"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { MachinePhoto } from "@/components/machine-photo";
import {
  buildRoutine,
  GROUP_OPTIONS,
  LEVEL_OPTIONS,
  SEX_OPTIONS,
  type Level,
  type MuscleGroup,
  type Sex,
} from "@/lib/routine";

type Step = 0 | 1 | 2 | 3;

export default function RutinaPage() {
  const [step, setStep] = useState<Step>(0);
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const routine = useMemo(() => {
    if (step === 3 && group && level && sex) {
      return buildRoutine(group, level, sex);
    }
    return null;
  }, [step, group, level, sex]);

  const toggleDone = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const restart = () => {
    setStep(0);
    setGroup(null);
    setLevel(null);
    setSex(null);
    setDone(new Set());
  };

  const progress = routine ? Math.round((done.size / routine.items.length) * 100) : 0;

  return (
    <main className="min-h-screen">
      <SiteNav active="rutina" />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Encabezado + barra de pasos */}
        <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
          Rutina express
        </p>
        <h1 className="font-display mt-2 text-4xl tracking-wide uppercase sm:text-5xl">
          {step < 3 ? (
            <>
              Armamos tu rutina en <span className="text-blood">3 preguntas</span>
            </>
          ) : (
            <>
              Tu rutina está <span className="text-blood">lista</span>
            </>
          )}
        </h1>

        {step < 3 && (
          <p className="mt-6 text-xs font-semibold tracking-[0.3em] text-steel uppercase">
            Paso <span className="text-blood">{step + 1}</span> de 3
          </p>
        )}
        <div className="mt-2 flex gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 transition-colors ${
                step > i ? "bg-blood" : step === i ? "bg-chalk" : "bg-graphite"
              }`}
            />
          ))}
        </div>

        {/* PASO 1: grupo muscular */}
        {step === 0 && (
          <StepBlock
            question="¿Qué quieres entrenar hoy?"
            options={GROUP_OPTIONS}
            selected={group}
            onSelect={(value) => {
              setGroup(value);
              setStep(1);
            }}
          />
        )}

        {/* PASO 2: nivel */}
        {step === 1 && (
          <StepBlock
            question="¿Cuál es tu nivel?"
            options={LEVEL_OPTIONS}
            selected={level}
            onSelect={(value) => {
              setLevel(value);
              setStep(2);
            }}
            onBack={() => setStep(0)}
          />
        )}

        {/* PASO 3: sexo */}
        {step === 2 && (
          <StepBlock
            question="Última: ¿cómo entrenas?"
            options={SEX_OPTIONS}
            selected={sex}
            onSelect={(value) => {
              setSex(value);
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}

        {/* RESULTADO */}
        {step === 3 && routine && (
          <div className="rise mt-8">
            <div className="border border-blood bg-coal p-5 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl tracking-wide uppercase">
                  {routine.title}
                </p>
                <p className="mt-1 text-sm text-steel">{routine.subtitle}</p>
              </div>
              <p className="mt-3 sm:mt-0 sm:text-right">
                <span className="font-display block text-4xl text-blood">
                  ~{routine.durationMinutes}&apos;
                </span>
                <span className="text-xs tracking-widest text-steel uppercase">
                  duración estimada
                </span>
              </p>
            </div>

            {/* Progreso de la sesión */}
            <div className="mt-6">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold tracking-widest text-steel uppercase">
                  Progreso de hoy
                </span>
                <span className="font-display text-xl text-blood">
                  {done.size}/{routine.items.length}
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
              {routine.items.map((item, i) => {
                const isDone = done.has(item.exercise.id);
                return (
                  <li
                    key={item.exercise.id}
                    className={`rise grid grid-cols-[88px_1fr] gap-3 border p-3 transition-colors sm:grid-cols-[140px_1fr_auto] sm:gap-4 sm:p-4 ${
                      isDone ? "border-graphite bg-coal/40 opacity-60" : "border-graphite bg-coal"
                    }`}
                    style={{ animationDelay: `${i * 0.07}s` }}
                  >
                    <MachinePhoto name={item.exercise.machine} index={i} compact />
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
              <p className="hazard mt-8 p-px text-center">
                <span className="font-display block bg-ink px-4 py-4 text-2xl tracking-wider uppercase">
                  💪 ¡Sesión completada! Nos vemos la próxima.
                </span>
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={restart}
                className="border border-chalk/30 px-6 py-3 font-display text-lg tracking-wider uppercase transition-colors hover:border-blood hover:text-blood"
              >
                ← Armar otra rutina
              </button>
              <Link
                href="/entrar?code=MARIA"
                className="bg-blood px-6 py-3 font-display text-lg tracking-wider text-chalk uppercase transition-colors hover:bg-ember"
              >
                ¿Quieres un coach? Ver plan PRO
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Bloque genérico de pregunta con tarjetas de opción grandes
function StepBlock<T extends string>({
  question,
  options,
  selected,
  onSelect,
  onBack,
}: {
  question: string;
  options: { value: T; label: string; detail: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
  onBack?: () => void;
}) {
  return (
    <div className="rise mt-10">
      <h2 className="font-display text-3xl tracking-wide uppercase">{question}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((option, i) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rise group border p-6 text-left transition-all hover:-translate-y-0.5 hover:border-blood ${
              selected === option.value ? "border-blood bg-graphite" : "border-graphite bg-coal"
            }`}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <span className="font-display block text-2xl tracking-wide uppercase group-hover:text-blood">
              {option.label}
            </span>
            <span className="mt-1 block text-sm text-steel">{option.detail}</span>
          </button>
        ))}
      </div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 text-sm font-semibold tracking-widest text-steel uppercase transition-colors hover:text-blood"
        >
          ← Volver
        </button>
      )}
    </div>
  );
}
