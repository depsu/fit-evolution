"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import {
  COACH_CODE,
  getSession,
  loadClients,
  loginWithCode,
  type StoredClient,
} from "@/lib/store";

export default function EntrarPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [clients, setClients] = useState<StoredClient[]>([]);
  // Código de la sesión que ya está abierta (para marcarla en la demo)
  const [activeCode, setActiveCode] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadClients();
    setClients(stored);

    // ¿Hay alguien con sesión abierta? Lo marcamos como "activo"
    const session = getSession();
    if (session?.type === "coach") {
      setActiveCode(COACH_CODE);
    } else if (session?.type === "client") {
      const client = stored.find((c) => c.id === session.clientId);
      setActiveCode(client?.code ?? null);
    }

    // Permite llegar con el código listo: /entrar?code=MARIA
    const param = new URLSearchParams(window.location.search).get("code");
    if (param) setCode(param.toUpperCase());
  }, []);

  // A quién corresponde el código escrito (para el botón específico)
  const match = useMemo(() => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === COACH_CODE) return { type: "coach" as const };
    const client = clients.find((c) => c.code === normalized);
    return client ? { type: "client" as const, client } : null;
  }, [code, clients]);

  const submitLabel = match
    ? match.type === "coach"
      ? "Entrar a la vista de coach →"
      : `Entrar a mi rutina como ${match.client.name.split(" ")[0]} →`
    : "Entrar →";

  const submit = () => {
    const session = loginWithCode(code);
    if (!session) {
      setError(true);
      return;
    }
    router.push(session.type === "coach" ? "/panel" : "/mi-rutina");
  };

  const enterAsCoach = () => {
    loginWithCode(COACH_CODE);
    router.push("/panel");
  };

  return (
    <main className="min-h-screen">
      <SiteNav active="entrar" />

      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
          Acceso clientes
        </p>
        <h1 className="font-display mt-2 text-5xl tracking-wide uppercase">
          Entra con tu <span className="text-blood">código</span>
        </h1>
        <p className="mt-4 text-steel">
          Tu coach te da un código al inscribirte. Escríbelo y listo: sin
          correo, sin contraseña.
        </p>

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label
            htmlFor="codigo"
            className="text-xs font-semibold tracking-[0.3em] text-steel uppercase"
          >
            Tu código
          </label>
          <input
            id="codigo"
            autoFocus
            autoComplete="off"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              setError(false);
            }}
            placeholder="EJ: MARIA"
            className={`font-display mt-2 w-full border bg-coal px-5 py-4 text-3xl tracking-[0.2em] text-chalk uppercase placeholder:text-graphite focus:outline-none ${
              error ? "border-blood" : "border-graphite focus:border-chalk/50"
            }`}
          />
          {error && (
            <p className="mt-2 text-sm font-semibold text-blood">
              Ese código no existe. Revisa con tu coach.
            </p>
          )}
          <button
            type="submit"
            className="mt-4 w-full bg-blood py-4 font-display text-2xl tracking-wider text-chalk uppercase transition-colors hover:bg-ember"
          >
            {submitLabel}
          </button>
        </form>

        {/* Ayuda del prototipo: códigos de clientes de demostración */}
        <div className="mt-10 border border-graphite bg-coal p-5">
          <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
            Clientes de prueba (demo)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {clients.map((client) => {
              const isSelected = code.trim().toUpperCase() === client.code;
              const isActive = activeCode === client.code;
              return (
                <button
                  key={client.code}
                  type="button"
                  onClick={() => {
                    setCode(client.code);
                    setError(false);
                  }}
                  className={`relative border px-3 py-1.5 font-display text-sm tracking-widest uppercase transition-colors ${
                    isSelected
                      ? "border-blood bg-blood text-chalk"
                      : "border-graphite text-steel hover:border-blood hover:text-blood"
                  }`}
                >
                  {client.code}
                  {isActive && (
                    <span className="absolute -top-2 -right-2 bg-chalk px-1 text-[9px] font-bold tracking-normal text-ink">
                      ACTIVO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-steel">
            Toca un código y luego el botón rojo para ver la rutina de ese
            cliente.
          </p>
        </div>

        {/* Acceso del entrenador, separado y centrado para que no se confunda */}
        <div className="mt-8 border-t border-graphite pt-8 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-steel uppercase">
            ¿Eres el entrenador?
          </p>
          <button
            type="button"
            onClick={enterAsCoach}
            className={`relative mt-3 inline-block border border-blood px-8 py-4 font-display text-xl tracking-wider text-blood uppercase transition-colors hover:bg-blood hover:text-chalk`}
          >
            Entrar al panel como coach →
            {activeCode === COACH_CODE && (
              <span className="absolute -top-2 -right-2 bg-chalk px-1 text-[9px] font-bold tracking-normal text-ink">
                ACTIVO
              </span>
            )}
          </button>
          <p className="mt-2 text-xs text-steel">
            Ahí ves a tus clientes, su asistencia y les asignas rutinas.
          </p>
        </div>

        <p className="mt-10 text-center text-sm text-steel">
          ¿Todavía no eres cliente?{" "}
          <Link href="/rutina" className="font-semibold text-blood hover:text-ember">
            Prueba la rutina express gratis
          </Link>
        </p>
      </div>
    </main>
  );
}
