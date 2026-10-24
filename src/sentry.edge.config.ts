import * as Sentry from "@sentry/nextjs";

import { sentryBaseOptions } from "@/lib/sentry-config";

// Edge runtime (proxy.ts) (decision 086): its SDK tracks no sessions.
const options = sentryBaseOptions();
if (options) Sentry.init(options);
