"use client";

import { mediaKind, youtubeId } from "@/lib/store";
import { useEscape } from "@/lib/use-escape";

// Muestra la foto o el video de un ejercicio (URL que puso el coach)
export function MediaModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  useEscape(true, onClose);
  const kind = mediaKind(url);
  const yt = youtubeId(url);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Cómo se hace: ${title}`}
      className="tour-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="tour-card w-full max-w-lg border border-blood bg-coal">
        <div className="hazard h-2 w-full" aria-hidden />
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-xl leading-tight tracking-wide uppercase">
              {title}
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

          <div className="mt-3">
            {kind === "youtube" && yt ? (
              <iframe
                src={`https://www.youtube.com/embed/${yt}`}
                title={`Video: ${title}`}
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full border border-graphite"
              />
            ) : kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={`Foto: ${title}`}
                className="max-h-[65vh] w-full border border-graphite object-contain"
              />
            ) : kind === "video" ? (
              <video
                src={url}
                controls
                playsInline
                className="max-h-[65vh] w-full border border-graphite"
              />
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block border border-chalk/30 px-4 py-3 text-center font-display text-lg tracking-wider uppercase transition-colors hover:border-blood hover:text-blood"
              >
                Abrir el enlace →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
