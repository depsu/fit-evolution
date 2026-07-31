"use client";

import { useEffect, useState } from "react";
import { useEscape } from "@/lib/use-escape";

// Guía paso a paso reutilizable. Si un paso trae `targetId`, la guía
// hace scroll hasta esa sección y la destaca con un foco (el resto de
// la página se oscurece). Se abre sola la primera vez (storageKey) y
// queda disponible en el botón "?" flotante.
export interface GuideStep {
  icon: string;
  title: string;
  highlight: string;
  text: string;
  // id del elemento de la página que este paso explica
  targetId?: string;
  // Dónde poner la tarjeta para no tapar la sección iluminada
  // (por defecto abajo; "top" cuando la sección queda en la parte baja)
  placement?: "top" | "bottom";
}

function clearSpotlight() {
  document
    .querySelectorAll(".guide-target")
    .forEach((el) => el.classList.remove("guide-target"));
}

export function GuideTour({
  steps,
  storageKey,
  buttonLabel = "Guía",
}: {
  steps: GuideStep[];
  storageKey: string;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEscape(open, () => close());

  useEffect(() => {
    const seen = window.localStorage.getItem(storageKey);
    if (!seen) {
      const timer = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(timer);
    }
  }, [storageKey]);

  // Enfoca la sección del paso actual
  useEffect(() => {
    clearSpotlight();
    if (!open) return;
    const targetId = steps[step]?.targetId;
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    target.classList.add("guide-target");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    return clearSpotlight;
  }, [open, step, steps]);

  const close = () => {
    window.localStorage.setItem(storageKey, "vista");
    clearSpotlight();
    setOpen(false);
    setStep(0);
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const hasTarget = Boolean(
    current?.targetId && typeof document !== "undefined" &&
      document.getElementById(current.targetId)
  );

  return (
    <>
      {/* Botón flotante para reabrir la guía cuando quieras */}
      <button
        type="button"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        aria-label="Abrir la guía de esta pantalla"
        className="fixed right-4 bottom-4 z-[60] flex items-center gap-2 border border-blood bg-ink/95 px-3.5 py-2.5 font-display text-lg tracking-wider text-blood uppercase shadow-[0_0_24px_rgba(225,6,0,0.35)] transition-transform hover:-translate-y-0.5 hover:bg-blood hover:text-chalk sm:right-5 sm:bottom-5 sm:px-4 sm:py-3"
      >
        <span aria-hidden>?</span>
        <span className="hidden sm:inline">{buttonLabel}</span>
      </button>

      {open && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Guía de esta pantalla"
          className={`tour-backdrop fixed inset-0 flex justify-center p-4 ${
            hasTarget
              ? `pointer-events-none z-[80] ${
                  current.placement === "top" ? "items-start pt-16" : "items-end"
                }`
              : "z-[70] items-end bg-ink/80 backdrop-blur-sm sm:items-center"
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className={`tour-card pointer-events-auto w-full max-w-lg border border-blood bg-coal ${
              hasTarget ? "mb-2 shadow-[0_0_40px_rgba(0,0,0,0.9)]" : ""
            }`}
          >
            <div className="hazard h-2 w-full" aria-hidden />

            <div className={hasTarget ? "p-5 sm:p-6" : "p-6 sm:p-8"}>
              <div className="flex items-start justify-between gap-4">
                <span
                  className="tour-icon inline-flex size-12 items-center justify-center border border-graphite bg-ink text-3xl sm:size-16 sm:text-4xl"
                  aria-hidden
                >
                  {current.icon}
                </span>
                <button
                  type="button"
                  onClick={close}
                  className="text-xs font-semibold tracking-widest text-steel uppercase transition-colors hover:text-blood"
                >
                  Saltar guía ✕
                </button>
              </div>

              {/* key=step reinicia la animación en cada paso */}
              <div key={step} className="tour-swap mt-4">
                <h2 className="font-display text-2xl leading-tight tracking-wide uppercase sm:text-3xl">
                  {current.title}{" "}
                  <span className="text-blood">{current.highlight}</span>
                </h2>
                <p className="mt-2 text-base text-steel sm:text-lg">{current.text}</p>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-2" aria-label={`Paso ${step + 1} de ${steps.length}`}>
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStep(i)}
                      aria-label={`Ir al paso ${i + 1}`}
                      className={`h-2 transition-all ${
                        i === step ? "w-8 bg-blood" : "w-2 bg-graphite hover:bg-steel"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="border border-graphite px-4 py-2.5 font-display text-base tracking-wider text-steel uppercase transition-colors hover:border-chalk/40 hover:text-chalk"
                    >
                      ← Atrás
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (isLast ? close() : setStep(step + 1))}
                    className="bg-blood px-5 py-2.5 font-display text-base tracking-wider text-chalk uppercase transition-colors hover:bg-ember"
                  >
                    {isLast ? "¡Entendido!" : "Siguiente →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
