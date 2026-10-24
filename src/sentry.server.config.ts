import * as Sentry from "@sentry/nextjs";

import { sentryBaseOptions } from "@/lib/sentry-config";
import { withoutRequestSessions } from "@/lib/sentry-privacy";

// Node runtime (decision 086): exceptions only, without request sessions.
const options = sentryBaseOptions();
if (options) {
  Sentry.init({
    ...options,
    integrations: (defaults) =>
      withoutRequestSessions(defaults, Sentry.httpIntegration),
  });
}
