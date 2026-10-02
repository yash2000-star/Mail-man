import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXTAUTH_URL || "https://mail-man-yash.vercel.app";
const DESCRIPTION =
  "An AI email client for Gmail: smart categories and summaries, suggested replies, Smart Labels, to-dos from your email, and chat with your inbox. Works with your own Gemini, ChatGPT or Claude key.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Mail-man: AI email client for Gmail", template: "%s · Mail-man" },
  description: DESCRIPTION,
  applicationName: "Mail-man",
  openGraph: {
    type: "website",
    siteName: "Mail-man",
    title: "Mail-man: AI email client for Gmail",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ background: "#000" }}>
      <body className={`${inter.className} bg-black`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
