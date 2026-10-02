"use client";

import { useState } from "react";
import { X, Key, Check, ShieldAlert, Trash2 } from "lucide-react";
import { AI_PROVIDERS, AiProvider, PROVIDER_KEY_INFO, PROVIDER_LABELS, SavedKeys } from "@/lib/ai-providers";

type KeyField = "geminiApiKey" | "openAiApiKey" | "anthropicApiKey";

export type SettingsUpdate = Partial<Record<KeyField, string>> & { aiProvider?: AiProvider };

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedKeys: SavedKeys;
  aiProvider: AiProvider | null;
  /** Resolves to an error message, or null on success. */
  onSave: (update: SettingsUpdate) => Promise<string | null>;
  /** Deletes all of the user's Mail-man data; resolves to an error message, or null */
  onDeleteData?: () => Promise<string | null>;
}

const FIELD: Record<AiProvider, KeyField> = {
  gemini: "geminiApiKey",
  openai: "openAiApiKey",
  anthropic: "anthropicApiKey",
};

export default function SettingsModal({ isOpen, onClose, savedKeys, aiProvider, onSave, onDeleteData }: SettingsModalProps) {
  // New keys typed in this session; saved keys are never sent to the browser.
  const [newKeys, setNewKeys] = useState<Record<AiProvider, string>>({ gemini: "", openai: "", anthropic: "" });
  const [removed, setRemoved] = useState<Set<AiProvider>>(new Set());
  const [provider, setProvider] = useState<AiProvider | null>(aiProvider);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteData = async () => {
    if (!onDeleteData) return;
    if (!confirm("Delete all your Mail-man data? This removes your saved API keys, Smart Labels, to-dos and AI summaries, and signs you out. Your Gmail is not affected.")) return;
    setIsDeleting(true);
    setError("");
    const deleteError = await onDeleteData();
    setIsDeleting(false);
    if (deleteError) setError(deleteError);
  };

  // Which providers will have a key after saving
  const willHaveKey = (p: AiProvider) => newKeys[p].trim() !== "" || (savedKeys[p].saved && !removed.has(p));
  const available = AI_PROVIDERS.filter(willHaveKey);
  const effectiveProvider = provider && available.includes(provider) ? provider : available[0] ?? null;

  const handleSave = async () => {
    const update: SettingsUpdate = {};
    for (const p of AI_PROVIDERS) {
      if (newKeys[p].trim()) update[FIELD[p]] = newKeys[p].trim();
      else if (removed.has(p)) update[FIELD[p]] = "";
    }
    if (effectiveProvider) update.aiProvider = effectiveProvider;

    setIsSaving(true);
    setError("");
    const saveError = await onSave(update);
    setIsSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
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
            {AI_PROVIDERS.map((p) => {
              const isSavedKey = savedKeys[p].saved && !removed.has(p);
              return (
                <div key={p}>
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label htmlFor={`key-${p}`} className="block text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
                      {PROVIDER_LABELS[p]} API Key
                    </label>
                    <a href={PROVIDER_KEY_INFO[p].getKeyUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-amber-500 hover:underline">
                      Get a key
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id={`key-${p}`}
                      type="password"
                      autoComplete="off"
                      value={newKeys[p]}
                      onChange={(e) => setNewKeys((k) => ({ ...k, [p]: e.target.value }))}
                      placeholder={isSavedKey ? `Saved key ending ${savedKeys[p].hint || "****"} (type to replace)` : PROVIDER_KEY_INFO[p].placeholder}
                      className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800/60 text-zinc-100 px-5 py-3.5 rounded-2xl outline-none focus:border-amber-500/50 transition-all font-mono text-[13px] shadow-sm placeholder-zinc-600"
                    />
                    {isSavedKey && (
                      <button
                        type="button"
                        onClick={() => setRemoved((r) => new Set(r).add(p))}
                        title={`Remove saved ${PROVIDER_LABELS[p]} key`}
                        className="shrink-0 px-3 rounded-2xl border border-zinc-800/60 text-zinc-500 hover:text-rose-400 hover:border-rose-500/40 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {available.length > 1 && (
              <div>
                <label htmlFor="ai-provider" className="block text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-2 ml-1">
                  Use for AI features
                </label>
                <select
                  id="ai-provider"
                  value={effectiveProvider ?? ""}
                  onChange={(e) => setProvider(e.target.value as AiProvider)}
                  className="w-full bg-zinc-900 border border-zinc-800/60 text-zinc-100 px-5 py-3.5 rounded-2xl outline-none focus:border-amber-500/50 text-[13px]"
                >
                  {available.map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>)}
                </select>
              </div>
            )}

            {error && <p className="text-rose-400 text-xs font-medium px-1">{error}</p>}
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex gap-3 text-zinc-400 text-xs leading-relaxed mt-2">
            <ShieldAlert size={16} className="shrink-0 text-amber-500 mt-0.5" />
            <p>
              <strong className="text-zinc-200">Your keys stay on the server.</strong> They are encrypted in the database and used only by Mail-man&apos;s server to call the AI provider. One key from any provider is enough.
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
            disabled={isSaved || isSaving}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-emerald-500 disabled:opacity-100 text-black font-black text-sm uppercase tracking-widest px-8 py-3 rounded-full transition-all flex items-center justify-center gap-2 min-w-[140px] shadow-xl"
          >
            {isSaved ? <><Check size={16} className="stroke-[4]" /> Saved</> : isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        {onDeleteData && (
          <div className="mt-8 pt-5 border-t border-zinc-800/60 flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
              Remove everything Mail-man stores about you. <a href="/privacy" target="_blank" className="text-zinc-400 underline hover:text-zinc-200">Privacy</a>
            </p>
            <button
              onClick={handleDeleteData}
              disabled={isDeleting}
              className="shrink-0 text-xs font-bold text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-500/60 rounded-full px-4 py-2 transition disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete my data"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}