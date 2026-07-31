"use client";

import { useEffect } from "react";

// Observa todos los elementos con [data-reveal] y les añade la clase
// .revealed cuando entran al viewport, para que la página se vaya
// descubriendo a medida que bajas (el CSS vive en globals.css).
export function RevealOnScroll() {
  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal]");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}
