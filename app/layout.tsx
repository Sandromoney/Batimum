import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "leaflet/dist/leaflet.css";
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
      data-theme="light"
      data-theme-effective="light"
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
        {children}
      </body>
    </html>
  );
}
