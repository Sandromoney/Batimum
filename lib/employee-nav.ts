import type { LucideIcon } from "lucide-react";
import { CalendarDays, ClipboardList, Home, User } from "lucide-react";

export type EmployeeNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const EMPLOYEE_NAV_ITEMS: EmployeeNavItem[] = [
  { href: "/planning-employe", label: "Accueil", icon: Home },
  { href: "/planning-employe/planning", label: "Mon planning", icon: CalendarDays },
  { href: "/planning-employe/taches", label: "Mes tâches", icon: ClipboardList },
  { href: "/planning-employe/profil", label: "Mon profil", icon: User },
];

export function isEmployeeNavItemActive(pathname: string, href: string): boolean {
  if (href === "/planning-employe") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
