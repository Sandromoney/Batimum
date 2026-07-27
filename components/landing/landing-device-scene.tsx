import { LandingDesktopScreen } from "@/components/landing/landing-device-screens";

/**
 * Stable Hero visual — dashboard panel only.
 * No MacBook/iPhone images, no sticky scroll, no 3D transforms.
 */
export function LandingHeroVisual() {
  return (
    <div className="lp-hero__visual" aria-hidden="true">
      <div className="lp-hero__panel">
        <LandingDesktopScreen />
      </div>
    </div>
  );
}

/** @deprecated Use LandingHeroVisual — kept for import safety during restore. */
export function LandingDeviceScene() {
  return <LandingHeroVisual />;
}
