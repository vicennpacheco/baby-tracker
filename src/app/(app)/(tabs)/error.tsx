"use client";

import type { ReactNode } from "react";

import { ErrorState } from "@/components/shared/error-state";

// Rendered inside the (tabs) layout: the bottom bar remains a way out.
export default function TabsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): ReactNode {
  return <ErrorState error={error} retry={retry} />;
}
