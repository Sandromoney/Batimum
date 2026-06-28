"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CLOSE_DELAY_MS = 150;
const ANIMATION_MS = 250;

/**
 * Menu déroulant : survol sur desktop (pointer fin), clic/tap sur mobile.
 */
export function useHoverDropdown() {
  const [open, setOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [hoverOpenEnabled, setHoverOpenEnabled] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverOpenEnabled(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (open) {
      clearHideTimer();
      setPanelMounted(true);
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setPanelVisible(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setPanelVisible(false);
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setPanelMounted(false);
    }, ANIMATION_MS);

    return () => clearHideTimer();
  }, [clearHideTimer, open]);

  useEffect(
    () => () => {
      clearCloseTimer();
      clearHideTimer();
    },
    [clearCloseTimer, clearHideTimer],
  );

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const toggleMenu = useCallback(() => {
    clearCloseTimer();
    setOpen((value) => !value);
  }, [clearCloseTimer]);

  const containerProps = hoverOpenEnabled
    ? {
        onMouseEnter: openMenu,
        onMouseLeave: scheduleClose,
      }
    : {};

  return {
    open,
    panelMounted,
    panelVisible,
    hoverOpenEnabled,
    openMenu,
    closeMenu,
    toggleMenu,
    containerProps,
    animationMs: ANIMATION_MS,
  };
}
