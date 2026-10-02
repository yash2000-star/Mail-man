import Link from "next/link";
import { Mail } from "lucide-react";

export const GITHUB_URL = "https://github.com/yash2000-star/Mail-man";

/** Shared layout for the privacy policy and terms pages. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <header className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold">
            <span className="w-7 h-7 rounded-md border border-amber-500/40 flex items-center justify-center">
              <Mail size={14} className="text-amber-500" />
            </span>
            Mail-man
          </Link>
          <nav className="flex items-center gap-5 text-xs font-medium text-zinc-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated {updated}</p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-amber-500 [&_a:hover]:underline [&_strong]:text-zinc-100 [&_p+p]:mt-3">
          {children}
        </div>
      </main>
      <footer className="border-t border-zinc-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-xs text-zinc-600 flex flex-wrap gap-4 justify-between">
          <span>Mail-man</span>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">Source code on GitHub</a>
        </div>
      </footer>
    </div>
  );
}
