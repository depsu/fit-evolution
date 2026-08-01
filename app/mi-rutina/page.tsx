"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { MachinePhoto } from "@/components/machine-photo";
import { WeekHistoryModal } from "@/components/week-history-modal";
import { ClientFileModal } from "@/components/client-file-modal";
import { PlanDayModal } from "@/components/plan-day-modal";
import { MediaModal } from "@/components/media-modal";
import { EditRoutineModal } from "@/components/edit-routine-modal";
import { DAY_NAMES, iconForRoutine, type Routine, type RoutineItem } from "@/lib/routine";
import { useEscape } from "@/lib/use-escape";
import {
  getCoachSettings,
  getMedia,
  getSession,
  loadClients,
  mediaKind,
  pullRemote,
  type CoachSettings,
  logout,
  mondayISO,
  routineForToday,
  saveClients,
  todayIndex,
  todayISO,
  type DayLog,
  type MediaMap,
  type StoredClient,
} from "@/lib/store";

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export default function MiRutinaPage() {
  const router = useRouter();
  const [client, setClient] = useState<StoredClient | null>(null);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Día tocado en "Tu semana" → modal con lo que hiciste ese día
  const [dayLog, setDayLog] = useState<{ dayIndex: number; log: DayLog | null } | null>(
    null
  );
  // Modal "Ver todo": historial por semanas
  const [historyOpen, setHistoryOpen] = useState(false);
  // Modal "Mi ficha"
  const [fileOpen, setFileOpen] = useState(false);
  // Horario y estado del coach (para el aviso de pausa)
  const [coach, setCoach] = useState<CoachSettings | null>(null);
  // Día tocado en un cuadro vacío: futuro/hoy = planificar; pasado = registrar
  const [planDay, setPlanDay] = useState<{
    day: number;
    mode: "planificar" | "registrar";
  } | null>(null);
  // Filtro de rutinas: solo aparece si el cliente creó alguna propia
  const [routineFilter, setRoutineFilter] = useState<"todas" | "coach" | "propias">("todas");
  // Recordatorios (notificaciones del navegador)
  const [notify, setNotify] = useState(false);
  // Fotos/videos de ejercicios (los pone el coach en su Biblioteca)
  const [media, setMedia] = useState<MediaMap>({});
  const [mediaView, setMediaView] = useState<{ url: string; title: string } | null>(null);
  // Editor de la rutina activa (agregar/quitar ejercicios, peso…)
  const [editOpen, setEditOpen] = useState(false);

  // Cerrar modales con Escape
  useEscape(!!dayLog, () => setDayLog(null));
  useEscape(planDay !== null, () => setPlanDay(null));
  useEscape(!!mediaView, () => setMediaView(null));
  useEscape(editOpen, () => setEditOpen(false));
  useEscape(historyOpen, () => setHistoryOpen(false));
  useEscape(fileOpen, () => setFileOpen(false));

  // Carga la sesión y el cliente al montar, bajando antes lo último de la nube
  useEffect(() => {
    const session = getSession();
    if (!session || session.type !== "client") {
      router.replace("/entrar");
      return;
    }
    let alive = true;
    const timer = window.setInterval(async () => {
      // Refresco: si el coach cambió algo, se ve aquí a los segundos
      if (!(await pullRemote())) return;
      const fresh = loadClients().find((c) => c.id === session.clientId);
      if (alive && fresh) {
        setClient(fresh);
        setMedia(getMedia());
        setCoach(getCoachSettings());
      }
    }, 7000);
    (async () => {
    await pullRemote();
    if (!alive) return;
    let found = loadClients().find((c) => c.id === session.clientId);
    if (!found) {
      logout();
      router.replace("/entrar");
      return;
    }
    // Sesión nueva cada día: si cambió la fecha, se limpia lo marcado ayer
    if (found.lastActiveDate !== todayISO()) {
      found = {
        ...found,
        lastActiveDate: todayISO(),
        routines: found.routines.map((saved) => ({ ...saved, done: [] })),
      };
      saveClients(loadClients().map((c) => (c.id === found!.id ? found! : c)));
    }
    setClient(found);
    setCoach(getCoachSettings());
    setMedia(getMedia());
    setNotify(
      window.localStorage.getItem("fitevo:notify:v1") === "on" &&
        "Notification" in window &&
        Notification.permission === "granted"
    );
    // Queda premarcada la rutina que toca hoy (o la primera)
    setActiveRoutineId(routineForToday(found)?.id ?? null);
    setLoaded(true);
    })();
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [router]);

  const active = useMemo(
    () => client?.routines.find((saved) => saved.id === activeRoutineId) ?? null,
    [client, activeRoutineId]
  );

  const persist = (updated: StoredClient) => {
    setClient(updated);
    saveClients(loadClients().map((c) => (c.id === updated.id ? updated : c)));
  };

  const toggleDone = (exerciseId: string) => {
    if (!client || !active) return;
    const wasDone = active.done.includes(exerciseId);
    const done = wasDone
      ? active.done.filter((id) => id !== exerciseId)
      : [...active.done, exerciseId];

    // ¿Con este toque quedó completada la sesión? Suma al contador
    const justCompleted =
      !wasDone && done.length === active.routine.items.length;
    const routines = client.routines.map((saved) =>
      saved.id === active.id
        ? {
            ...saved,
            done,
            timesDone:
              justCompleted && saved.lastDoneDate !== todayISO()
                ? saved.timesDone + 1
                : saved.timesDone,
            lastDoneDate: justCompleted ? todayISO() : saved.lastDoneDate,
          }
        : saved
    );

    // Al marcar el primer ejercicio del día cuenta como asistencia,
    // y se registra en el historial qué rutina hizo hoy
    const week = [...client.week];
    if (!wasDone) week[todayIndex()] = true;
    const previous = client.history.find((entry) => entry.day === todayIndex());
    const todayLog: DayLog = {
      day: todayIndex(),
      routineTitle: active.routine.title,
      completed: done.length,
      total: active.routine.items.length,
      exercises: active.routine.items.map((item) => item.exercise.name),
      moreWeight: previous?.moreWeight,
      comfortable: previous?.comfortable,
    };
    const history = [
      ...client.history.filter((entry) => entry.day !== todayIndex()),
      todayLog,
    ];

    persist({ ...client, routines, week, history });
  };

  // Guarda las respuestas de fin de sesión en el registro de hoy.
  // Si pide subir peso, queda anotado en el historial de ajustes de la rutina.
  const answerFeedback = (field: "moreWeight" | "comfortable", value: boolean) => {
    if (!client) return;
    const history = client.history.map((entry) =>
      entry.day === todayIndex() ? { ...entry, [field]: value } : entry
    );
    let routines = client.routines;
    if (field === "moreWeight" && value && active) {
      const alreadyAsked = active.adjustments.some(
        (adjustment) =>
          adjustment.dateLabel === todayISO() && adjustment.by === "cliente"
      );
      if (!alreadyAsked) {
        routines = client.routines.map((saved) =>
          saved.id === active.id
            ? {
                ...saved,
                adjustments: [
                  ...saved.adjustments,
                  {
                    dateLabel: todayISO(),
                    by: "cliente" as const,
                    text: "Pidió subir el peso la próxima sesión",
                  },
                ],
              }
            : saved
        );
      }
    }
    persist({ ...client, history, routines });
  };

  // Fecha AAAA-MM-DD de un día de ESTA semana (para registros pasados)
  const dateOfWeekDay = (dayIndex: number): string => {
    const [year, month, dayOfMonth] = mondayISO().split("-").map(Number);
    const date = new Date(year, month - 1, dayOfMonth + dayIndex);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Deja una rutina existente planificada para el día tocado (con hora)
  const planExisting = (routineId: string, time: string | null) => {
    if (!client || planDay === null) return;
    if (planDay.mode === "registrar") {
      registerPast(routineId);
      return;
    }
    persist({
      ...client,
      routines: client.routines.map((saved) =>
        saved.id === routineId
          ? { ...saved, routine: { ...saved.routine, day: planDay.day, time } }
          : saved
      ),
    });
    if (planDay.day === todayIndex()) setActiveRoutineId(routineId);
    setPlanDay(null);
  };

  // Registra una rutina que hizo un día pasado y no quedó marcada
  const registerPast = (routineId: string) => {
    if (!client || planDay === null) return;
    const saved = client.routines.find((routine) => routine.id === routineId);
    if (!saved) return;
    const day = planDay.day;
    const doneDate = dateOfWeekDay(day);
    const week = [...client.week];
    week[day] = true;
    const history = [
      ...client.history.filter((entry) => entry.day !== day),
      {
        day,
        routineTitle: saved.routine.title,
        completed: saved.routine.items.length,
        total: saved.routine.items.length,
        exercises: saved.routine.items.map((item) => item.exercise.name),
      },
    ];
    persist({
      ...client,
      week,
      history,
      routines: client.routines.map((routine) =>
        routine.id === routineId
          ? {
              ...routine,
              timesDone: routine.timesDone + 1,
              lastDoneDate:
                !routine.lastDoneDate || routine.lastDoneDate < doneDate
                  ? doneDate
                  : routine.lastDoneDate,
            }
          : routine
      ),
    });
    setPlanDay(null);
  };

  // Crea una rutina propia del cliente, ya planificada
  const createOwn = (routine: Routine) => {
    if (!client || planDay === null) return;
    const id = `r${Date.now()}`;
    const day = planDay.day;
    persist({
      ...client,
      routines: [
        ...client.routines,
        {
          id,
          createdBy: "cliente",
          routine,
          done: [],
          timesDone: 0,
          adjustments: [
            { dateLabel: todayISO(), by: "cliente", text: "Creó su propia rutina" },
          ],
        },
      ],
    });
    if (day === todayIndex()) setActiveRoutineId(id);
    setPlanDay(null);
  };

  // Activar/desactivar recordatorios del navegador
  const toggleNotify = async () => {
    if (notify) {
      window.localStorage.setItem("fitevo:notify:v1", "off");
      setNotify(false);
      return;
    }
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      window.localStorage.setItem("fitevo:notify:v1", "on");
      setNotify(true);
      new Notification("🔔 Recordatorios activados", {
        body: "Te avisaremos 30 minutos antes de tu rutina planificada.",
      });
    }
  };

  // Revisa cada minuto si toca avisar (mientras la app está abierta)
  useEffect(() => {
    if (!notify || !client) return;
    const check = () => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      client.routines.forEach((saved) => {
        const { day, time, title } = {
          day: saved.routine.day,
          time: saved.routine.time,
          title: saved.routine.title,
        };
        if (day !== todayIndex() || !time) return;
        const [hours, minutes] = time.split(":").map(Number);
        const until = hours * 60 + minutes - nowMinutes;
        const firedKey = `fitevo:avisado:${todayISO()}:${saved.id}`;
        if (until > 0 && until <= 30 && !window.sessionStorage.getItem(firedKey)) {
          window.sessionStorage.setItem(firedKey, "1");
          new Notification(
            `⏰ En ${until} min empieza tu ${title.replace(/^Rutina( express)? · /, "día de ")}`,
            { body: "¡Prepárate! 💪" }
          );
        }
      });
    };
    check();
    const timer = window.setInterval(check, 60000);
    return () => window.clearInterval(timer);
  }, [notify, client]);

  // Actualiza el peso corporal: queda en el histórico con la fecha de hoy
  const updateWeight = (weightKg: number) => {
    if (!client) return;
    persist({
      ...client,
      weightKg,
      weightHistory: [
        ...client.weightHistory,
        { dateLabel: todayISO(), weightKg },
      ],
    });
  };

  // Guarda la edición de la rutina activa; los cambios quedan anotados
  // como ajustes del cliente (el coach los ve en "Ver avances")
  const saveEdit = (items: RoutineItem[], changes: string[]) => {
    if (!client || !active) return;
    persist({
      ...client,
      routines: client.routines.map((saved) =>
        saved.id === active.id
          ? {
              ...saved,
              routine: { ...saved.routine, items },
              adjustments: [
                ...saved.adjustments,
                ...changes.map((text) => ({
                  dateLabel: todayISO(),
                  by: "cliente" as const,
                  text,
                })),
              ],
            }
          : saved
      ),
    });
    setEditOpen(false);
  };

  // Eliminar una rutina propia (las del coach las elimina el coach)
  const deleteActive = () => {
    if (!client || !active) return;
    if (
      !window.confirm(
        `¿Eliminar “${active.routine.title}”? Esta acción no se puede deshacer.`
      )
    )
      return;
    const routines = client.routines.filter((saved) => saved.id !== active.id);
    persist({ ...client, routines });
    setActiveRoutineId(routines[0]?.id ?? null);
  };

  const exit = () => {
    logout();
    router.push("/");
  };

  if (!loaded || !client) {
    return (
      <main className="min-h-screen">
        <SiteNav active="mi-rutina" />
        <p className="p-10 text-center text-steel">Cargando tu rutina…</p>
      </main>
    );
  }

  const firstName = client.name.split(" ")[0];
  const total = active?.routine.items.length ?? 0;
  const completed = active
    ? active.routine.items.filter((item) => active.done.includes(item.exercise.id))
        .length
    : 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const todayFeedback = client.history.find((entry) => entry.day === todayIndex());

  return (
    <main className="min-h-screen">
      <SiteNav active="mi-rutina" />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
              Tu espacio · {client.plan}
            </p>
            <h1 className="font-display mt-2 text-4xl tracking-wide uppercase sm:text-5xl">
              Hola, <span className="text-blood">{firstName}</span>
            </h1>
            <p className="mt-2 text-steel">Objetivo: {client.goal}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFileOpen(true)}
              className="border border-blood px-4 py-2 text-xs font-semibold tracking-widest text-blood uppercase transition-colors hover:bg-blood hover:text-chalk"
            >
              Mi ficha
            </button>
            <button
              type="button"
              onClick={exit}
              className="border border-graphite px-4 py-2 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:border-blood hover:text-blood"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Aviso del coach en pausa */}
        {coach?.paused && (
          <p className="rise mt-6 border-l-4 border-blood bg-coal px-4 py-3 text-sm">
            ⏸ <strong>Aviso de tu coach:</strong> está en pausa por estos días.
            {coach.pauseMessage ? ` “${coach.pauseMessage}”` : ""}
          </p>
        )}

        {/* Días del coach + tus clases con él */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="border border-graphite bg-coal p-4">
            <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
              Tu coach está en el gym
            </p>
            <p className="font-display mt-1 text-xl tracking-wide text-blood">
              {coach
                ? coach.workDays
                    .map((works, i) => (works ? DAY_LABELS[i] : null))
                    .filter(Boolean)
                    .join(" · ") || "por confirmar"
                : "…"}
            </p>
          </div>
          {client.sessionsPack && (
            <div className="border border-graphite bg-coal p-4">
              <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
                Clases con tu coach
              </p>
              <p className="mt-1 text-sm">
                <strong className="font-display text-xl text-blood">
                  {client.sessionsPack.total - client.sessionsPack.used}
                </strong>{" "}
                de {client.sessionsPack.total} restantes ·{" "}
                próxima:{" "}
                <strong>
                  {typeof client.sessionsPack.nextDay === "number"
                    ? DAY_NAMES[client.sessionsPack.nextDay]
                    : "por agendar"}
                </strong>
              </p>
            </div>
          )}
        </div>

        {/* Asistencia semanal: toca un día para ver qué hiciste */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
              Tu semana
            </h2>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="border border-graphite px-3 py-1.5 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:border-blood hover:text-blood"
            >
              Ver todo →
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            {client.week.map((attended, i) => {
              const entry = client.history.find((historyEntry) => historyEntry.day === i);
              return (
              <div key={i} className="flex-1 text-center">
                <button
                  type="button"
                  onClick={() =>
                    attended
                      ? setDayLog({ dayIndex: i, log: entry ?? null })
                      : setPlanDay({
                          day: i,
                          mode: i < todayIndex() ? "registrar" : "planificar",
                        })
                  }
                  title={
                    attended
                      ? `Entrenaste el ${DAY_NAMES[i]} — toca para ver qué hiciste`
                      : i < todayIndex()
                        ? `¿Entrenaste el ${DAY_NAMES[i]}? Regístralo`
                        : `Planificar el ${DAY_NAMES[i]}`
                  }
                  aria-label={
                    attended
                      ? `Ver lo que hiciste el ${DAY_NAMES[i]}`
                      : i < todayIndex()
                        ? `Registrar una rutina que hiciste el ${DAY_NAMES[i]}`
                        : `Planificar tu rutina del ${DAY_NAMES[i]}`
                  }
                  className={`relative h-10 w-full border transition-transform ${
                    attended
                      ? "hazard cursor-pointer border-blood hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(225,6,0,0.5)]"
                      : i === todayIndex()
                        ? "border-chalk/40 bg-graphite/40"
                        : "border-graphite bg-graphite/40"
                  }`}
                >
                  {/* Icono de la zona entrenada, o "+" para planificar */}
                  {attended && entry ? (
                    <span
                      className="absolute inset-0 flex items-center justify-center text-base [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
                      aria-hidden
                    >
                      {iconForRoutine(entry.routineTitle)}
                    </span>
                  ) : !attended ? (
                    <span
                      className={`absolute inset-0 flex items-center justify-center ${
                        i < todayIndex()
                          ? "text-xs text-steel/40"
                          : "text-lg text-steel/60"
                      }`}
                      aria-hidden
                    >
                      {i < todayIndex() ? "✎" : "+"}
                    </span>
                  ) : null}
                </button>
                <span
                  className={`mt-1 block text-xs ${
                    i === todayIndex() ? "font-bold text-chalk" : "text-steel"
                  }`}
                >
                  {DAY_LABELS[i]}
                </span>
              </div>
              );
            })}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel">
            <span className="flex items-center gap-1.5">
              <span className="hazard inline-block h-3 w-6 border border-blood" aria-hidden />
              entrenaste · tócalo para ver qué hiciste
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 border border-graphite bg-graphite/40" aria-hidden />
              con “+” planificas los días que vienen · con “✎” registras un
              día pasado que entrenaste
            </span>
          </p>

          {/* Recordatorios: aviso 30 min antes de la rutina planificada */}
          <button
            type="button"
            onClick={toggleNotify}
            aria-pressed={notify}
            className={`mt-3 border px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors ${
              notify
                ? "border-blood bg-blood text-chalk"
                : "border-graphite text-steel hover:border-blood hover:text-blood"
            }`}
          >
            🔔 Recordatorios: {notify ? "activados" : "desactivados"}
          </button>
        </div>

        {/* Tus rutinas: la de hoy queda premarcada; puedes abrir otra si quieres */}
        <h2 className="mt-10 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
          Tus rutinas ({client.routines.length})
        </h2>

        {/* Filtro: solo aparece si ya creaste una rutina propia */}
        {client.routines.some((saved) => saved.createdBy === "cliente") && (
          <div className="mt-2 flex gap-2">
            {(
              [
                { value: "todas", label: "Todas" },
                { value: "coach", label: "Del coach" },
                { value: "propias", label: "Mías" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRoutineFilter(option.value)}
                aria-pressed={routineFilter === option.value}
                className={`border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  routineFilter === option.value
                    ? "border-blood bg-blood text-chalk"
                    : "border-graphite text-steel hover:border-blood"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {client.routines
            .filter((saved) =>
              routineFilter === "todas"
                ? true
                : routineFilter === "propias"
                  ? saved.createdBy === "cliente"
                  : saved.createdBy !== "cliente"
            )
            .map((saved) => {
            const isActive = saved.id === activeRoutineId;
            const isToday = saved.routine.day === todayIndex();
            return (
              <button
                key={saved.id}
                type="button"
                onClick={() => setActiveRoutineId(saved.id)}
                className={`relative border px-4 py-2.5 text-left transition-colors ${
                  isActive ? "border-blood bg-coal" : "border-graphite bg-coal/40 hover:border-steel"
                }`}
              >
                <span className={`font-display block text-base leading-tight uppercase ${isActive ? "text-blood" : ""}`}>
                  {saved.routine.title.replace(/^Rutina( express)? · /, "")}
                </span>
                <span className="block text-xs text-steel">
                  {typeof saved.routine.day === "number"
                    ? DAY_NAMES[saved.routine.day]
                    : "Cualquier día"}
                  {saved.routine.time ? ` · ${saved.routine.time}` : ""}
                  {saved.createdBy === "cliente" ? " · tuya" : ""}
                </span>
                {isToday && (
                  <span className="absolute -top-2 -right-2 bg-blood px-1.5 text-[9px] font-bold tracking-widest text-chalk uppercase">
                    Hoy
                  </span>
                )}
              </button>
            );
            })}
        </div>

        {active ? (
          <>
            <div className="mt-6 border border-blood bg-coal p-5 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-blood uppercase">
                  {active.createdBy === "cliente" ? "Creada por ti" : "Asignada por tu coach"} ·{" "}
                  {typeof active.routine.day === "number"
                    ? `para el ${DAY_NAMES[active.routine.day]}`
                    : "para cualquier día"}
                  {active.routine.time ? ` · ${active.routine.time} h` : ""}
                </p>
                <p className="font-display mt-1 text-2xl tracking-wide uppercase">
                  {active.routine.title}
                </p>
                <p className="mt-1 text-sm text-steel">{active.routine.subtitle}</p>
              </div>
              <p className="mt-3 sm:mt-0 sm:text-right">
                <span className="font-display block text-4xl text-blood">
                  ~{active.routine.durationMinutes}&apos;
                </span>
                <span className="text-xs tracking-widest text-steel uppercase">
                  duración estimada
                </span>
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="border border-graphite px-3 py-2 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:border-blood hover:text-blood"
              >
                ✏️ Editar rutina
              </button>
              {active.createdBy === "cliente" && (
                <button
                  type="button"
                  onClick={deleteActive}
                  className="px-3 py-2 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:text-blood"
                >
                  Eliminar ✕
                </button>
              )}
            </div>

            <p className="mt-4 border-l-2 border-blood bg-coal px-4 py-3 text-sm text-steel">
              💡 Toca <strong className="text-chalk">“Marcar”</strong> cuando termines
              cada ejercicio. Tu coach ve tu avance al instante.
            </p>

            <div className="mt-6">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold tracking-widest text-steel uppercase">
                  Progreso de hoy
                </span>
                <span className="font-display text-xl text-blood">
                  {completed}/{total}
                </span>
              </div>
              <div className="mt-2 h-2 bg-graphite">
                <div
                  className="h-full bg-blood transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ol className="mt-8 space-y-4">
              {active.routine.items.map((item, i) => {
                const isDone = active.done.includes(item.exercise.id);
                return (
                  <li
                    key={item.exercise.id}
                    className={`grid grid-cols-[88px_1fr] gap-3 border p-3 transition-colors sm:grid-cols-[140px_1fr_auto] sm:gap-4 sm:p-4 ${
                      isDone
                        ? "border-graphite bg-coal/40 opacity-60"
                        : "border-graphite bg-coal"
                    }`}
                  >
                    {media[item.exercise.id] &&
                    mediaKind(media[item.exercise.id].url) === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={media[item.exercise.id].url}
                        alt={`Foto: ${item.exercise.name}`}
                        className="aspect-square w-full border border-graphite object-cover sm:aspect-[4/3]"
                      />
                    ) : (
                      <MachinePhoto name={item.exercise.machine} index={i} compact />
                    )}
                    <div>
                      <p className="text-xs font-semibold tracking-[0.2em] text-blood uppercase">
                        {item.exercise.muscle}
                      </p>
                      <h3
                        className={`font-display mt-1 text-2xl tracking-wide uppercase ${
                          isDone ? "line-through decoration-blood" : ""
                        }`}
                      >
                        {item.exercise.name}
                      </h3>
                      <p className="mt-1 text-sm text-steel">💡 {item.exercise.tip}</p>
                      {media[item.exercise.id] && (
                        <button
                          type="button"
                          onClick={() =>
                            setMediaView({
                              url: media[item.exercise.id].url,
                              title: item.exercise.name,
                            })
                          }
                          className="mt-2 border border-blood px-3 py-1.5 text-xs font-semibold tracking-widest text-blood uppercase transition-colors hover:bg-blood hover:text-chalk"
                        >
                          ▶ Ver cómo se hace
                        </button>
                      )}
                      <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
                        <span>
                          <strong className="font-display text-lg text-blood">{item.sets}</strong>{" "}
                          series
                        </span>
                        <span>
                          <strong className="font-display text-lg text-blood">{item.reps}</strong>{" "}
                          reps
                        </span>
                        <span>
                          <strong className="font-display text-lg text-blood">
                            {item.weight ?? "—"}
                          </strong>{" "}
                          peso
                        </span>
                        <span>
                          <strong className="font-display text-lg text-blood">
                            {item.restSeconds}s
                          </strong>{" "}
                          descanso
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleDone(item.exercise.id)}
                      aria-pressed={isDone}
                      className={`col-span-2 self-center border px-4 py-3 font-display text-lg tracking-wider uppercase transition-colors sm:col-span-1 ${
                        isDone
                          ? "pop border-blood bg-blood text-chalk"
                          : "border-chalk/30 hover:border-blood hover:text-blood"
                      }`}
                    >
                      {isDone ? "✓ Hecho" : "Marcar"}
                    </button>
                  </li>
                );
              })}
            </ol>

            {progress === 100 && (
              <div className="rise mt-8">
                <p className="hazard p-px text-center">
                  <span className="font-display block bg-ink px-4 py-4 text-2xl tracking-wider uppercase">
                    💪 ¡Sesión completada! Tu coach ya lo puede ver.
                  </span>
                </p>

                {/* Preguntas de cierre: el coach ve estas respuestas */}
                <div className="mt-4 space-y-4 border border-graphite bg-coal p-5">
                  <div>
                    <p className="font-semibold">
                      ¿Te sientes listo para aumentar un poco el peso en la
                      siguiente sesión?
                    </p>
                    <div className="mt-2 flex gap-2">
                      {[
                        { label: "💪 Sí, subamos", value: true },
                        { label: "Todavía no", value: false },
                      ].map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => answerFeedback("moreWeight", option.value)}
                          aria-pressed={todayFeedback?.moreWeight === option.value}
                          className={`border px-4 py-2 text-sm font-semibold transition-colors ${
                            todayFeedback?.moreWeight === option.value
                              ? "border-blood bg-blood text-chalk"
                              : "border-graphite hover:border-blood"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold">¿Estuviste cómodo con esta sesión?</p>
                    <div className="mt-2 flex gap-2">
                      {[
                        { label: "😀 Sí, muy bien", value: true },
                        { label: "😮‍💨 Me costó", value: false },
                      ].map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => answerFeedback("comfortable", option.value)}
                          aria-pressed={todayFeedback?.comfortable === option.value}
                          className={`border px-4 py-2 text-sm font-semibold transition-colors ${
                            todayFeedback?.comfortable === option.value
                              ? "border-blood bg-blood text-chalk"
                              : "border-graphite hover:border-blood"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="border-t border-graphite pt-4 text-sm text-steel">
                    🌙 Mañana aparecerá tu próxima rutina aquí mismo. Hoy has
                    hecho un buen trabajo, {firstName}.
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-6 border border-graphite bg-coal p-6 text-steel">
            Tu coach todavía no te asigna una rutina. ¡Pídele tu primera!
          </p>
        )}
      </div>

      {/* Modal: qué hiciste el día tocado */}
      {dayLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Lo que hiciste el ${DAY_NAMES[dayLog.dayIndex]}`}
          className="tour-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDayLog(null);
          }}
        >
          <div className="tour-card w-full max-w-sm border border-blood bg-coal">
            <div className="hazard h-2 w-full" aria-hidden />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-2xl tracking-wide uppercase">
                  {DAY_NAMES[dayLog.dayIndex]}
                </h3>
                <button
                  type="button"
                  onClick={() => setDayLog(null)}
                  className="text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:text-blood"
                >
                  Cerrar ✕
                </button>
              </div>
              {dayLog.log ? (
                <>
                  <p className="mt-2 text-sm text-steel">Ese día hiciste:</p>
                  <p className="font-display mt-1 text-xl tracking-wide text-blood uppercase">
                    {dayLog.log.routineTitle}
                  </p>
                  <p className="mt-1 text-sm">
                    Completaste{" "}
                    <strong className="font-display text-lg text-blood">
                      {dayLog.log.completed}/{dayLog.log.total}
                    </strong>{" "}
                    ejercicios
                  </p>
                  <ul className="mt-3 space-y-1 border-t border-graphite pt-3">
                    {dayLog.log.exercises.map((exercise, i) => (
                      <li key={exercise} className="flex items-center gap-2 text-sm">
                        <span
                          className={`flex size-4 shrink-0 items-center justify-center text-[10px] ${
                            i < (dayLog.log?.completed ?? 0)
                              ? "bg-blood text-chalk"
                              : "border border-graphite text-steel"
                          }`}
                          aria-hidden
                        >
                          {i < (dayLog.log?.completed ?? 0) ? "✓" : ""}
                        </span>
                        {exercise}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-3 text-sm text-steel">
                  Entrenaste ese día, pero no quedó registro de la rutina.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal "Ver todo": semanas anteriores + estadísticas */}
      {historyOpen && (
        <WeekHistoryModal client={client} onClose={() => setHistoryOpen(false)} />
      )}

      {/* Planificar el día tocado */}
      {planDay !== null && (
        <PlanDayModal
          client={client}
          dayIndex={planDay.day}
          mode={planDay.mode}
          onClose={() => setPlanDay(null)}
          onPlanExisting={planExisting}
          onCreateOwn={createOwn}
        />
      )}

      {/* Editor de la rutina activa */}
      {editOpen && active && (
        <EditRoutineModal
          title={active.routine.title}
          items={active.routine.items}
          level={client.level}
          onSave={saveEdit}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Foto o video del ejercicio */}
      {mediaView && (
        <MediaModal
          url={mediaView.url}
          title={mediaView.title}
          onClose={() => setMediaView(null)}
        />
      )}

      {/* Mi ficha: datos, peso e histórico */}
      {fileOpen && (
        <ClientFileModal
          client={client}
          onClose={() => setFileOpen(false)}
          onUpdateWeight={updateWeight}
        />
      )}
    </main>
  );
}
