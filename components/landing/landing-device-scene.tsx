"use client";

import {
  motion,
  type MotionValue,
  useTransform,
} from "framer-motion";
import {
  LandingDesktopScreen,
  LandingMobileScreen,
} from "@/components/landing/landing-device-screens";

type LandingDeviceSceneProps = {
  progress?: MotionValue<number>;
  reducedMotion?: boolean;
};

export function LandingDeviceScene({
  progress,
  reducedMotion = false,
}: LandingDeviceSceneProps) {
  if (reducedMotion || !progress) {
    return (
      <div className="lp-pro-stage lp-pro-stage--static" aria-hidden="true">
        <div className="lp-pro-mac">
          <MacBookPro />
        </div>
        <div className="lp-pro-phone">
          <IPhonePro />
        </div>
        <p className="lp-pro-caption">Bureau · Terrain</p>
      </div>
    );
  }

  return <ScrollDrivenStage progress={progress} />;
}

function ScrollDrivenStage({ progress }: { progress: MotionValue<number> }) {
  // Scroll story: Mac dominates → slow yaw → phone emerges → phone leads → fade out.
  // Phone never shows its back: rotateY stays near 0 (screen always facing camera).
  const macRotateY = useTransform(progress, [0.04, 0.58], [2, -32]);
  const macRotateX = useTransform(progress, [0.04, 0.58], [12, 5]);
  const macZ = useTransform(progress, [0.04, 0.58], [160, -40]);
  const macX = useTransform(progress, [0.04, 0.58], ["-50%", "-64%"]);
  const macY = useTransform(progress, [0.04, 0.58], ["-48%", "-45%"]);
  const macScale = useTransform(progress, [0.04, 0.58, 0.88], [1.02, 0.9, 0.82]);
  const macOpacity = useTransform(progress, [0.76, 0.94], [1, 0]);

  const phoneRotateY = useTransform(progress, [0.1, 0.6], [6, -2]);
  const phoneRotateX = useTransform(progress, [0.1, 0.6], [10, 2]);
  const phoneZ = useTransform(progress, [0.06, 0.22, 0.6], [-220, -40, 180]);
  const phoneX = useTransform(progress, [0.06, 0.6], ["-46%", "-10%"]);
  const phoneY = useTransform(progress, [0.06, 0.6], ["-42%", "-54%"]);
  const phoneScale = useTransform(progress, [0.06, 0.6], [0.82, 1.1]);
  const phoneOpacity = useTransform(
    progress,
    [0.06, 0.16, 0.28, 0.76, 0.94],
    [0, 0.15, 1, 1, 0],
  );

  const stageOpacity = useTransform(progress, [0.8, 0.98], [1, 0]);
  const stageY = useTransform(progress, [0.8, 0.98], [0, 56]);
  const captionOpacity = useTransform(
    progress,
    [0.4, 0.5, 0.7, 0.84],
    [0, 1, 1, 0],
  );

  return (
    <div className="lp-pro-stage" aria-hidden="true">
      <motion.div
        className="lp-pro-stage__canvas"
        style={{
          opacity: stageOpacity,
          y: stageY,
          perspective: 2000,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="lp-pro-stage__glow" />
        <div className="lp-pro-stage__floor" />

        <motion.div
          className="lp-pro-mac"
          style={{
            x: macX,
            y: macY,
            z: macZ,
            rotateY: macRotateY,
            rotateX: macRotateX,
            scale: macScale,
            opacity: macOpacity,
            transformStyle: "preserve-3d",
          }}
        >
          <MacBookPro />
        </motion.div>

        <motion.div
          className="lp-pro-phone"
          style={{
            x: phoneX,
            y: phoneY,
            z: phoneZ,
            rotateY: phoneRotateY,
            rotateX: phoneRotateX,
            scale: phoneScale,
            opacity: phoneOpacity,
            transformStyle: "preserve-3d",
          }}
        >
          <IPhonePro />
        </motion.div>

        <motion.p className="lp-pro-caption" style={{ opacity: captionOpacity }}>
          Bureau <span aria-hidden="true">→</span> Terrain
        </motion.p>
      </motion.div>
    </div>
  );
}

function MacBookPro() {
  return (
    <div className="lp-pro-mac__rig">
      <div className="lp-pro-mac__lid">
        <div className="lp-pro-mac__lid-metal" />
        <div className="lp-pro-mac__lid-edge" />
        <div className="lp-pro-mac__bezel">
          <span className="lp-pro-mac__camera" />
          <div className="lp-pro-mac__display">
            <div className="lp-pro-mac__glass" />
            <LandingDesktopScreen />
          </div>
        </div>
        <div className="lp-pro-mac__chin" />
      </div>
      <div className="lp-pro-mac__hinge">
        <span />
        <span />
      </div>
      <div className="lp-pro-mac__deck">
        <div className="lp-pro-mac__deck-metal" />
        <div className="lp-pro-mac__speaker" />
        <div className="lp-pro-mac__keyboard">
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className={`lp-pro-mac__key-row lp-pro-mac__key-row--${row}`}>
              {Array.from({ length: row === 4 ? 1 : row === 0 ? 13 : 12 }).map(
                (__, key) => (
                  <span
                    key={key}
                    className={
                      row === 4
                        ? "lp-pro-mac__key lp-pro-mac__key--space"
                        : "lp-pro-mac__key"
                    }
                  />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="lp-pro-mac__trackpad" />
        <div className="lp-pro-mac__deck-lip" />
      </div>
      <div className="lp-pro-mac__shadow lp-pro-mac__shadow--ambient" />
      <div className="lp-pro-mac__shadow lp-pro-mac__shadow--contact" />
      <div className="lp-pro-mac__reflection" />
    </div>
  );
}

function IPhonePro() {
  return (
    <div className="lp-pro-phone__rig">
      <div className="lp-pro-phone__frame">
        <div className="lp-pro-phone__titanium" />
        <span className="lp-pro-phone__btn lp-pro-phone__btn--silent" />
        <span className="lp-pro-phone__btn lp-pro-phone__btn--vol-up" />
        <span className="lp-pro-phone__btn lp-pro-phone__btn--vol-down" />
        <span className="lp-pro-phone__btn lp-pro-phone__btn--power" />
        <div className="lp-pro-phone__screen">
          <span className="lp-pro-phone__island" />
          <div className="lp-pro-phone__glass" />
          <LandingMobileScreen />
        </div>
      </div>
      <div className="lp-pro-phone__shadow lp-pro-phone__shadow--ambient" />
      <div className="lp-pro-phone__shadow lp-pro-phone__shadow--contact" />
    </div>
  );
}
