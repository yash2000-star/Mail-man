import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

Sentry.init({
  ...sentryOptions,
  // Breadcrumbs from the browser console could quote email content
  integrations: (defaults) => defaults.filter((i) => i.name !== "Breadcrumbs"),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
