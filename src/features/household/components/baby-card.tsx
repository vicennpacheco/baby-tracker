import { Baby } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BabyCardProps = {
  name: string;
  /** "2 meses" (formatBabyAge). */
  age: string;
  /** "27 ago" (formatShortDate). */
  birthDate: string;
};

/** Settings: who the app is about, with the way to correct it. */
export function BabyCard({ name, age, birthDate }: BabyCardProps): ReactNode {
  return (
    <section aria-labelledby="baby-title" className="flex flex-col gap-3">
      <h2 id="baby-title" className="text-lg font-semibold">
        Tu bebé
      </h2>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
          <Baby aria-hidden className="size-6" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-medium break-words">{name}</span>
          <span className="text-sm text-muted-foreground">
            {age} · nació el {birthDate}
          </span>
        </span>
        <Link
          href="/settings/baby"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 shrink-0 px-4 text-base",
          )}
        >
          Editar
          <span className="sr-only"> los datos de {name}</span>
        </Link>
      </div>
    </section>
  );
}
