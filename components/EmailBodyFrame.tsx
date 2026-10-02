"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface EmailBodyFrameProps {
  html: string;
  title?: string;
  /** Whether the body is HTML; guessed from the content when not given */
  isHtml?: boolean;
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Plain-text bodies (no tags at all) are escaped and shown pre-wrapped.
const looksLikeHtml = (body: string) => /<[a-z!/][\s\S]*>/i.test(body);

/**
 * Renders untrusted email HTML inside a sandboxed iframe.
 *
 * The sandbox deliberately omits `allow-scripts`, so nothing in the email
 * (inline <script>, onerror= handlers, javascript: URLs) can execute.
 * `allow-same-origin` is only there so we can measure the document height;
 * it is safe ONLY because scripts are disabled — never add `allow-scripts`
 * alongside it. The CSP meta tag is a second layer in case the sandbox is
 * ever loosened.
 */
export default function EmailBodyFrame({ html, title = "Email content", isHtml }: EmailBodyFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  const srcDoc = useMemo(() => {
    const content = (isHtml ?? looksLikeHtml(html))
      ? html
      : `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(html)}</pre>`;

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data: cid:; style-src 'unsafe-inline' https:; font-src https: data:; media-src https:;">
<base target="_blank">
<style>
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 16px; line-height: 1.8; color: #18181b; word-wrap: break-word; overflow-wrap: anywhere; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
</style>
</head>
<body>${content}</body>
</html>`;
  }, [html, isHtml]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let observer: ResizeObserver | null = null;

    const measure = () => {
      const doc = iframe.contentDocument;
      if (!doc?.documentElement) return;
      setHeight(Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0));
    };

    const onLoad = () => {
      measure();
      observer?.disconnect();
      const doc = iframe.contentDocument;
      if (doc?.body && typeof ResizeObserver !== "undefined") {
        // Images load after the document, so keep re-measuring as it grows.
        observer = new ResizeObserver(measure);
        observer.observe(doc.body);
      }
    };

    iframe.addEventListener("load", onLoad);
    return () => {
      iframe.removeEventListener("load", onLoad);
      observer?.disconnect();
    };
  }, [srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="w-full border-0 block"
      style={{ height }}
    />
  );
}
