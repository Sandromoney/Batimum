"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";
import {
  resolveLandingVideoSource,
  type LandingVideoSource,
} from "@/lib/landing-video-config";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { cn } from "@/lib/utils";

function VideoPlayer({
  source,
  className,
  autoPlay = false,
}: {
  source: LandingVideoSource;
  className?: string;
  autoPlay?: boolean;
}) {
  if (source.kind === "mp4") {
    return (
      <video
        className={className}
        controls
        playsInline
        autoPlay={autoPlay}
        src={source.url}
      >
        <track kind="captions" />
      </video>
    );
  }

  if (source.kind === "embed") {
    const embedSrc = autoPlay
      ? source.url.includes("?")
        ? `${source.url}&autoplay=1`
        : `${source.url}?autoplay=1`
      : source.url;
    return (
      <iframe
        className={className}
        src={embedSrc}
        title="Présentation Batimum"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return null;
}

function LandingVideoModal({
  open,
  onClose,
  source,
}: {
  open: boolean;
  onClose: () => void;
  source: LandingVideoSource;
}) {
  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="landing-video-modal fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Vidéo de présentation Batimum"
    >
      <button
        type="button"
        className="btp-modal-backdrop absolute inset-0"
        aria-label="Fermer la vidéo"
        onClick={handleBackdropClick}
      />
      <div className="landing-video-modal__panel relative z-10 w-full max-w-6xl">
        <button
          type="button"
          className="absolute -top-12 right-0 inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/90 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Fermer
        </button>
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
          <VideoPlayer
            source={source}
            className="aspect-video h-auto w-full border-0 bg-black object-contain"
            autoPlay
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function LandingVideoBlock() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const source = resolveLandingVideoSource();
  const hasVideo = source.kind !== "none";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePlay = () => {
    if (hasVideo) setModalOpen(true);
  };

  return (
    <>
      <section
        id="logiciel"
        className="mx-auto w-full max-w-7xl px-6 pb-14 pt-4 sm:px-8 sm:pb-20 lg:px-10"
      >
        <LandingReveal>
          <div className="landing-video-stage mx-auto max-w-6xl">
            <button
              type="button"
              className={cn(
                "landing-video-frame group relative block w-full overflow-hidden rounded-2xl border border-border/50 bg-[#0a0a0a] shadow-card transition-[transform,box-shadow] duration-500 ease-out",
                hasVideo && "cursor-pointer",
              )}
              onClick={handlePlay}
              disabled={!hasVideo}
              aria-label={
                hasVideo
                  ? "Lire la vidéo de présentation Batimum"
                  : "Vidéo de présentation à venir"
              }
            >
              <div className="relative aspect-video w-full">
                {hasVideo && source.kind === "mp4" ? (
                  <video
                    className="h-full w-full object-cover object-center opacity-80"
                    muted
                    playsInline
                    preload="metadata"
                    src={source.url}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(37_99_235/0.06),transparent_65%)]" />
                )}
                <span className="absolute inset-0 bg-black/35 transition-colors duration-500 group-hover:bg-black/25" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-sm transition-transform duration-500 group-hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]">
                    <Play
                      className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </div>
            </button>
          </div>
        </LandingReveal>
      </section>

      {mounted && hasVideo ? (
        <LandingVideoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          source={source}
        />
      ) : null}
    </>
  );
}
