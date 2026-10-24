import { z } from "zod";

import { isEuSentryDsn } from "@/lib/sentry-privacy";

// Client-safe variables only. Server-only variables live in `@/lib/env`.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("sb_publishable_", {
      error: "Use the publishable key (sb_publishable_…), never a secret key",
    }),
  // Error monitoring (decision 086). Optional: without it nothing is sent.
  // Only Sentry's EU region is accepted, so telemetry cannot leave Europe by
  // a misconfigured variable. An empty value counts as absent.
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .refine(isEuSentryDsn, {
        error:
          "NEXT_PUBLIC_SENTRY_DSN must be a DSN of Sentry's EU region (*.ingest.de.sentry.io)",
      })
      .optional(),
  ),
  // Set by Vercel for Next.js projects; tags each event with its environment.
  NEXT_PUBLIC_VERCEL_ENV: z
    .enum(["development", "preview", "production"])
    .optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

// Next.js only inlines NEXT_PUBLIC_* variables that are referenced literally,
// so they cannot be read through a generic `process.env` lookup.
export const publicEnv: PublicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
});
