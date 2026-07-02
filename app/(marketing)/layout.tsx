import { SupabaseProvider } from "@/components/supabase-provider";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SupabaseProvider>
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </SupabaseProvider>
  );
}
