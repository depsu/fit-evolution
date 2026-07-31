import Link from "next/link";

// Barra superior compartida entre todas las vistas
export function SiteNav({
  active,
}: {
  active: "inicio" | "rutina" | "entrar" | "panel" | "mi-rutina";
}) {
  const linkBase =
    "px-3 py-2 text-sm font-semibold uppercase tracking-widest whitespace-nowrap transition-colors sm:px-4";

  return (
    <header className="sticky top-0 z-40 border-b border-graphite bg-ink">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="FIT EVOLUTION, ir al inicio">
          <span className="hazard block h-8 w-3" aria-hidden />
          <span className="font-display text-2xl leading-none tracking-wide">
            <span className="bg-blood px-1.5 py-0.5 italic">FIT</span>{" "}
            <span className="italic">EVOLUTION</span>
          </span>
        </Link>
        <nav aria-label="Navegación principal" className="flex items-center gap-1">
          <Link
            href="/"
            aria-current={active === "inicio" ? "page" : undefined}
            className={`${linkBase} ${
              active === "inicio" ? "text-blood" : "text-steel hover:text-chalk"
            } hidden sm:block`}
          >
            Inicio
          </Link>
          <Link
            href="/rutina"
            aria-current={active === "rutina" ? "page" : undefined}
            className={`${linkBase} ${
              active === "rutina" ? "text-blood" : "text-steel hover:text-chalk"
            }`}
          >
            {/* En móvil, etiqueta corta para que no se parta en dos líneas */}
            <span className="sm:hidden">Rutina</span>
            <span className="hidden sm:inline">Rutina express</span>
          </Link>
          <Link
            href={active === "mi-rutina" ? "/mi-rutina" : "/entrar"}
            aria-current={active === "entrar" || active === "mi-rutina" ? "page" : undefined}
            className={`${linkBase} ${
              active === "entrar" || active === "mi-rutina"
                ? "text-blood"
                : "text-steel hover:text-chalk"
            }`}
          >
            {active === "mi-rutina" ? "Mi rutina" : "Entrar"}
          </Link>
          {/* El acceso al panel vive en /entrar; aquí solo se marca
              cuando ya estás dentro (así el menú queda liviano en móvil) */}
          {active === "panel" && (
            <Link
              href="/panel"
              aria-current="page"
              className={`${linkBase} border border-blood bg-blood text-chalk`}
            >
              Panel
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
