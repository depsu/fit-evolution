"use client";

import { useMemo, useState } from "react";
import { useEscape } from "@/lib/use-escape";
import type { StoredClient } from "@/lib/store";

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

// Historial por semanas: navega entre semanas y ve mini-estadísticas.
// Se usa igual en la vista del cliente y en el panel del coach.
export function WeekHistoryModal({
  client,
  onClose,
}: {
  client: StoredClient;
  onClose: () => void;
}) {
  // Todas las semanas: pasadas + la actual al final
  const weeks = useMemo(
    () => [...client.pastWeeks, client.week],
    [client.pastWeeks, client.week]
  );
  const [index, setIndex] = useState(weeks.length - 1);
  useEscape(true, onClose);

  const week = weeks[index] ?? [];
  const isCurrent = index === weeks.length - 1;
  const trained = week.filter(Boolean).length;
  // Estadísticas extra solo de la semana actual (es la que tiene registro detallado)
  const exercisesDone = isCurrent
    ? client.history.reduce((sum, entry) => sum + entry.completed, 0)
    : null;

  const weekLabel = isCurrent
    ? "Esta semana"
    : `Hace ${weeks.length - 1 - index} semana${weeks.length - 1 - index > 1 ? "s" : ""}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Historial de entrenamiento"
      className="tour-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="tour-card w-full max-w-md border border-blood bg-coal">
        <div className="hazard h-2 w-full" aria-hidden />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-2xl tracking-wide uppercase">
              Historial de <span className="text-blood">{client.name.split(" ")[0]}</span>
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

          {/* Navegación entre semanas */}
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              aria-label="Semana anterior"
              className="border border-graphite px-3 py-2 font-display text-lg text-steel transition-colors hover:border-blood hover:text-blood disabled:opacity-30"
            >
              ←
            </button>
            <p className="font-display text-xl tracking-wide uppercase">{weekLabel}</p>
            <button
              type="button"
              disabled={isCurrent}
              onClick={() => setIndex(index + 1)}
              aria-label="Semana siguiente"
              className="border border-graphite px-3 py-2 font-display text-lg text-steel transition-colors hover:border-blood hover:text-blood disabled:opacity-30"
            >
              →
            </button>
          </div>

          {/* La semana elegida */}
          <div className="mt-4 flex gap-2">
            {week.map((attended, i) => (
              <div key={i} className="flex-1 text-center">
                <div
                  className={`h-10 border ${
                    attended ? "hazard border-blood" : "border-graphite bg-graphite/40"
                  }`}
                  title={attended ? "Entrenó" : "Sin entrenar"}
                />
                <span className="mt-1 block text-xs text-steel">{DAY_LABELS[i]}</span>
              </div>
            ))}
          </div>

          {/* Mini estadísticas de esa semana */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="border border-graphite bg-ink p-4">
              <p className="font-display text-3xl text-blood">{trained}/7</p>
              <p className="mt-1 text-xs text-steel">días entrenados</p>
            </div>
            <div className="border border-graphite bg-ink p-4">
              {exercisesDone !== null ? (
                <>
                  <p className="font-display text-3xl text-blood">{exercisesDone}</p>
                  <p className="mt-1 text-xs text-steel">ejercicios completados</p>
                </>
              ) : (
                <>
                  <p className="font-display text-3xl text-blood">
                    {Math.round((trained / 7) * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-steel">constancia esa semana</p>
                </>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-steel">
            Usa las flechas para moverte entre semanas.
          </p>
        </div>
      </div>
    </div>
  );
}
