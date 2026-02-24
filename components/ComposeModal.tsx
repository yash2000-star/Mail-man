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
} from "lucide-react";

// import Quill dynamically so Next.js doesn't crash on the server
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

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
        body: JSON.stringify({ to, subject, message }),
      });

      if (response.ok) {
        setTo("");
        setSubject("");
        setMessage("");
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
          apiKey: apiKey
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-t-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh] animate-in slide-in-from-bottom-5 duration-300">
        {/* Header Area */}
        <div className="px-4 py-3 bg-[#f2f6fc] border-b border-gray-100 flex justify-between items-center rounded-t-2xl">
          <span className="text-sm font-bold text-gray-800">New Message</span>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition"
              title="Minimize"
            >
              <Minus size={16} />
            </button>
            <button
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition hidden sm:block"
              title="Full Screen"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 group focus-within:bg-gray-50 transition-colors">
          <span className="text-gray-500 text-sm font-medium w-12">To</span>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 bg-transparent text-gray-900 text-sm outline-none font-medium"
            placeholder="recipient@example.com"
          />
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 group focus-within:bg-gray-50 transition-colors">
          <span className="text-gray-500 text-sm font-medium w-12">
            Subject
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-gray-900 text-sm outline-none font-bold"
            placeholder="What is this about?"
          />
        </div>

        {/* RICH TEXT EDITOR (Replaced the textarea) */}
        <div className="flex-1 overflow-y-auto bg-white text-gray-900 font-sans custom-quill-container">
          <style>{`
            .ql-container.ql-snow { border: none !important; font-family: inherit; font-size: 15px; }
            .ql-editor { min-height: 250px; padding: 24px; }
            .ql-editor.ql-blank::before { color: #9ca3af; font-style: normal; }
            /* Hide the ugly scrollbar inside the editor */
            .ql-editor::-webkit-scrollbar { display: none; }
            .ql-editor { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          <ReactQuill
            theme="snow"
            value={message}
            onChange={setMessage}
            modules={{ toolbar: false }}
            placeholder="Write your message here..."
          />
        </div>

        <div
          id="custom-toolbar"
          className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            {/* Send Button */}
            <div className="flex rounded-full overflow-hidden shadow-sm">
              <button
                onClick={handleSend}
                disabled={isSending || !to.trim() || !message.trim()}
                className="px-5 py-2.5 bg-[#1a73e8] hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-bold transition flex items-center gap-2 rounded-full"
              >
                {isSending ? "Sending..." : "Send"}
                {!isSending && <Send size={14} className="ml-1" />}
              </button>
            </div>

            {/* Quill Formatting Classes (ql-bold, ql-italic, etc. make it work automatically!) */}
            <div className="hidden sm:flex items-center gap-1 text-gray-500 border-r border-gray-200 pr-4">
              <button
                onClick={() => toggleFormat("bold")}
                className={`p-2 rounded transition ${activeFormats.bold
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  }`}
                title="Bold"
              >
                <Bold size={16} />
              </button>

              <button
                onClick={() => toggleFormat("italic")}
                className={`p-2 rounded transition ${activeFormats.italic
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  }`}
                title="Italic"
              >
                <Italic size={16} />
              </button>

              <button
                onClick={() => toggleFormat("underline")}
                className={`p-2 rounded transition ${activeFormats.underline
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  }`}
                title="Underline"
              >
                <Underline size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 text-gray-500">
              <button
                className="ql-link p-2 hover:bg-gray-100 hover:text-gray-800 rounded transition"
                title="Insert link"
                onMouseDown={(e) => e.preventDefault()}
              >
                <Link2 size={16} />
              </button>
              <button
                className="ql-image p-2 hover:bg-gray-100 hover:text-gray-800 rounded transition hidden md:block"
                title="Insert image"
              >
                <ImageIcon size={16} />
              </button>

              {/* AI Enhance Button */}
              <button
                onClick={handleAIEnhance}
                disabled={isEnhancing || !message.trim()}
                className="p-2 hover:bg-blue-50 hover:text-[#1a73e8] rounded transition text-[#1a73e8] disabled:opacity-50"
                title="Enhance with AI"
              >
                <Sparkles
                  size={16}
                  className={isEnhancing ? "animate-pulse" : ""}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-400">
            <button className="p-2 hover:bg-gray-100 hover:text-gray-700 rounded transition">
              <MoreVertical size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 hover:text-red-500 rounded transition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
