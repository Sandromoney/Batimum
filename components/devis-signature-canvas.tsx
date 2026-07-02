"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DIRIGEANT_SIGNATURE_CANVAS } from "@/lib/signature-pdf";
import { cn } from "@/lib/utils";
import { PenLine } from "lucide-react";

type DevisSignatureCanvasProps = {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  variant?: "default" | "dirigeant";
  initialImage?: string | null;
  showClearButton?: boolean;
  showPlaceholder?: boolean;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function DevisSignatureCanvas({
  onChange,
  disabled = false,
  variant = "default",
  initialImage = null,
  showClearButton = true,
  showPlaceholder = false,
  className,
}: DevisSignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const isDirigeant = variant === "dirigeant";
  const canvasWidth = isDirigeant
    ? DIRIGEANT_SIGNATURE_CANVAS.widthPx
    : undefined;
  const canvasHeight = isDirigeant
    ? DIRIGEANT_SIGNATURE_CANVAS.heightPx
    : undefined;
  const guideInset = isDirigeant ? DIRIGEANT_SIGNATURE_CANVAS.guideInsetPx : 0;

  const emitSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const { width, height } = canvas;
    const pixels = context.getImageData(0, 0, width, height).data;
    const hasInkPixels = pixels.some((value, index) => index % 4 === 3 && value > 0);
    setHasInk(hasInkPixels);
    onChange(hasInkPixels ? canvas.toDataURL("image/png") : null);
  }, [onChange]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  }, [onChange]);

  const setupContext = useCallback(
    (context: CanvasRenderingContext2D) => {
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = isDirigeant ? 2.2 : 2;
      context.strokeStyle = "#111827";
    },
    [isDirigeant],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    if (isDirigeant && canvasWidth && canvasHeight) {
      canvas.width = Math.floor(canvasWidth * ratio);
      canvas.height = Math.floor(canvasHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    } else {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    setupContext(context);
  }, [canvasHeight, canvasWidth, isDirigeant, setupContext]);

  useEffect(() => {
    resizeCanvas();
    if (isDirigeant) return;
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [isDirigeant, resizeCanvas]);

  useEffect(() => {
    if (!initialImage?.startsWith("data:image")) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();
    image.onload = () => {
      resizeCanvas();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = isDirigeant ? canvasWidth! : canvas.getBoundingClientRect().width;
      const height = isDirigeant ? canvasHeight! : canvas.getBoundingClientRect().height;
      const drawLeft = guideInset;
      const drawTop = guideInset;
      const drawWidth = width - guideInset * 2;
      const drawHeight = height - guideInset * 2;
      const scale = Math.min(drawWidth / image.width, drawHeight / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      const x = drawLeft + (drawWidth - drawW) / 2;
      const y = drawTop + (drawHeight - drawH) / 2;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, x, y, drawW, drawH);
      setHasInk(true);
      emitSignature();
    };
    image.src = initialImage;
  }, [
    canvasHeight,
    canvasWidth,
    emitSignature,
    guideInset,
    initialImage,
    isDirigeant,
    resizeCanvas,
  ]);

  function clampPoint(x: number, y: number) {
    if (!isDirigeant || !canvasWidth || !canvasHeight) return { x, y };
    return {
      x: clamp(x, guideInset, canvasWidth - guideInset),
      y: clamp(y, guideInset, canvasHeight - guideInset),
    };
  }

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return clampPoint(event.clientX - rect.left, event.clientY - rect.top);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture(event.pointerId);
    emitSignature();
  }

  const canvasNode = (
    <canvas
      ref={canvasRef}
      className={cn(
        "touch-none bg-white",
        isDirigeant ? "block" : "h-40 w-full",
      )}
      style={
        isDirigeant
          ? { width: canvasWidth, height: canvasHeight }
          : undefined
      }
      aria-label="Zone de signature"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );

  if (!isDirigeant) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="overflow-hidden rounded-xl border border-border/80 bg-white">
          {canvasNode}
        </div>
        {showClearButton ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={clearCanvas}
            >
              Effacer la signature
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      <div
        className="relative overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm"
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        {canvasNode}
        <div
          className="pointer-events-none absolute rounded-md border border-dashed border-gray-300/70"
          style={{
            left: guideInset,
            top: guideInset,
            right: guideInset,
            bottom: guideInset,
          }}
          aria-hidden
        />
        {showPlaceholder && !hasInk ? (
          <div
            className="pointer-events-none absolute flex flex-col items-center justify-center text-center"
            style={{
              left: guideInset,
              top: guideInset,
              right: guideInset,
              bottom: guideInset,
            }}
          >
            <PenLine className="mb-1.5 h-5 w-5 text-gray-300" strokeWidth={1.5} />
            <p className="text-[11px] font-medium text-gray-400">Signez ici</p>
            <p className="mt-0.5 max-w-[11rem] text-[9px] leading-snug text-gray-300">
              La signature apparaîtra dans cette zone sur vos devis PDF
            </p>
          </div>
        ) : null}
      </div>
      <p className="max-w-[18rem] text-center text-[10px] leading-relaxed text-muted-foreground">
        Restez dans cette zone pour un rendu optimal sur vos devis.
      </p>
      {showClearButton ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={clearCanvas}
        >
          Effacer la signature
        </Button>
      ) : null}
    </div>
  );
}
