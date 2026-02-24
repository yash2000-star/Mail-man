"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Bot, Shield, Sparkles,
  Mail, Plus, Search, Tag, BarChart3, Clock,
  ChevronRight, Star
} from "lucide-react";

// ===== ANIMATION HELPERS =====
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true, margin: "-80px" },
};

const cardFade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

// ===== LOGO CAROUSEL DATA =====
const LOGOS = [
  "Google", "Stripe", "Notion", "Linear", "Vercel", "Figma", "Slack", "Intercom"
];

// ===== DYNAMIC USE CASES =====
const USE_CASES = ["Agency", "Freelancer", "Startup", "Enterprise", "E-commerce"];

// ===== FAQ DATA =====
const FAQS = [
  {
    q: "How does Mail-man use my data?",
    a: "We never store your emails. All email content is processed in-memory via your own API key and never persisted on our servers. Your privacy is absolute."
  },
  {
    q: "Can I use my own AI keys?",
    a: "Yes! Mail-man supports Bring Your Own Key (BYOK) for Gemini, OpenAI, and Anthropic. Just paste your key in settings and you're ready."
  },
  {
    q: "Is there a free plan?",
    a: "Absolutely. The free plan includes full Gmail access, up to 30 emails and Smart Labels. The Pro plan unlocks unlimited AI processing and priority support."
  },
  {
    q: "How fast is email classification?",
    a: "Classification happens in seconds per email using your connected AI model. Batch processing of 30 emails typically completes in under 2 minutes."
  },
];


export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [useCaseIdx, setUseCaseIdx] = useState(0);
  const [inputVal, setInputVal] = useState("");

  // Cycle through use cases
  useEffect(() => {
    const interval = setInterval(() => {
      setUseCaseIdx(i => (i + 1) % USE_CASES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden selection:bg-blue-100">

      {/* ─── HERO BACKGROUND GLOW ─── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-gradient-radial from-blue-100 via-indigo-50 to-transparent opacity-80 blur-[120px]" />
        <div className="absolute top-[60px] right-[-20%] w-[600px] h-[500px] rounded-full bg-gradient-radial from-purple-50 to-transparent opacity-50 blur-[100px]" />
      </div>

      {/* ─── 1. NAVBAR ─── */}
      <nav className="fixed top-4 inset-x-0 z-50 px-4">
        <div className="max-w-6xl mx-auto backdrop-blur-md bg-white/75 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Mail size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">Mail-man</span>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Pricing", "About"].map(link => (
              <a key={link} href={`#${link.toLowerCase()}`} className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition">
                {link}
              </a>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => signIn("google")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            Sign Up Free <ArrowRight size={14} strokeWidth={3} />
          </button>
        </div>
      </nav>

      {/* ─── 2. HERO SECTION ─── */}
      <section className="relative z-10 pt-48 pb-32 px-6 max-w-6xl mx-auto text-center">

        {/* Badge */}
        <motion.div {...fadeUp} className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-bold mb-8">
          <Sparkles size={14} className="fill-blue-200" />
          Introducing Mail-man AI
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-6xl md:text-7xl lg:text-[88px] font-black tracking-tighter leading-tight mb-8 text-slate-950"
        >
          Power your Inbox<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500">
            with Clean AI.
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Connect your own AI keys. Get intelligent summaries, auto-extracted tasks, and perfect draft replies—without any monthly subscription.
        </motion.p>

        {/* Glassmorphic Input */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="max-w-xl mx-auto"
        >
          <div className="relative group bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] flex items-center gap-3 p-2 pl-5 focus-within:border-blue-300 focus-within:shadow-[0_10px_40px_rgba(59,130,246,0.12)] transition-all">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Ask anything about your inbox..."
              className="flex-1 text-slate-700 font-medium text-sm bg-transparent outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => signIn("google")}
              className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition hover:bg-blue-700 flex items-center gap-1.5 shrink-0"
            >
              Try it <ArrowRight size={14} strokeWidth={3} />
            </button>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-3">No account needed — connect Gmail in 1 click.</p>
        </motion.div>

        {/* Social Proof Avatars */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
          className="flex items-center justify-center gap-3 mt-10"
        >
          <div className="flex -space-x-3">
            {["bg-blue-400", "bg-violet-400", "bg-emerald-400", "bg-amber-400"].map((c, i) => (
              <div key={i} className={`w-9 h-9 ${c} rounded-full border-2 border-white flex items-center justify-center`}>
                <Star size={12} className="text-white fill-white" />
              </div>
            ))}
          </div>
          <span className="text-sm font-semibold text-slate-500"><span className="text-slate-900 font-bold">1,200+</span> professionals use Mail-man</span>
        </motion.div>
      </section>

      {/* ─── 3. LOGO CAROUSEL ─── */}
      <section className="relative z-10 py-12 border-y border-gray-100 bg-slate-50/60 overflow-hidden">
        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Trusted by teams at</p>
        <div className="flex items-center gap-20 animate-marquee whitespace-nowrap">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <span key={i} className="text-lg font-black text-slate-300 grayscale shrink-0">
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* ─── 4. BENTO FEATURES GRID ─── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <motion.div {...fadeUp} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-950 mb-4">
            Every tool you need.<br />Nothing you don't.
          </h2>
          <p className="text-slate-500 font-medium text-lg">Intelligent email management, powered by the AI model of your choice.</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-12 gap-5"
        >
          {/* Large Left Card */}
          <motion.div variants={cardFade} className="md:col-span-8 bg-white border border-gray-100 rounded-3xl p-10 shadow-[0_10px_40px_rgba(0,0,0,0.05)] flex flex-col gap-8 group hover:shadow-[0_20px_60px_rgba(59,130,246,0.08)] transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><Sparkles className="text-blue-600" size={20} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Train Your AI</h3>
                <p className="text-sm text-slate-500 font-medium">Create smart labels with natural language instructions</p>
              </div>
            </div>
            {/* Mock UI */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-gray-100 flex-1 space-y-3">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Active Smart Label</div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <p className="text-sm text-slate-700 italic font-medium">
                    "Flag all emails containing an invoice or a payment request due within 7 days."
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                {["Urgent", "Finance", "Reply Needed"].map(tag => (
                  <span key={tag} className="text-[11px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Top Right — Add Your Brand */}
          <motion.div variants={cardFade} className="md:col-span-4 bg-white border border-gray-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.05)] group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-shadow">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-6"><Tag className="text-emerald-600" size={20} /></div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Add Your Brand</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">Custom labels with colors, smart AI instructions, and retroactive email tagging across your last 50 messages.</p>
            <div className="mt-6 flex gap-2">
              {["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-red-400", "bg-purple-500"].map(c => (
                <div key={c} className={`w-7 h-7 ${c} rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform`} />
              ))}
            </div>
          </motion.div>

          {/* Bottom Left — Chat with Inbox */}
          <motion.div variants={cardFade} className="md:col-span-5 bg-blue-600 rounded-3xl p-8 shadow-[0_10px_40px_rgba(59,130,246,0.25)] text-white overflow-hidden relative group">
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mb-6"><Bot size={20} /></div>
              <h3 className="text-2xl font-black mb-3">Chat with Inbox</h3>
              <p className="text-blue-100 font-medium text-sm leading-relaxed">Ask plain-English questions about your email threads. "What did Sarah say about the proposal?"</p>
            </div>
            {/* Mock chat bubble */}
            <div className="absolute bottom-6 right-6 left-6 bg-white/15 backdrop-blur rounded-xl p-3 text-sm text-white/80 italic font-medium group-hover:bg-white/20 transition">
              "Found 3 messages from Sarah about the Q3 proposal. Want a summary?"
            </div>
          </motion.div>

          {/* Bottom Mid — Multi Model */}
          <motion.div variants={cardFade} className="md:col-span-4 bg-white border border-gray-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-6"><BarChart3 className="text-violet-600" size={20} /></div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Multi-Model Hub</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">Switch between Gemini, ChatGPT, and Claude with one click. Use your own keys for $0/mo AI.</p>
            <div className="mt-6 space-y-2">
              {[{ name: "Gemini", color: "bg-blue-500" }, { name: "GPT-4o", color: "bg-emerald-500" }, { name: "Claude", color: "bg-amber-500" }].map(m => (
                <div key={m.name} className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${m.color}`} />
                  <span className="text-xs text-slate-600 font-bold">{m.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom Right — Smart Scheduling */}
          <motion.div variants={cardFade} className="md:col-span-3 bg-white border border-gray-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-6"><Clock className="text-amber-600" size={20} /></div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Task Extraction</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">AI pulls deadlines from your inbox directly into your Master To-Do dashboard.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── 5. STATS SECTION ─── */}
      <section className="relative z-10 bg-slate-950 py-20 px-6">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
          className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center text-white"
        >
          {[
            { num: "1,200+", label: "Active Users" },
            { num: "95%", label: "Time Saved on Email Triage" },
            { num: "$0", label: "Monthly Cost with Your Own Key" },
          ].map(stat => (
            <motion.div key={stat.label} variants={cardFade}>
              <p className="text-5xl font-black tracking-tighter text-white mb-2">{stat.num}</p>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── 6. DYNAMIC USE CASES ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <motion.div {...fadeUp} className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-950 mb-4">
            The AI inbox built for{" "}
            <span className="relative inline-block">
              <AnimatePresence mode="wait">
                <motion.span
                  key={useCaseIdx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35 }}
                  className="text-blue-600 inline-block"
                >
                  {USE_CASES[useCaseIdx]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h2>
          <p className="text-slate-500 font-medium text-lg">Whatever you do, Mail-man shapes itself to your workflow.</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { icon: <BarChart3 className="text-blue-600" size={24} />, bg: "bg-blue-50", title: "Founders & Startups", desc: "Organize investor updates, pitch deck intros, and customer conversations automatically." },
            { icon: <Bot className="text-violet-600" size={24} />, bg: "bg-violet-50", title: "Freelancers", desc: "Never miss a client follow-up. Extract project deadlines and create tasks from inbound emails." },
            { icon: <Shield className="text-emerald-600" size={24} />, bg: "bg-emerald-50", title: "Enterprise Teams", desc: "Classify thousands of emails per team with custom labels, private key vaults, and thread summaries." },
          ].map(card => (
            <motion.div key={card.title} variants={cardFade} className="bg-white border border-gray-100 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-transform duration-300">
              <div className={`w-12 h-12 ${card.bg} rounded-2xl flex items-center justify-center mb-6`}>{card.icon}</div>
              <h3 className="text-xl font-black text-slate-900 mb-3">{card.title}</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">{card.desc}</p>
              <button className="mt-6 flex items-center gap-1 text-sm font-bold text-blue-600 hover:gap-2 transition-all">
                Learn more <ChevronRight size={16} />
              </button>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── 7. PRICING ─── */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 py-28">
        <motion.div {...fadeUp} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-950 mb-4">Simple, honest pricing.</h2>
          <p className="text-slate-500 font-medium text-lg">Start for free. Upgrade when you're ready.</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch"
        >
          {/* Free Card */}
          <motion.div variants={cardFade} className="bg-white border border-gray-200 rounded-3xl p-10 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
            <p className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-4">Free</p>
            <p className="text-5xl font-black text-slate-900 mb-2">$0<span className="text-lg font-bold text-slate-400">/mo</span></p>
            <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">Everything you need to get started with AI email management.</p>
            <ul className="space-y-4 mb-10">
              {["30 emails per sync", "Smart Labels (3 max)", "Basic AI Summaries", "Gmail Integration"].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <Check size={16} className="text-emerald-500" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => signIn("google")} className="w-full py-3.5 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition">
              Get Started Free
            </button>
          </motion.div>

          {/* Pro Card */}
          <motion.div variants={cardFade} className="bg-white border-2 border-blue-200 rounded-3xl p-10 shadow-[0_10px_60px_rgba(59,130,246,0.12)] relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">Most Popular</div>
            <p className="text-sm font-extrabold text-blue-600 uppercase tracking-widest mb-4">Pro</p>
            <p className="text-5xl font-black text-slate-900 mb-2">
              $0<span className="text-lg font-bold text-slate-400">/mo</span>
            </p>
            <p className="text-slate-500 font-medium text-sm mb-1">with your own API key</p>
            <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">Full unlimited access. No usage limits.</p>
            <ul className="space-y-4 mb-10">
              {["Unlimited email syncing", "Unlimited Smart Labels", "AI Chat with Inbox", "Multi-Model Support (Gemini, GPT, Claude)", "Master To-Do Dashboard", "Priority Support"].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <Check size={16} className="text-blue-600" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => signIn("google")} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition shadow-lg shadow-blue-600/20">
              Connect Gmail Now
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── 8. FAQ ─── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <motion.div {...fadeUp} className="text-center mb-16">
          <h2 className="text-4xl font-black tracking-tight text-slate-950 mb-4">Frequently asked.</h2>
        </motion.div>
        <motion.div {...fadeUp} className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-7 py-5 text-left"
              >
                <span className="font-bold text-slate-900 text-[15px] pr-4">{faq.q}</span>
                <motion.span
                  animate={{ rotate: activeFaq === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-slate-400 font-bold text-xl"
                >
                  <Plus size={16} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {activeFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <p className="px-7 pb-6 text-sm text-slate-500 font-medium leading-relaxed">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ─── 9. BOTTOM CTA ─── */}
      <section className="relative z-10 px-6 py-8 mb-12">
        <motion.div
          {...fadeUp}
          className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 rounded-3xl p-16 text-center text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              Create your own AI email agent.
            </h2>
            <p className="text-blue-100 font-medium text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Connect Gmail, add your API key, and Mail-man does the rest. No monthly fees. Absolute privacy.
            </p>
            <button
              onClick={() => signIn("google")}
              className="bg-white text-blue-600 hover:bg-blue-50 font-black text-lg py-5 px-12 rounded-2xl transition-all shadow-xl flex items-center gap-3 mx-auto"
            >
              Get Started Free <ArrowRight size={22} strokeWidth={3} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* ─── 10. FOOTER ─── */}
      <footer className="relative z-10 border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Mail size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">Mail-man</span>
          </div>
          <div className="flex gap-8">
            {["Privacy", "Terms", "GitHub", "Twitter"].map(l => (
              <a key={l} href="#" className="text-sm font-semibold text-slate-400 hover:text-slate-700 transition">{l}</a>
            ))}
          </div>
          <p className="text-sm text-slate-400 font-medium">© 2026 Mail-man Inc.</p>
        </div>
      </footer>

    </div>
  );
}