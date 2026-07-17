import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Calendar,
  ClipboardList,
  FileText,
  HardHat,
  LayoutDashboard,
  LineChart,
  Package,
  Receipt,
  Settings,
  Users,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const DESKTOP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/devis", label: "Devis", icon: FileText },
  { href: "/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/chantiers", label: "Chantiers", icon: HardHat },
  { href: "/pilotage", label: "Pilotage", icon: LineChart },
  { href: "/factures", label: "Factures", icon: Receipt },
  { href: "/planning", label: "Planning", icon: Calendar },
  { href: "/ia", label: "MUM IA", icon: Bot },
  { href: "/parametres/bibliotheque", label: "Fourniture", icon: Package },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

export const MOBILE_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/devis", label: "Devis", icon: FileText },
  { href: "/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/factures", label: "Factures", icon: Receipt },
  { href: "/chantiers", label: "Chantiers", icon: HardHat },
  { href: "/pilotage", label: "Pilotage", icon: LineChart },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/planning", label: "Planning", icon: Calendar },
  { href: "/parametres", label: "Paramètres", icon: Settings },
  { href: "/parametres/bibliotheque", label: "Fourniture", icon: Package },
  { href: "/ia", label: "MUM IA", icon: Bot },
];

export function isAppNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  if (href === "/parametres" && pathname.startsWith("/parametres/bibliotheque")) {
    return false;
  }
  return true;
}
