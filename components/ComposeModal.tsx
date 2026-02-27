"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

import {
  X,
  Minus,
  Maximize2,
  Paperclip,
  Link2,
  ImageIcon,
  Smile,
  MoreVertical,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  Send,
  ChevronDown,
  Sparkles,
  Globe
} from "lucide-react";

// import Quill dynamically so Next.js doesn't crash on the server
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false }) as any;

const LANGUAGES = [
  "English", "Chinese", "Japanese", "French", "Italian", "German",
  "Spanish", "Portuguese", "Russian", "Korean", "Thai", "Ukrainian", "Hindi"
];

const STYLES = ["Default", "Concise", "Friendly", "Professional"];

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
}

export default function ComposeModal({
  isOpen,
  onClose,
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
}: ComposeModalProps) {
  const { data: session } = useSession();

  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState("Default");
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const [aiCommand, setAiCommand] = useState("");
  const [showFormatting, setShowFormatting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [windowState, setWindowState] = useState<"default" | "minimized" | "fullscreen">("default");

  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const quillRef = useRef<any>(null);
  const [activeFormats, setActiveFormats] = useState<any>({});

  useEffect(() => {
    setTo(defaultTo);
    setSubject(defaultSubject);
    setMessage(defaultBody);
  }, [defaultTo, defaultSubject, defaultBody]);

  if (!isOpen) return null;

  const handleSend = async () => {
    // message is now HTML (e.g., "<p><strong>Hello</strong></p>")
    if (
      !session ||
      !(session as any).accessToken ||
      !to.trim() ||
      !message.trim()
    )
      return;

    setIsSending(true);

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({ to, cc, bcc, subject, message }), // Ideally api/send needs updating to handle cc/bcc
      });

      if (response.ok) {
        setTo("");
        setCc("");
        setBcc("");
        setShowCc(false);
        setShowBcc(false);
        setSubject("");
        setMessage("");
        setWindowState("default");
        onClose();
      }
    } catch (error) {
      console.log("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleAIEnhance = async () => {
    if (!message.trim() || message === "<p><br></p>") return;

    // Grab the BYOK key from the vault!
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
      alert("⚠️ Please click the Gear icon in the bottom left to add your Gemini API Key first!");
      return;
    }

    setIsEnhancing(true);

    try {
      const response = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: message,
          apiKey: apiKey,
          language: selectedLanguage,
          style: selectedStyle,
          command: aiCommand
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      if (data.enhancedText) {
        setMessage(data.enhancedText);
      }
    } catch (error: any) {
      console.error("AI Enhance failed:", error);
      alert(`AI failed to enhance the message: ${error.message}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const toggleFormat = (format: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const currentFormat = editor.getFormat();
    editor.format(format, !currentFormat[format]);

    setActiveFormats(editor.getFormat());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files as FileList)]);
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Determine container classes based on window state
  const wrapperClasses = windowState === "fullscreen"
    ? "fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    : windowState === "minimized"
      ? "fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[70] flex items-end justify-end w-full sm:w-[500px]"
      : "fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto";

  const modalClasses = windowState === "fullscreen"
    ? "w-full h-full bg-zinc-950 sm:rounded-2xl shadow-2xl flex flex-col border border-zinc-800/60"
    : windowState === "minimized"
      ? "w-full sm:w-full bg-zinc-900 border border-zinc-800/60 sm:rounded-t-2xl sm:rounded-b-none shadow-2xl flex flex-col h-[50px] overflow-hidden transition-all duration-300"
      : "w-full max-w-5xl bg-zinc-950 border border-zinc-800/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[90vh] animate-in zoom-in-95 duration-300";


  return (
    <div className={wrapperClasses}>
      <div className={modalClasses}>

        {/* Header Area */}
        <div
          className={`px-5 py-4 flex justify-between items-center bg-zinc-950 ${windowState === "minimized" ? "cursor-pointer hover:bg-zinc-900 border-t-2 border-amber-500" : ""}`}
          onClick={() => windowState === "minimized" && setWindowState("default")}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); setWindowState("default"); }}
              className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition"
              title="Close"
            >
              <X size={16} strokeWidth={2} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setWindowState(windowState === "minimized" ? "default" : "minimized"); }}
              className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition"
              title="Minimize"
            >
              <Minus size={16} strokeWidth={2} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setWindowState(windowState === "fullscreen" ? "default" : "fullscreen"); }}
              className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition hidden sm:block"
              title="Full Screen"
            >
              <Maximize2 size={14} strokeWidth={2} />
            </button>
            {windowState === "minimized" && (
              <span className="ml-2 text-sm font-bold text-zinc-100">New Message</span>
            )}
          </div>

          <div>
            <button
              onClick={handleSend}
              disabled={isSending || !to.trim() || !message.trim()}
              className="w-9 h-9 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:opacity-50 text-black transition flex items-center justify-center rounded-full shadow-lg pr-0.5"
              title="Send"
            >
              <Send size={16} strokeWidth={3} className="-rotate-45" />
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="px-6 py-2 border-b border-zinc-800/60 flex items-center justify-between group transition-colors">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-zinc-500 text-[13px] font-bold uppercase tracking-widest w-10 shrink-0">To</span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 bg-transparent text-zinc-100 text-sm outline-none font-bold h-8"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span
              onClick={() => {
                setShowCc(!showCc);
                if (showCc) setCc("");
              }}
              className={`text-[11px] font-black uppercase tracking-widest cursor-pointer transition ${showCc ? "text-amber-500" : "text-zinc-500 hover:text-zinc-100"}`}
            >
              CC
            </span>
            <span
              onClick={() => {
                setShowBcc(!showBcc);
                if (showBcc) setBcc("");
              }}
              className={`text-[11px] font-black uppercase tracking-widest cursor-pointer transition ${showBcc ? "text-amber-500" : "text-zinc-500 hover:text-zinc-100"}`}
            >
              Bcc
            </span>
          </div>
        </div>

        {/* Dynamic CC Field */}
        {showCc && (
          <div className="px-6 py-2 border-b border-zinc-800/60 flex items-center gap-2 group transition-colors animate-in slide-in-from-top-1 duration-200">
            <span className="text-zinc-500 text-[13px] font-bold uppercase tracking-widest w-10 shrink-0">Cc</span>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-zinc-100 text-sm outline-none font-bold h-8"
            />
          </div>
        )}

        {/* Dynamic BCC Field */}
        {showBcc && (
          <div className="px-6 py-2 border-b border-zinc-800/60 flex items-center gap-2 group transition-colors animate-in slide-in-from-top-1 duration-200">
            <span className="text-zinc-500 text-[13px] font-bold uppercase tracking-widest w-10 shrink-0">Bcc</span>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-zinc-100 text-sm outline-none font-bold h-8"
            />
          </div>
        )}

        {/* Static From Field */}
        <div className="px-6 py-2 border-b border-zinc-800/60 flex items-center gap-2 group transition-colors">
          <span className="text-zinc-500 text-[13px] font-bold uppercase tracking-widest w-10 shrink-0">From</span>
          <div className="flex-1 bg-transparent text-zinc-400 text-sm outline-none h-8 flex items-center gap-2">
            <span className="font-bold text-zinc-200">{session?.user?.name || "Yash Nirwan"}</span>
            <span className="text-zinc-600 hidden sm:inline">&bull; {(session?.user?.email || "yashnirwan18@gmail.com")}</span>
          </div>
        </div>

        <div className="px-6 py-2 border-b border-zinc-800/60 flex items-center gap-2 group transition-colors">
          <span className="text-zinc-500 text-[13px] font-bold uppercase tracking-widest w-10 shrink-0">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-zinc-100 text-sm outline-none font-bold h-8 placeholder:font-normal placeholder:text-zinc-600"
          />
        </div>

        {/* RICH TEXT EDITOR */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 text-zinc-100 font-sans custom-quill-container relative">
          <style>{`
            .ql-container.ql-snow { border: none !important; font-family: inherit; font-size: 15px; }
            .ql-editor { min-height: 250px; padding: 24px 24px 60px 24px; color: #f4f4f5; }
            .ql-editor.ql-blank::before { color: #52525b; font-style: normal; font-weight: 500; }
            /* Hide the ugly scrollbar inside the editor */
            .ql-editor::-webkit-scrollbar { display: none; }
            .ql-editor { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={message}
            onChange={setMessage}
            modules={{ toolbar: false }}
            placeholder="Start typing or write with AI"
          />

          {/* AI / Language Pills - Absolutely positioned at the bottom of the editor view before the toolbar */}
          <div className="absolute bottom-4 left-6 flex items-center gap-3">
            {/* Style Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStyleMenu(!showStyleMenu)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 text-[11px] font-black uppercase tracking-widest transition shadow-2xl ${showStyleMenu ? "bg-amber-500 text-black" : "bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}
              >
                <Sparkles size={13} className={showStyleMenu ? "text-black" : "text-amber-500"} />
                {selectedStyle === "Default" ? "Style" : selectedStyle}
                <ChevronDown size={12} className="ml-1 opacity-50" />
              </button>

              {showStyleMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStyleMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-3 w-44 bg-zinc-900 border border-zinc-800/60 shadow-2xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 p-1">
                    {STYLES.map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          setSelectedStyle(style);
                          setShowStyleMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition rounded-xl ${selectedStyle === style
                          ? "bg-amber-500/10 text-amber-500"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                          }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 text-[11px] font-black uppercase tracking-widest transition shadow-2xl ${showLanguageMenu ? "bg-amber-500 text-black" : "bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}
              >
                <Globe size={13} className={showLanguageMenu ? "text-black" : "text-zinc-400"} />
                {selectedLanguage}
                <ChevronDown size={12} className="ml-1 opacity-50" />
              </button>

              {showLanguageMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-3 w-48 bg-zinc-900 border border-zinc-800/60 shadow-2xl rounded-2xl py-2 z-50 max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200 p-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setShowLanguageMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition rounded-xl ${selectedLanguage === lang
                          ? "bg-amber-500/10 text-amber-500"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                          }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Attachments List */}
        {attachments.length > 0 && (
          <div className="px-6 py-3 flex items-center gap-3 flex-wrap border-t border-zinc-800/60 bg-zinc-900/10">
            {attachments.map((file, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800/60 rounded-xl text-sm font-bold text-zinc-300 shadow-xl animate-in zoom-in duration-200">
                <Paperclip size={14} className="text-amber-500" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <span className="text-zinc-600 text-xs">({(file.size / 1024).toFixed(0)}kb)</span>
                <button onClick={() => removeAttachment(i)} className="ml-1 text-zinc-500 hover:text-red-500 transition">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formatting Toolbar */}
        {showFormatting && (
          <div className="px-6 py-2 flex items-center gap-2 border-t border-zinc-800/60 bg-zinc-900 animate-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => toggleFormat("bold")}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${activeFormats.bold ? "bg-amber-500 text-black shadow-lg" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`}
              title="Bold"
            >
              <Bold size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => toggleFormat("italic")}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${activeFormats.italic ? "bg-amber-500 text-black shadow-lg" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`}
              title="Italic"
            >
              <Italic size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => toggleFormat("underline")}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${activeFormats.underline ? "bg-amber-500 text-black shadow-lg" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`}
              title="Underline"
            >
              <Underline size={16} strokeWidth={2.5} />
            </button>
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <button
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100`}
              title="Align Left"
            >
              <AlignLeft size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* BOTTOM TOOLBAR */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-zinc-800/60 bg-zinc-950">

          {/* Left: Input for "Write with AI" */}
          <div className="flex items-center gap-3 px-5 py-2.5 bg-zinc-900 focus-within:bg-zinc-900 rounded-full w-full max-w-[450px] border border-zinc-800 focus-within:border-amber-500/50 shadow-2xl transition-all">
            <Sparkles size={16} className={`text-amber-500 ${isEnhancing ? "animate-pulse" : ""}`} strokeWidth={2.5} />
            <input
              type="text"
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAIEnhance();
                }
              }}
              placeholder="Write with AI..."
              disabled={isEnhancing}
              className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-100 placeholder:text-zinc-600 font-bold disabled:opacity-50"
            />
            {aiCommand.trim() && (
              <button
                onClick={handleAIEnhance}
                disabled={isEnhancing}
                className="p-1.5 rounded-full bg-amber-500 text-black hover:bg-amber-400 transition disabled:opacity-50"
              >
                <Send size={14} strokeWidth={3} className="-rotate-45" />
              </button>
            )}
          </div>

          {/* Right: Formatting & Action Icons */}
          <div className="flex items-center gap-2 text-zinc-500 shrink-0 ml-4">
            <button
              onClick={() => setShowFormatting(!showFormatting)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition ${showFormatting ? "bg-amber-500 text-black" : "hover:bg-zinc-900 hover:text-zinc-100"}`}
              title="Formatting (Aa)"
            >
              <span className="font-black text-sm -mt-0.5">Aa</span>
            </button>

            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center hover:bg-zinc-900 hover:text-zinc-100 rounded-full transition"
              title="Attach files"
            >
              <Paperclip size={18} strokeWidth={2} />
            </button>

            <button
              className="w-9 h-9 flex items-center justify-center hover:bg-zinc-900 hover:text-zinc-100 rounded-full transition"
              title="Insert image"
            >
              <ImageIcon size={18} strokeWidth={2} />
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center hover:bg-zinc-900 hover:text-red-500 rounded-full transition ml-1"
              title="Discard draft"
            >
              <Trash2 size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
