"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, CheckCircle2, MapPin, Receipt, Send } from "lucide-react";
import { LandingPhone } from "@/components/landing/landing-device-frames";
import { getPublicSignupHref } from "@/lib/private-beta";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type Screen = "devis" | "planning" | "intervention" | "facture";

const SCREENS: Screen[] = ["devis", "planning", "intervention", "facture"];

const FLOAT_CARDS = [
  { id: "devis", label: "Devis envoyé", delay: 0 },
  { id: "intervention", label: "Intervention ajoutée", delay: 1 },
  { id: "facture", label: "Facture payée", delay: 2 },
  { id: "chantier", label: "Chantier mis à jour", delay: 3 },
] as const;

export function LandingMobileFieldSection() {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [screen, setScreen] = useState<Screen>("devis");
  const signupHref = getPublicSignupHref();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.2, rootMargin: "60px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setScreen("facture");
      return;
    }
    if (!inView) return;

    let index = 0;
    setScreen(SCREENS[0]);
    const id = window.setInterval(() => {
      index = (index + 1) % SCREENS.length;
      setScreen(SCREENS[index]);
    }, 2600);

    return () => window.clearInterval(id);
  }, [inView, reducedMotion]);

  return (
    <section
      id="mobile-chantier"
      ref={ref}
      className={cn(
        "landing-mobile-field",
        inView && "landing-mobile-field--visible",
      )}
      aria-label="Batimum sur chantier, depuis le téléphone"
    >
      <div className="landing-mobile-field__media" aria-hidden>
        <div className="landing-mobile-field__media-frame">
          <Image
            src="/landing/artisan-phone.webp"
            alt=""
            fill
            priority={false}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1100px"
            className="landing-mobile-field__photo"
          />
        </div>
        <div className="landing-mobile-field__veil" />
      </div>

      <div className="landing-container landing-mobile-field__inner">
        <header className="landing-mobile-field__header">
          <h2 className="landing-mobile-field__title">
            Votre entreprise, toujours dans votre poche.
          </h2>
          <p className="landing-mobile-field__lead">
            Clients, devis, planning, chantiers et factures vous suivent
            partout.
          </p>
        </header>

        <div className="landing-mobile-field__stage">
          {FLOAT_CARDS.map((card) => (
            <div
              key={card.id}
              className={cn(
                "landing-mobile-field__float",
                `landing-mobile-field__float--${card.id}`,
              )}
              style={{ "--float-delay": `${card.delay * 120}ms` } as CSSProperties}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              <span>{card.label}</span>
            </div>
          ))}

          <div className="landing-mobile-field__phone-wrap">
            <LandingPhone
              className="landing-mobile-field__phone"
              statusLabel="9:41"
              alive
            >
              <MobileFieldScreen screen={screen} />
            </LandingPhone>
          </div>

          <aside className="landing-mobile-field__previews" aria-hidden>
            <div
              className={cn(
                "landing-mobile-field__preview",
                screen === "devis" && "landing-mobile-field__preview--active",
              )}
            >
              <span>Devis</span>
              <strong>SDB Dupont</strong>
              <em>8 450 € HT</em>
            </div>
            <div
              className={cn(
                "landing-mobile-field__preview",
                screen === "planning" && "landing-mobile-field__preview--active",
              )}
            >
              <span>Planning</span>
              <strong>Mardi · Lucas</strong>
              <em>08:00 – 17:00</em>
            </div>
            <div
              className={cn(
                "landing-mobile-field__preview",
                screen === "intervention" &&
                  "landing-mobile-field__preview--active",
              )}
            >
              <span>Intervention</span>
              <strong>Rénovation SDB</strong>
              <em>12 rue des Lilas</em>
            </div>
            <div
              className={cn(
                "landing-mobile-field__preview",
                screen === "facture" && "landing-mobile-field__preview--active",
              )}
            >
              <span>Facture</span>
              <strong>FAC-2408</strong>
              <em>Envoyée</em>
            </div>
          </aside>
        </div>

        <div className="landing-mobile-field__cta-row">
          <Link
            href={signupHref}
            className="landing-btn-primary group landing-mobile-field__cta"
          >
            Piloter mon entreprise avec Batimum
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
          <p className="landing-mobile-field__credit">
            Photo chantier libre de droits · Unsplash
          </p>
        </div>
      </div>
    </section>
  );
}

function MobileFieldScreen({ screen }: { screen: Screen }) {
  return (
    <div className="field-phone-ui">
      <div className="field-phone-ui__top">
        <strong>Batimum</strong>
        <span className="field-phone-ui__pill">
          {screen === "devis"
            ? "Devis"
            : screen === "planning"
              ? "Planning"
              : screen === "intervention"
                ? "Terrain"
                : "Facture"}
        </span>
      </div>

      {screen === "devis" ? (
        <div className="field-phone-ui__card field-phone-ui__card--enter">
          <p className="field-phone-ui__kicker">Devis</p>
          <p className="field-phone-ui__title">Rénovation salle de bain</p>
          <p className="field-phone-ui__meta">M. Dupont</p>
          <p className="field-phone-ui__amount">8 450 € HT</p>
          <span className="field-phone-ui__status">
            <Send className="h-3.5 w-3.5" aria-hidden />
            Prêt à envoyer
          </span>
        </div>
      ) : null}

      {screen === "planning" ? (
        <div className="field-phone-ui__card field-phone-ui__card--enter">
          <p className="field-phone-ui__kicker">Planning</p>
          <p className="field-phone-ui__title">Mardi</p>
          <div className="field-phone-ui__row">
            <span>Lucas</span>
            <span>08:00 – 17:00</span>
          </div>
          <div className="field-phone-ui__row">
            <span>SDB Dupont</span>
            <span className="field-phone-ui__ok">Affecté</span>
          </div>
        </div>
      ) : null}

      {screen === "intervention" ? (
        <div className="field-phone-ui__card field-phone-ui__card--enter">
          <p className="field-phone-ui__kicker">Intervention</p>
          <p className="field-phone-ui__title">Rénovation salle de bain</p>
          <p className="field-phone-ui__meta">Client Dupont</p>
          <p className="field-phone-ui__address">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            12 rue des Lilas, Lyon
          </p>
        </div>
      ) : null}

      {screen === "facture" ? (
        <div className="field-phone-ui__card field-phone-ui__card--enter">
          <p className="field-phone-ui__kicker">Facture</p>
          <p className="field-phone-ui__title">FAC-2408</p>
          <p className="field-phone-ui__meta">M. Dupont · 8 450 € HT</p>
          <span className="field-phone-ui__status field-phone-ui__status--paid">
            <Receipt className="h-3.5 w-3.5" aria-hidden />
            Facture envoyée
          </span>
        </div>
      ) : null}

      <div className="field-phone-ui__dots" aria-hidden>
        {SCREENS.map((item) => (
          <span
            key={item}
            className={cn(
              "field-phone-ui__dot",
              item === screen && "field-phone-ui__dot--active",
            )}
          />
        ))}
      </div>
    </div>
  );
}
