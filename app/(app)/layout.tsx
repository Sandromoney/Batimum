import { AppLayoutRouter } from "@/components/app-layout-router";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppLayoutRouter>{children}</AppLayoutRouter>;
}
