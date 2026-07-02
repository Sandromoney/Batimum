"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  clamp,
  hexToHsv,
  hsvToHex,
  normalizeHex,
} from "@/lib/color-picker-utils";
import { cn } from "@/lib/utils";

type DevisColorPickerPanelProps = {
  hex: string;
  onChange: (hex: string) => void;
  className?: string;
};

export function DevisColorPickerPanel({
  hex,
  onChange,
  className,
}: DevisColorPickerPanelProps) {
  const [hsv, setHsv] = useState(() => {
    const parsed = normalizeHex(hex) ?? "#2563EB";
    const [h, s, v] = hexToHsv(parsed);
    return { h, s, v };
  });
  const [hexInput, setHexInput] = useState(() => normalizeHex(hex) ?? "#2563EB");
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const draggingSv = useRef(false);
  const draggingHue = useRef(false);
  const hsvRef = useRef(hsv);
  const lastEmittedHexRef = useRef(normalizeHex(hex) ?? "#2563EB");
  hsvRef.current = hsv;

  const emit = useCallback(
    (next: { h: number; s: number; v: number }) => {
      setHsv(next);
      const nextHex = hsvToHex(next.h, next.s, next.v);
      setHexInput(nextHex);
      lastEmittedHexRef.current = nextHex;
      onChange(nextHex);
    },
    [onChange],
  );

  useEffect(() => {
    if (draggingSv.current || draggingHue.current) return;
    const parsed = normalizeHex(hex);
    if (!parsed || parsed === lastEmittedHexRef.current) return;
    lastEmittedHexRef.current = parsed;
    const [h, s, v] = hexToHsv(parsed);
    setHsv({ h, s, v });
    setHexInput(parsed);
  }, [hex]);

  function updateSvFromPointer(clientX: number, clientY: number) {
    const node = svRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const s = clamp((clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    emit({ ...hsvRef.current, s, v });
  }

  function updateHueFromPointer(clientX: number) {
    const node = hueRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 360);
    emit({ ...hsvRef.current, h });
  }

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (draggingSv.current) updateSvFromPointer(event.clientX, event.clientY);
      if (draggingHue.current) updateHueFromPointer(event.clientX);
    }
    function onUp() {
      draggingSv.current = false;
      draggingHue.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  });

  const pureHue = hsvToHex(hsv.h, 1, 1);
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        ref={svRef}
        className="relative h-44 w-full cursor-crosshair overflow-hidden rounded-xl border border-white/10 shadow-inner"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHue})`,
        }}
        onPointerDown={(event) => {
          draggingSv.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateSvFromPointer(event.clientX, event.clientY);
        }}
      >
        <span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: currentHex,
          }}
        />
      </div>

      <div
        ref={hueRef}
        className="relative h-3 w-full cursor-pointer rounded-full border border-white/10"
        style={{
          background:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
        onPointerDown={(event) => {
          draggingHue.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateHueFromPointer(event.clientX);
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            backgroundColor: pureHue,
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 rounded-lg border border-white/15 shadow-sm"
          style={{ backgroundColor: currentHex }}
        />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Code HEX
          </p>
          <Input
            value={hexInput}
            onChange={(event) => {
              const value = event.target.value.toUpperCase();
              setHexInput(value.startsWith("#") ? value : `#${value}`);
            }}
            onBlur={() => {
              const parsed = normalizeHex(hexInput);
              if (!parsed) {
                setHexInput(currentHex);
                return;
              }
              const [h, s, v] = hexToHsv(parsed);
              emit({ h, s, v });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="font-mono text-xs uppercase"
          />
        </div>
      </div>
    </div>
  );
}
