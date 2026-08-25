import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneColor, toneOf } from "@/lib/analytics";

export function ScoreBar({
  value,
  delay = 0,
  className,
}: {
  value: number;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="grow-bar h-full rounded-full"
        style={{
          width: `${Math.max(2, Math.min(100, value * 100))}%`,
          backgroundColor: toneColor[toneOf(value)],
          animationDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

export function SectionCard({
  title: heading,
  subtitle,
  action,
  children,
  className,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={cn("panel rise-in p-5", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-bold tracking-tight">{heading}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ToneDot({ value }: { value: number }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: toneColor[toneOf(value)] }}
    />
  );
}
