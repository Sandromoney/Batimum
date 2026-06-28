import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ThemeSync } from "@/components/theme-sync";
import { StoreProvider } from "@/lib/store";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTP Gestion",
  description: "Gestion devis, clients, chantiers et factures",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      data-theme="dark"
      data-theme-effective="dark"
      suppressHydrationWarning
      className={`h-full ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
      </head>
      <body
        className={`min-h-full bg-background font-sans text-foreground antialiased ${GeistSans.className}`}
      >
        <StoreProvider>
          <ThemeSync />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
