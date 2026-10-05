"use client";

import { signIn } from "next-auth/react";

/** Shown across the top of /demo: what it is, and the way out. */
export default function DemoBanner() {
  return (
    <div className="shrink-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 bg-amber-500 text-black text-xs font-bold">
      <span>Demo mode: a sample inbox. Nothing here touches a real mailbox, and AI answers are canned.</span>
      <span className="flex items-center gap-3">
        <button onClick={() => signIn("google", { callbackUrl: "/" })} className="underline underline-offset-2 hover:no-underline">
          Connect your Gmail
        </button>
        {/* A full page load on purpose: it removes the demo's stand-in backend */}
        {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
        <button onClick={() => window.location.assign("/")} className="underline underline-offset-2 hover:no-underline">
          Exit demo
        </button>
      </span>
    </div>
  );
}
