"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  LandingDesktopScreen,
  LandingMobileScreen,
} from "@/components/landing/landing-device-screens";

export type DeviceFocus = "desktop" | "mobile";

type LandingDeviceSceneProps = {
  onFocusChange?: (focus: DeviceFocus) => void;
};

const HOLD_MS = 4000;
const ROTATE_S = 1.4;

export function LandingDeviceScene({ onFocusChange }: LandingDeviceSceneProps) {
  const reducedMotion = useReducedMotion();
  const [focus, setFocus] = useState<DeviceFocus>("desktop");

  useEffect(() => {
    onFocusChange?.(focus);
  }, [focus, onFocusChange]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setFocus((prev) => (prev === "desktop" ? "mobile" : "desktop"));
    }, HOLD_MS + ROTATE_S * 1000);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <div className="lp-device-stage lp-device-stage--static" aria-hidden="true">
        <div className="lp-device lp-macbook">
          <MacBookFrame />
        </div>
        <div className="lp-device lp-iphone">
          <IPhoneFrame />
        </div>
      </div>
    );
  }

  const desktopFront = focus === "desktop";

  return (
    <div className="lp-device-stage" aria-hidden="true">
      <div className="lp-device-stage__floor" />
      <motion.div
        className="lp-device-orbit"
        animate={{ rotateY: desktopFront ? 0 : 180 }}
        transition={{ duration: ROTATE_S, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* MacBook — face avant de l’orbite */}
        <motion.div
          className="lp-device lp-macbook"
          style={{
            x: "-50%",
            y: "-50%",
            z: 70,
            transformStyle: "preserve-3d",
          }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <MacBookFrame />
          </motion.div>
        </motion.div>

        {/* iPhone — face arrière (dos à dos), toujours orienté vers l’extérieur */}
        <motion.div
          className="lp-device lp-iphone"
          style={{
            x: "-50%",
            y: "-48%",
            z: -70,
            rotateY: 180,
            transformStyle: "preserve-3d",
          }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 5.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.35,
            }}
          >
            <IPhoneFrame />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function LandingDeviceContext({ focus }: { focus: DeviceFocus }) {
  const copy =
    focus === "desktop"
      ? "Au bureau, pilotez vos devis, vos factures et votre rentabilité."
      : "Sur le terrain, vos équipes retrouvent leur planning, leurs consignes et leurs chantiers.";

  return (
    <div className="lp-hero__context">
      <div className="lp-device-toggle" aria-hidden="true">
        <span className={focus === "desktop" ? "is-active" : undefined}>
          Bureau
        </span>
        <span className={focus === "mobile" ? "is-active" : undefined}>
          Terrain
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={focus}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          {copy}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function MacBookFrame() {
  return (
    <div>
      <div className="lp-macbook__body">
        <div className="lp-macbook__bezel">
          <div className="lp-macbook__camera" />
          <div className="lp-macbook__screen">
            <LandingDesktopScreen />
          </div>
        </div>
      </div>
      <div className="lp-macbook__base">
        <div className="lp-macbook__notch" />
      </div>
    </div>
  );
}

function IPhoneFrame() {
  return (
    <div className="lp-iphone__body">
      <span className="lp-iphone__side lp-iphone__side--left" />
      <span className="lp-iphone__side lp-iphone__side--right" />
      <div className="lp-iphone__screen">
        <div className="lp-iphone__island" />
        <LandingMobileScreen />
      </div>
    </div>
  );
}
