import { Baby, type LucideIcon, Milk, Moon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FirstStep = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Module accent and soft surface (CLAUDE.md §4.4). */
  surfaceClassName: string;
  iconClassName: string;
};

// The three records of a first day, in the order they usually come. Each
// opens its module, where the one-tap bar is (decision 071).
const FIRST_STEPS: readonly FirstStep[] = [
  {
    href: "/diapers",
    label: "Primer pañal",
    icon: Baby,
    surfaceClassName: "bg-diapers-soft",
    iconClassName: "text-diapers",
  },
  {
    href: "/feeding",
    label: "Primera toma",
    icon: Milk,
    surfaceClassName: "bg-feeding-soft",
    iconClassName: "text-feeding",
  },
  {
    href: "/sleep",
    label: "Primera siesta",
    icon: Moon,
    surfaceClassName: "bg-sleep-soft",
    iconClassName: "text-sleep",
  },
];

/**
 * "Hoy" on a family's first use, before any record: a welcome with big
 * shortcuts instead of a summary of zeros (CLAUDE.md §4.4, empty states
 * with a call to the first record).
 */
export function FirstUseCard({ babyName }: { babyName: string }): ReactNode {
  return (
    <section
      aria-labelledby="first-use-title"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="first-use-title"
          className="text-2xl font-semibold text-balance"
        >
          Todo listo para {babyName}
        </h2>
        <p className="text-muted-foreground">
          Empieza por lo primero que pase: aquí verás el resumen del día.
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {FIRST_STEPS.map(
          ({ href, label, icon: Icon, surfaceClassName, iconClassName }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl p-2 text-center text-sm leading-tight font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  surfaceClassName,
                )}
              >
                <Icon aria-hidden className={cn("size-7", iconClassName)} />
                {label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
