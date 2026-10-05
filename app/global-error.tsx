"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Last-resort error page when the root layout itself fails. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#e4e4e7", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 16 }}>
        <div>
          <h1 style={{ color: "#fff" }}>Something went wrong</h1>
          <p style={{ color: "#71717a" }}>Mail-man hit an unexpected problem. Please reload the page.</p>
        </div>
      </body>
    </html>
  );
}
