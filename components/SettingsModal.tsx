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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[17px] font-extrabold text-black flex items-center gap-2">
            <Key size={18} className="text-[#2ca2f6]" />
            AI Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-5">
          <div className="space-y-4">

            <div>
              <label className="block text-[13px] font-bold text-gray-500 mb-1.5 ml-1">Google Gemini API Key</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#f4f6f8] border border-transparent text-black px-4 py-3 rounded-2xl outline-none focus:border-blue-300 transition-colors font-mono text-[13px] shadow-sm placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-500 mb-1.5 ml-1">OpenAI API Key (ChatGPT)</label>
              <input
                type="password"
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#f4f6f8] border border-transparent text-black px-4 py-3 rounded-2xl outline-none focus:border-blue-300 transition-colors font-mono text-[13px] shadow-sm placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-500 mb-1.5 ml-1">Anthropic API Key (Claude)</label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-[#f4f6f8] border border-transparent text-black px-4 py-3 rounded-2xl outline-none focus:border-blue-300 transition-colors font-mono text-[13px] shadow-sm placeholder-gray-400"
              />
            </div>

          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl flex gap-3 text-purple-700 text-[13px] leading-relaxed mt-2">
            <ShieldAlert size={16} className="shrink-0 text-purple-600 mt-0.5" />
            <p>
              <strong>Your key is stored securely in your database.</strong> We save your API key encrypted in MongoDB and inject it only into your secure serverless functions when you use AI features.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-6">
          <button onClick={onClose} className="text-gray-500 font-bold text-[15px] hover:text-black transition px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaved}
            className="bg-[#8ecbfb] hover:bg-[#6abcf8] disabled:bg-[#43b016] disabled:opacity-100 text-white font-extrabold text-[15px] px-7 py-2.5 rounded-full transition-all flex items-center justify-center gap-2 min-w-[120px]"
          >
            {isSaved ? <><Check size={16} className="stroke-[3]" /> Saved</> : "Save Keys"}
          </button>
        </div>

      </div>
    </div>
  );
}