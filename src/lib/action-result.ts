import { captureException } from "@sentry/nextjs";
import { z } from "zod";

import { sanitizeError } from "@/lib/sentry-privacy";

// Single contract for every Server Action (CLAUDE.md §3.3). Isomorphic on
// purpose: client components import these types to read action results.

export type ActionErrorCode =
  "VALIDATION" | "UNAUTHENTICATED" | "NOT_FOUND" | "CONFLICT" | "UNEXPECTED";

export type ActionError = {
  code: ActionErrorCode;
  message: string; // Spanish, safe to show to the user.
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: ActionError };

const UNEXPECTED_MESSAGE = "Algo ha fallado. Inténtalo de nuevo.";
const NOT_FOUND_MESSAGE = "No hemos encontrado ese registro.";

/**
 * Thrown by authorization checks. "Belongs to another household" and "does
 * not exist" must look identical to the client (CLAUDE.md §2.7).
 */
export class NotFoundError extends Error {
  override name = "NotFoundError";
}

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function actionError(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error: { code, message, fieldErrors } };
}

export function validationError(error: z.ZodError): ActionResult<never> {
  const { fieldErrors } = z.flattenError(error);
  const definedFieldErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
  return actionError(
    "VALIDATION",
    "Revisa los campos marcados.",
    definedFieldErrors,
  );
}

export function readPrismaCode(error: unknown): string | undefined {
  // Structural check instead of importing Prisma, so this module stays
  // importable from client components.
  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

/**
 * Boundary for unexpected errors. Logs only the action name, error class and
 * code: Prisma messages can embed query arguments, i.e. health data.
 */
export function handleActionError(
  actionName: string,
  error: unknown,
): ActionResult<never> {
  const code = readPrismaCode(error);
  if (error instanceof NotFoundError || code === "P2025") {
    return actionError("NOT_FOUND", NOT_FOUND_MESSAGE);
  }
  if (code === "P2002") {
    return actionError("CONFLICT", "Ese registro ya existe.");
  }

  console.error(`[${actionName}] failed`, {
    name: error instanceof Error ? error.name : typeof error,
    code,
  });
  // Same rule as the log line: the name, the code and the frames, never the
  // message (decision 086). A no-op while Sentry is not initialized.
  captureException(sanitizeError(error, code), {
    tags: { action: actionName },
  });
  return actionError("UNEXPECTED", UNEXPECTED_MESSAGE);
}
