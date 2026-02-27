"use client";

import { useState, useEffect } from "react";
import { X, Key, Check, ShieldAlert } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialKeys: { gemini: string; openai: string; anthropic: string };
  onSaveDb: (keys: any) => Promise<void>;
}

export default function SettingsModal({ isOpen, onClose, initialKeys, onSaveDb }: SettingsModalProps) {
  const [geminiKey, setGeminiKey] = useState("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(initialKeys?.gemini || "");
      setOpenAiKey(initialKeys?.openai || "");
      setAnthropicKey(initialKeys?.anthropic || "");
    }
  }, [isOpen, initialKeys]);

  const handleSave = async () => {
    await onSaveDb({
      geminiApiKey: geminiKey.trim(),
      openAiApiKey: openAiKey.trim(),
      anthropicApiKey: anthropicKey.trim()
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950 rounded-[32px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-zinc-800/60">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-[14px] font-black uppercase tracking-widest text-zinc-100 flex items-center gap-3">
            <Key size={18} className="text-amber-500" />
            AI Vault Settings
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100 transition">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-5">
          <div className="space-y-4">

            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-2 ml-1">Google Gemini API Key</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-900 border border-zinc-800/60 text-zinc-100 px-5 py-3.5 rounded-2xl outline-none focus:border-amber-500/50 transition-all font-mono text-[13px] shadow-sm placeholder-zinc-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-2 ml-1">OpenAI API Key (ChatGPT)</label>
              <input
                type="password"
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-zinc-900 border border-zinc-800/60 text-zinc-100 px-5 py-3.5 rounded-2xl outline-none focus:border-amber-500/50 transition-all font-mono text-[13px] shadow-sm placeholder-zinc-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-2 ml-1">Anthropic API Key (Claude)</label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-zinc-900 border border-zinc-800/60 text-zinc-100 px-5 py-3.5 rounded-2xl outline-none focus:border-amber-500/50 transition-all font-mono text-[13px] shadow-sm placeholder-zinc-700"
              />
            </div>

          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex gap-3 text-zinc-400 text-xs leading-relaxed mt-2">
            <ShieldAlert size={16} className="shrink-0 text-amber-500 mt-0.5" />
            <p>
              <strong className="text-zinc-200">Your key is stored securely.</strong> We save your API key encrypted in MongoDB and inject it only into your secure serverless functions.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-8">
          <button onClick={onClose} className="text-zinc-500 font-bold text-sm hover:text-zinc-100 transition px-6 py-2.5">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaved}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-emerald-500 disabled:opacity-100 text-black font-black text-sm uppercase tracking-widest px-8 py-3 rounded-full transition-all flex items-center justify-center gap-2 min-w-[140px] shadow-xl"
          >
            {isSaved ? <><Check size={16} className="stroke-[4]" /> Saved</> : "Save Keys"}
          </button>
        </div>

      </div>
    </div>
  );
}