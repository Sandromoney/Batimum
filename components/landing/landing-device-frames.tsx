import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type LandingPhoneProps = {
  children: ReactNode;
  className?: string;
  statusLabel?: string;
  /** Premium 3D phone (default). Classic kept for rare legacy demos. */
  variant?: "classic" | "iphone";
  /** Idle breathe / float animation (paused via CSS when reduced-motion). */
  alive?: boolean;
};

/** Cadre smartphone premium — CSS 3D, pas de WebGL. Utilisable en RSC. */
export function LandingPhone({
  children,
  className,
  statusLabel = "9:41",
  variant = "iphone",
  alive = false,
}: LandingPhoneProps) {
  if (variant === "classic") {
    return (
      <div
        className={cn(
          "landing-phone relative mx-auto w-[min(100%,280px)] select-none",
          className,
        )}
      >
        <div className="landing-phone__bezel">
          <div className="landing-phone__notch" aria-hidden="true">
            <span className="landing-phone__status">{statusLabel}</span>
          </div>
          <div className="landing-phone__screen">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "landing-device landing-device--phone",
        alive && "landing-device--alive",
        "relative mx-auto w-[min(100%,300px)] select-none",
        className,
      )}
    >
      <div className="landing-device__scene">
        <div className="landing-device__shadow" aria-hidden />
        <div className="landing-device__body">
          <span className="landing-device__side landing-device__side--silent" aria-hidden />
          <span className="landing-device__side landing-device__side--vol-up" aria-hidden />
          <span className="landing-device__side landing-device__side--vol-down" aria-hidden />
          <span className="landing-device__side landing-device__side--power" aria-hidden />

          <div className="landing-device__chassis">
            <div className="landing-device__glass">
              <div className="landing-device__island" aria-hidden>
                <span className="landing-device__island-cam" />
                <span className="landing-device__island-sensor" />
              </div>
              <div className="landing-device__status" aria-hidden>
                <span>{statusLabel}</span>
                <span className="landing-device__status-right">
                  <i className="landing-device__signal" />
                  <i className="landing-device__battery" />
                </span>
              </div>
              <div className="landing-device__screen">{children}</div>
              <div className="landing-device__glare" aria-hidden />
              <div className="landing-device__home" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type LandingLaptopProps = {
  children: ReactNode;
  className?: string;
  alive?: boolean;
  /** Compact for side-by-side compositions */
  size?: "md" | "lg";
};

/** Ordinateur premium bureau — CSS 3D, sans WebGL. */
export function LandingLaptop({
  children,
  className,
  alive = false,
  size = "lg",
}: LandingLaptopProps) {
  return (
    <div
      className={cn(
        "landing-laptop",
        alive && "landing-laptop--alive",
        size === "md" && "landing-laptop--md",
        "relative mx-auto w-full select-none",
        className,
      )}
    >
      <div className="landing-laptop__scene">
        <div className="landing-laptop__shadow" aria-hidden />
        <div className="landing-laptop__lid">
          <div className="landing-laptop__bezel">
            <span className="landing-laptop__cam" aria-hidden />
            <div className="landing-laptop__screen">{children}</div>
            <div className="landing-laptop__glare" aria-hidden />
          </div>
        </div>
        <div className="landing-laptop__base" aria-hidden>
          <div className="landing-laptop__hinge" />
          <div className="landing-laptop__deck">
            <div className="landing-laptop__keys" />
            <div className="landing-laptop__track" />
          </div>
          <div className="landing-laptop__front" />
        </div>
      </div>
    </div>
  );
}

type LandingTabletProps = {
  children: ReactNode;
  className?: string;
};

/** @deprecated Prefer LandingLaptop for desk demos — kept for compatibility. */
export function LandingTablet({ children, className }: LandingTabletProps) {
  return (
    <LandingLaptop className={className} size="md">
      {children}
    </LandingLaptop>
  );
}
