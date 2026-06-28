import { ClientProviders } from "@/components/client-providers";

export default function GoogleSignupCompleteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClientProviders>{children}</ClientProviders>;
}
