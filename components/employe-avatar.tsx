import type { Employe } from "@/lib/types";
import { employeInitials } from "@/lib/planning-utils";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "btp-avatar btp-avatar-sm h-7 w-7 text-[10px]",
  md: "btp-avatar btp-avatar-md h-9 w-9 text-xs",
  lg: "btp-avatar h-11 w-11 text-sm",
};

export function EmployeAvatar({
  employe,
  size = "md",
  className,
  title,
}: {
  employe: Pick<Employe, "prenom" | "nom" | "photo">;
  size?: Size;
  className?: string;
  title?: string;
}) {
  const initials = employeInitials(employe as Employe);

  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-hover font-bold text-primary ring-1 ring-border",
        sizeClasses[size],
        className,
      )}
    >
      {employe.photo ? (
        <img
          src={employe.photo}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

export function EmployeAvatarGroup({
  employes,
  max = 4,
  size = "sm",
}: {
  employes: Employe[];
  max?: number;
  size?: Size;
}) {
  if (employes.length === 0) return null;

  const visible = employes.slice(0, max);
  const extra = employes.length - visible.length;

  return (
    <span className="inline-flex items-center -space-x-2">
      {visible.map((employe) => (
        <EmployeAvatar
          key={employe.id}
          employe={employe}
          size={size}
          title={`${employe.prenom} ${employe.nom}`}
          className="ring-2 ring-card"
        />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-card-elevated font-medium text-muted-foreground ring-2 ring-card",
            sizeClasses[size],
          )}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
