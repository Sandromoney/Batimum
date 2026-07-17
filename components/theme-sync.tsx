"use client";

import { useLayoutEffect } from "react";
import { applyTheme } from "@/lib/theme";

/** Force le thème clair unique au chargement. */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme();
  }, []);

  return null;
}
