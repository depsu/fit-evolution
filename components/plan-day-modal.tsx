"use client";

import { useState } from "react";
import {
  DAY_NAMES,
  EXERCISES,
  iconForRoutine,
  LEVEL_CONFIG,
  MOVEMENT_OPTIONS,
  type Exercise,
  type Routine,
} from "@/lib/routine";
import type { StoredClient } from "@/lib/store";
import { useEscape } from "@/lib/use-escape";

// Planificar un día: el cliente elige una rutina existente (del coach o
// suya) o arma la suya propia con el catálogo, y puede ponerle hora.
export function PlanDayModal({
  client,
  dayIndex,
  mode = "planificar",
  onClose,
  onPlanExisting,
  onCreateOwn,
}: {
  client: StoredClient;
  dayIndex: number;
  // "planificar" = día de hoy o futuro; "registrar" = día pasado que
  // entrenaste pero no quedó marcado
  mode?: "planificar" | "registrar";
  onClose: () => void;
  // Asigna una rutina que ya existe a este día (con hora opcional)
  onPlanExisting: (routineId: string, time: string | null) => void;
  // Crea una rutina propia del cliente ya planificada para este día
  onCreateOwn: (routine: Routine) => void;
}) {
  const registering = mode === "registrar";
  const [step, setStep] = useState<"elegir" | "crear">("elegir");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [time, setTime] = useState("");
  // Armador propio
  const [name, setName] = useState("");
  const [filter, setFilter] = useState<"todos" | Exercise["movement"]>("todos");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEscape(true, onClose);

  // Series/reps según el nivel de su ficha
  const config = LEVEL_CONFIG[client.level];

  const normalize = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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

  const togglePick = (id: string) => {
    setError(null);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submit = () => {
    if (step === "elegir") {
      if (!selectedId) {
        setError(
          registering
            ? "Elige la rutina que hiciste ese día."
            : "Elige una de tus rutinas, o crea una propia."
        );
        return;
      }
      onPlanExisting(selectedId, time || null);
      return;
    }
    // Rutina propia
    const chosen = EXERCISES.filter((exercise) => picked.has(exercise.id));
    if (chosen.length === 0) {
      setError("Elige al menos un ejercicio.");
      return;
    }
    const items = chosen.map((exercise) => ({
      exercise,
      sets: config.sets,
      reps: config.reps,
      restSeconds: config.rest,
    }));
    const durationMinutes = Math.round(
      items.reduce(
        (minutes, item) => minutes + item.sets * (0.75 + item.restSeconds / 60),
        8
      )
    );
    onCreateOwn({
      title: `Rutina · ${name.trim() || "Mi rutina"}`,
      subtitle: `Creada por ti · ${items.length} ejercicios · descansos de ${config.rest}s`,
      durationMinutes,
      items,
      day: dayIndex,
      time: time || null,
    });
  };

  const smallChip = (isActive: boolean) =>
    `border px-3 py-1.5 text-xs font-semibold transition-colors ${
      isActive ? "border-blood bg-blood text-chalk" : "border-graphite hover:border-blood"
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Planificar el ${DAY_NAMES[dayIndex]}`}
      className="tour-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="tour-card flex max-h-[88vh] w-full max-w-md flex-col border border-blood bg-coal">
        <div className="hazard h-2 w-full shrink-0" aria-hidden />
        <div className="overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-2xl leading-tight tracking-wide uppercase">
              {registering ? "Registrar el" : "Planificar el"}{" "}
              <span className="text-blood">{DAY_NAMES[dayIndex]}</span>
            </h3>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:text-blood"
            >
              Cerrar ✕
            </button>
          </div>

          {registering && (
            <p className="mt-3 border-l-2 border-blood bg-ink px-3 py-2 text-sm text-steel">
              ¿Entrenaste ese día y no quedó marcado? Elige qué rutina hiciste
              y la dejamos en tu historial.
            </p>
          )}

          {/* Elegir o crear (solo al planificar) */}
          {!registering && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("elegir");
                setError(null);
              }}
              className={`border px-3 py-3 text-left transition-colors ${
                step === "elegir" ? "border-blood bg-ink" : "border-graphite hover:border-steel"
              }`}
            >
              <span className={`font-display block text-lg uppercase ${step === "elegir" ? "text-blood" : ""}`}>
                📋 Una existente
              </span>
              <span className="block text-xs text-steel">Del coach o tuya</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("crear");
                setError(null);
              }}
              className={`border px-3 py-3 text-left transition-colors ${
                step === "crear" ? "border-blood bg-ink" : "border-graphite hover:border-steel"
              }`}
            >
              <span className={`font-display block text-lg uppercase ${step === "crear" ? "text-blood" : ""}`}>
                ✏️ Crear la mía
              </span>
              <span className="block text-xs text-steel">Elige tus ejercicios</span>
            </button>
          </div>
          )}

          {/* Hora (opcional): para los recordatorios; no aplica al registrar */}
          {!registering && (
          <label className="mt-4 flex items-center justify-between gap-3 border border-graphite bg-ink p-3 text-sm">
            <span>
              ⏰ ¿A qué hora vas?{" "}
              <span className="block text-xs text-steel">
                Opcional — con recordatorios activos te avisamos 30 min antes
              </span>
            </span>
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="border border-graphite bg-coal px-3 py-2 text-chalk focus:border-chalk/50 focus:outline-none [color-scheme:dark]"
            />
          </label>
          )}

          {step === "elegir" ? (
            <div className="mt-4 space-y-2">
              {client.routines.map((saved) => {
                const isSelected = saved.id === selectedId;
                return (
                  <button
                    key={saved.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(saved.id);
                      setError(null);
                    }}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-3 border p-3 text-left transition-colors ${
                      isSelected ? "border-blood bg-ink" : "border-graphite hover:border-steel"
                    }`}
                  >
                    <span aria-hidden>{iconForRoutine(saved.routine.title)}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`font-display block truncate text-base uppercase ${isSelected ? "text-blood" : ""}`}>
                        {saved.routine.title.replace(/^Rutina( express)? · /, "")}
                      </span>
                      <span className="block text-xs text-steel">
                        {saved.createdBy === "cliente" ? "Tuya" : "De tu coach"} ·{" "}
                        {saved.routine.items.length} ejercicios
                      </span>
                    </span>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center border text-xs ${
                        isSelected ? "border-blood bg-blood text-chalk" : "border-graphite"
                      }`}
                      aria-hidden
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombre de tu rutina (ej: Mi día de pierna)"
                aria-label="Nombre de tu rutina"
                className="w-full border border-graphite bg-ink px-4 py-2.5 text-chalk placeholder:text-steel/50 focus:border-chalk/50 focus:outline-none"
              />

              {/* Filtro en idioma del gym + buscador */}
              <div className="mt-3 flex flex-wrap gap-2">
                {[{ value: "todos" as const, label: "Todos" }, ...MOVEMENT_OPTIONS].map(
                  (option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilter(option.value)}
                      className={smallChip(filter === option.value)}
                    >
                      {option.label}
                    </button>
                  )
                )}
              </div>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="🔍 Busca: prensa, mancuernas…"
                aria-label="Buscar ejercicio"
                className="mt-2 w-full border border-graphite bg-ink px-4 py-2.5 text-chalk placeholder:text-steel/50 focus:border-chalk/50 focus:outline-none"
              />

              <p className="mt-3 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
                Elige ejercicios ({picked.size})
              </p>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto border border-graphite bg-ink p-2">
                {catalog.length === 0 && (
                  <p className="p-3 text-sm text-steel">Nada con esa búsqueda.</p>
                )}
                {catalog.map((exercise) => {
                  const isPicked = picked.has(exercise.id);
                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => togglePick(exercise.id)}
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
                          {exercise.machine}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-steel">
                Series y reps se ajustan solas a tu nivel ({client.level}:{" "}
                {config.sets}×{config.reps}). Tu coach puede afinarla después.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm font-semibold text-blood" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            className="mt-5 w-full bg-blood py-3 font-display text-lg tracking-wider text-chalk uppercase transition-colors hover:bg-ember"
          >
            {registering
              ? "Sí, hice esta rutina ✓"
              : step === "elegir"
                ? `Dejarla para el ${DAY_NAMES[dayIndex]} →`
                : `Crear y planificar →`}
          </button>
        </div>
      </div>
    </div>
  );
}
