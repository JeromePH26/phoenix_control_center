import { ReactNode } from "react";

type BadgeTone = "gold" | "neutral" | "green" | "red";

const TONE_CLASSES: Record<BadgeTone, string> = {
  gold: "bg-phoenix-gold/10 text-phoenix-gold-dark border-phoenix-gold/30",
  neutral: "bg-neutral-100 text-neutral-500 border-neutral-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
};

export default function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
