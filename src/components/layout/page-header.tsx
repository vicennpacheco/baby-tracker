import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** A real link, so Android's back gesture and deep links keep working. */
  backHref?: string;
  /**
   * Instead of `backHref`, for a step inside one screen (a wizard step in the
   * URL): history.back() returns to the previous step without stacking a new
   * entry, so the system back button keeps matching.
   */
  onBack?: () => void;
};

const BACK = cn(
  buttonVariants({ variant: "ghost", size: "icon" }),
  "-ml-3 size-12",
);

export function PageHeader({
  title,
  description,
  backHref,
  onBack,
}: PageHeaderProps): ReactNode {
  return (
    <header className="flex flex-col gap-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Atrás"
          className={BACK}
        >
          <ChevronLeft aria-hidden className="size-6" />
        </button>
      ) : (
        backHref && (
          <Link href={backHref} aria-label="Atrás" className={BACK}>
            <ChevronLeft aria-hidden className="size-6" />
          </Link>
        )
      )}
      <h1 className="text-3xl font-semibold text-balance">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </header>
  );
}
