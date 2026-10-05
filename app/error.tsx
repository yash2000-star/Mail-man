"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

/** Shown when a page crashes, instead of a blank screen. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-black text-zinc-300 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-amber-500 text-xs font-black uppercase tracking-widest">Error</p>
      <h1 className="mt-3 text-3xl font-bold text-white">Something went wrong</h1>
      <p className="mt-3 text-zinc-500 max-w-md">
        Mail-man hit an unexpected problem. Trying again usually fixes it; if it keeps happening, reload the page.
      </p>
      <div className="mt-8 flex gap-4">
        <button onClick={reset} className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition">
          Try again
        </button>
        <Link href="/" className="px-5 py-2.5 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-sm font-bold transition">
          Go home
        </Link>
      </div>
    </main>
  );
}
