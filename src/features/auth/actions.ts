"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import {
  requestEmailOtpSchema,
  verifyEmailOtpSchema,
} from "@/features/auth/schemas";
import {
  actionError,
  type ActionResult,
  handleActionError,
  ok,
  validationError,
} from "@/lib/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Supabase Auth error codes we expect during the OTP flow.
const RATE_LIMIT_CODES = new Set([
  "over_email_send_rate_limit",
  "over_request_rate_limit",
]);
const INVALID_OTP_CODES = new Set(["otp_expired", "invalid_credentials"]);

function isRateLimited(error: AuthError): boolean {
  return error.status === 429 || RATE_LIMIT_CODES.has(error.code ?? "");
}

export async function requestEmailOtp(input: unknown): Promise<ActionResult> {
  const parsed = requestEmailOtpSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { shouldCreateUser: true },
    });
    if (error && isRateLimited(error)) {
      return actionError(
        "CONFLICT",
        "Ya te enviamos un código hace poco. Espera un minuto y pide otro.",
      );
    }
    if (error) return handleActionError("requestEmailOtp", error);
    return ok();
  } catch (error) {
    return handleActionError("requestEmailOtp", error);
  }
}

export async function verifyEmailOtp(input: unknown): Promise<ActionResult> {
  const parsed = verifyEmailOtpSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: "email",
    });
    if (
      error &&
      (INVALID_OTP_CODES.has(error.code ?? "") || error.status === 403)
    ) {
      return actionError("VALIDATION", "Ese código no vale o ha caducado.", {
        token: [
          "Ese código no vale o ha caducado. Revisa el email o pide uno nuevo.",
        ],
      });
    }
    if (error && isRateLimited(error)) {
      return actionError(
        "CONFLICT",
        "Demasiados intentos. Espera un minuto y vuelve a probar.",
      );
    }
    if (error) return handleActionError("verifyEmailOtp", error);
  } catch (error) {
    return handleActionError("verifyEmailOtp", error);
  }

  // Outside try/catch: redirect() works by throwing.
  redirect("/");
}

// Always redirects; typed like the other actions so clients can call it
// through callAction, which turns a dropped connection into a toast.
export async function signOut(): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) handleActionError("signOut", error);
  redirect("/login");
}
