import { ClientProviders } from "@/components/client-providers";

export default function GoogleLoginCompleteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClientProviders>{children}</ClientProviders>;
}
