"use client";

import { useEffect } from "react";

// Cierra modales con la tecla Escape (accesibilidad de teclado).
// `active` permite llamarlo siempre y activarlo solo con el modal abierto.
export function useEscape(active: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onClose]);
}
