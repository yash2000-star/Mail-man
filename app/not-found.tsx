import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-zinc-300 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-amber-500 text-xs font-black uppercase tracking-widest">404</p>
      <h1 className="mt-3 text-3xl font-bold text-white">This page doesn&apos;t exist</h1>
      <p className="mt-3 text-zinc-500">The link may be broken, or the page may have moved.</p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition">
          Go home
        </Link>
        <a href="/demo" className="px-5 py-2.5 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-sm font-bold transition">
          Try the demo
        </a>
      </div>
    </main>
  );
}
