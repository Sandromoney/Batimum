"use client";



import { cn } from "@/lib/utils";



export function PageHeader({

  title,

  description,

  action,

}: {

  title: string;

  description?: string;

  action?: React.ReactNode;

}) {

  return (

    <header className="btp-page-header mb-8 flex flex-col gap-5 sm:mb-10 xl:flex-row xl:items-center xl:justify-between">

      <span className="min-w-0">

        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">

          {title}

        </h1>

        {description && (

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">

            {description}

          </p>

        )}

      </span>

      {action && (

        <span className="flex shrink-0 flex-wrap items-center gap-3">

          {action}

        </span>

      )}

    </header>

  );

}

