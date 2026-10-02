import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXTAUTH_URL || "https://mail-man-yash.vercel.app";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/setup"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
