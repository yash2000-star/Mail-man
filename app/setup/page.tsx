"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Key, Check, ShieldAlert, ArrowRight } from "lucide-react";

const LOADING_MESSAGES = [
    "Connecting to inbox...",
    "Reading your top emails...",
    "Generating AI summaries...",
    "Organizing your triage...",
    "Almost ready...",
];

export default function SetupPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [apiKey, setApiKey] = useState("");
    const [phase, setPhase] = useState<"input" | "loading" | "done">("input");
    const [error, setError] = useState("");
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    const [isSaved, setIsSaved] = useState(false);
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
                    if (data.geminiApiKey && data.geminiApiKey.trim() !== "") {
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
            setError("Please enter your Gemini API key.");
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
                body: JSON.stringify({ geminiApiKey: trimmedKey }),
            });
            if (!saveRes.ok) throw new Error("Failed to save API key.");

            // Step 2: Fetch top 5 inbox emails from Gmail
            const accessToken = (session as any)?.accessToken;
            if (!accessToken) throw new Error("No access token.");

            const gmailRes = await fetch(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=in:inbox",
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!gmailRes.ok) throw new Error("Failed to fetch emails.");

            const gmailData = await gmailRes.json();
            let preloadedEmails: any[] = [];

            if (gmailData.messages && gmailData.messages.length > 0) {
                const detailPromises = gmailData.messages.map(async (msg: any) => {
                    try {
                        const res = await fetch(
                            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
                            { headers: { Authorization: `Bearer ${accessToken}` } }
                        );
                        if (!res.ok) return null;
                        return await res.json();
                    } catch {
                        return null;
                    }
                });

                const detailedMsgs = await Promise.all(detailPromises);

                const getHeader = (headers: any[], name: string) => {
                    const h = headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
                    return h ? h.value : "";
                };

                preloadedEmails = detailedMsgs
                    .filter((m: any) => m && m.payload && m.payload.headers)
                    .map((m: any) => ({
                        id: m.id,
                        snippet: m.snippet,
                        subject: getHeader(m.payload.headers, "Subject"),
                        from: getHeader(m.payload.headers, "From").split("<")[0].trim(),
                        date: getHeader(m.payload.headers, "Date"),
                        isUnread: m.labelIds?.includes("UNREAD") || false,
                        isStarred: m.labelIds?.includes("STARRED") || false,
                        to: getHeader(m.payload.headers, "To"),
                        cc: getHeader(m.payload.headers, "Cc"),
                        hasAttachment: m.payload.parts?.some(
                            (p: any) => p.filename && p.filename.length > 0
                        ) || false,
                    }));

                // Step 3: Classify those emails
                if (preloadedEmails.length > 0) {
                    const classifyPayload = preloadedEmails.map((e) => ({
                        id: e.id,
                        sender: e.from,
                        snippet: e.snippet,
                    }));

                    const classifyRes = await fetch("/api/classify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ emails: classifyPayload, apiKey: trimmedKey }),
                    });

                    if (classifyRes.ok) {
                        const classifyData = await classifyRes.json();
                        if (Array.isArray(classifyData)) {
                            preloadedEmails = preloadedEmails.map((email) => {
                                const match = classifyData.find((r: any) => r.id === email.id);
                                return match ? { ...email, ...match } : email;
                            });
                        }
                    }
                }
            }

            // Step 4: Cache to localStorage so dashboard loads instantly
            try {
                localStorage.setItem("ezee_mail_cache_Inbox", JSON.stringify(preloadedEmails));
            } catch { }

            // Step 5: Show saved ✓ then redirect
            if (cycleRef.current) clearInterval(cycleRef.current);
            setPhase("done");
            setIsSaved(true);

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
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        // Matches the SettingsModal backdrop style
        <div className="min-h-screen flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" style={{ background: "linear-gradient(135deg, #e8f0fe 0%, #f3f4f6 50%, #fdf2f8 100%)" }}>

            {/* Card — identical to SettingsModal */}
            <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[17px] font-extrabold text-black flex items-center gap-2">
                        <Key size={18} className="text-[#2ca2f6]" />
                        Welcome to Mail-man.
                    </h2>
                </div>

                {phase === "input" && (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-gray-500 mb-1.5 ml-1">
                                        Google Gemini API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="AIzaSy..."
                                        autoFocus
                                        className="w-full bg-[#f4f6f8] border border-transparent text-black px-4 py-3 rounded-2xl outline-none focus:border-blue-300 transition-colors font-mono text-[13px] shadow-sm placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-500 text-xs font-medium px-1">{error}</p>
                            )}

                            {/* Security notice — identical to SettingsModal */}
                            <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl flex gap-3 text-purple-700 text-[13px] leading-relaxed">
                                <ShieldAlert size={16} className="shrink-0 text-purple-600 mt-0.5" />
                                <p>
                                    <strong>Your key is stored securely in your database.</strong>{" "}
                                    We save your API key encrypted in MongoDB and inject it only into your secure serverless functions.
                                </p>
                            </div>
                        </div>

                        {/* Footer — identical to SettingsModal */}
                        <div className="flex items-center justify-between gap-3 pt-6">
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[13px] text-[#2ca2f6] hover:underline font-medium"
                            >
                                Get a free key →
                            </a>
                            <button
                                type="submit"
                                className="bg-[#8ecbfb] hover:bg-[#6abcf8] text-white font-extrabold text-[15px] px-7 py-2.5 rounded-full transition-all flex items-center justify-center gap-2 min-w-[140px]"
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
                        <p className="text-[13px] font-bold text-gray-500 mb-1.5 ml-1">Status</p>
                        <div className="bg-[#f4f6f8] rounded-2xl px-4 py-3 text-[13px] font-mono text-black shadow-sm flex items-center gap-3">
                            {phase === "done" ? (
                                <>
                                    <Check size={15} className="text-[#43b016] shrink-0 stroke-[3]" />
                                    <span>Your inbox is ready!</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin shrink-0" />
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
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${done ? "border-[#43b016] bg-[#43b016]/10" : active ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
                                            {done && <Check size={9} className="text-[#43b016] stroke-[3]" />}
                                        </div>
                                        <span className={done ? "text-gray-500 line-through" : active ? "text-black font-semibold" : "text-gray-400"}>{step}</span>
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
