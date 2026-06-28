import { AppLayoutRouter } from "@/components/app-layout-router";
import { ClientProviders } from "@/components/client-providers";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClientProviders>
      <AppLayoutRouter>{children}</AppLayoutRouter>
    </ClientProviders>
  );
}
