"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function MediaLightbox({ src, type }: { src: string; type: "image" | "video" }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="lightbox-overlay"
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "fadeIn 0.2s ease" }}
    >
      <button
        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all z-10"
        onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        style={{ position: "absolute", top: "1rem", right: "1rem" }}
      >
        <X size={24} className="text-white" />
      </button>
      {type === "image" ? (
        <img
          src={src}
          alt="media"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "0.5rem", pointerEvents: "auto" }}
        />
      ) : (
        <video
          src={src}
          controls
          autoPlay
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "0.5rem", pointerEvents: "auto" }}
        />
      )}
    </div>
  );
}

// Hook for managing lightbox state
export function useLightbox() {
  const [lightbox, setLightbox] = useState<{ src: string; type: "image" | "video" } | null>(null);
  return {
    lightbox,
    openLightbox: (src: string, type: "image" | "video") => setLightbox({ src, type }),
    closeLightbox: () => setLightbox(null),
  };
}
