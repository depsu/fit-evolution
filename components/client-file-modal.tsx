"use client";

import { useState } from "react";
import { formatDateLabel, type StoredClient } from "@/lib/store";
import { useEscape } from "@/lib/use-escape";

// Ficha del cliente: sus datos, y el peso se puede tocar para ver el
// histórico y actualizarlo (se guarda con el día). Se usa igual en la
// vista del cliente y en el panel del coach.
export function ClientFileModal({
  client,
  onClose,
  onUpdateWeight,
}: {
  client: StoredClient;
  onClose: () => void;
  // Guarda el peso nuevo; queda en el historial con la fecha de hoy
  onUpdateWeight: (weightKg: number) => void;
}) {
  // El historial y el editor de peso solo se abren si se toca "peso"
  const [weightOpen, setWeightOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  useEscape(true, onClose);

  // Link directo para entrar con su código (para compartir o QR).
  // Incluye la ruta base cuando el sitio vive en GitHub Pages.
  const accessLink =
    typeof window !== "undefined"
      ? `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/entrar?code=${client.code}`
      : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(accessLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin permiso de portapapeles: el link queda visible para copiar a mano
    }
  };

  const saveWeight = () => {
    const parsed = Number(newWeight.replace(",", "."));
    if (!parsed || parsed < 20 || parsed > 300) {
      setError(true);
      return;
    }
    onUpdateWeight(parsed);
    setNewWeight("");
    setError(false);
  };

  const firstWeight = client.weightHistory[0]?.weightKg;
  const delta =
    firstWeight !== undefined && client.weightKg !== undefined
      ? Math.round((client.weightKg - firstWeight) * 10) / 10
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha de ${client.name}`}
      className="tour-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="tour-card flex max-h-[85vh] w-full max-w-md flex-col border border-blood bg-coal">
        <div className="hazard h-2 w-full shrink-0" aria-hidden />
        <div className="overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-2xl leading-tight tracking-wide uppercase">
              Ficha de <span className="text-blood">{client.name.split(" ")[0]}</span>
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

          <dl className="mt-4 space-y-2 text-sm">
            {[
              { label: "Nombre", value: client.name },
              { label: "Plan", value: client.plan },
              { label: "Nivel", value: client.level },
              { label: "Entrena como", value: client.sex },
              { label: "Objetivo", value: client.goal },
              {
                label: "Altura",
                value: client.heightCm ? `${client.heightCm} cm` : "sin registrar",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-graphite pb-2"
              >
                <dt className="text-xs tracking-widest text-steel uppercase">{row.label}</dt>
                <dd className="text-right font-semibold capitalize">{row.value}</dd>
              </div>
            ))}

            {/* Peso: tócalo para ver el histórico y actualizarlo */}
            <div className="border-b border-graphite pb-2">
              <button
                type="button"
                onClick={() => setWeightOpen(!weightOpen)}
                aria-expanded={weightOpen}
                className="flex w-full items-baseline justify-between gap-4 text-left"
              >
                <span className="text-xs tracking-widest text-steel uppercase">
                  Peso <span aria-hidden>{weightOpen ? "▲" : "▼"}</span>
                </span>
                <span className="text-right">
                  <strong className="font-display text-xl text-blood">
                    {client.weightKg ? `${client.weightKg} kg` : "sin registrar"}
                  </strong>
                  {delta !== null && delta !== 0 && (
                    <span className="ml-2 text-xs text-steel">
                      ({delta > 0 ? "+" : ""}
                      {delta} kg desde el inicio)
                    </span>
                  )}
                </span>
              </button>

              {weightOpen && (
                <div className="mt-3 border-l-2 border-blood bg-ink p-3">
                  <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
                    Histórico de peso
                  </p>
                  {client.weightHistory.length === 0 ? (
                    <p className="mt-2 text-sm text-steel">
                      Sin registros todavía. Anota el primero aquí abajo.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {[...client.weightHistory].reverse().map((entry, i) => (
                        <li
                          key={i}
                          className="flex items-baseline justify-between text-sm"
                        >
                          <span className="text-steel">{formatDateLabel(entry.dateLabel)}</span>
                          <strong className="font-display text-base">
                            {entry.weightKg} kg
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    className="mt-3 flex items-end gap-2 border-t border-graphite pt-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveWeight();
                    }}
                  >
                    <label className="flex flex-1 flex-col gap-1 text-xs text-steel">
                      actualizar peso (kg)
                      <input
                        inputMode="decimal"
                        value={newWeight}
                        onChange={(event) => {
                          setNewWeight(event.target.value);
                          setError(false);
                        }}
                        placeholder="ej: 74.5"
                        className={`border bg-coal px-3 py-2 text-chalk placeholder:text-steel/40 focus:outline-none ${
                          error ? "border-blood" : "border-graphite focus:border-chalk/50"
                        }`}
                      />
                    </label>
                    <button
                      type="submit"
                      className="bg-blood px-4 py-2 font-display text-base tracking-wider text-chalk uppercase transition-colors hover:bg-ember"
                    >
                      Guardar
                    </button>
                  </form>
                  {error && (
                    <p className="mt-1 text-xs font-semibold text-blood">
                      Escribe un peso válido en kilos, ej: 74.5
                    </p>
                  )}
                </div>
              )}
            </div>
          </dl>

          {/* Compartir acceso: código, link y QR */}
          <div className="mt-5 border border-graphite bg-ink p-4">
            <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
              Compartir acceso
            </p>
            <div className="mt-3 flex items-center gap-4">
              {/* QR del link (necesita internet; si falla, queda el link) */}
              {!qrFailed && accessLink && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&bgcolor=10-10-10&color=242-239-233&data=${encodeURIComponent(accessLink)}`}
                  alt={`Código QR para entrar como ${client.code}`}
                  width={96}
                  height={96}
                  className="shrink-0 border border-graphite"
                  onError={() => setQrFailed(true)}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl tracking-widest text-blood">
                  {client.code}
                </p>
                <p className="mt-1 truncate text-xs text-steel">{accessLink}</p>
                <button
                  type="button"
                  onClick={copyLink}
                  className={`mt-2 border px-3 py-1.5 text-xs font-semibold tracking-widest uppercase transition-colors ${
                    copied
                      ? "border-blood bg-blood text-chalk"
                      : "border-graphite text-steel hover:border-blood hover:text-blood"
                  }`}
                >
                  {copied ? "¡Copiado! ✓" : "Copiar link"}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-steel">
              Escanea el QR o abre el link: llega directo a entrar con el
              código puesto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
