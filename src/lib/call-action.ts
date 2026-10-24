import { unstable_rethrow } from "next/navigation";

import {
  actionError,
  UNEXPECTED_MESSAGE,
  type ActionResult,
} from "@/lib/action-result";

export const OFFLINE_MESSAGE = "No hay conexión. Inténtalo de nuevo.";

/**
 * What a rejected call becomes. The browser's fetch throws a TypeError when
 * the request never completes; `navigator.onLine` catches the rest.
 */
export function toCallFailure(
  error: unknown,
  isOnline: boolean,
): ActionResult<never> {
  const isConnectionLost = !isOnline || error instanceof TypeError;
  return actionError(
    "UNEXPECTED",
    isConnectionLost ? OFFLINE_MESSAGE : UNEXPECTED_MESSAGE,
  );
}

/**
 * Every client call to a Server Action goes through here (CLAUDE.md §2.4).
 * Expected errors already come back as an ActionResult, but a dropped
 * connection rejects the call itself, and inside a transition that would
 * replace the whole screen with error.tsx. Only the call is wrapped: a bug
 * in the code that reads the result still reaches the error boundary.
 */
export async function callAction<T>(
  call: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await call();
  } catch (error) {
    // A server redirect() also rejects the call (NEXT_REDIRECT): Next.js
    // navigates when it propagates, so it must not become a toast.
    unstable_rethrow(error);
    console.error("[callAction] Server Action call failed", error);
    return toCallFailure(error, navigator.onLine);
  }
}
