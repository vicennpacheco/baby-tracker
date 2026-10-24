import * as Sentry from "@sentry/nextjs";

import { sentryBaseOptions } from "@/lib/sentry-config";

// Error monitoring in the browser (decision 086). Events travel through the
// app's own /monitoring tunnel (next.config.ts), so they leave the device
// towards the EU deployment, never directly to a third party.
const options = sentryBaseOptions();
if (options) Sentry.init(options);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
