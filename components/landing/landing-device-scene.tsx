"use client";

import Image from "next/image";
import {
  motion,
  type MotionValue,
  useTransform,
} from "framer-motion";

const MACBOOK_FRAME = "/assets/devices/macbook.jpg";
const IPHONE_FRAME = "/assets/devices/iphone17pro.png";

/** Screen slot — calibrated on public/assets/devices/macbook.png (960×960) */
const MAC_SCREEN = {
  left: "8.65%",
  top: "20.94%",
  width: "86.56%",
  height: "58.44%",
  radius: "0.35rem",
} as const;

/** Screen slot — Apple Design Resources frame (1350×2760) */
const PHONE_SCREEN = {
  left: "5.48%",
  top: "2.57%",
  width: "88.96%",
  height: "94.82%",
  radius: "14.67%",
} as const;

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
        <MacBookMockup />
        <PhoneMockup />
        <p className="lp-pro-caption">Bureau · Terrain</p>
      </div>
    );
  }

  return <ScrollDrivenStage progress={progress} />;
}

function ScrollDrivenStage({ progress }: { progress: MotionValue<number> }) {
  const macRotateY = useTransform(progress, [0.04, 0.62], [6, -24]);
  const macRotateX = useTransform(progress, [0.04, 0.62], [8, 3]);
  const macZ = useTransform(progress, [0.04, 0.62], [140, -60]);
  const macX = useTransform(progress, [0.04, 0.62], ["-50%", "-58%"]);
  const macY = useTransform(progress, [0.04, 0.62], ["-50%", "-48%"]);
  const macScale = useTransform(progress, [0.04, 0.62, 0.9], [1, 0.92, 0.88]);
  const macOpacity = useTransform(progress, [0.78, 0.96], [1, 0]);

  const phoneRotateY = useTransform(progress, [0.12, 0.65], [4, -2]);
  const phoneRotateX = useTransform(progress, [0.12, 0.65], [6, 1]);
  const phoneZ = useTransform(progress, [0.06, 0.28, 0.65], [-240, -80, 150]);
  const phoneX = useTransform(progress, [0.06, 0.65], ["-48%", "-8%"]);
  const phoneY = useTransform(progress, [0.06, 0.65], ["-48%", "-54%"]);
  const phoneScale = useTransform(progress, [0.06, 0.65], [0.86, 1.06]);
  const phoneOpacity = useTransform(
    progress,
    [0.06, 0.2, 0.32, 0.78, 0.96],
    [0, 0, 1, 1, 0],
  );

  const stageOpacity = useTransform(progress, [0.82, 0.98], [1, 0]);
  const stageY = useTransform(progress, [0.82, 0.98], [0, 48]);
  const captionOpacity = useTransform(
    progress,
    [0.44, 0.54, 0.72, 0.86],
    [0, 1, 1, 0],
  );

  return (
    <div className="lp-pro-stage" aria-hidden="true">
      <motion.div
        className="lp-pro-stage__canvas"
        style={{
          opacity: stageOpacity,
          y: stageY,
          perspective: 2200,
          transformStyle: "preserve-3d",
        }}
      >
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
          <MacBookMockup />
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
          <PhoneMockup />
        </motion.div>

        <motion.p className="lp-pro-caption" style={{ opacity: captionOpacity }}>
          Bureau <span aria-hidden="true">→</span> Terrain
        </motion.p>
      </motion.div>
    </div>
  );
}

function MacBookMockup() {
  return (
    <div className="lp-device-mock lp-device-mock--mac">
      <div className="lp-device-mock__shadow lp-device-mock__shadow--ambient" />
      <div className="lp-device-mock__shadow lp-device-mock__shadow--contact" />
      <div className="lp-device-mock__reflection" />
      <div className="lp-device-mock__body">
        <div
          className="lp-device-mock__screen lp-device-mock__screen--mac"
          style={{
            left: MAC_SCREEN.left,
            top: MAC_SCREEN.top,
            width: MAC_SCREEN.width,
            height: MAC_SCREEN.height,
            borderRadius: MAC_SCREEN.radius,
          }}
        />
        <Image
          src={MACBOOK_FRAME}
          alt=""
          width={960}
          height={960}
          className="lp-device-mock__frame"
          priority
          draggable={false}
        />
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="lp-device-mock lp-device-mock--phone">
      <div className="lp-device-mock__shadow lp-device-mock__shadow--ambient" />
      <div className="lp-device-mock__shadow lp-device-mock__shadow--contact" />
      <div className="lp-device-mock__reflection" />
      <div className="lp-device-mock__body">
        <div
          className="lp-device-mock__screen lp-device-mock__screen--phone"
          style={{
            left: PHONE_SCREEN.left,
            top: PHONE_SCREEN.top,
            width: PHONE_SCREEN.width,
            height: PHONE_SCREEN.height,
            borderRadius: PHONE_SCREEN.radius,
          }}
        />
        <Image
          src={IPHONE_FRAME}
          alt=""
          width={1350}
          height={2760}
          className="lp-device-mock__frame"
          priority
          draggable={false}
        />
      </div>
    </div>
  );
}
