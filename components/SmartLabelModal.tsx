"use client";

import { useState } from "react";
import { Check } from "lucide-react";

interface SmartLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLabel: (label: { name: string; prompt: string; color: string; applyRetroactively: boolean }) => void;
}

const COLORS = [
  { id: "blue", class: "bg-[#2ca2f6]" },    // Light Blue
  { id: "green", class: "bg-[#8dc500]" },   // Green
  { id: "yellow", class: "bg-[#f5a623]" },  // Orange/Yellow
  { id: "red", class: "bg-[#ed4c67]" },     // Pink/Red
  { id: "gray", class: "bg-[#6b6b6b]" },    // Dark Gray
  { id: "indigo", class: "bg-[#6b52ff]" },  // Indigo/Purple
  { id: "purple", class: "bg-[#c04bf2]" },  // Magenta
];

export default function SmartLabelModal({ isOpen, onClose, onAddLabel }: SmartLabelModalProps) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const [applyRetroactively, setApplyRetroactively] = useState(true);

  if (!isOpen) return null;

  const handleCreate = () => {
    onAddLabel({
      name,
      prompt,
      color: selectedColor,
      applyRetroactively
    });

    setName("");
    setPrompt("");
    setSelectedColor("blue");
    setApplyRetroactively(true);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">

      {/* Main Container - Copied exact corner radius and spacing */}
      <div className="w-full max-w-md bg-zinc-950 rounded-[32px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-zinc-800/60">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-[14px] font-black uppercase tracking-widest text-zinc-100">New Smart Label</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 font-bold text-sm hover:text-zinc-100 transition"
          >
            Cancel
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-5">

          {/* Label Name Input */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-2 ml-1">Label Name</label>
            <div className="flex justify-between items-center bg-zinc-900 rounded-2xl px-5 py-4 border border-zinc-800/60 focus-within:border-amber-500/50 transition-all">
              <input
                type="text"
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name your label..."
                className="bg-transparent outline-none text-zinc-100 w-full placeholder-zinc-700 font-bold text-[15px]"
              />
              <span className="text-zinc-600 text-[11px] font-black shrink-0 ml-3">
                {name.length}/30
              </span>
            </div>
          </div>

          {/* Label Prompt Input */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-2 ml-1">Label Logic / Prompt</label>
            <div className="bg-zinc-900 rounded-2xl p-5 flex flex-col border border-zinc-800/60 focus-within:border-amber-500/50 transition-all">
              <textarea
                maxLength={100}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what this label is for to help Mail-man AI work smarter."
                className="bg-transparent outline-none text-zinc-100 w-full resize-none min-h-[90px] placeholder-zinc-700 font-bold text-[15px] leading-relaxed"
              />
              <div className="text-right text-zinc-600 text-[11px] font-black mt-2">
                {prompt.length}/100
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-6 pt-2 ml-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Color</label>
            <div className="flex items-center gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`w-6 h-6 rounded-full ${color.class} flex items-center justify-center transition-all hover:scale-125 hover:ring-2 ring-white/20`}
                >
                  {selectedColor === color.id && <Check size={12} className="text-white stroke-[4]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Retroactive Checkbox & Footer Actions */}
          <div className="flex items-end justify-between pt-6 pl-1">

            <label className="flex items-center gap-3 cursor-pointer group mb-1.5">
              <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all ${applyRetroactively ? "bg-amber-500 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "bg-zinc-900 border-2 border-zinc-700 group-hover:border-zinc-500"
                }`}>
                {applyRetroactively && <Check size={14} className="text-black stroke-[4]" />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={applyRetroactively}
                onChange={() => setApplyRetroactively(!applyRetroactively)}
              />
              <span className="text-sm font-bold text-zinc-500 group-hover:text-zinc-400 transition-colors">
                Sync retroactively
              </span>
            </label>

            <button
              onClick={handleCreate}
              disabled={!name.trim() || !prompt.trim()}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:opacity-100 text-black font-black text-sm uppercase tracking-widest px-8 py-3 rounded-full transition-all shadow-xl"
            >
              Create
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}