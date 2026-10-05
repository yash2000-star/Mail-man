/**
 * Shared Sentry settings. Error monitoring is off unless a DSN is configured
 * (NEXT_PUBLIC_SENTRY_DSN), so local development and forks send nothing.
 * Only errors are reported: no performance tracing, no session replay, and
 * no personal data (cookies, request bodies, IP addresses).
 */
import type { ErrorEvent } from "@sentry/nextjs";

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Removes anything that could contain email content or credentials before an event leaves the app. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
    if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
            for (const name of Object.keys(event.request.headers)) {
                if (/cookie|authorization/i.test(name)) delete event.request.headers[name];
            }
        }
    }
    delete event.user;
    return event;
}

export const sentryOptions = {
    dsn: SENTRY_DSN,
    enabled: Boolean(SENTRY_DSN),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
};
