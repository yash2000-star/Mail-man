"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
  motion, AnimatePresence, useScroll, useTransform
} from "framer-motion";
import {
  ArrowRight, Check, Sparkles, Mail, ChevronRight, Menu, X, Plus
} from "lucide-react";
import { HoverEffect } from "./ui/card-hover-effect";
import { TrainYourAIAnimation, MultiModelHubAnimation, TaskExtractionAnimation, AddYourBrandAnimation } from "./ui/bento-animations";
import { StickyScrollUseCases } from "./ui/sticky-scroll-use-cases";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal"],  // strictly upright — no italic swashes
});

// ── Design tokens ────────────────────────────────────────────────────
const BG = "#09090b";       // zinc-950
const BORDER = "border-zinc-800/60";

// ── Animation presets ────────────────────────────────────────────────
const slideUp = (delay = 0, ready = true) => ({
  initial: { opacity: 0, y: 60 },
  animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 },
  transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] as const, delay },
});

const fadeIn = (delay = 0, ready = true) => ({
  initial: { opacity: 0 },
  animate: ready ? { opacity: 1 } : { opacity: 0 },
  transition: { duration: 0.8, ease: "easeOut" as const, delay },
});

const inView = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const, delay },
});

// ── Preloader Overlay ─────────────────────────────────────────────────
function PreloaderOverlay({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center pointer-events-none"
      initial={{ y: "0%" }}
      animate={{ y: "-100%" }}
      transition={{
        duration: 0.9,
        ease: [0.65, 0, 0.35, 1],
        delay: 1.3,
      }}
      onAnimationComplete={onDone}
    >
      {/* Stress text */}
      <motion.p
        className="font-mono text-sm tracking-widest uppercase text-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 1.5,
          times: [0, 0.25, 0.7, 1], // quick fade in, short hold, fade out
          ease: "easeInOut",
        }}
      >
        <span className="text-zinc-600">7,432 unread emails.&nbsp;</span>
        <span className="text-zinc-500">Missed deadlines.&nbsp;</span>
        <span className="text-zinc-400">Endless spam.</span>
      </motion.p>

      {/* Bottom border that acts as a curtain edge */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-800" />
    </motion.div>
  );
}

const GITHUB_URL = "https://github.com/yash2000-star/Mail-man";

// Full page load for /demo so the demo's sample backend starts fresh
const NAV_LINKS: [string, string][] = [["Features", "#features"], ["Live demo", "/demo"], ["GitHub", GITHUB_URL]];

// ── FAQ data ─────────────────────────────────────────────────────────
const FAQS = [
  { q: "What does Mail-man store about my email?", a: "Your emails stay in Gmail; Mail-man doesn't keep copies of them. It stores only what its features need: AI summaries, suggested replies, Smart Labels and to-dos, plus your AI API keys, encrypted. The Privacy Policy has the details." },
  { q: "Can I use my own AI keys?", a: "Yes. Mail-man works with a Google Gemini, OpenAI (ChatGPT) or Anthropic (Claude) key. Add one in settings and every AI feature uses it. Keys stay on the server and are never sent back to your browser." },
  { q: "Does it cost anything?", a: "Mail-man itself is free, and all of its code is on GitHub. AI usage is billed by your AI provider to your own key; Gemini has a free tier that is enough to try everything." },
  { q: "Can I try it without connecting Gmail?", a: "Yes. The live demo runs the full app on a sample inbox, with no sign-in and no API key needed." },
];

// ── Horizontal scroll features ───────────────────────────────────────
const FEAT_CARDS = [
  { num: "01", title: "Smart\nInbox", body: "Every email is sorted into Important, Social, Promotions or General and gets a one-line summary, so you can triage at a glance.", accent: "amber" },
  { num: "02", title: "Suggested\nReplies", body: "Emails that need an answer get a draft reply. Send it in one click, or open it in the composer and refine it with AI.", accent: "amber" },
  { num: "03", title: "Smart\nLabels", body: "Describe a label in plain English (\"invoices and receipts\") and the AI applies it to matching mail, including your recent inbox.", accent: "amber" },
  { num: "04", title: "Chat\nwith Inbox", body: "Ask plain-English questions about your recent mail. \"What did Sarah say about the proposal?\"", accent: "amber" },
  { num: "05", title: "Task\nExtraction", body: "Action items and deadlines are pulled from emails into a to-do dashboard, grouped by what's overdue, today and upcoming.", accent: "amber" },
  { num: "06", title: "Any AI\nProvider", body: "Bring a Gemini, ChatGPT or Claude key. Every feature works with whichever one you have.", accent: "amber" },
];

// ── FAQ item ─────────────────────────────────────────────────────────
function FaqItem({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
  return (
    <div className={`border-b ${BORDER} last:border-0 cursor-pointer`} onClick={onClick}>
      <div className="flex items-center justify-between py-6 gap-6">
        <p className="font-medium text-white text-sm leading-snug">{q}</p>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.22 }} className="shrink-0 text-zinc-500">
          <Plus size={16} />
        </motion.div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-zinc-500 text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Horizontal Scroll Section ────────────────────────────────────────
function HorizontalFeatures() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  // Each card ~340px + 24px gap. Total slide = (n-1) * (card + gap) roughly
  const totalCards = FEAT_CARDS.length;
  const cardW = 340;
  const gap = 24;
  const totalSlide = (totalCards - 1) * (cardW + gap);
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -totalSlide]);

  return (
    <section ref={containerRef} className={`relative border-t ${BORDER}`} style={{ height: '300vh' }}>
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-x-clip">
        {/* Section header */}
        <div className="max-w-7xl mx-auto w-full px-8 md:px-14 mb-14">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-4">Core Capabilities</p>
              <h2 className={`${serif.className} text-4xl md:text-5xl font-normal tracking-[0.02em] text-white leading-[1.15]`}>
                Everything you need.<br />
                <span className="text-zinc-500 italic tracking-[0.02em]">Nothing you don&apos;t.</span>
              </h2>
            </div>
            <p className="hidden md:block text-zinc-600 text-xs font-medium max-w-[200px] text-right leading-relaxed">
              Scroll to explore all capabilities →
            </p>
          </div>
        </div>

        {/* Card track */}
        <div className="max-w-7xl mx-auto w-full px-8 md:px-14 overflow-visible">
          <motion.div style={{ x }} className="flex gap-6 will-change-transform">
            {FEAT_CARDS.map((card) => (
              <div
                key={card.num}
                className={`shrink-0 w-[300px] md:w-[340px] border ${BORDER} bg-zinc-950 p-8 flex flex-col justify-between`}
                style={{ height: 320 }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-8">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">{card.num}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                </div>
                {/* Title */}
                <h3 className="text-2xl font-light tracking-tight text-white leading-[1.2] whitespace-pre-line flex-1">
                  {card.title}
                </h3>
                {/* Body */}
                <p className="text-zinc-500 text-sm leading-relaxed mt-4">{card.body}</p>
                {/* Bottom line */}
                <div className="mt-8 h-px bg-amber-500/30 w-12" />
              </div>
            ))}
            {/* Spacer card so last card sits fully in view */}
            <div className="shrink-0 w-8" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  // The intro plays once per visit, and never for people who prefer reduced motion
  const [skipIntro] = useState(() => {
    try {
      return sessionStorage.getItem("mailman-intro-seen") === "1"
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });
  const [heroReady, setHeroReady] = useState(skipIntro);

  const handlePreloaderDone = () => {
    setHeroReady(true);
    try {
      sessionStorage.setItem("mailman-intro-seen", "1");
    } catch {
      // storage blocked: the intro just plays again next time
    }
  };


  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className={`min-h-screen text-white ${jakarta.className}`} style={{ background: BG }}>

      {/* ── PRELOADER ───────────────────────────────────────────── */}
      {!skipIntro && <PreloaderOverlay onDone={handlePreloaderDone} />}

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? "border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md" : ""}`}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-zinc-700 flex items-center justify-center">
              <Mail size={13} strokeWidth={2} className="text-amber-500" />
            </div>
            <span className="font-bold tracking-tight text-white text-[15px]">Mail-man</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(([label, href]) => (
              <a key={label} href={href} className="text-xs font-medium tracking-wide text-zinc-500 hover:text-white transition-colors duration-150">
                {label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => signIn("google")}
              className="
                hidden md:flex items-center gap-2
                bg-gradient-to-b from-amber-400 to-amber-600
                text-zinc-900 text-[11px] font-bold uppercase tracking-widest
                px-5 py-2 rounded-full
                shadow-[inset_0px_1px_1px_rgba(255,255,255,0.5),0px_0px_15px_rgba(245,158,11,0.2)]
                hover:shadow-[inset_0px_1px_1px_rgba(255,255,255,0.6),0px_0px_25px_rgba(245,158,11,0.4)]
                hover:-translate-y-0.5
                transition-all duration-300 group
              "
            >
              Get Started
              <ArrowRight size={12} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-zinc-400 hover:text-white p-1">
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 inset-x-0 z-40 border-b border-zinc-800 bg-zinc-950"
          >
            <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col gap-5">
              {NAV_LINKS.map(([label, href]) => (
                <a key={label} href={href} onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">{label}</a>
              ))}
              <button
                onClick={() => signIn("google")}
                className="
                  flex items-center gap-2
                  bg-gradient-to-b from-amber-400 to-amber-600
                  text-zinc-900 text-xs font-black uppercase tracking-widest
                  px-6 py-3 rounded-full w-fit
                  shadow-[inset_0px_1px_1px_rgba(255,255,255,0.5),0px_0px_15px_rgba(245,158,11,0.2)]
                  transition-all duration-300
                "
              >
                Get Started <ArrowRight size={12} strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="relative min-h-screen flex flex-col justify-center pt-16">

          <div className="max-w-4xl mx-auto px-8 md:px-14 pt-16 pb-24 w-full flex flex-col items-center text-center">
            {/* Eyebrow — pill badge */}
            <motion.div {...slideUp(0, heroReady)} className="flex items-center justify-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/10 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">
                <Sparkles size={10} className="text-amber-400" />
                AI-Powered Email Intelligence
              </span>
            </motion.div>

            {/* Headline */}
            <div className="mb-8 w-full">
              <motion.h1
                {...slideUp(0.1, heroReady)}
                className={`${serif.className} text-6xl sm:text-7xl md:text-8xl font-normal tracking-[0.02em] leading-[1.15] text-white`}
              >
                Your inbox,<br />
                <span className="text-white">finally tamed.</span>
              </motion.h1>
            </div>

            {/* Sub-headline */}
            <motion.p {...slideUp(0.22, heroReady)} className="text-zinc-400 text-lg font-normal leading-relaxed max-w-xl mb-10">
              Mail-man connects to your Gmail and uses your own AI key to sort, summarize and draft replies, track your to-dos, and answer questions about your inbox.
            </motion.p>

            {/* CTA row */}
            <motion.div {...slideUp(0.34, heroReady)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 pb-6">
              <button
                onClick={() => signIn("google")}
                className="
                  flex items-center gap-3
                  bg-gradient-to-b from-amber-400 to-amber-600
                  text-zinc-900 text-sm font-bold tracking-wide
                  px-8 py-4 rounded-full
                  shadow-[inset_0px_1px_1px_rgba(255,255,255,0.5),0px_0px_20px_rgba(245,158,11,0.25)]
                  hover:shadow-[inset_0px_1px_1px_rgba(255,255,255,0.6),0px_0px_35px_rgba(245,158,11,0.5)]
                  hover:-translate-y-0.5
                  transition-all duration-300 group
                "
              >
                Connect Gmail Free
                <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
              <a href="/demo" className="flex items-center gap-2 px-6 py-3.5 rounded-full border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-500 text-sm font-bold tracking-wide transition-colors duration-150">
                Try the live demo <ChevronRight size={14} strokeWidth={2} />
              </a>
            </motion.div>

            {/* Trust strip */}
            <motion.div {...fadeIn(0.5, heroReady)} className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-10 border-t ${BORDER} w-full`}>
              {["Gemini, ChatGPT or Claude", "Keys encrypted, server-side only", "Gmail via Google sign-in", "Free, with code on GitHub"].map((t, i) => (
                <span key={i} className="flex items-center gap-2 text-[11px] font-medium text-zinc-600 uppercase tracking-wide">
                  <span className="w-1 h-1 bg-amber-500 rounded-full" />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── DIVIDER ──────────────────────────────────────────── */}
        <div className={`border-t ${BORDER} max-w-7xl mx-auto px-8 md:px-14`} />

        {/* ── STATS ────────────────────────────────────────────── */}
        <section className={`border-t border-b ${BORDER}`}>
          <div className="max-w-7xl mx-auto px-8 md:px-14 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800/60">
            {[
              { num: "$0", label: "To use, with your own AI key" },
              { num: "3", label: "AI providers: Gemini, ChatGPT, Claude" },
              { num: "0", label: "Ads, trackers or analytics" },
            ].map((s, i) => (
              <motion.div key={s.label} {...inView(i * 0.1)} className="py-16 px-8 first:pl-0 last:pr-0">
                <p className="text-5xl md:text-6xl font-light tracking-tighter text-white mb-3">{s.num}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── HORIZONTAL SCROLL FEATURES ───────────────────────── */}
        <section id="features">
          <HorizontalFeatures />
        </section>

        {/* ── BENTO GRID ───────────────────────────────────────── */}
        <section className={`border-t ${BORDER} py-32`}>
          <div className="max-w-7xl mx-auto px-8 md:px-14">
            <motion.div {...inView()} className="mb-20">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-5">Under the Hood</p>
              <h2 className={`${serif.className} text-4xl md:text-5xl font-normal tracking-[0.02em] text-white leading-[1.15]`}>
                Intelligent tools.<br />
                <span className="text-zinc-500 italic tracking-[0.02em]">Powered by your AI.</span>
              </h2>
            </motion.div>

            <HoverEffect
              items={[
                {
                  className: "md:col-span-8",
                  children: (
                    <div className="flex flex-col h-full gap-8">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mb-3">01 — Smart Labels</p>
                        <h3 className="text-xl font-light tracking-tight text-white">Train Your AI</h3>
                        <p className="text-sm text-zinc-500 mt-2">Create smart labels with natural language instructions</p>
                      </div>
                      <TrainYourAIAnimation />
                    </div>
                  ),
                },
                {
                  className: "md:col-span-4",
                  children: (
                    <div className="flex flex-col h-full">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mb-3">02 — Brand</p>
                      <h3 className="text-xl font-light tracking-tight text-white mb-2">Add Your Brand</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed flex-1">Custom labels, colors, smart AI instructions, retroactive tagging across your last 50 messages.</p>
                      <AddYourBrandAnimation />
                    </div>
                  ),
                },
                {
                  className: "md:col-span-5 !p-0 overflow-hidden",
                  children: (
                    <div className="relative h-full bg-zinc-900 border border-zinc-800/60">
                      <div className="p-8 flex flex-col h-full">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mb-3">03 — AI Chat</p>
                        <h3 className="text-2xl font-light tracking-tight text-white mb-3">Chat with Inbox</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">Ask plain-English questions about your email threads. &ldquo;What did Sarah say about the proposal?&rdquo;</p>
                        <div className="relative mt-8 h-20 overflow-hidden flex-1">
                          <motion.div
                            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5, repeat: Infinity, repeatType: "loop", repeatDelay: 4.5 }}
                            className="absolute top-0 left-0 right-4 bg-zinc-800 border border-zinc-700/60 p-3 text-sm text-zinc-300"
                          >
                            &ldquo;What did Sarah say about the proposal?&rdquo;
                          </motion.div>
                          <motion.div
                            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 2.0, repeat: Infinity, repeatType: "loop", repeatDelay: 3.0 }}
                            className="absolute top-8 right-0 left-4 bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-300"
                          >
                            &ldquo;Found 3 messages. Want a summary?&rdquo;
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  className: "md:col-span-4",
                  children: (
                    <div className="flex flex-col h-full">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mb-3">04 — Models</p>
                      <h3 className="text-xl font-light tracking-tight text-white mb-2">Multi-Model Hub</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed flex-1">Switch between Gemini, ChatGPT, and Claude with one click.</p>
                      <MultiModelHubAnimation />
                    </div>
                  ),
                },
                {
                  className: "md:col-span-3",
                  children: (
                    <div className="flex flex-col h-full">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mb-3">05 — Tasks</p>
                      <h3 className="text-xl font-light tracking-tight text-white mb-2">Task Extraction</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed">AI pulls deadlines from your inbox directly into your To-Do dashboard.</p>
                      <TaskExtractionAnimation />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </section>

        {/* ── USE CASES ────────────────────────────────────────── */}
        <section className={`border-t ${BORDER}`}>
          {/* Force dark mode on all child elements of StickyScrollUseCases */}
          <div className="
            [&_section]:bg-zinc-950 [&_.bg-white]:!bg-zinc-900 [&_.bg-slate-50]:!bg-zinc-900
            [&_.bg-slate-100]:!bg-zinc-800 [&_.bg-gray-50]:!bg-zinc-900 [&_.bg-gray-100]:!bg-zinc-800
            [&_.text-slate-900]:!text-white [&_.text-gray-900]:!text-white
            [&_.text-slate-700]:!text-zinc-300 [&_.text-gray-700]:!text-zinc-300
            [&_.text-slate-500]:!text-zinc-500 [&_.text-gray-500]:!text-zinc-500
            [&_.text-slate-400]:!text-zinc-600 [&_.text-gray-400]:!text-zinc-600
            [&_.border-slate-100]:!border-zinc-800 [&_.border-slate-200]:!border-zinc-800
            [&_.border-gray-100]:!border-zinc-800 [&_.border-gray-200]:!border-zinc-800
            [&_.shadow-xl]:!shadow-none [&_.shadow-lg]:!shadow-none [&_.shadow-md]:!shadow-none
            [&_img]:brightness-90
          ">
            <StickyScrollUseCases />
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────── */}
        <section id="pricing" className={`border-t ${BORDER} py-32`}>
          <div className="max-w-7xl mx-auto px-8 md:px-14">
            <motion.div {...inView()} className="mb-20">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-5">Pricing</p>
              <h2 className={`${serif.className} text-4xl md:text-5xl font-normal tracking-[0.02em] text-white`}>Free to use.</h2>
            </motion.div>

            <motion.div {...inView(0.1)} className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-zinc-800/60">
              <div className="p-10 bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-800/60">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-8">Bring your own key</p>
                <p className="text-5xl font-light tracking-tighter text-white mb-1">$0</p>
                <p className="text-xs text-zinc-600 mb-6">Mail-man is free; its code is on GitHub</p>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                  AI features run on your own Gemini, OpenAI or Anthropic key, and your provider bills you directly for what you use. Gemini has a free tier that covers trying everything.
                </p>
                <button onClick={() => signIn("google")} className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-widest transition-colors">
                  Connect Gmail
                </button>
              </div>
              <div className="p-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-8">Everything included</p>
                <ul className="space-y-4">
                  {["Smart inbox with summaries", "Suggested and AI-written replies", "Smart Labels and Needs Reply", "Conversations, drafts and attachments", "AI chat with your inbox", "To-do dashboard with due dates"].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                      <Check size={12} className="text-amber-500" strokeWidth={3} />{f}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section className={`border-t ${BORDER} py-32`}>
          <div className="max-w-7xl mx-auto px-8 md:px-14 grid grid-cols-1 md:grid-cols-2 gap-20">
            <motion.div {...inView()}>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-5">FAQ</p>
              <h2 className={`${serif.className} text-4xl font-normal tracking-[0.02em] text-white leading-[1.15]`}>Common<br />questions.</h2>
            </motion.div>
            <motion.div {...inView(0.1)} className={`border-t ${BORDER}`}>
              {FAQS.map((faq, i) => (
                <FaqItem key={i} q={faq.q} a={faq.a} open={activeFaq === i} onClick={() => setActiveFaq(activeFaq === i ? null : i)} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── BOTTOM CTA ───────────────────────────────────────── */}
        <section className={`border-t ${BORDER} py-40`}>
          <div className="max-w-7xl mx-auto px-8 md:px-14 text-center">
            <motion.div {...inView()}>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-8">Get Started Today</p>
              <h2 className={`${serif.className} text-5xl md:text-7xl font-normal tracking-[0.02em] text-white mb-10 leading-[1.15]`}>
                Build the future<br />
                <span className="text-zinc-500 italic tracking-[0.02em]">of email.</span>
              </h2>
              <button
                onClick={() => signIn("google")}
                className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-black text-sm font-black uppercase tracking-widest px-10 py-5 transition-colors duration-150 group"
              >
                Connect Gmail Free
                <ArrowRight size={15} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform duration-150" />
              </button>
              <div className="mt-6">
                <a href="/demo" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">
                  or try the live demo first →
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className={`relative w-full border-t ${BORDER} bg-zinc-950 pt-20 pb-5`}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 flex flex-col md:flex-row justify-between gap-14 mb-16">
          {/* Brand */}
          <div className="flex flex-col gap-5 max-w-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 border border-zinc-700 flex items-center justify-center">
                <Mail size={13} strokeWidth={2} className="text-amber-500" />
              </div>
              <span className="font-bold tracking-tight text-white text-[15px]">Mail-man</span>
            </div>
            <p className="text-zinc-600 text-sm leading-relaxed">Your inbox, tamed by your own AI.</p>
            <div className="flex items-center gap-3 mt-1">
              <a href={GITHUB_URL} aria-label="Mail-man on GitHub" target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-white hover:border-zinc-600 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" /></svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-3 gap-12 md:gap-20">
            {[
              { label: "Product", links: [["Features", "#features"], ["Pricing", "#pricing"], ["Live demo", "/demo"]] },
              { label: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]] },
              { label: "Code", links: [["GitHub", GITHUB_URL]] },
            ].map(col => (
              <div key={col.label} className="flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700 mb-1">{col.label}</span>
                {col.links.map(([label, href]) => (
                  <a key={label} href={href} className="text-zinc-600 hover:text-white text-sm transition-colors">{label}</a>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Mega type mark */}
        <div className="w-full flex items-center justify-center pointer-events-none overflow-hidden">
          <h1 className="text-[12vw] font-black tracking-tighter leading-none text-zinc-900 text-center mb-[-2vw]">
            MAIL-MAN
          </h1>
        </div>
      </footer>
    </div>
  );
}