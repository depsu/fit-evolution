"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { GuideTour, type GuideStep } from "@/components/guide-tour";
import { WeekHistoryModal } from "@/components/week-history-modal";
import { ClientFileModal } from "@/components/client-file-modal";
import {
  buildRoutine,
  cardioExercise,
  DAY_NAMES,
  EXERCISES,
  GROUP_OPTIONS,
  iconForRoutine,
  LEVEL_CONFIG,
  LEVEL_OPTIONS,
  MOVEMENT_OPTIONS,
  type Exercise,
  type Level,
  type MuscleGroup,
  type Routine,
  type RoutineItem,
  type Sex,
} from "@/lib/routine";
import { useEscape } from "@/lib/use-escape";
import {
  clientProgress,
  formatDateLabel,
  generateCode,
  getCoachSettings,
  saveCoachSettings,
  type CoachSettings,
  getSession,
  lastDoneLabel,
  loadClients,
  logout,
  routineForToday,
  saveClients,
  todayISO,
  type DayLog,
  type SavedRoutine,
  type StoredClient,
} from "@/lib/store";

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

// Guía que explica el panel sección por sección: cada paso ilumina
// la sección de la que habla (targetId) y oscurece el resto.
const PANEL_GUIDE: GuideStep[] = [
  {
    icon: "🧭",
    title: "Este es",
    highlight: "tu panel",
    text: "Aquí controlas todo tu gimnasio: tus clientes, su asistencia y sus rutinas. Te mostramos cada sección — mira lo que se ilumina.",
  },
  {
    icon: "📊",
    title: "Arriba:",
    highlight: "tus números",
    text: "Clientes activos, adherencia media (qué tanto están cumpliendo sus rutinas) y cuántas sesiones hicieron entre todos esta semana.",
    targetId: "guia-metricas",
  },
  {
    icon: "📇",
    title: "La lista:",
    highlight: "tus clientes",
    text: "Toca un nombre para abrir su ficha. El porcentaje rojo es cuánto lleva de sus rutinas. Con “+ Nuevo” creas un cliente (ahí defines su nivel, una sola vez) y la app te da su código de acceso.",
    targetId: "guia-clientes",
  },
  {
    icon: "📅",
    title: "Su",
    highlight: "asistencia",
    text: "Cada cuadro es un día, de lunes (L) a domingo (D). Rayado rojo = vino a entrenar; gris = no vino. 👆 Toca un día rayado y verás qué rutina hizo ese día.",
    targetId: "guia-asistencia",
  },
  {
    icon: "🗂️",
    title: "Todas sus",
    highlight: "rutinas",
    text: "Un cliente puede tener varias rutinas, cada una con su día. En cada una ves cuántas veces la hizo y cuándo fue la última. Ábrela para ✏️ editarla (series, reps, peso) o 📈 ver sus avances y el historial de ajustes.",
    targetId: "guia-rutina",
    placement: "top",
  },
  {
    icon: "✏️",
    title: "Botón",
    highlight: "nueva rutina",
    text: "Crea otra rutina y se SUMA a su lista: automática (eliges zona) o armada por ti — buscas ejercicios del catálogo (de máquina o pesas), defines series, reps y peso, y le pones su día.",
    targetId: "guia-asignar",
  },
];

export default function PanelPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [clients, setClients] = useState<StoredClient[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [mode, setMode] = useState<"detalle" | "asignar" | "nuevo">("detalle");
  const [toast, setToast] = useState<string | null>(null);
  // Día tocado en la asistencia → modal con la rutina que hizo
  const [dayLog, setDayLog] = useState<{ dayIndex: number; log: DayLog | null } | null>(
    null
  );
  // Modales: historial por semanas, ficha del cliente y horario del coach
  const [historyOpen, setHistoryOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [coach, setCoach] = useState<CoachSettings | null>(null);
  // Columna de detalle: en móvil queda debajo de la lista, así que al
  // cambiar de cliente o abrir un formulario bajamos la vista hasta ella
  const detailRef = useRef<HTMLDivElement | null>(null);
  const skipFirstScroll = useRef(true);

  // Cerrar modales con Escape
  useEscape(!!dayLog, () => setDayLog(null));
  useEscape(historyOpen, () => setHistoryOpen(false));
  useEscape(fileOpen, () => setFileOpen(false));
  useEscape(scheduleOpen, () => setScheduleOpen(false));

  useEffect(() => {
    if (skipFirstScroll.current) {
      skipFirstScroll.current = false;
      return;
    }
    // Solo en pantallas angostas (en escritorio ya se ve todo junto)
    if (window.innerWidth < 1024) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [mode, selectedId]);

  useEffect(() => {
    const session = getSession();
    if (!session || session.type !== "coach") {
      router.replace("/entrar");
      return;
    }
    const stored = loadClients();
    setClients(stored);
    setSelectedId(stored[0]?.id ?? "");
    setCoach(getCoachSettings());
    setAuthorized(true);
  }, [router]);

  const selected = useMemo(
    () => clients.find((client) => client.id === selectedId) ?? null,
    [clients, selectedId]
  );

  const stats = useMemo(() => {
    const total = clients.length;
    if (total === 0) return { total: 0, sessions: 0, adherence: 0 };
    const sessions = clients.reduce(
      (count, client) => count + client.week.filter(Boolean).length,
      0
    );
    const ratios = clients.map((client) => {
      const progress = clientProgress(client);
      return progress.total > 0 ? progress.completed / progress.total : 0;
    });
    const adherence = Math.round(
      (ratios.reduce((sum, ratio) => sum + ratio, 0) / total) * 100
    );
    return { total, sessions, adherence };
  }, [clients]);

  const persist = (updated: StoredClient[]) => {
    setClients(updated);
    saveClients(updated);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  // Agrega la rutina nueva a la lista del cliente (no reemplaza nada)
  const addRoutine = (routine: Routine) => {
    if (!selected) return;
    const savedRoutine: SavedRoutine = {
      id: `r${Date.now()}`,
      createdBy: "coach",
      routine,
      done: [],
      timesDone: 0,
      adjustments: [{ dateLabel: todayISO(), by: "coach", text: "Creó la rutina" }],
    };
    persist(
      clients.map((client) =>
        client.id === selected.id
          ? { ...client, routines: [...client.routines, savedRoutine] }
          : client
      )
    );
    setMode("detalle");
    showToast(`Rutina agregada a ${selected.name.split(" ")[0]} ✓`);
  };

  // El coach edita la rutina (series/reps/peso); cada cambio queda anotado
  const editRoutine = (
    routineId: string,
    items: RoutineItem[],
    changes: string[]
  ) => {
    if (!selected) return;
    persist(
      clients.map((client) =>
        client.id === selected.id
          ? {
              ...client,
              routines: client.routines.map((savedRoutine) =>
                savedRoutine.id === routineId
                  ? {
                      ...savedRoutine,
                      routine: { ...savedRoutine.routine, items },
                      adjustments: [
                        ...savedRoutine.adjustments,
                        ...changes.map((text) => ({
                          dateLabel: todayISO(),
                          by: "coach" as const,
                          text,
                        })),
                      ],
                    }
                  : savedRoutine
              ),
            }
          : client
      )
    );
    showToast("Rutina actualizada ✓");
  };

  const removeRoutine = (routineId: string) => {
    if (!selected) return;
    persist(
      clients.map((client) =>
        client.id === selected.id
          ? {
              ...client,
              routines: client.routines.filter((saved) => saved.id !== routineId),
            }
          : client
      )
    );
    showToast("Rutina quitada");
  };

  const addClient = (data: {
    name: string;
    goal: string;
    sex: Sex;
    level: Level;
    plan: StoredClient["plan"];
    group: MuscleGroup;
    heightCm?: number;
    weightKg?: number;
    customCode?: string;
    packTotal?: number;
  }) => {
    // Si el coach eligió un código (apodo), se usa; si está tomado, se avisa
    const normalized = (data.customCode ?? "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);
    const taken = clients.some((client) => client.code === normalized);
    const code =
      normalized && !taken && normalized !== "COACH"
        ? normalized
        : generateCode(data.customCode?.trim() || data.name, clients);
    const client: StoredClient = {
      id: `c${Date.now()}`,
      name: data.name.trim(),
      code,
      plan: data.plan,
      level: data.level,
      sex: data.sex,
      goal: data.goal.trim() || "Ponerse en forma",
      sessionsPack:
        data.packTotal && data.packTotal > 0
          ? { total: data.packTotal, used: 0, nextDay: null }
          : undefined,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      weightHistory: data.weightKg
        ? [{ dateLabel: todayISO(), weightKg: data.weightKg }]
        : [],
      week: [false, false, false, false, false, false, false],
      routines: [
        {
          id: `r${Date.now()}`,
          routine: buildRoutine(data.group, data.level, data.sex),
          done: [],
          timesDone: 0,
          adjustments: [
            { dateLabel: todayISO(), by: "coach", text: "Creó la rutina" },
          ],
        },
      ],
      history: [],
      pastWeeks: [],
      lastSeen: "nunca",
    };
    const updated = [...clients, client];
    persist(updated);
    setSelectedId(client.id);
    setMode("detalle");
    setFileOpen(true);
    showToast(`${client.name.split(" ")[0]} creado · código ${code}`);
  };

  // El coach actualiza el peso del cliente desde su ficha
  const updateWeight = (weightKg: number) => {
    if (!selected) return;
    persist(
      clients.map((client) =>
        client.id === selected.id
          ? {
              ...client,
              weightKg,
              weightHistory: [
                ...client.weightHistory,
                { dateLabel: todayISO(), weightKg },
              ],
            }
          : client
      )
    );
    showToast("Peso actualizado ✓");
  };

  const updateCoach = (settings: CoachSettings) => {
    setCoach(settings);
    saveCoachSettings(settings);
  };

  // Marca una clase del pack como realizada / cambia la próxima
  const updatePack = (used: number, nextDay: number | null) => {
    if (!selected?.sessionsPack) return;
    persist(
      clients.map((client) =>
        client.id === selected.id && client.sessionsPack
          ? {
              ...client,
              sessionsPack: {
                ...client.sessionsPack,
                used: Math.max(0, Math.min(client.sessionsPack.total, used)),
                nextDay,
              },
            }
          : client
      )
    );
  };

  const exit = () => {
    logout();
    router.push("/");
  };

  if (!authorized) {
    return (
      <main className="min-h-screen">
        <SiteNav active="panel" />
        <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
          <p className="text-steel">
            Verificando acceso… Si no avanza,{" "}
            <Link href="/entrar" className="font-semibold text-blood">
              entra con el código COACH
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <SiteNav active="panel" />
      <GuideTour
        steps={PANEL_GUIDE}
        storageKey="fitevo:guia-panel:v2"
        buttonLabel="Guía del panel"
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
              Panel del coach
            </p>
            <h1 className="font-display mt-1 text-4xl tracking-wide uppercase sm:text-5xl">
              Hola, <span className="text-blood">Roberto</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden items-center gap-2 border border-graphite px-3 py-2 text-sm text-steel sm:flex">
              <span className="livedot size-2 rounded-full bg-blood" />
              {stats.sessions} sesiones esta semana
            </p>
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className={`relative border px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors ${
                coach?.paused
                  ? "border-blood bg-blood text-chalk"
                  : "border-graphite text-steel hover:border-blood hover:text-blood"
              }`}
            >
              {coach?.paused ? "⏸ En pausa" : "Mi horario"}
            </button>
            <button
              type="button"
              onClick={exit}
              className="border border-graphite px-3 py-2 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:border-blood hover:text-blood"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Métricas generales */}
        <div id="guia-metricas" className="mt-8 grid grid-cols-3 gap-3 bg-ink">
          {[
            { big: String(stats.total), small: "clientes activos" },
            { big: `${stats.adherence}%`, small: "adherencia media" },
            { big: String(stats.sessions), small: "sesiones esta semana" },
          ].map((stat) => (
            <div key={stat.small} className="border border-graphite bg-coal p-4 sm:p-6">
              <p className="font-display text-3xl text-blood sm:text-5xl">{stat.big}</p>
              <p className="mt-1 text-xs text-steel sm:text-sm">{stat.small}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Lista de clientes */}
          <aside id="guia-clientes" className="bg-ink">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
                Tus clientes
              </h2>
              <button
                type="button"
                onClick={() => setMode(mode === "nuevo" ? "detalle" : "nuevo")}
                className={`px-3 py-1.5 font-display text-sm tracking-widest uppercase transition-colors ${
                  mode === "nuevo"
                    ? "border border-chalk/30 hover:border-blood hover:text-blood"
                    : "bg-blood text-chalk hover:bg-ember"
                }`}
              >
                {mode === "nuevo" ? "Cancelar" : "+ Nuevo"}
              </button>
            </div>
            <p className="mt-2 text-xs text-steel">
              Toca un cliente para ver su avance. Con “+ Nuevo” lo creas y le
              das su código de acceso.
            </p>
            <ul className="mt-3 space-y-2">
              {clients.map((client) => {
                const isActive = client.id === selectedId && mode !== "nuevo";
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(client.id);
                        setMode("detalle");
                      }}
                      className={`flex w-full items-center gap-3 border p-3 text-left transition-colors ${
                        isActive
                          ? "border-blood bg-graphite"
                          : "border-graphite bg-coal hover:border-steel"
                      }`}
                    >
                      <span
                        className={`font-display flex size-11 shrink-0 items-center justify-center text-lg ${
                          isActive ? "bg-blood text-chalk" : "bg-graphite text-blood"
                        }`}
                      >
                        {client.name
                          .split(" ")
                          .map((word) => word[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{client.name}</span>
                        <span className="block text-xs text-steel">
                          {(() => {
                            const days = [
                              ...new Set(
                                client.routines
                                  .map((saved) => saved.routine.day)
                                  .filter((day): day is number => typeof day === "number")
                              ),
                            ].sort((a, b) => a - b);
                            return days.length > 0
                              ? `Entrena: ${days.map((day) => DAY_LABELS[day]).join(" · ")}`
                              : "Sin día fijo";
                          })()}
                        </span>
                      </span>
                      {client.sessionsPack &&
                        typeof client.sessionsPack.nextDay === "number" && (
                          <span
                            className="border border-blood px-2 py-1 font-display text-sm tracking-wide text-blood"
                            title={`Próxima clase juntos: ${DAY_NAMES[client.sessionsPack.nextDay]}`}
                          >
                            🤝 {DAY_LABELS[client.sessionsPack.nextDay]}
                          </span>
                        )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Columna derecha: detalle / nueva rutina / nuevo cliente.
              El div con ref permite bajar hasta aquí en móvil. */}
          <div ref={detailRef} className="min-w-0 scroll-mt-20">
          {mode === "nuevo" ? (
            <section className="border border-graphite bg-coal p-6">
              <NewClientForm onCreate={addClient} />
            </section>
          ) : selected ? (
            <section className="border border-graphite bg-coal p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl tracking-wide uppercase">
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-steel">
                    {selected.plan} · nivel {selected.level} · objetivo: {selected.goal}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 border border-graphite px-3 py-1 text-sm">
                    <span className="text-xs tracking-widest text-steel uppercase">
                      Código de acceso
                    </span>
                    <strong className="font-display text-lg tracking-widest text-blood">
                      {selected.code}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFileOpen(true)}
                  className="border border-blood px-4 py-2.5 text-xs font-semibold tracking-widest text-blood uppercase transition-colors hover:bg-blood hover:text-chalk"
                >
                  Ver ficha
                </button>
              </div>

              {/* Pack de clases personales con el coach */}
              {selected.sessionsPack && (
                <div className="mt-6 border border-graphite bg-ink p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
                        Clases con el coach
                      </p>
                      <p className="mt-1">
                        <strong className="font-display text-3xl text-blood">
                          {selected.sessionsPack.total - selected.sessionsPack.used}
                        </strong>{" "}
                        <span className="text-sm text-steel">
                          de {selected.sessionsPack.total} restantes · próxima:{" "}
                          <strong className="text-chalk">
                            {typeof selected.sessionsPack.nextDay === "number"
                              ? DAY_NAMES[selected.sessionsPack.nextDay]
                              : "por agendar"}
                          </strong>
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={selected.sessionsPack.used >= selected.sessionsPack.total}
                      onClick={() =>
                        updatePack(
                          selected.sessionsPack!.used + 1,
                          selected.sessionsPack!.nextDay
                        )
                      }
                      className="border border-blood px-3 py-2 text-xs font-semibold tracking-widest text-blood uppercase transition-colors hover:bg-blood hover:text-chalk disabled:opacity-40"
                    >
                      ✓ Clase de hoy hecha
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs text-steel">Próxima clase:</span>
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => updatePack(selected.sessionsPack!.used, i)}
                        className={`border px-2 py-1 text-xs font-semibold transition-colors ${
                          selected.sessionsPack!.nextDay === i
                            ? "border-blood bg-blood text-chalk"
                            : "border-graphite text-steel hover:border-blood"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => updatePack(selected.sessionsPack!.used, null)}
                      className={`border px-2 py-1 text-xs font-semibold transition-colors ${
                        selected.sessionsPack!.nextDay === null
                          ? "border-blood bg-blood text-chalk"
                          : "border-graphite text-steel hover:border-blood"
                      }`}
                    >
                      Por agendar
                    </button>
                  </div>
                </div>
              )}

              {/* Asistencia semanal: toca un día rayado para ver qué hizo */}
              <div id="guia-asistencia" className="mt-6 bg-coal">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
                    Asistencia de la semana
                  </h3>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="border border-graphite px-3 py-1.5 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:border-blood hover:text-blood"
                  >
                    Ver todo →
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  {selected.week.map((attended, i) => {
                    const entry = selected.history.find(
                      (historyEntry) => historyEntry.day === i
                    );
                    return (
                    <div key={i} className="flex-1 text-center">
                      <button
                        type="button"
                        disabled={!attended}
                        onClick={() => setDayLog({ dayIndex: i, log: entry ?? null })}
                        title={
                          attended
                            ? `Entrenó ${entry ? entry.routineTitle : ""} el ${DAY_NAMES[i]} — toca para ver qué hizo`
                            : "No vino"
                        }
                        aria-label={
                          attended
                            ? `Ver la rutina que hizo el ${DAY_NAMES[i]}`
                            : `${DAY_NAMES[i]}: no vino`
                        }
                        className={`relative h-14 w-full border transition-transform ${
                          attended
                            ? "hazard cursor-pointer border-blood hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(225,6,0,0.5)]"
                            : "border-graphite bg-graphite/40"
                        }`}
                      >
                        {/* Icono de la zona que entrenó ese día */}
                        {attended && entry && (
                          <span
                            className="absolute inset-0 flex items-center justify-center text-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
                            aria-hidden
                          >
                            {iconForRoutine(entry.routineTitle)}
                          </span>
                        )}
                      </button>
                      <span className="mt-1 block text-xs text-steel">{DAY_LABELS[i]}</span>
                    </div>
                    );
                  })}
                </div>
                {/* Leyenda para que se entienda de un vistazo */}
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel">
                  <span className="flex items-center gap-1.5">
                    <span className="hazard inline-block h-3 w-6 border border-blood" aria-hidden />
                    vino a entrenar · tócalo para ver qué hizo
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-6 border border-graphite bg-graphite/40" aria-hidden />
                    no vino
                  </span>
                </p>
              </div>

              {/* Crear rutina: debajo de la asistencia, junto a lo que gestiona */}
              <button
                id="guia-asignar"
                type="button"
                onClick={() => setMode(mode === "asignar" ? "detalle" : "asignar")}
                className={`mt-6 w-full px-5 py-3 font-display text-lg tracking-wider uppercase transition-colors sm:w-auto ${
                  mode === "asignar"
                    ? "border border-chalk/30 hover:border-blood hover:text-blood"
                    : "bg-blood text-chalk hover:bg-ember"
                }`}
              >
                {mode === "asignar" ? "Cancelar" : "+ Nueva rutina"}
              </button>

              {mode === "asignar" ? (
                <AssignForm
                  clientName={selected.name.split(" ")[0] ?? "tu cliente"}
                  clientSex={selected.sex}
                  clientLevel={selected.level}
                  onAssign={addRoutine}
                />
              ) : (
                <RoutinesSection
                  client={selected}
                  onRemove={removeRoutine}
                  onEdit={editRoutine}
                />
              )}
            </section>
          ) : (
            <section className="flex items-center justify-center border border-graphite bg-coal p-10 text-steel">
              Crea tu primer cliente con “+ Nuevo”.
            </section>
          )}
          </div>
        </div>
      </div>

      {/* Modal: qué rutina hizo el día tocado */}
      {dayLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Rutina del ${DAY_NAMES[dayLog.dayIndex]}`}
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
                  <p className="mt-2 text-sm text-steel">Ese día hizo:</p>
                  <p className="font-display mt-1 text-xl tracking-wide text-blood uppercase">
                    {dayLog.log.routineTitle}
                  </p>
                  <p className="mt-1 text-sm">
                    Completó{" "}
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
                  {/* Cómo se sintió el cliente al terminar */}
                  {(dayLog.log.moreWeight !== undefined ||
                    dayLog.log.comfortable !== undefined) && (
                    <div className="mt-3 space-y-1 border-t border-graphite pt-3 text-sm">
                      {dayLog.log.moreWeight !== undefined && (
                        <p>
                          {dayLog.log.moreWeight
                            ? "💪 Quiere subir el peso la próxima sesión"
                            : "✋ Prefiere mantener el peso por ahora"}
                        </p>
                      )}
                      {dayLog.log.comfortable !== undefined && (
                        <p>
                          {dayLog.log.comfortable
                            ? "😀 Se sintió cómodo con la sesión"
                            : "😮‍💨 La sesión le costó — considera ajustarla"}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-steel">
                  Vino a entrenar, pero no quedó registro de qué rutina hizo.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Horario del coach: días de trabajo y pausa con aviso */}
      {scheduleOpen && coach && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Horario del coach"
          className="tour-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setScheduleOpen(false);
          }}
        >
          <div className="tour-card w-full max-w-md border border-blood bg-coal">
            <div className="hazard h-2 w-full" aria-hidden />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-2xl tracking-wide uppercase">
                  Mi <span className="text-blood">horario</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setScheduleOpen(false)}
                  className="text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:text-blood"
                >
                  Cerrar ✕
                </button>
              </div>

              <p className="mt-3 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
                Días que estoy en el gimnasio
              </p>
              <div className="mt-2 flex gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      updateCoach({
                        ...coach,
                        workDays: coach.workDays.map((works, j) =>
                          j === i ? !works : works
                        ),
                      })
                    }
                    aria-pressed={coach.workDays[i]}
                    className={`flex-1 border py-2.5 font-display text-base transition-colors ${
                      coach.workDays[i]
                        ? "border-blood bg-blood text-chalk"
                        : "border-graphite text-steel hover:border-blood"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-steel">
                Tus clientes ven estos días en su vista.
              </p>

              {/* Pausa: avisa a todos los clientes con una alerta */}
              <div className="mt-5 border-t border-graphite pt-4">
                <button
                  type="button"
                  onClick={() => updateCoach({ ...coach, paused: !coach.paused })}
                  aria-pressed={coach.paused}
                  className={`w-full border px-4 py-3 text-left font-semibold transition-colors ${
                    coach.paused
                      ? "border-blood bg-blood text-chalk"
                      : "border-graphite hover:border-blood"
                  }`}
                >
                  {coach.paused ? "⏸ En pausa — toca para reactivar" : "⏸ Pausar mis clases"}
                  <span className={`block text-xs font-normal ${coach.paused ? "text-chalk/80" : "text-steel"}`}>
                    Tus clientes verán una pequeña alerta al entrar
                  </span>
                </button>
                {coach.paused && (
                  <input
                    value={coach.pauseMessage}
                    onChange={(event) =>
                      updateCoach({ ...coach, pauseMessage: event.target.value })
                    }
                    placeholder="Mensaje (ej: vuelvo el lunes)"
                    className="mt-2 w-full border border-graphite bg-ink px-4 py-2.5 text-chalk placeholder:text-steel/40 focus:border-chalk/50 focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial por semanas del cliente seleccionado */}
      {historyOpen && selected && (
        <WeekHistoryModal client={selected} onClose={() => setHistoryOpen(false)} />
      )}

      {/* Ficha del cliente seleccionado */}
      {fileOpen && selected && (
        <ClientFileModal
          client={selected}
          onClose={() => setFileOpen(false)}
          onUpdateWeight={updateWeight}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="rise fixed bottom-6 left-1/2 z-50 -translate-x-1/2 bg-blood px-6 py-3 font-display text-lg tracking-wider text-chalk uppercase shadow-lg"
        >
          {toast}
        </div>
      )}
    </main>
  );
}

// Todas las rutinas del cliente: cuántas veces la hizo, cuándo fue la
// última, edición directa y su historial de avances/ajustes
function RoutinesSection({
  client,
  onRemove,
  onEdit,
}: {
  client: StoredClient;
  onRemove: (routineId: string) => void;
  onEdit: (routineId: string, items: RoutineItem[], changes: string[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(
    routineForToday(client)?.id ?? client.routines[0]?.id ?? null
  );
  // Rutina cuyo modal de avances está abierto
  const [progressId, setProgressId] = useState<string | null>(null);
  // Rutina en edición y sus valores temporales
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<
    Map<string, { sets: number; reps: string; weight: string }>
  >(new Map());

  const startEditing = (savedRoutine: SavedRoutine) => {
    const next = new Map<string, { sets: number; reps: string; weight: string }>();
    savedRoutine.routine.items.forEach((item) => {
      next.set(item.exercise.id, {
        sets: item.sets,
        reps: item.reps,
        weight: item.weight ?? "",
      });
    });
    setDraft(next);
    setEditingId(savedRoutine.id);
  };

  const updateDraft = (
    id: string,
    field: "sets" | "reps" | "weight",
    value: string
  ) => {
    setDraft((prev) => {
      const current = prev.get(id);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(id, {
        ...current,
        [field]: field === "sets" ? Math.max(1, Math.min(8, Number(value) || 1)) : value,
      });
      return next;
    });
  };

  const saveEditing = (savedRoutine: SavedRoutine) => {
    const changes: string[] = [];
    const items = savedRoutine.routine.items.map((item) => {
      const values = draft.get(item.exercise.id);
      if (!values) return item;
      const weight = values.weight.trim() || undefined;
      if (weight !== item.weight) {
        changes.push(
          `Cambió el peso de ${item.exercise.name}: ${item.weight ?? "—"} → ${weight ?? "—"}`
        );
      }
      if (values.sets !== item.sets) {
        changes.push(
          `Cambió las series de ${item.exercise.name}: ${item.sets} → ${values.sets}`
        );
      }
      if (values.reps !== item.reps) {
        changes.push(
          `Cambió las reps de ${item.exercise.name}: ${item.reps} → ${values.reps}`
        );
      }
      return { ...item, sets: values.sets, reps: values.reps, weight };
    });
    onEdit(savedRoutine.id, items, changes);
    setEditingId(null);
  };

  const progressRoutine =
    client.routines.find((savedRoutine) => savedRoutine.id === progressId) ?? null;

  if (client.routines.length === 0) {
    return (
      <p id="guia-rutina" className="mt-8 border border-graphite bg-ink p-6 text-steel">
        Sin rutinas todavía. Crea la primera con “+ Nueva rutina”.
      </p>
    );
  }

  return (
    <div id="guia-rutina" className="mt-8 bg-coal">
      <h3 className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
        Sus rutinas ({client.routines.length}) · toca una para abrirla
      </h3>
      <ul className="mt-3 space-y-3">
        {client.routines.map((savedRoutine) => {
          const isOpen = savedRoutine.id === openId;
          const isEditing = savedRoutine.id === editingId;
          return (
            <li
              key={savedRoutine.id}
              className={`border ${isOpen ? "border-blood" : "border-graphite"}`}
            >
              <button
                type="button"
                onClick={() => {
                  setOpenId(isOpen ? null : savedRoutine.id);
                  if (isEditing) setEditingId(null);
                }}
                aria-expanded={isOpen}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left"
              >
                <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <span className="font-display block truncate text-xl tracking-wide uppercase">
                    <span aria-hidden>{iconForRoutine(savedRoutine.routine.title)}</span>{" "}
                    {savedRoutine.routine.title}
                  </span>
                  <span className="block text-xs text-steel">
                    Hecha {savedRoutine.timesDone}{" "}
                    {savedRoutine.timesDone === 1 ? "vez" : "veces"} · última:{" "}
                    {lastDoneLabel(savedRoutine.lastDoneDate)}
                    {savedRoutine.createdBy === "cliente" ? " · ✋ la creó el cliente" : ""}
                  </span>
                </span>
                <span
                  className={`border px-2 py-1 text-xs font-semibold tracking-widest uppercase ${
                    typeof savedRoutine.routine.day === "number"
                      ? "border-blood text-blood"
                      : "border-graphite text-steel"
                  }`}
                >
                  {typeof savedRoutine.routine.day === "number"
                    ? DAY_NAMES[savedRoutine.routine.day]
                    : "Cualquier día"}
                  {savedRoutine.routine.time ? ` · ${savedRoutine.routine.time}` : ""}
                </span>
                <span className="text-steel" aria-hidden>
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-graphite">
                  <ul className="divide-y divide-graphite">
                    {savedRoutine.routine.items.map((item, i) => {
                      const values = draft.get(item.exercise.id);
                      return (
                        <li key={item.exercise.id} className="p-3">
                          <div className="flex items-center gap-4">
                            <span className="font-display flex size-8 shrink-0 items-center justify-center border border-graphite text-sm text-steel">
                              {i + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold">
                                {item.exercise.name}
                              </span>
                              <span className="block text-xs text-steel">
                                {item.exercise.machine}
                                {!isEditing &&
                                  ` · ${item.sets}×${item.reps}${item.weight ? ` · ${item.weight}` : ""} · ${item.restSeconds}s descanso`}
                              </span>
                            </span>
                            <span className="hidden text-xs tracking-widest text-steel uppercase sm:block">
                              {item.exercise.muscle}
                            </span>
                          </div>
                          {isEditing && values && (
                            <div className="mt-2 flex flex-wrap items-end gap-3 pl-12">
                              <label className="flex flex-col gap-1 text-xs text-steel">
                                series
                                <input
                                  type="number"
                                  min={1}
                                  max={8}
                                  value={values.sets}
                                  onChange={(event) =>
                                    updateDraft(item.exercise.id, "sets", event.target.value)
                                  }
                                  className="w-16 border border-graphite bg-ink px-2 py-1.5 text-center text-chalk focus:border-chalk/50 focus:outline-none"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs text-steel">
                                reps
                                <input
                                  value={values.reps}
                                  onChange={(event) =>
                                    updateDraft(item.exercise.id, "reps", event.target.value)
                                  }
                                  className="w-20 border border-graphite bg-ink px-2 py-1.5 text-center text-chalk focus:border-chalk/50 focus:outline-none"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs text-steel">
                                peso
                                <input
                                  value={values.weight}
                                  onChange={(event) =>
                                    updateDraft(item.exercise.id, "weight", event.target.value)
                                  }
                                  placeholder="ej: 20 kg"
                                  className="w-24 border border-graphite bg-ink px-2 py-1.5 text-center text-chalk placeholder:text-steel/40 focus:border-chalk/50 focus:outline-none"
                                />
                              </label>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-graphite p-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-2 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:text-chalk"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditing(savedRoutine)}
                          className="bg-blood px-4 py-2 font-display text-base tracking-wider text-chalk uppercase transition-colors hover:bg-ember"
                        >
                          Guardar cambios ✓
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setProgressId(savedRoutine.id)}
                          className="border border-graphite px-3 py-2 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:border-blood hover:text-blood"
                        >
                          📈 Ver avances
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditing(savedRoutine)}
                          className="border border-graphite px-3 py-2 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:border-blood hover:text-blood"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(savedRoutine.id)}
                          className="px-3 py-2 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:text-blood"
                        >
                          Quitar ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Modal: avances con esta rutina */}
      {progressRoutine && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Avances con ${progressRoutine.routine.title}`}
          className="tour-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setProgressId(null);
          }}
        >
          <div className="tour-card flex max-h-[85vh] w-full max-w-md flex-col border border-blood bg-coal">
            <div className="hazard h-2 w-full shrink-0" aria-hidden />
            <div className="overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-2xl leading-tight tracking-wide uppercase">
                  Avances con{" "}
                  <span className="text-blood">{progressRoutine.routine.title}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setProgressId(null)}
                  className="text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:text-blood"
                >
                  Cerrar ✕
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="border border-graphite bg-ink p-4">
                  <p className="font-display text-3xl text-blood">
                    {progressRoutine.timesDone}
                  </p>
                  <p className="mt-1 text-xs text-steel">
                    {progressRoutine.timesDone === 1 ? "vez realizada" : "veces realizada"}
                  </p>
                </div>
                <div className="border border-graphite bg-ink p-4">
                  <p className="font-display text-2xl text-blood">
                    {lastDoneLabel(progressRoutine.lastDoneDate)}
                  </p>
                  <p className="mt-1 text-xs text-steel">última vez que la hizo</p>
                </div>
              </div>

              <p className="mt-5 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
                Historial de ajustes
              </p>
              {progressRoutine.adjustments.length === 0 ? (
                <p className="mt-2 text-sm text-steel">
                  Sin ajustes todavía: la rutina sigue tal como se creó.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {[...progressRoutine.adjustments].reverse().map((adjustment, i) => (
                    <li
                      key={i}
                      className={`border-l-2 bg-ink p-3 text-sm ${
                        adjustment.by === "coach" ? "border-blood" : "border-chalk/40"
                      }`}
                    >
                      <p>{adjustment.text}</p>
                      <p className="mt-0.5 text-xs text-steel">
                        {adjustment.by === "coach" ? "🧑‍🏫 Coach" : "🙋 Cliente"} ·{" "}
                        {formatDateLabel(adjustment.dateLabel)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignForm({
  clientName,
  clientSex,
  clientLevel,
  onAssign,
}: {
  clientName: string;
  clientSex: Sex;
  clientLevel: Level;
  onAssign: (routine: Routine) => void;
}) {
  const [tab, setTab] = useState<"auto" | "manual">("auto");
  const [group, setGroup] = useState<MuscleGroup>("full-body");
  // Día de la semana para la rutina (null = cualquier día) y hora opcional
  const [day, setDay] = useState<number | null>(null);
  const [time, setTime] = useState("");
  // Buscador y filtro del catálogo precargado (idioma del coach)
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | Exercise["movement"]>("todos");
  // Cardio de inicio (10 min) y de cierre (20 min)
  const [cardioStart, setCardioStart] = useState(false);
  const [cardioEnd, setCardioEnd] = useState(false);
  // Nombre de la rutina (se sugiere solo según el filtro elegido)
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  // Ejercicios elegidos a mano, con series, reps y peso
  const [picked, setPicked] = useState<
    Map<string, { sets: number; reps: string; weight: string }>
  >(new Map());
  const [manualError, setManualError] = useState(false);

  // El nivel viene de la ficha del cliente (se definió al crearlo)
  const config = LEVEL_CONFIG[clientLevel];

  const FILTER_OPTIONS: { value: "todos" | Exercise["movement"]; label: string }[] = [
    { value: "todos", label: "Todos" },
    ...MOVEMENT_OPTIONS,
  ];

  const normalize = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Catálogo filtrado por zona y por lo que se escriba en el buscador
  const catalog = EXERCISES.filter((exercise) => {
    if (filter !== "todos" && exercise.movement !== filter) return false;
    if (!query.trim()) return true;
    const q = normalize(query);
    return (
      normalize(exercise.name).includes(q) ||
      normalize(exercise.machine).includes(q) ||
      normalize(exercise.muscle).includes(q)
    );
  });

  const pickFilter = (value: "todos" | Exercise["movement"], label: string) => {
    setFilter(value);
    // Sugiere el nombre de la rutina según la categoría ("Agarre", "Empuje"…)
    if (!nameTouched) setName(value === "todos" ? "" : label);
  };

  const togglePick = (exercise: Exercise) => {
    setManualError(false);
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(exercise.id)) {
        next.delete(exercise.id);
      } else {
        next.set(exercise.id, { sets: config.sets, reps: config.reps, weight: "" });
      }
      return next;
    });
  };

  const updatePick = (
    id: string,
    field: "sets" | "reps" | "weight",
    value: string
  ) => {
    setPicked((prev) => {
      const current = prev.get(id);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(id, {
        ...current,
        [field]: field === "sets" ? Math.max(1, Math.min(8, Number(value) || 1)) : value,
      });
      return next;
    });
  };

  // Agrega los bloques de cardio recomendados por el coach.
  // Cada bloque lleva su propio id: así marcar uno no marca el otro.
  const wrapWithCardio = (routine: Routine): Routine => {
    const cardio = cardioExercise();
    const items = [
      ...(cardioStart
        ? [{
            exercise: { ...cardio, id: "cardio-inicio", name: "Cardio para comenzar" },
            sets: 1,
            reps: "10 min",
            restSeconds: 0,
          }]
        : []),
      ...routine.items,
      ...(cardioEnd
        ? [{
            exercise: { ...cardio, id: "cardio-final", name: "Cardio para finalizar" },
            sets: 1,
            reps: "20 min",
            restSeconds: 0,
          }]
        : []),
    ];
    const extraMinutes = (cardioStart ? 10 : 0) + (cardioEnd ? 20 : 0);
    return {
      ...routine,
      items,
      durationMinutes: routine.durationMinutes + extraMinutes,
    };
  };

  const submit = () => {
    if (tab === "auto") {
      onAssign(
        wrapWithCardio({
          ...buildRoutine(group, clientLevel, clientSex),
          day,
          time: time || null,
        })
      );
      return;
    }
    // Rutina armada a mano por el coach
    const chosen = EXERCISES.filter((exercise) => picked.has(exercise.id));
    if (chosen.length === 0) {
      setManualError(true);
      return;
    }
    const items = chosen.map((exercise) => {
      const pick = picked.get(exercise.id);
      return {
        exercise,
        sets: pick?.sets ?? config.sets,
        reps: pick?.reps ?? config.reps,
        weight: pick?.weight?.trim() ? pick.weight.trim() : undefined,
        restSeconds: config.rest,
      };
    });
    const durationMinutes = Math.round(
      items.reduce(
        (minutes, item) => minutes + item.sets * (0.75 + item.restSeconds / 60),
        8
      )
    );
    const routineName = name.trim() || "Rutina del coach";
    onAssign(
      wrapWithCardio({
        title: `Rutina · ${routineName}`,
        subtitle: `Armada por tu coach · ${items.length} ejercicios · descansos de ${config.rest}s`,
        durationMinutes,
        items,
        day,
        time: time || null,
      })
    );
  };

  const chip = (isActive: boolean) =>
    `border px-4 py-2 text-sm font-semibold transition-colors ${
      isActive ? "border-blood bg-blood text-chalk" : "border-graphite hover:border-blood"
    }`;

  const smallChip = (isActive: boolean) =>
    `border px-3 py-1.5 text-xs font-semibold transition-colors ${
      isActive ? "border-blood bg-blood text-chalk" : "border-graphite hover:border-blood"
    }`;

  return (
    <div className="rise mt-8 border border-blood bg-graphite/60 p-5">
      <h3 className="font-display text-xl tracking-wide uppercase">
        Nueva rutina para {clientName}
      </h3>
      <p className="mt-1 text-sm text-steel">
        Se agrega a su lista de rutinas (nivel {clientLevel}, según su ficha).
        La verá apenas entre con su código.
      </p>

      {/* Cómo quieres crearla */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab("auto")}
          className={`border px-3 py-3 text-left transition-colors ${
            tab === "auto" ? "border-blood bg-coal" : "border-graphite hover:border-steel"
          }`}
        >
          <span className={`font-display block text-lg uppercase ${tab === "auto" ? "text-blood" : ""}`}>
            ⚡ Automática
          </span>
          <span className="block text-xs text-steel">
            Eliges la zona, la app la arma
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`border px-3 py-3 text-left transition-colors ${
            tab === "manual" ? "border-blood bg-coal" : "border-graphite hover:border-steel"
          }`}
        >
          <span className={`font-display block text-lg uppercase ${tab === "manual" ? "text-blood" : ""}`}>
            ✏️ La armo yo
          </span>
          <span className="block text-xs text-steel">
            Buscas ejercicios; series, reps y peso
          </span>
        </button>
      </div>

      {/* Día de la rutina: uno fijo o cualquiera */}
      <p className="mt-5 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
        ¿Qué día le toca esta rutina?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => setDay(null)} className={smallChip(day === null)}>
          Cualquier día
        </button>
        {DAY_NAMES.map((dayName, i) => (
          <button key={dayName} type="button" onClick={() => setDay(i)} className={smallChip(day === i)} title={dayName}>
            {DAY_LABELS[i]}
          </button>
        ))}
        <label className="ml-1 flex items-center gap-2 text-xs text-steel">
          hora
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="border border-graphite bg-ink px-2 py-1.5 text-chalk focus:border-chalk/50 focus:outline-none [color-scheme:dark]"
          />
        </label>
      </div>

      {/* Cardio recomendado por el coach: 10 min al comenzar, 20 al final */}
      <p className="mt-5 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
        Cardio recomendado
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setCardioStart(!cardioStart)}
          aria-pressed={cardioStart}
          className={`border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
            cardioStart
              ? "border-blood bg-blood text-chalk"
              : "border-graphite hover:border-blood"
          }`}
        >
          🏃 10 min para comenzar
          <span className={`block text-xs font-normal ${cardioStart ? "text-chalk/80" : "text-steel"}`}>
            Calienta antes de las máquinas
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCardioEnd(!cardioEnd)}
          aria-pressed={cardioEnd}
          className={`border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
            cardioEnd
              ? "border-blood bg-blood text-chalk"
              : "border-graphite hover:border-blood"
          }`}
        >
          🏃 20 min para finalizar
          <span className={`block text-xs font-normal ${cardioEnd ? "text-chalk/80" : "text-steel"}`}>
            Quema extra al cierre
          </span>
        </button>
      </div>

      {tab === "auto" ? (
        <>
          <p className="mt-5 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
            Zona a trabajar
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {GROUP_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setGroup(option.value)}
                className={chip(group === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Nombre de la rutina (se sugiere según el filtro) */}
          <label
            htmlFor="nombre-rutina"
            className="mt-5 block text-xs font-semibold tracking-[0.3em] text-steel uppercase"
          >
            Nombre de la rutina
          </label>
          <input
            id="nombre-rutina"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameTouched(true);
            }}
            placeholder="Ej: Pierna"
            className="mt-2 w-full border border-graphite bg-ink px-4 py-2.5 text-chalk placeholder:text-steel/50 focus:border-chalk/50 focus:outline-none"
          />

          {/* Catálogo precargado: filtro por zona + buscador */}
          <p className="mt-4 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
            Filtra: pierna · empuje · agarre · abdomen
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => pickFilter(option.value, option.label)}
                className={smallChip(filter === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="🔍 Busca: prensa, mancuernas, glúteo…"
            aria-label="Buscar ejercicio"
            className="mt-3 w-full border border-graphite bg-ink px-4 py-2.5 text-chalk placeholder:text-steel/50 focus:border-chalk/50 focus:outline-none"
          />

          <p className="mt-3 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
            Elige los ejercicios ({picked.size} en la rutina)
          </p>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto border border-graphite bg-ink p-2">
            {catalog.length === 0 && (
              <p className="p-3 text-sm text-steel">
                Nada con esa búsqueda. Prueba con otra palabra.
              </p>
            )}
            {catalog.map((exercise) => {
              const isPicked = picked.has(exercise.id);
              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => togglePick(exercise)}
                  className={`flex w-full items-center gap-3 border p-2 text-left text-sm transition-colors ${
                    isPicked
                      ? "border-blood bg-coal"
                      : "border-transparent hover:border-graphite"
                  }`}
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center border text-xs ${
                      isPicked ? "border-blood bg-blood text-chalk" : "border-graphite"
                    }`}
                    aria-hidden
                  >
                    {isPicked ? "✓" : "+"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{exercise.name}</span>
                    <span className="block truncate text-xs text-steel">
                      {exercise.machine} · {exercise.muscle}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase ${
                      exercise.equipment === "pesas"
                        ? "border-blood/60 text-blood"
                        : "border-graphite text-steel"
                    }`}
                  >
                    {exercise.equipment === "pesas"
                      ? "Pesas"
                      : exercise.equipment === "cuerpo"
                        ? "Cuerpo"
                        : "Máquina"}
                  </span>
                </button>
              );
            })}
          </div>

          {picked.size > 0 && (
            <>
              <p className="mt-4 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
                Series, repeticiones y peso
              </p>
              <ul className="mt-2 space-y-2">
                {EXERCISES.filter((exercise) => picked.has(exercise.id)).map(
                  (exercise) => {
                    const pick = picked.get(exercise.id);
                    if (!pick) return null;
                    return (
                      <li
                        key={exercise.id}
                        className="border-l-2 border-blood bg-ink p-3"
                      >
                        {/* Nombre arriba, controles abajo: claro también en móvil */}
                        <p className="font-semibold">{exercise.name}</p>
                        <div className="mt-2 flex flex-wrap items-end gap-3">
                          <label className="flex flex-col gap-1 text-xs text-steel">
                            series
                            <input
                              type="number"
                              min={1}
                              max={8}
                              value={pick.sets}
                              onChange={(event) =>
                                updatePick(exercise.id, "sets", event.target.value)
                              }
                              className="w-16 border border-graphite bg-coal px-2 py-1.5 text-center text-chalk focus:border-chalk/50 focus:outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-steel">
                            reps
                            <input
                              value={pick.reps}
                              onChange={(event) =>
                                updatePick(exercise.id, "reps", event.target.value)
                              }
                              className="w-20 border border-graphite bg-coal px-2 py-1.5 text-center text-chalk focus:border-chalk/50 focus:outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-steel">
                            peso (opcional)
                            <input
                              value={pick.weight}
                              onChange={(event) =>
                                updatePick(exercise.id, "weight", event.target.value)
                              }
                              placeholder="ej: 20 kg"
                              className="w-24 border border-graphite bg-coal px-2 py-1.5 text-center text-chalk placeholder:text-steel/40 focus:border-chalk/50 focus:outline-none"
                            />
                          </label>
                        </div>
                      </li>
                    );
                  }
                )}
              </ul>
            </>
          )}

          {manualError && (
            <p className="mt-3 text-sm font-semibold text-blood">
              Elige al menos un ejercicio de la lista.
            </p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={submit}
        className="mt-6 bg-blood px-6 py-3 font-display text-lg tracking-wider text-chalk uppercase transition-colors hover:bg-ember"
      >
        Agregar esta rutina →
      </button>
    </div>
  );
}

function NewClientForm({
  onCreate,
}: {
  onCreate: (data: {
    name: string;
    goal: string;
    sex: Sex;
    level: Level;
    plan: StoredClient["plan"];
    group: MuscleGroup;
    heightCm?: number;
    weightKg?: number;
    customCode?: string;
    packTotal?: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [packTotal, setPackTotal] = useState("");
  const [sex, setSex] = useState<Sex>("mujer");
  const [level, setLevel] = useState<Level>("principiante");
  const [plan, setPlan] = useState<StoredClient["plan"]>("Mensual");
  const [group, setGroup] = useState<MuscleGroup>("full-body");
  const [error, setError] = useState(false);

  const chip = (isActive: boolean) =>
    `border px-4 py-2 text-sm font-semibold transition-colors ${
      isActive
        ? "border-blood bg-blood text-chalk"
        : "border-graphite hover:border-blood"
    }`;

  return (
    <div>
      <h2 className="font-display text-3xl tracking-wide uppercase">
        Nuevo <span className="text-blood">cliente</span>
      </h2>
      <p className="mt-1 text-sm text-steel">
        Esta es su ficha: el nivel se define una sola vez aquí. Al crearlo se
        genera su código de acceso — dáselo y ya puede entrar desde el celular.
      </p>

      <label
        htmlFor="nombre"
        className="mt-6 block text-xs font-semibold tracking-[0.3em] text-steel uppercase"
      >
        Nombre
      </label>
      <input
        id="nombre"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setError(false);
        }}
        placeholder="Nombre y apellido"
        className={`mt-2 w-full border bg-ink px-4 py-3 text-chalk placeholder:text-steel/50 focus:outline-none ${
          error ? "border-blood" : "border-graphite focus:border-chalk/50"
        }`}
      />
      {error && (
        <p className="mt-1 text-sm font-semibold text-blood">Ponle un nombre.</p>
      )}

      <label
        htmlFor="objetivo"
        className="mt-4 block text-xs font-semibold tracking-[0.3em] text-steel uppercase"
      >
        Objetivo
      </label>
      <input
        id="objetivo"
        value={goal}
        onChange={(event) => setGoal(event.target.value)}
        placeholder="Ej: bajar de peso, ganar músculo…"
        className="mt-2 w-full border border-graphite bg-ink px-4 py-3 text-chalk placeholder:text-steel/50 focus:border-chalk/50 focus:outline-none"
      />

      {/* Código elegible: apodo o lo que el cliente quiera */}
      <label
        htmlFor="codigo-acceso"
        className="mt-4 block text-xs font-semibold tracking-[0.3em] text-steel uppercase"
      >
        Código de acceso (opcional)
      </label>
      <input
        id="codigo-acceso"
        value={customCode}
        onChange={(event) => setCustomCode(event.target.value.toUpperCase())}
        placeholder="Ej: su apodo — si lo dejas vacío, se genera solo"
        className="mt-2 w-full border border-graphite bg-ink px-4 py-3 font-display text-xl tracking-widest text-chalk uppercase placeholder:font-body placeholder:text-sm placeholder:tracking-normal placeholder:text-steel/50 focus:border-chalk/50 focus:outline-none"
      />

      {/* Ficha física: siempre opcional */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
          Altura (opcional)
          <input
            inputMode="numeric"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            placeholder="ej: 172 cm"
            className="border border-graphite bg-ink px-3 py-2.5 font-normal tracking-normal text-chalk normal-case placeholder:text-steel/40 focus:border-chalk/50 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
          Peso (opcional)
          <input
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder="ej: 74.5 kg"
            className="border border-graphite bg-ink px-3 py-2.5 font-normal tracking-normal text-chalk normal-case placeholder:text-steel/40 focus:border-chalk/50 focus:outline-none"
          />
        </label>
      </div>

      <p className="mt-4 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
        Entrena como
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => setSex("mujer")} className={chip(sex === "mujer")}>
          Mujer
        </button>
        <button type="button" onClick={() => setSex("hombre")} className={chip(sex === "hombre")}>
          Hombre
        </button>
      </div>

      <p className="mt-4 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
        Nivel (se pregunta una sola vez)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LEVEL_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setLevel(option.value)}
            className={chip(level === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label
        htmlFor="pack-clases"
        className="mt-4 block text-xs font-semibold tracking-[0.3em] text-steel uppercase"
      >
        Clases personales contratadas (opcional)
      </label>
      <input
        id="pack-clases"
        type="number"
        min={0}
        max={50}
        value={packTotal}
        onChange={(event) => setPackTotal(event.target.value)}
        placeholder="Ej: 4 (si pagó un pack de clases contigo)"
        className="mt-2 w-full border border-graphite bg-ink px-4 py-3 text-chalk placeholder:text-steel/50 focus:border-chalk/50 focus:outline-none"
      />

      <p className="mt-4 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
        Plan
      </p>
      <div className="mt-2 flex gap-2">
        {(["Mensual", "Coaching PRO"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPlan(option)}
            className={chip(plan === option)}
          >
            {option}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
        Primera rutina
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {GROUP_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setGroup(option.value)}
            className={chip(group === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!name.trim()) {
            setError(true);
            return;
          }
          onCreate({
            name,
            goal,
            sex,
            level,
            plan,
            group,
            heightCm: Number(height.replace(/[^0-9.]/g, "")) || undefined,
            weightKg: Number(weight.replace(/[^0-9.,]/g, "").replace(",", ".")) || undefined,
            customCode: customCode || undefined,
            packTotal: Number(packTotal) || undefined,
          });
        }}
        className="mt-6 bg-blood px-6 py-3 font-display text-lg tracking-wider text-chalk uppercase transition-colors hover:bg-ember"
      >
        Crear cliente →
      </button>
    </div>
  );
}
