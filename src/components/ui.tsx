import { cn } from "@/lib/cn";
import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-line/80 bg-card/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] backdrop-blur-sm",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-medium uppercase tracking-[0.22em] text-mute", className)}>
      {children}
    </p>
  );
}

export function Button({
  tone = "accent",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "accent" | "ghost" | "danger" | "quiet";
}) {
  const tones = {
    accent: "bg-acid text-ink hover:bg-white",
    ghost: "bg-white/5 text-cream hover:bg-white/10 border border-line",
    quiet: "bg-transparent text-mute hover:text-cream",
    danger: "bg-heat/15 text-heat hover:bg-heat/25",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-40",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Chip({
  active,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-acid bg-acid text-ink"
          : "border-line bg-white/3 text-mute hover:text-cream",
        className,
      )}
      {...rest}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export function Field({
  className,
  label,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const autoId = useId();
  const inputId = id ?? (label ? autoId : undefined);
  const input = (
    <input
      id={inputId}
      className={cn(
        "min-h-11 w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm text-cream outline-none placeholder:text-mute/70 focus:border-acid/60",
        className,
      )}
      {...rest}
    />
  );
  if (!label) return input;
  return (
    <label className="block text-sm" htmlFor={inputId}>
      <span className="mb-1 block text-xs text-mute">{label}</span>
      {input}
    </label>
  );
}

export function Area({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm text-cream outline-none placeholder:text-mute/70 focus:border-acid/60",
        className,
      )}
      {...rest}
    />
  );
}

export function Progress({
  value,
  max = 100,
  tone = "acid",
}: {
  value: number;
  max?: number;
  tone?: "acid" | "sky" | "violet" | "gold" | "heat";
}) {
  const pct = Math.min(100, (value / max) * 100);
  const colors = {
    acid: "bg-acid",
    sky: "bg-sky",
    violet: "bg-violet",
    gold: "bg-gold",
    heat: "bg-heat",
  };
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
      <div className={cn("h-full rounded-full transition-all", colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[0.18em] text-mute">{label}</p>
      <p className={cn("mt-1 font-mono text-2xl tabular-nums text-cream", tone)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-mute">{hint}</p> : null}
    </div>
  );
}
