import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers"; // <--- IMPORTING THE BRIDGE

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mail-man",
  description: "AI Email Analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ background: "#000" }}>
      <body className={`${inter.className} bg-black`}>
        {/* WRAPPING THE APP IN THE BRIDGE */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}