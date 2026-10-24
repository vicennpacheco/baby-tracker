"use client";

import { captureException } from "@sentry/nextjs";
import { CircleAlert, RotateCw } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  /** `error` from error.tsx: reported to error monitoring once. */
  error: Error & { digest?: string };
  /** `retry` from error.tsx: re-fetches and re-renders the failed segment. */
  retry: () => void;
};

/**
 * Body of every error.tsx. Server details never reach the client (Next.js
 * only forwards a digest), so the copy stays generic and offers a way out.
 */
export function ErrorState({ error, retry }: ErrorStateProps): ReactNode {
  useEffect(() => {
    // A server error arrives here with only its digest, and onRequestError
    // already reported it on the server (src/instrumentation.ts).
    if (error.digest === undefined) captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div role="alert" className="flex flex-col gap-2">
        <CircleAlert aria-hidden className="size-8 text-destructive" />
        <h1 className="text-3xl font-semibold text-balance">
          No hemos podido cargar esta pantalla
        </h1>
        <p className="text-muted-foreground">
          Revisa tu conexión y vuelve a intentarlo.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        onClick={retry}
        className="mt-auto h-14 w-full text-base"
      >
        <RotateCw aria-hidden className="size-5" />
        Reintentar
      </Button>
    </div>
  );
}
