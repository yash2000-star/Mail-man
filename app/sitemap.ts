import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXTAUTH_URL || "https://mail-man-yash.vercel.app";
  return ["", "/demo", "/privacy", "/terms"].map((path) => ({ url: `${site}${path}` }));
}
