"use client";

import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  logo,
  size = "md",
  className,
}: {
  name: string;
  logo?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-hover font-bold text-primary ring-1 ring-border/80",
        size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-10 w-10 text-sm" : "h-9 w-9 text-sm",
        className,
      )}
      title={name}
    >
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="h-full w-full rounded-full object-cover object-center"
        />
      ) : (
        initials
      )}
    </span>
  );
}
