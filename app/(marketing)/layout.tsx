import "./marketing-emerald.css";
import { MarketingProviders } from "@/components/marketing-providers";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <MarketingProviders>
      <div className="marketing-emerald">{children}</div>
    </MarketingProviders>
  );
}
