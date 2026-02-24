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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">

      {/* Main Container - Copied exact corner radius and spacing */}
      <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[17px] font-extrabold text-black">New Smart Label</h2>
          <button
            onClick={onClose}
            className="text-[#2ca2f6] font-bold text-[15px] hover:underline transition"
          >
            Cancel
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-5">

          {/* Label Name Input */}
          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-1.5 ml-1">Name</label>
            <div className="flex justify-between items-center bg-[#f4f6f8] rounded-2xl px-4 py-3 border border-transparent focus-within:border-blue-300 transition-colors">
              <input
                type="text"
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Label Name"
                className="bg-transparent outline-none text-black w-full placeholder-gray-400 font-bold text-[15px]"
              />
              <span className="text-gray-400 text-[13px] font-medium shrink-0 ml-2">
                {name.length}/30
              </span>
            </div>
          </div>

          {/* Label Prompt Input */}
          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-1.5 ml-1">Label Prompt</label>
            <div className="bg-[#f4f6f8] rounded-2xl p-4 flex flex-col border border-transparent focus-within:border-blue-300 transition-colors">
              <textarea
                maxLength={100}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what this label is for to help Mail-man AI work smarter."
                className="bg-transparent outline-none text-black w-full resize-none min-h-[80px] placeholder-gray-400 font-bold text-[15px]"
              />
              <div className="text-right text-gray-400 text-[13px] font-medium mt-1">
                {prompt.length}/100
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-4 pt-1 ml-1">
            <label className="text-[13px] font-bold text-gray-500">Color</label>
            <div className="flex items-center gap-2.5">
              {COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`w-[26px] h-[26px] rounded-full ${color.class} flex items-center justify-center transition-transform hover:scale-110`}
                >
                  {selectedColor === color.id && <Check size={14} className="text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Retroactive Checkbox & Footer Actions */}
          <div className="flex items-end justify-between pt-4 pl-1">

            <label className="flex items-center gap-2 cursor-pointer group mb-1">
              <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-colors ${applyRetroactively ? "bg-black" : "bg-transparent border-2 border-gray-300 group-hover:border-gray-500"
                }`}>
                {applyRetroactively && <Check size={14} className="text-white stroke-[3]" />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={applyRetroactively}
                onChange={() => setApplyRetroactively(!applyRetroactively)}
              />
              <span className="text-[14px] font-bold text-gray-500">
                Apply to your last 50 emails
              </span>
            </label>

            <button
              onClick={handleCreate}
              disabled={!name.trim() || !prompt.trim()}
              className="bg-[#8ecbfb] hover:bg-[#6abcf8] disabled:opacity-50 text-white font-extrabold text-[15px] px-7 py-2.5 rounded-full transition-all"
            >
              Create
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}