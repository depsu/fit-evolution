// Tarjeta de máquina con imagen de ejemplo (ilustración de línea).
// Cuando el dueño saque las fotos reales, este componente pasa a <Image>.
// `compact` es la versión miniatura para las tarjetas de ejercicio.

type MachineArt = "pulley" | "press" | "rack" | "bench" | "seated" | "weights";

// Elige la ilustración según el nombre de la máquina o implemento
function machineArt(name: string): MachineArt {
  const n = name.toLowerCase();
  if (/(mancuerna|barra olímpica)/.test(n)) return "weights";
  if (/(polea|jal[oó]n|remo|dominadas)/.test(n)) return "pulley";
  if (/prensa/.test(n)) return "press";
  if (/(smith|fondos)/.test(n)) return "rack";
  if (/(femoral|banco|gemelos)/.test(n)) return "bench";
  return "seated";
}

// Ilustraciones de línea de cada tipo de máquina
function MachineDrawing({ art }: { art: MachineArt }) {
  const stroke = "#9a9a94";
  const accent = "#e10600";
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 120 100" className="h-full w-full" aria-hidden>
      {art === "pulley" && (
        <g {...common}>
          {/* Torre de polea con placas y asiento */}
          <path d="M78 92 V14 H100 V92" />
          <rect x="82" y="46" width="14" height="30" fill={accent} stroke="none" opacity="0.85" />
          <path d="M89 14 V22" />
          <path d="M89 22 L36 30" strokeDasharray="3 4" />
          <path d="M20 30 H52" strokeWidth={4} />
          <path d="M30 60 H56 M43 60 V78 M31 92 H55" />
          <circle cx="89" cy="14" r="4" />
        </g>
      )}
      {art === "press" && (
        <g {...common}>
          {/* Prensa 45°: riel inclinado, plataforma y asiento */}
          <path d="M14 92 H106" />
          <path d="M30 88 L92 30" strokeWidth={4} />
          <path d="M86 24 L102 40" strokeWidth={5} />
          <rect x="78" y="18" width="8" height="8" fill={accent} stroke="none" opacity="0.85" />
          <path d="M22 88 L48 62 L60 74" />
          <circle cx="70" cy="52" r="6" />
          <circle cx="82" cy="40" r="6" />
        </g>
      )}
      {art === "rack" && (
        <g {...common}>
          {/* Máquina Smith: marco y barra con discos */}
          <path d="M24 92 V12 M96 92 V12 M24 12 H96" />
          <path d="M18 92 H30 M90 92 H102" />
          <path d="M24 50 H96" strokeWidth={4} />
          <circle cx="34" cy="50" r="9" fill={accent} stroke="none" opacity="0.85" />
          <circle cx="86" cy="50" r="9" fill={accent} stroke="none" opacity="0.85" />
          <path d="M24 30 H32 M88 30 H96 M24 70 H32 M88 70 H96" />
        </g>
      )}
      {art === "bench" && (
        <g {...common}>
          {/* Banco con rodillo de femoral */}
          <path d="M18 56 H84" strokeWidth={5} />
          <path d="M84 56 L104 44" strokeWidth={5} />
          <path d="M30 56 V92 M72 56 V92 M24 92 H36 M66 92 H78" />
          <circle cx="100" cy="58" r="7" fill={accent} stroke="none" opacity="0.85" />
          <circle cx="100" cy="34" r="7" />
        </g>
      )}
      {art === "weights" && (
        <g {...common}>
          {/* Mancuerna: barra con discos a los lados */}
          <path d="M38 50 H82" strokeWidth={4} />
          <rect x="24" y="32" width="10" height="36" fill={accent} stroke="none" opacity="0.85" />
          <rect x="14" y="38" width="8" height="24" />
          <rect x="86" y="32" width="10" height="36" fill={accent} stroke="none" opacity="0.85" />
          <rect x="98" y="38" width="8" height="24" />
        </g>
      )}
      {art === "seated" && (
        <g {...common}>
          {/* Máquina sentada: asiento, respaldo y brazos móviles */}
          <path d="M40 92 V70 H72 M40 70 V38" strokeWidth={4} />
          <path d="M30 92 H52 M62 70 V92 M54 92 H72" />
          <path d="M40 42 Q18 40 16 24" />
          <path d="M72 66 Q96 64 100 46" />
          <circle cx="16" cy="20" r="6" fill={accent} stroke="none" opacity="0.85" />
          <circle cx="102" cy="42" r="6" fill={accent} stroke="none" opacity="0.85" />
        </g>
      )}
    </svg>
  );
}

export function MachinePhoto({
  name,
  index,
  compact = false,
}: {
  name: string;
  index: number;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex w-full flex-col justify-between overflow-hidden border border-graphite bg-coal ${
        compact ? "aspect-square sm:aspect-[4/3]" : "aspect-square"
      }`}
    >
      <div className="hazard-thin absolute inset-x-0 top-0 h-2 opacity-60" aria-hidden />
      <span
        className={`font-display pointer-events-none absolute -right-2 -bottom-4 leading-none text-outline select-none ${
          compact ? "text-5xl sm:text-7xl" : "-bottom-6 text-[7rem]"
        }`}
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Imagen de ejemplo de la máquina */}
      <div
        className={`relative z-10 mx-auto flex flex-1 items-center justify-center ${
          compact ? "w-4/5 pt-3" : "w-3/5 pt-6"
        }`}
      >
        <MachineDrawing art={machineArt(name)} />
      </div>

      <div
        className={`relative z-10 flex flex-col items-start gap-0.5 ${
          compact ? "p-2 sm:p-3" : "p-4"
        }`}
      >
        <p
          className={`font-semibold tracking-[0.2em] text-steel uppercase ${
            compact ? "hidden text-[9px] sm:block" : "text-[10px]"
          }`}
        >
          Imagen de referencia
        </p>
        <p
          className={`font-display leading-tight tracking-wide text-chalk ${
            compact ? "text-xs sm:text-base" : "text-lg"
          }`}
        >
          {name}
        </p>
      </div>
    </div>
  );
}
