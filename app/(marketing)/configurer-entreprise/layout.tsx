import { ClientProviders } from "@/components/client-providers";

export default function ConfigurerEntrepriseLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClientProviders>{children}</ClientProviders>;
}
