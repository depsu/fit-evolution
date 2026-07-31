import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { MachinePhoto } from "@/components/machine-photo";
import { RevealOnScroll } from "@/components/reveal-on-scroll";

// Precios del gimnasio (CLP)
const PLANS = [
  {
    name: "Mensual",
    price: "$30.000",
    period: "al mes",
    note: "Sin matrícula ni contratos.",
    features: [
      "Acceso ilimitado a todas las máquinas",
      "Rutina express incluida",
      "Clases grupales",
    ],
    highlighted: false,
  },
  {
    name: "Semestral",
    price: "$155.000",
    period: "por 6 meses",
    note: "Sale a $25.800 al mes · ahorras $25.000.",
    features: [
      "Todo lo del plan mensual",
      "Evaluación física con coach",
      "Puedes congelar hasta 2 semanas",
    ],
    highlighted: false,
  },
  {
    name: "Anual",
    price: "$230.000",
    period: "al año",
    note: "Sale a $19.200 al mes · ahorras $130.000.",
    features: [
      "Todo lo del plan semestral",
      "Rutina personalizada de tu coach",
      "Seguimiento de tu progreso en la app",
    ],
    highlighted: true,
  },
];

const TEAM = [
  { name: "Roberto Mendoza", role: "Head coach · Fuerza", initials: "RM" },
  { name: "Daniela Ríos", role: "Coach · Glúteo y funcional", initials: "DR" },
  { name: "Miguel Ángel Torres", role: "Coach · Hipertrofia", initials: "MT" },
];

const MACHINES = [
  "Prensa 45°",
  "Máquina Smith",
  "Polea alta (jalón)",
  "Peck deck",
  "Máquina femoral",
  "Máquina de glúteo",
  "Polea de remo",
  "Máquina de abductores",
];

const MARQUEE_ITEMS = [
  "TU CAMBIO EMPIEZA HOY",
  "EQUIPAMIENTO MODERNO",
  "NO IMPORTA TU NIVEL",
  "SAN PABLO 4842 · QUINTA NORMAL",
];

export default function HomePage() {
  return (
    <main>
      <SiteNav active="inicio" />
      <RevealOnScroll />

      {/* HERO: presentación del gimnasio, con el nombre en grande como el logo */}
      <section className="relative overflow-hidden border-b border-graphite">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-16 text-center sm:px-6 lg:pt-24 lg:pb-20">
          <p className="rise mx-auto inline-flex items-center gap-2 border border-graphite bg-ink px-3 py-1.5 text-xs font-semibold tracking-[0.25em] text-steel uppercase">
            <span className="livedot size-2 rounded-full bg-blood" />
            Abierto hoy · 7:00 — 22:00
          </p>
          {/* Logotipo épico: FIT en caja roja + EVOLUTION, en cursiva como el letrero */}
          <h1
            className="rise mt-8 font-display leading-none tracking-wide uppercase"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="inline-block -skew-x-6 bg-blood px-3 py-1 text-6xl italic sm:px-5 sm:text-8xl lg:text-9xl">
              FIT
            </span>{" "}
            <span className="inline-block -skew-x-6 text-6xl italic sm:text-8xl lg:text-9xl">
              EVOLUTION
            </span>
          </h1>
          <p
            className="rise mx-auto mt-6 font-display text-2xl tracking-wider text-blood uppercase sm:text-3xl"
            style={{ animationDelay: "0.2s" }}
          >
            Tu cambio empieza hoy 🔥
          </p>
          <p
            className="rise mx-auto mt-2 max-w-md text-lg text-steel"
            style={{ animationDelay: "0.25s" }}
          >
            No importa tu nivel, nosotros te guiamos. Equipamiento moderno y
            coaches en sala, en pleno Quinta Normal.
          </p>
          <div
            className="rise mx-auto mt-8 flex max-w-md flex-col justify-center gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-4"
            style={{ animationDelay: "0.3s" }}
          >
            <a
              href="#planes"
              className="bg-blood px-8 py-4 text-center font-display text-xl tracking-wider text-chalk uppercase transition-transform hover:-translate-y-0.5 hover:bg-ember"
            >
              Ver planes y precios →
            </a>
            <a
              href="#ubicacion"
              className="border border-chalk/30 px-8 py-4 text-center font-display text-xl tracking-wider uppercase transition-colors hover:border-blood hover:text-blood"
            >
              📍 Cómo llegar
            </a>
          </div>
          <div
            className="rise mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
            style={{ animationDelay: "0.35s" }}
          >
            {[
              { big: "+40", small: "máquinas modernas" },
              { big: "L5", small: "a pasos de Metro Blanqueado" },
              { big: "3", small: "coaches en sala" },
              { big: "$30.000", small: "al mes, sin matrícula" },
            ].map((stat) => (
              <div key={stat.small} className="border border-graphite bg-coal p-4 text-left">
                <p className="font-display text-3xl text-blood">{stat.big}</p>
                <p className="mt-1 text-sm text-steel">{stat.small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUESINA (decorativa: repetida, se oculta a lectores de pantalla) */}
      <div aria-hidden className="overflow-hidden border-b border-graphite bg-blood py-3">
        <div className="marquee-track flex w-max items-center gap-8">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map(
            (item, i) => (
              <span
                key={i}
                className="font-display flex items-center gap-8 text-xl tracking-widest whitespace-nowrap text-ink uppercase"
              >
                {item} <span aria-hidden>▪</span>
              </span>
            )
          )}
        </div>
      </div>

      {/* MÁQUINAS */}
      <section className="border-b border-graphite bg-coal/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl tracking-wide uppercase sm:text-5xl">
              Nuestras <span className="text-blood">máquinas</span>
            </h2>
            <p className="max-w-sm text-sm text-steel">
              Imágenes de referencia: pronto verás la foto real de cada máquina
              del gimnasio.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {MACHINES.map((machine, i) => (
              <div
                key={machine}
                data-reveal
                style={{ "--reveal-delay": `${(i % 4) * 0.08}s` } as React.CSSProperties}
              >
                <MachinePhoto name={machine} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 data-reveal className="font-display text-4xl tracking-wide uppercase sm:text-5xl">
          Planes y <span className="text-blood">precios</span>
        </h2>
        <p data-reveal className="mt-2 text-steel">
          Para entrenar en el gimnasio. Sin letra chica.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              data-reveal
              style={{ "--reveal-delay": `${i * 0.12}s` } as React.CSSProperties}
              className={`relative flex flex-col border p-8 ${
                plan.highlighted
                  ? "border-blood bg-graphite"
                  : "border-graphite bg-coal"
              }`}
            >
              {plan.highlighted && (
                <span className="hazard absolute -top-px right-6 px-3 py-1 font-display text-sm tracking-widest text-chalk uppercase">
                  Mejor precio
                </span>
              )}
              <h3 className="font-display text-2xl tracking-wide uppercase">{plan.name}</h3>
              <p className="mt-4">
                <span className="font-display text-5xl text-blood sm:text-6xl">
                  {plan.price}
                </span>
                <span className="ml-2 text-steel">{plan.period}</span>
              </p>
              <p className="mt-2 text-sm font-semibold text-chalk/80">{plan.note}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm">
                    <span className="text-blood" aria-hidden>
                      ▪
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#contacto"
                className={`mt-8 block py-3 text-center font-display text-lg tracking-wider uppercase transition-colors ${
                  plan.highlighted
                    ? "bg-blood text-chalk hover:bg-ember"
                    : "border border-chalk/30 hover:border-blood hover:text-blood"
                }`}
              >
                Quiero este plan
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* HORARIO Y UBICACIÓN */}
      <section id="ubicacion" className="scroll-mt-20 border-b border-graphite">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div data-reveal className="border border-graphite bg-coal p-8">
            <h2 className="font-display text-3xl tracking-wide uppercase sm:text-4xl">
              Horario de <span className="text-blood">funcionamiento</span>
            </h2>
            <ul className="mt-6 space-y-3">
              {[
                ["Lunes a Viernes", "7:00 — 22:00 hrs."],
                ["Sábado", "9:00 — 17:00 hrs."],
                ["Domingos y feriados", "Cerrado"],
              ].map(([day, hours]) => (
                <li
                  key={day}
                  className="flex flex-wrap items-baseline justify-between gap-2 border border-graphite bg-ink px-4 py-3"
                >
                  <span className="font-display text-lg tracking-wide uppercase">{day}</span>
                  <span className={hours === "Cerrado" ? "text-steel" : "font-semibold text-blood"}>
                    {hours}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal className="border border-graphite bg-coal p-8">
            <h2 className="font-display text-3xl tracking-wide uppercase sm:text-4xl">
              📍 <span className="text-blood">Ubicación</span>
            </h2>
            <p className="font-display mt-6 border border-chalk/30 bg-ink px-4 py-4 text-center text-2xl tracking-wide uppercase">
              San Pablo 4842
              <span className="block text-lg text-steel">Quinta Normal</span>
            </p>
            <ul className="mt-5 space-y-2 text-steel">
              <li>🚇 A pasos de Metro Blanqueado (Línea 5)</li>
              <li>🛒 Al lado del supermercado Santa Isabel</li>
            </ul>
            <a
              href="https://maps.google.com/?q=San+Pablo+4842,+Quinta+Normal"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block border border-chalk/30 px-6 py-3 font-display text-lg tracking-wider uppercase transition-colors hover:border-blood hover:text-blood"
            >
              Abrir en el mapa →
            </a>
          </div>
        </div>
      </section>

      {/* EQUIPO */}
      <section className="border-y border-graphite bg-coal/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 data-reveal className="font-display text-4xl tracking-wide uppercase sm:text-5xl">
            El <span className="text-blood">equipo</span>
          </h2>
          <p data-reveal className="mt-2 max-w-md text-steel">
            Coaches de verdad, en el piso del gimnasio, listos para ayudarte.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {TEAM.map((member, i) => (
              <div
                key={member.name}
                data-reveal
                style={{ "--reveal-delay": `${i * 0.12}s` } as React.CSSProperties}
                className="group border border-graphite bg-coal p-6 transition-colors hover:border-blood"
              >
                <div className="hazard-thin flex aspect-square items-center justify-center border border-graphite bg-graphite">
                  <span className="font-display bg-ink px-6 py-4 text-5xl tracking-widest text-blood">
                    {member.initials}
                  </span>
                </div>
                <h3 className="font-display mt-4 text-2xl tracking-wide uppercase">
                  {member.name}
                </h3>
                <p className="text-sm text-steel">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL: manda a la rutina express */}
      <section id="contacto" data-reveal className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 text-center sm:px-6">
        <h2 className="font-display text-5xl leading-tight tracking-wide uppercase sm:text-7xl">
          ¿Hoy toca <span className="text-blood">pierna</span>?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-steel">
          Arma tu rutina express ahora mismo y llega al gimnasio sabiendo
          exactamente qué hacer.
        </p>
        <Link
          href="/rutina"
          className="mt-8 inline-block bg-blood px-10 py-5 font-display text-2xl tracking-wider text-chalk uppercase transition-transform hover:-translate-y-0.5 hover:bg-ember"
        >
          Empezar gratis →
        </Link>
      </section>

      <footer className="border-t border-graphite">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-steel sm:px-6">
          <p className="font-display text-lg tracking-wide text-chalk uppercase italic">
            <span className="bg-blood px-1">FIT</span> EVOLUTION
          </p>
          <p>Lun a Vie 7:00–22:00 · Sáb 9:00–17:00 · Dom cerrado</p>
          <p>
            San Pablo 4842, Quinta Normal ·{" "}
            <a
              href="https://instagram.com/fitevolutiongimnasio"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blood hover:text-ember"
            >
              @fitevolutiongimnasio
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
