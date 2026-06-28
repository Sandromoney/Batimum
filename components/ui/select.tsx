"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function parseOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  function walk(nodes: ReactNode) {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;

      if (typeof child.type === "string" && child.type === "option") {
        const props = child.props as {
          value?: string | number;
          disabled?: boolean;
          children?: ReactNode;
        };

        options.push({
          value: String(props.value ?? ""),
          label: String(props.children ?? ""),
          disabled: props.disabled,
        });
        return;
      }

      const props = child.props as { children?: ReactNode };
      if (props.children) walk(props.children);
    });
  }

  walk(children);
  return options;
}

const triggerClassName = cn(
  "flex w-full items-center justify-between gap-2 rounded-2xl border border-border/80 bg-card/90 px-4 py-3 text-left text-sm text-foreground shadow-[var(--shadow-input)]",
  "transition-all duration-200",
  "hover:border-border hover:bg-card-elevated/70",
  "focus:border-primary/60 focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const menuClassName = cn(
  "z-[60] max-h-60 overflow-auto rounded-2xl border border-border/80 bg-card p-1.5 shadow-card",
);

export function Select({
  className,
  children,
  value,
  onChange,
  disabled,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const options = useMemo(() => parseOptions(children), [children]);
  const selected =
    options.find((option) => option.value === String(value ?? "")) ?? options[0];

  function updateMenuPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        (target instanceof Element && target.closest("[data-select-menu]"))
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function emitChange(nextValue: string) {
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as React.ChangeEvent<HTMLSelectElement>);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          triggerClassName,
          className,
          open && "border-primary/60 ring-4 ring-primary/10",
        )}
        onClick={() => {
          if (disabled || options.length === 0) return;
          if (!open) updateMenuPosition();
          setOpen((isOpen) => !isOpen);
        }}
        {...(props.id ? { id: props.id } : {})}
      >
        <span className="min-w-0 truncate">
          {selected?.label ?? "Sélectionner"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
          strokeWidth={2}
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            role="listbox"
            data-select-menu
            className={menuClassName}
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
            aria-activedescendant={selected?.value}
          >
            {options.map((option, index) => {
              const isSelected = option.value === String(value ?? "");

              return (
                <li key={`${option.value}-${index}`} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={cn(
                      "w-full rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors duration-150",
                      index > 0 && "border-t border-border/45",
                      isSelected
                        ? "bg-primary font-medium text-primary-foreground"
                        : "text-foreground hover:bg-primary/12 hover:text-primary",
                      option.disabled && "cursor-not-allowed opacity-40",
                    )}
                    onClick={() => {
                      if (option.disabled) return;
                      emitChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
