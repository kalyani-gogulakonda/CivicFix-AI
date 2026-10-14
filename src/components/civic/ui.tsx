import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  outline: "border border-input bg-background text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "text-destructive hover:bg-destructive/10",
};

export function Btn({
  variant = "primary",
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-border bg-card p-5 sm:p-6", className)}>{children}</div>;
}

const badgeTone = {
  green: "bg-accent text-accent-foreground",
  gray: "bg-secondary text-secondary-foreground",
  amber: "bg-warning text-warning-foreground",
  red: "bg-destructive/10 text-destructive",
};
export function Badge({ tone = "gray", children }: { tone?: keyof typeof badgeTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeTone[tone])}>
      {children}
    </span>
  );
}

export function AiLabel({ demo }: { demo: boolean }) {
  return demo ? (
    <Badge tone="amber">Demo mode · not real AI</Badge>
  ) : (
    <Badge tone="green">✦ AI-generated suggestion</Badge>
  );
}

export const fieldCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
