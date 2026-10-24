"use client";

import type { ReactNode } from "react";

import { ErrorState } from "@/components/shared/error-state";

import "./globals.css";

// Only when the root layout itself fails (CLAUDE.md §3.3): it replaces the
// layout, so it brings <html> and <body>. Without next-themes it follows
// the light tokens; it is meant to be seen almost never.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): ReactNode {
  return (
    <html lang="es">
      <body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)_+_2rem)] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <ErrorState error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
