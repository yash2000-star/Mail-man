import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy. Email bodies render in a sandboxed srcdoc iframe,
 * which inherits this policy, so remote images, styles and fonts must stay
 * allowed (scripts never run there: the sandbox has no allow-scripts).
 * vercel.live is the toolbar Vercel injects into preview deployments.
 */
const csp = [
  "default-src 'self'",
  // Next.js inlines its bootstrap scripts; dev mode also needs eval for fast refresh
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://vercel.live`,
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  `connect-src 'self' https://vercel.live wss://ws-us3.pusher.com${isDev ? " ws:" : ""}`,
  "frame-src 'self' https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
