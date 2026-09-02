import type { ReactNode } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Minus, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/mystery/calculations";
import { INDICATOR_STATE_LABEL, STATUS_LABEL } from "@/lib/mystery/calculations";

/* ---------- StatusBadge ---------- */

const STATUS_STYLES: Record<Status, string> = {
  alto: "bg-success/10 text-success border-success/25",
  medio: "bg-warning/10 text-warning border-warning/25",
  critico: "bg-danger/10 text-danger border-danger/25",
  "sin-evaluar": "bg-muted text-muted-foreground border-border",
};

const STATUS_DOT: Record<Status, string> = {
  alto: "bg-success",
  medio: "bg-warning",
  critico: "bg-danger",
  "sin-evaluar": "bg-neutral-status",
};

export function StatusBadge({
  status,
  variant = "nivel",
  className,
}: {
  status: Status;
  variant?: "nivel" | "estado";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {variant === "nivel" ? STATUS_LABEL[status] : INDICATOR_STATE_LABEL[status]}
    </span>
  );
}

/* ---------- MetricCard ---------- */

export function MetricCard({
  label,
  value,
  subtext,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: "default" | "success" | "danger" | "primary";
  icon?: ReactNode;
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    danger: "text-danger",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_oklch(0.3_0.03_260/0.05)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {label}
        </p>
        {icon}
      </div>
      <p className={cn("mt-1.5 text-[28px] leading-none font-bold tabular-nums xl:text-[32px]", toneClass)}>
        {value}
      </p>
      {subtext && <p className="mt-2 text-xs leading-snug text-muted-foreground">{subtext}</p>}
    </div>
  );
}

/* ---------- GapChip ---------- */

export function GapChip({ gap, className }: { gap: number | null; className?: string }) {
  if (gap === null) return <span className="text-muted-foreground">—</span>;
  const pp = Math.abs(gap * 100).toFixed(1);
  if (Math.abs(gap) < 0.0005)
    return (
      <span className={cn("flex flex-wrap justify-center items-center gap-1 text-sm font-semibold text-muted-foreground", className)}>
        <Minus className="h-3.5 w-3.5" /> 0.0 pp
      </span>
    );
  const positive = gap > 0;
  return (
    <span
      className={cn(
        "flex justify-center items-center gap-1 text-sm font-semibold tabular-nums",
        positive ? "text-success" : "text-danger",
        className,
      )}
    >
      {positive ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {positive ? "+" : "−"}
      {pp} pp
    </span>
  );
}

/* ---------- SectionHeader ---------- */

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-[17px] font-bold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- EmptyState ---------- */

export function EmptyState({
  message = "No hay evaluaciones disponibles para los filtros seleccionados.",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      <SearchX className="h-8 w-8 text-muted-foreground/50" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/* ---------- ProgressBar (barras de cumplimiento) ---------- */

export function ScoreBar({
  value,
  status,
  className,
}: {
  value: number | null;
  status: Status;
  className?: string;
}) {
  const color = {
    alto: "bg-success",
    medio: "bg-warning",
    critico: "bg-danger",
    "sin-evaluar": "bg-neutral-status/40",
  }[status];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-200", color)}
        style={{ width: `${Math.max(0, Math.min(100, (value ?? 0) * 100))}%` }}
      />
    </div>
  );
}

/* ---------- InfoNote ---------- */

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-accent px-3 py-2 text-xs leading-relaxed text-accent-foreground">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}
