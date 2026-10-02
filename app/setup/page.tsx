"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Key, Check, ShieldAlert, ArrowRight } from "lucide-react";
import { AI_PROVIDERS, AiProvider, PROVIDER_KEY_INFO, PROVIDER_LABELS } from "@/lib/ai-providers";
import type { MailItem, MailPage } from "@/lib/mail-types";

const KEY_FIELD: Record<AiProvider, string> = {
    gemini: "geminiApiKey",
    openai: "openAiApiKey",
    anthropic: "anthropicApiKey",
};

const LOADING_MESSAGES = [
    "Connecting to inbox...",
    "Reading your top emails...",
    "Generating AI summaries...",
    "Organizing your triage...",
    "Almost ready...",
];

export default function SetupPage() {
    const { status } = useSession();
    const router = useRouter();

    const [provider, setProvider] = useState<AiProvider>("gemini");
    const [apiKey, setApiKey] = useState("");
    const [phase, setPhase] = useState<"input" | "loading" | "done">("input");
    const [error, setError] = useState("");
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    const cycleRef = useRef<NodeJS.Timeout | null>(null);
    const msgIndexRef = useRef(0);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/");
        }
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/user")
                .then((r) => r.json())
                .then((data) => {
                    if (AI_PROVIDERS.some((p) => data.savedKeys?.[p]?.saved)) {
                        router.replace("/");
                    }
                })
                .catch(() => { });
        }
    }, [status, router]);

    const startMessageCycle = () => {
        msgIndexRef.current = 0;
        setLoadingMessage(LOADING_MESSAGES[0]);
        cycleRef.current = setInterval(() => {
            msgIndexRef.current = (msgIndexRef.current + 1) % LOADING_MESSAGES.length;
            setLoadingMessage(LOADING_MESSAGES[msgIndexRef.current]);
        }, 2500);
    };

    useEffect(() => {
        return () => {
            if (cycleRef.current) clearInterval(cycleRef.current);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedKey = apiKey.trim();
        if (!trimmedKey) {
            setError(`Please enter your ${PROVIDER_LABELS[provider]} API key.`);
            return;
        }

        setError("");
        setPhase("loading");
        startMessageCycle();

        try {
            // Step 1: Save the API key to DB
            const saveRes = await fetch("/api/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [KEY_FIELD[provider]]: trimmedKey, aiProvider: provider }),
            });
            if (!saveRes.ok) throw new Error("Failed to save API key.");

            // Step 2: Fetch the newest inbox emails (through our server)
            const listRes = await fetch("/api/gmail/messages?folder=Inbox");
            if (!listRes.ok) throw new Error("Failed to fetch emails.");
            const listData: MailPage = await listRes.json();
            let preloadedEmails: MailItem[] = listData.emails;

            // Step 3: Classify those emails
            if (preloadedEmails.length > 0) {
                const classifyPayload = preloadedEmails.slice(0, 10).map((e) => ({
                    id: e.id,
                    sender: e.from,
                    snippet: e.snippet,
                }));

                const classifyRes = await fetch("/api/classify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emails: classifyPayload }),
                });

                // This first AI call doubles as a check that the key works
                if (!classifyRes.ok) {
                    const data = await classifyRes.json().catch(() => ({}));
                    if (data.code === "invalid_key") throw new Error(data.error);
                } else {
                    const classifyData = await classifyRes.json();
                    if (Array.isArray(classifyData)) {
                        preloadedEmails = preloadedEmails.map((email) => {
                            const match = classifyData.find((r: any) => r.id === email.id);
                            return match ? { ...email, ...match } : email;
                        });
                    }
                }
            }

            // Step 4: Cache to localStorage so dashboard loads instantly
            try {
                localStorage.setItem("mailman_cache_inbox_v2", JSON.stringify(preloadedEmails));
            } catch { }

            // Step 5: Show saved ✓ then redirect
            if (cycleRef.current) clearInterval(cycleRef.current);
            setPhase("done");

            setTimeout(() => {
                router.replace("/");
            }, 1000);
        } catch (err: any) {
            console.error("Setup failed:", err);
            if (cycleRef.current) clearInterval(cycleRef.current);
            setPhase("input");
            setError(err.message || "Something went wrong. Please try again.");
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="w-10 h-10 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-black bg-[radial-gradient(circle_at_70%_20%,rgba(245,158,11,0.12),transparent_55%)]">

            {/* Card styled like the Settings modal */}
            <div className="w-full max-w-md bg-zinc-950 rounded-[32px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-zinc-800/60">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[17px] font-extrabold text-zinc-100 flex items-center gap-2">
                        <Key size={18} className="text-amber-500" />
                        Welcome to Mail-man.
                    </h2>
                </div>

                {phase === "input" && (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <p className="block text-[13px] font-bold text-zinc-500 mb-1.5 ml-1">AI provider</p>
                                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="AI provider">
                                        {AI_PROVIDERS.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                role="radio"
                                                aria-checked={provider === p}
                                                onClick={() => setProvider(p)}
                                                className={`px-2 py-2.5 rounded-2xl text-[12px] font-bold border transition-colors ${provider === p ? "border-amber-500/60 bg-amber-500/10 text-amber-400" : "border-zinc-800/60 bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}
                                            >
                                                {PROVIDER_LABELS[p]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="api-key" className="block text-[13px] font-bold text-zinc-500 mb-1.5 ml-1">
                                        {PROVIDER_LABELS[provider]} API key
                                    </label>
                                    <input
                                        id="api-key"
                                        type="password"
                                        autoComplete="off"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={PROVIDER_KEY_INFO[provider].placeholder}
                                        autoFocus
                                        className="w-full bg-zinc-900 border border-zinc-800/60 text-zinc-100 px-4 py-3 rounded-2xl outline-none focus:border-amber-500/50 transition-colors font-mono text-[13px] shadow-sm placeholder-zinc-600"
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-rose-400 text-xs font-medium px-1">{error}</p>
                            )}

                            <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex gap-3 text-zinc-400 text-[13px] leading-relaxed">
                                <ShieldAlert size={16} className="shrink-0 text-amber-500 mt-0.5" />
                                <p>
                                    <strong className="text-zinc-200">Your key stays on the server.</strong>{" "}
                                    It is encrypted in the database and only used by Mail-man&apos;s server to call the AI. You can add keys for other providers later in Settings.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between gap-3 pt-6">
                            <a
                                href={PROVIDER_KEY_INFO[provider].getKeyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[13px] text-amber-500 hover:underline font-medium"
                            >
                                {provider === "gemini" ? "Get a free key →" : "Get a key →"}
                            </a>
                            <button
                                type="submit"
                                className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[15px] px-7 py-2.5 rounded-full transition-all flex items-center justify-center gap-2 min-w-[140px]"
                            >
                                Unlock Inbox
                                <ArrowRight size={15} />
                            </button>
                        </div>
                    </form>
                )}

                {(phase === "loading" || phase === "done") && (
                    <div className="py-4 space-y-5">
                        {/* Dynamic status message */}
                        <p className="text-[13px] font-bold text-zinc-500 mb-1.5 ml-1">Status</p>
                        <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl px-4 py-3 text-[13px] font-mono text-zinc-100 shadow-sm flex items-center gap-3">
                            {phase === "done" ? (
                                <>
                                    <Check size={15} className="text-[#43b016] shrink-0 stroke-[3]" />
                                    <span>Your inbox is ready!</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin shrink-0" />
                                    <span
                                        key={loadingMessage}
                                        className="animate-pulse"
                                    >
                                        {loadingMessage}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Steps */}
                        <div className="space-y-2 pl-1">
                            {["Saving API key", "Fetching top emails", "Generating AI summaries"].map((step, i) => {
                                const phaseIndex = phase === "loading"
                                    ? (LOADING_MESSAGES.indexOf(loadingMessage) >= 0 ? Math.floor(LOADING_MESSAGES.indexOf(loadingMessage) * 3 / LOADING_MESSAGES.length) : 0)
                                    : 3;
                                const done = phase === "done" || phaseIndex > i;
                                const active = phase === "loading" && phaseIndex === i;
                                return (
                                    <div key={step} className="flex items-center gap-2.5 text-[13px]">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${done ? "border-[#43b016] bg-[#43b016]/10" : active ? "border-amber-500 bg-amber-500/10" : "border-zinc-700"}`}>
                                            {done && <Check size={9} className="text-[#43b016] stroke-[3]" />}
                                        </div>
                                        <span className={done ? "text-zinc-500 line-through" : active ? "text-zinc-100 font-semibold" : "text-zinc-600"}>{step}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
