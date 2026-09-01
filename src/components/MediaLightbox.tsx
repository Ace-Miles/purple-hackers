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
    <div className="lightbox-overlay" onClick={() => setOpen(false)}>
      <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all z-10">
        <X size={24} className="text-white" />
      </button>
      {type === "image" ? (
        <img src={src} alt="media" onClick={e => e.stopPropagation()} />
      ) : (
        <video src={src} controls autoPlay onClick={e => e.stopPropagation()} />
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
