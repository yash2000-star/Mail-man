import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live demo",
  description: "Try Mail-man on a sample inbox: AI summaries, suggested replies, Smart Labels, to-dos and inbox chat. No sign-in needed.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
