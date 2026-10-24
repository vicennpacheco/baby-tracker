"use client";

import type { ReactNode } from "react";

import { ErrorState } from "@/components/shared/error-state";

// Rendered inside the (auth) layout, which already provides the <main>.
export default function AuthError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): ReactNode {
  return <ErrorState error={error} retry={retry} />;
}
