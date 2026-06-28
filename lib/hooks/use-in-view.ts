"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

type UseInViewOptions = {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
};

function isElementIntersecting(
  element: HTMLElement,
  threshold: number,
  rootMargin: string,
) {
  const rect = element.getBoundingClientRect();
  const margin = parseRootMargin(rootMargin);
  const rootTop = margin.top;
  const rootRight = window.innerWidth - margin.right;
  const rootBottom = window.innerHeight - margin.bottom;
  const rootLeft = margin.left;

  const visibleWidth =
    Math.min(rect.right, rootRight) - Math.max(rect.left, rootLeft);
  const visibleHeight =
    Math.min(rect.bottom, rootBottom) - Math.max(rect.top, rootTop);

  if (visibleWidth <= 0 || visibleHeight <= 0) return false;

  const visibleArea = visibleWidth * visibleHeight;
  const totalArea = rect.width * rect.height;
  if (totalArea <= 0) return true;

  return visibleArea / totalArea >= threshold;
}

function parseRootMargin(rootMargin: string) {
  const parts = rootMargin.trim().split(/\s+/);
  const values = parts.map((part) => {
    if (part.endsWith("%")) {
      const ratio = Number.parseFloat(part) / 100;
      return {
        x: window.innerWidth * ratio,
        y: window.innerHeight * ratio,
      };
    }
    if (part.endsWith("px")) {
      const px = Number.parseFloat(part);
      return { x: px, y: px };
    }
    return { x: 0, y: 0 };
  });

  const top = values[0]?.y ?? 0;
  const right = (values[1] ?? values[0])?.x ?? 0;
  const bottom = (values[2] ?? values[0])?.y ?? 0;
  const left = (values[3] ?? values[1] ?? values[0])?.x ?? 0;

  return { top, right, bottom, left };
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {},
) {
  const { threshold = 0, rootMargin = "0px", once = true } = options;
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const hasShown = useRef(false);

  const ref = useCallback((element: T | null) => {
    setNode(element);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setInView(true);
      hasShown.current = true;
      return;
    }

    if (!node) return;

    const reveal = () => {
      if (once && hasShown.current) return;
      hasShown.current = true;
      setInView(true);
    };

    if (isElementIntersecting(node, threshold, rootMargin)) {
      reveal();
      if (once) return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);

    const fallback = window.setTimeout(() => {
      if (!hasShown.current) reveal();
    }, 2000);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [node, once, reducedMotion, rootMargin, threshold]);

  return {
    ref,
    inView: reducedMotion || inView,
    reducedMotion,
  };
}
