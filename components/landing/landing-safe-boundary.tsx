"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  /** Nom court pour les logs de développement. */
  name?: string;
};

type State = {
  hasError: boolean;
};

/**
 * Isolates a decorative subtree so a local render crash cannot blank the landing.
 * Logs in development only — never swallows silently without a visible fallback.
 */
export class LandingSafeBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "development") return;
    const label = this.props.name ? `LandingSafeBoundary:${this.props.name}` : "LandingSafeBoundary";
    console.error(`[${label}]`, error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
