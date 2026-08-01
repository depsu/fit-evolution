"use client";

import { useState } from "react";
import {
  EXERCISES,
  LEVEL_CONFIG,
  type Exercise,
  type Level,
  type RoutineItem,
} from "@/lib/routine";
import { useEscape } from "@/lib/use-escape";

// Editor de rutina (lo usan cliente y coach): cambiar series/reps/peso,
// quitar ejercicios y agregar el que faltó. Devuelve los cambios en
// texto para dejarlos anotados en el historial de ajustes.
export function EditRoutineModal({
  title,
  items,
  level,
  onSave,
  onClose,
}: {
  title: string;
  items: RoutineItem[];
  level: Level;
  onSave: (items: RoutineItem[], changes: string[]) => void;
  onClose: () => void;
}) {
  const config = LEVEL_CONFIG[level];
  const [rows, setRows] = useState<RoutineItem[]>([...items]);
  const [values, setValues] = useState<
    Map<string, { sets: number; reps: string; weight: string }>
  >(
    new Map(
      items.map((item) => [
        item.exercise.id,
        { sets: item.sets, reps: item.reps, weight: item.weight ?? "" },
      ])
    )
  );
  const [query, setQuery] = useState("");
  useEscape(true, onClose);

  const update = (id: string, field: "sets" | "reps" | "weight", value: string) => {
    setValues((prev) => {
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

  const remove = (id: string) => {
    setRows((prev) => prev.filter((item) => item.exercise.id !== id));
  };

  const add = (exercise: Exercise) => {
    setRows((prev) => [
      ...prev,
      { exercise, sets: config.sets, reps: config.reps, restSeconds: config.rest },
    ]);
    setValues((prev) => {
      const next = new Map(prev);
      next.set(exercise.id, { sets: config.sets, reps: config.reps, weight: "" });
      return next;
    });
    setQuery("");
  };

  const candidates = EXERCISES.filter(
    (exercise) =>
      !rows.some((item) => item.exercise.id === exercise.id) &&
      (!query.trim() ||
        `${exercise.name} ${exercise.machine} ${exercise.muscle}`
          .toLowerCase()
          .includes(query.toLowerCase()))
  ).slice(0, 6);

  const save = () => {
    if (rows.length === 0) return;
    const changes: string[] = [];
    rows.forEach((item) => {
      if (!items.some((original) => original.exercise.id === item.exercise.id)) {
        changes.push(`Agregó ${item.exercise.name}`);
      }
    });
    items.forEach((original) => {
      if (!rows.some((item) => item.exercise.id === original.exercise.id)) {
        changes.push(`Quitó ${original.exercise.name}`);
      }
    });
    const nextItems = rows.map((item) => {
      const value = values.get(item.exercise.id);
      if (!value) return item;
      const weight = value.weight.trim() || undefined;
      const original = items.find(
        (candidate) => candidate.exercise.id === item.exercise.id
      );
      if (original) {
        if (weight !== original.weight) {
          changes.push(
            `Cambió el peso de ${item.exercise.name}: ${original.weight ?? "—"} → ${weight ?? "—"}`
          );
        }
        if (value.sets !== original.sets) {
          changes.push(
            `Cambió las series de ${item.exercise.name}: ${original.sets} → ${value.sets}`
          );
        }
        if (value.reps !== original.reps) {
          changes.push(
            `Cambió las reps de ${item.exercise.name}: ${original.reps} → ${value.reps}`
          );
        }
      }
      return { ...item, sets: value.sets, reps: value.reps, weight };
    });
    onSave(nextItems, changes);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Editar ${title}`}
      className="tour-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="tour-card flex max-h-[88vh] w-full max-w-md flex-col border border-blood bg-coal">
        <div className="hazard h-2 w-full shrink-0" aria-hidden />
        <div className="overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-xl leading-tight tracking-wide uppercase">
              Editar <span className="text-blood">{title}</span>
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

          <ul className="mt-4 space-y-3">
            {rows.map((item) => {
              const value = values.get(item.exercise.id);
              if (!value) return null;
              return (
                <li key={item.exercise.id} className="border-l-2 border-blood bg-ink p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate font-semibold">
                      {item.exercise.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(item.exercise.id)}
                      className="shrink-0 text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:text-blood"
                      aria-label={`Quitar ${item.exercise.name}`}
                    >
                      Quitar ✕
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs text-steel">
                      series
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={value.sets}
                        onChange={(event) => update(item.exercise.id, "sets", event.target.value)}
                        className="w-16 border border-graphite bg-coal px-2 py-1.5 text-center text-chalk focus:border-chalk/50 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-steel">
                      reps
                      <input
                        value={value.reps}
                        onChange={(event) => update(item.exercise.id, "reps", event.target.value)}
                        className="w-20 border border-graphite bg-coal px-2 py-1.5 text-center text-chalk focus:border-chalk/50 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-steel">
                      peso
                      <input
                        value={value.weight}
                        onChange={(event) => update(item.exercise.id, "weight", event.target.value)}
                        placeholder="ej: 20 kg"
                        className="w-24 border border-graphite bg-coal px-2 py-1.5 text-center text-chalk placeholder:text-steel/40 focus:border-chalk/50 focus:outline-none"
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Agregar el que faltó */}
          <div className="mt-4 border border-graphite bg-ink p-3">
            <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
              ＋ Agregar ejercicio
            </p>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="🔍 Busca el que faltó: prensa, curl…"
              aria-label="Buscar ejercicio para agregar"
              className="mt-2 w-full border border-graphite bg-coal px-3 py-2 text-sm text-chalk placeholder:text-steel/50 focus:border-chalk/50 focus:outline-none"
            />
            <div className="mt-2 grid gap-1">
              {candidates.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => add(exercise)}
                  className="flex items-center gap-3 border border-transparent p-2 text-left text-sm transition-colors hover:border-graphite"
                >
                  <span
                    className="flex size-5 shrink-0 items-center justify-center border border-blood text-xs text-blood"
                    aria-hidden
                  >
                    +
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{exercise.name}</span>
                    <span className="block truncate text-xs text-steel">
                      {exercise.machine} · {exercise.muscle}
                    </span>
                  </span>
                </button>
              ))}
              {candidates.length === 0 && (
                <p className="p-2 text-xs text-steel">
                  Nada con esa búsqueda (o ya están todos en la rutina).
                </p>
              )}
            </div>
          </div>

          {rows.length === 0 && (
            <p className="mt-3 text-sm font-semibold text-blood" role="alert">
              La rutina no puede quedar sin ejercicios.
            </p>
          )}

          <button
            type="button"
            disabled={rows.length === 0}
            onClick={save}
            className="mt-4 w-full bg-blood py-3 font-display text-lg tracking-wider text-chalk uppercase transition-colors hover:bg-ember disabled:opacity-40"
          >
            Guardar cambios ✓
          </button>
        </div>
      </div>
    </div>
  );
}
