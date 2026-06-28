"use client";

export function DashboardWelcome({
  greeting,
  name,
  subtitle,
}: {
  greeting: string;
  name: string;
  subtitle: string;
}) {
  return (
    <header className="btp-page-header mb-5 flex flex-col gap-3 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
          {greeting} {name}{" "}
          <span className="inline-block animate-[wave_2s_ease-in-out_infinite]">
            👋
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-[0.95rem]">
          {subtitle}
        </p>
      </div>
    </header>
  );
}
