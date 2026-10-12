import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sin conexión · Métricas Bebé" };

// What the service worker shows when a page cannot load (decision 072).
// Static, with no session or data, so it can be cached (CLAUDE.md §5).
export default function OfflinePage(): ReactNode {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-[calc(env(safe-area-inset-top)_+_2rem)] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-2">
        <WifiOff aria-hidden className="size-8 text-muted-foreground" />
        <h1 className="text-3xl font-semibold text-balance">Sin conexión</h1>
        <p className="text-muted-foreground">
          Para ver y guardar los registros, Métricas Bebé necesita internet.
          Comprueba la conexión y vuelve a intentarlo.
        </p>
      </div>
      {/* A full page load, not <Link>: offline, the router holds a client
          navigation until the network returns, so the button would seem to
          do nothing; and this page may be standing in for another URL. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-auto h-14 w-full text-base",
        )}
      >
        Reintentar
      </a>
    </main>
  );
}
