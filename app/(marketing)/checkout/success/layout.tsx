import { ClientProviders } from "@/components/client-providers";

export default function CheckoutSuccessLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClientProviders>{children}</ClientProviders>;
}
