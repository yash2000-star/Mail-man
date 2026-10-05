import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

Sentry.init({
  ...sentryOptions,
  // API routes catch their own errors and log them with console.error; report those too
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
});
