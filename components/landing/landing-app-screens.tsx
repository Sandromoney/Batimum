"use client";

import { type ReactNode } from "react";
import {
  Bot,
  CalendarDays,
  Euro,
  FileText,
  HardHat,
  Home,
  Menu,
  Receipt,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { DashboardWelcome } from "@/components/dashboard-welcome";
import { DevisCounters } from "@/components/devis-counters";
import { EmployeeTaskCard } from "@/components/employee-task-card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { EmployeeTaskContext } from "@/lib/employee-planning";
import type { EvenementPlanning } from "@/lib/types";
import { cn } from "@/lib/utils";

export type AppScreenId =
  | "dashboard"
  | "devis"
  | "planning"
  | "chantier"
  | "pilotage"
  | "factures"
  | "mum-ia";

/** Ordre produit demandé (héros). */
export const APP_SCREEN_ORDER: AppScreenId[] = [
  "dashboard",
  "devis",
  "planning",
  "chantier",
  "pilotage",
  "factures",
  "mum-ia",
];

const DEMO_EVENT: EvenementPlanning = {
  id: "landing-evt-dupont",
  titre: "Pose carrelage",
  tache: "Rénovation salle de bain",
  date: "2026-07-21",
  heureDebut: "08:00",
  heureFin: "17:00",
  type: "intervention",
};

const DEMO_TASK: EmployeeTaskContext = {
  event: DEMO_EVENT,
  chantierNom: "Rénovation SDB — Dupont",
  clientNom: "M. Dupont",
  adresseComplete: "12 rue des Artisans, Albi",
  adresseCompleteValide: true,
  displayTitle: "Pose carrelage",
  status: "en_cours",
  responsableNom: "Thomas",
  responsableTelephone: "06 12 34 56 78",
};

export function LandingAppScreen({
  id,
  density = "phone",
}: {
  id: AppScreenId;
  density?: "phone" | "desk";
}) {
  switch (id) {
    case "dashboard":
      return <ScreenDashboard density={density} />;
    case "devis":
      return <ScreenDevis density={density} />;
    case "planning":
      return <ScreenPlanning />;
    case "chantier":
      return <ScreenChantier />;
    case "pilotage":
      return <ScreenPilotage density={density} />;
    case "factures":
      return <ScreenFactures density={density} />;
    case "mum-ia":
      return <ScreenMumIa />;
    default:
      return null;
  }
}

export function LandingAppPhoneShell({
  active,
  children,
}: {
  active: AppScreenId;
  children: ReactNode;
}) {
  return (
    <div className="hero-app">
      <div className="hero-app__body">{children}</div>
      <nav className="hero-app__tabbar" aria-hidden>
        <span className={cn(active === "dashboard" && "is-active")}>
          <Home className="h-3.5 w-3.5" />
          Accueil
        </span>
        <span className={cn(active === "devis" && "is-active")}>
          <FileText className="h-3.5 w-3.5" />
          Devis
        </span>
        <span className={cn(active === "planning" && "is-active")}>
          <CalendarDays className="h-3.5 w-3.5" />
          Planning
        </span>
        <span className={cn(active === "chantier" && "is-active")}>
          <HardHat className="h-3.5 w-3.5" />
          Chantiers
        </span>
        <span
          className={cn(
            (active === "pilotage" ||
              active === "factures" ||
              active === "mum-ia") &&
              "is-active",
          )}
        >
          <Menu className="h-3.5 w-3.5" />
          Menu
        </span>
      </nav>
    </div>
  );
}

function ScreenDashboard({ density }: { density: "phone" | "desk" }) {
  return (
    <div className={cn("hero-ui", density === "desk" && "hero-ui--desk")}>
      <DashboardWelcome
        greeting="Bonjour"
        name="Thomas"
        subtitle="Votre journée chantier · Batimum"
      />
      <div className="hero-ui__card hero-ui__card--accent">
        <div className="hero-ui__row">
          <span className="hero-ui__kicker">Chiffre d’affaires</span>
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <p className="hero-ui__amount">42 650 €</p>
        <div className="hero-ui__spark" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="hero-ui__card">
        <p className="hero-ui__kicker">À faire aujourd’hui</p>
        <p className="hero-ui__line">Devis à envoyer · 3</p>
        <p className="hero-ui__line">Factures en attente · 5</p>
        <p className="hero-ui__line">Interventions prévues · 2</p>
      </div>
      <div className="hero-ui__card">
        <p className="hero-ui__kicker">Chantiers en cours</p>
        <ProgressBar value={60} size="sm" label="Rénovation SDB — Dupont" />
      </div>
    </div>
  );
}

function ScreenDevis({ density }: { density: "phone" | "desk" }) {
  if (density === "desk") {
    return (
      <div className="hero-ui hero-ui--desk">
        <div className="hero-ui__head">
          <strong>Devis</strong>
        <Badge label="Brouillon" status="brouillon" />
      </div>
        <DevisCounters
          counters={{
            total: 24,
            brouillon: 3,
            envoye: 8,
            signe: 11,
            accepte: 0,
            refuse: 1,
            expire: 1,
          }}
        />
        <div className="hero-ui__card">
          <div className="hero-ui__lot">
            <span>DEV-2408 · Dupont</span>
            <span>8 450 €</span>
          </div>
          <div className="hero-ui__lot">
            <span>DEV-2407 · SCI Terrasses</span>
            <span>4 200 €</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-ui">
      <div className="hero-ui__head">
        <strong>Nouveau devis</strong>
        <Badge label="Brouillon" status="brouillon" />
      </div>
      <p className="hero-ui__client">Client — M. Dupont</p>
      <p className="hero-ui__title">Rénovation salle de bain</p>
      <div className="hero-ui__card">
        <div className="hero-ui__lot">
          <span>Dépose ancienne</span>
          <span>480 €</span>
        </div>
        <div className="hero-ui__lot">
          <span>Carrelage 30×60</span>
          <span>3 120 €</span>
        </div>
        <div className="hero-ui__lot">
          <span>Pose collée + joints</span>
          <span>2 450 €</span>
        </div>
        <div className="hero-ui__total">
          <span>Total HT</span>
          <strong>8 450 €</strong>
        </div>
      </div>
      <div className="hero-ui__cta">Envoyer le devis</div>
    </div>
  );
}

function ScreenPlanning() {
  return (
    <div className="hero-ui hero-ui--real">
      <div className="hero-ui__head">
        <strong>Mon planning</strong>
        <Badge label="En cours" status="en_cours" />
      </div>
      <EmployeeTaskCard context={DEMO_TASK} compact />
    </div>
  );
}

function ScreenChantier() {
  return (
    <div className="hero-ui">
      <div className="hero-ui__head">
        <strong>Chantier Dupont</strong>
        <Badge label="En cours" status="en_cours" />
      </div>
      <div className="hero-ui__card">
        <ProgressBar value={60} size="sm" label="Avancement" />
      </div>
      <div className="hero-ui__card">
        <p className="hero-ui__kicker">Dépenses</p>
        <p className="hero-ui__amount hero-ui__amount--sm">3 250 €</p>
      </div>
      <div className="hero-ui__card hero-ui__card--accent">
        <p className="hero-ui__kicker">Marge prévisionnelle</p>
        <p className="hero-ui__amount hero-ui__amount--sm">24 %</p>
      </div>
    </div>
  );
}

function ScreenFactures({ density }: { density: "phone" | "desk" }) {
  return (
    <div className={cn("hero-ui", density === "desk" && "hero-ui--desk")}>
      <div className="hero-ui__head">
        <strong>Factures</strong>
        <Receipt className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="hero-ui__card hero-ui__card--accent">
        <div className="hero-ui__row">
          <p className="hero-ui__kicker">FAC-2408</p>
          <Badge label="Payée" status="payee" />
        </div>
        <p className="hero-ui__title">M. Dupont</p>
        <div className="hero-ui__progress">
          <span>8 450 € HT</span>
        </div>
      </div>
      <div className="hero-ui__card">
        <div className="hero-ui__row">
          <p className="hero-ui__kicker">FAC-2407</p>
          <Badge label="En attente" status="en_attente" />
        </div>
        <p className="hero-ui__title">SCI Les Terrasses</p>
        <div className="hero-ui__progress">
          <span>4 200 € HT</span>
        </div>
      </div>
    </div>
  );
}

function ScreenPilotage({ density }: { density: "phone" | "desk" }) {
  return (
    <div className={cn("hero-ui", density === "desk" && "hero-ui--desk")}>
      <div className="hero-ui__head">
        <strong>Pilotage</strong>
        <Euro className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="hero-ui__card hero-ui__card--accent">
        <p className="hero-ui__kicker">Marge du mois</p>
        <p className="hero-ui__amount">12 640 €</p>
      </div>
      <div className="hero-ui__metrics">
        <div>
          <p>Prévu</p>
          <strong>120 h</strong>
        </div>
        <div>
          <p>Réel</p>
          <strong>138 h</strong>
        </div>
      </div>
      <div className="hero-ui__card">
        <p className="hero-ui__kicker">Alerte</p>
        <p className="hero-ui__title">1 chantier dépasse le budget</p>
      </div>
    </div>
  );
}

function ScreenMumIa() {
  return (
    <div className="hero-ui">
      <div className="hero-ui__head">
        <strong>MUM IA</strong>
        <Sparkles className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="hero-ui__card">
        <p className="hero-ui__kicker">Dictée chantier</p>
        <p className="hero-ui__line">
          Fais un devis pour M. Dupont — 25 m² de carrelage, fourniture et pose.
        </p>
      </div>
      <div className="hero-ui__card hero-ui__card--accent">
        <div className="hero-ui__row">
          <Bot className="h-3.5 w-3.5 text-emerald-600" />
          <span className="hero-ui__kicker">Analyse</span>
        </div>
        <p className="hero-ui__line">Client identifié · Lot carrelage</p>
        <p className="hero-ui__line">Surface 25 m² · TVA à vérifier</p>
      </div>
      <div className="hero-ui__cta">Vérifier le devis</div>
    </div>
  );
}
