"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Tag, Database, Bot, Sparkles, Send, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

// 1. Train Your AI: The "Entity Extraction" Beam
export const TrainYourAIAnimation = () => {
    const [step, setStep] = useState(0); // 0: idle, 1: scanning, 2: extracted, 3: tagged

    useEffect(() => {
        const sequence = async () => {
            while (true) {
                setStep(0); // reset
                await new Promise(r => setTimeout(r, 1000));
                setStep(1); // scan starts
                await new Promise(r => setTimeout(r, 1500));
                setStep(2); // word drops
                await new Promise(r => setTimeout(r, 500));
                setStep(3); // morphs to tag
                await new Promise(r => setTimeout(r, 2000));
            }
        };
        sequence();
    }, []);

    return (
        <div className="bg-zinc-900 flex-1 rounded-lg p-4 sm:p-5 border border-zinc-800/60 flex flex-col relative overflow-hidden h-full min-h-[160px]">
            <div className="text-[10px] sm:text-xs text-zinc-600 font-bold uppercase tracking-widest mb-3">
                Active Smart Label
            </div>

            <div className="bg-zinc-800 rounded-lg p-3 sm:p-4 border border-zinc-700/50 relative overflow-hidden flex-1 flex flex-col justify-center min-h-[5rem]">
                <div className="flex items-start gap-3 relative z-10 w-full">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                    <p className="text-[11px] sm:text-sm text-zinc-400 font-medium relative leading-relaxed w-full">
                        "Flag all emails containing an{" "}
                        <span className="relative inline-block">
                            {/* Invisible placeholder to maintain spacing */}
                            <span className="opacity-0">invoice</span>

                            {/* The glowing highlight background */}
                            <motion.span
                                className="absolute inset-0 bg-amber-500/30 rounded-sm -z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: step >= 1 ? 1 : 0 }}
                                transition={{ duration: 0.2, delay: 0.6 }} // sync with beam crossing
                            />

                            {/* The word that stays or detaches */}
                            <AnimatePresence>
                                {step < 2 && (
                                    <motion.span
                                        layoutId="extracted-entity"
                                        className="absolute left-0 top-0 text-amber-400 font-bold z-20"
                                    >
                                        invoice
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </span>
                        {" "}or a payment request due within 7 days."
                    </p>

                    {/* Vertical Scanner Beam */}
                    <AnimatePresence>
                        {(step === 1 || step === 2) && (
                            <motion.div
                                initial={{ left: "-10%" }}
                                animate={{ left: "110%" }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, ease: "linear" }}
                                className="absolute -top-4 -bottom-4 w-6 bg-gradient-to-r from-transparent via-amber-400/40 to-amber-500 -inset-y-4 shadow-[0_0_20px_rgba(245,158,11,0.6)] z-30 opacity-70 border-r-2 border-amber-400 mix-blend-multiply pointer-events-none"
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Tag Bucket Area */}
            <div className="flex gap-2 mt-3 h-[28px] items-center">
                <span className="text-[10px] sm:text-[11px] font-bold bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full border border-zinc-700">
                    Urgent
                </span>

                {/* The bucket placeholder / landing spot */}
                <div className="relative w-[65px] h-[24px]">
                    <AnimatePresence>
                        {step >= 2 && (
                            <motion.div
                                layoutId="extracted-entity"
                                className={cn(
                                    "absolute flex items-center justify-center font-bold border shadow-sm whitespace-nowrap overflow-hidden",
                                    step === 2
                                        ? "text-amber-400 text-[11px] sm:text-sm px-1 top-0 left-0 bg-transparent border-transparent" // dropping state
                                        : "inset-0 text-[10px] sm:text-[11px] bg-amber-500 text-black font-bold rounded-full border-amber-600 shadow-amber-500/10" // tag state
                                )}
                                transition={{
                                    layout: { type: "spring", stiffness: 200, damping: 20 },
                                    background: { duration: 0.2, delay: 0.1 }
                                }}
                            >
                                {step === 2 ? "invoice" : "Finance"}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

// 2. Multi-Model Hub: The "Data Routing" Node
export const MultiModelHubAnimation = () => {
    const nodes = [
        { id: "gemini", label: "Gemini", color: "#f59e0b", y: 15 },
        { id: "gpt4", label: "GPT-4o", color: "#10b981", y: 50 },
        { id: "claude", label: "Claude", color: "#f59e0b", y: 85 },
    ];

    const [activeNode, setActiveNode] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveNode((prev) => (prev + 1) % nodes.length);
        }, 3000); // 3 seconds per node cycle
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative flex-1 flex mt-2 md:mt-4 h-[120px] w-full items-center pl-2 pr-4">
            {/* Central Input Node */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-zinc-800 rounded-lg z-20 flex items-center justify-center border border-zinc-700">
                <Database size={16} className="text-white" />
            </div>

            {/* SVG Wiring Canvas */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                {nodes.map((node, i) => {
                    const isActive = activeNode === i;
                    return (
                        <g key={node.id}>
                            {/* Static Background Wire */}
                            <path
                                d={`M 15 50 C 40 50, 60 ${node.y}, 85 ${node.y}`}
                                stroke={isActive ? node.color : "#3f3f46"}
                                strokeWidth={isActive ? "1.5" : "1"}
                                fill="none"
                                className="transition-colors duration-500"
                                opacity={isActive ? 0.4 : 1}
                            />

                            {/* Traveling Data Packet (Request) */}
                            {isActive && (
                                <motion.circle
                                    r="2.5"
                                    fill={node.color}
                                    filter={`drop-shadow(0 0 4px ${node.color})`}
                                    initial={{ offsetDistance: "0%", opacity: 0 }}
                                    animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
                                    transition={{ duration: 1, ease: "easeInOut" }}
                                    style={{
                                        offsetPath: `path('M 15 50 C 40 50, 60 ${node.y}, 85 ${node.y}')`,
                                    }}
                                    className="z-10"
                                />
                            )}

                            {/* Returning Data Packet (Response) */}
                            {isActive && (
                                <motion.circle
                                    r="2.5"
                                    fill={node.color}
                                    filter={`drop-shadow(0 0 4px ${node.color})`}
                                    initial={{ offsetDistance: "100%", opacity: 0 }}
                                    animate={{ offsetDistance: "0%", opacity: [0, 1, 1, 0] }}
                                    transition={{ duration: 1, ease: "easeInOut", delay: 1.2 }}
                                    style={{
                                        offsetPath: `path('M 15 50 C 40 50, 60 ${node.y}, 85 ${node.y}')`,
                                    }}
                                    className="z-10"
                                />
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Destination Nodes */}
            <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-[5%] w-24 z-20">
                {nodes.map((node, i) => {
                    const isActive = activeNode === i;
                    return (
                        <div key={node.id} className="flex items-center gap-2 w-full justify-end">
                            <span className={cn(
                                "text-[10px] sm:text-xs font-bold transition-colors duration-300",
                                isActive ? "text-white" : "text-zinc-600"
                            )}>
                                {node.label}
                            </span>
                            <motion.div
                                animate={{
                                    scale: isActive ? [1, 1.2, 1] : 1,
                                    boxShadow: isActive ? `0 0 15px ${node.color}60` : "none"
                                }}
                                transition={{ duration: 0.5, delay: 1 }}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0"
                            >
                                <div
                                    className="w-2 h-2 rounded-full transition-colors duration-300"
                                    style={{ backgroundColor: isActive ? node.color : "#cbd5e1" }}
                                />
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// 3. Task Extraction: The "Spatial Morph"
export const TaskExtractionAnimation = () => {
    const [step, setStep] = useState(0); // 0: raw text, 1: highlighted, 2: detaching/morphing, 3: calendar UI

    useEffect(() => {
        const sequence = async () => {
            while (true) {
                setStep(0);
                await new Promise(r => setTimeout(r, 1500));
                setStep(1); // highlight
                await new Promise(r => setTimeout(r, 1000));
                setStep(2); // morph start
                await new Promise(r => setTimeout(r, 600));
                setStep(3); // calendar ui
                await new Promise(r => setTimeout(r, 3500));
            }
        };
        sequence();
    }, []);

    return (
        <div className="flex-1 flex flex-col justify-between relative mt-4 h-full min-h-[140px]">
            {/* Raw Email Area */}
            <div className="bg-zinc-900 border border-zinc-800/60 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
                Hey team, can we make sure to review the final design assets and send that report by? Thanks!{" "}
                <span className="relative inline-block w-[90px] h-4 align-middle">
                    {/* Invisible placeholder */}
                    <span className="opacity-0">Friday at 5 PM</span>

                    <motion.span
                        className="absolute inset-x-0 -inset-y-0.5 bg-yellow-200/60 rounded-sm -z-10"
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{
                            opacity: step >= 1 ? 1 : 0,
                            scaleX: step >= 1 ? 1 : 0,
                            transformOrigin: "left"
                        }}
                        transition={{ duration: 0.3 }}
                    />

                    <AnimatePresence>
                        {step < 2 && (
                            <motion.div
                                layoutId="task-morph"
                                className="absolute inset-0 text-zinc-200 font-bold whitespace-nowrap overflow-visible flex items-center"
                            >
                                Friday at 5 PM
                            </motion.div>
                        )}
                    </AnimatePresence>
                </span>
            </div>

            {/* Morphing Area */}
            <div className="h-[60px] sm:h-[70px] mt-4 relative w-full flex justify-center items-end pb-2">
                <AnimatePresence>
                    {step >= 2 && (
                        <motion.div
                            layoutId="task-morph"
                            className={cn(
                                "absolute bg-zinc-800 overflow-hidden flex items-center z-20",
                                step === 2
                                    ? "text-zinc-200 font-bold justify-center rounded-sm text-xs sm:text-sm px-1 whitespace-nowrap h-5 top-0"
                                    : "w-full h-full rounded-lg border border-zinc-700 justify-start px-3 py-2 top-0"
                            )}
                            transition={{ type: "spring", stiffness: 250, damping: 25 }}
                        >
                            {step === 3 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex items-center gap-3 w-full"
                                >
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-700 rounded-lg flex items-center justify-center shrink-0">
                                        <Calendar size={16} className="text-amber-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-zinc-100">Send Design Report</p>
                                        <p className="text-[10px] font-medium text-zinc-500 flex items-center gap-1 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                            Friday, 5:00 PM
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                "Friday at 5 PM"
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// 4. Add Your Brand: The "Live Injection" Effect
export const AddYourBrandAnimation = () => {
    const themes = [
        { id: "slate", hex: "#64748b", bg: "bg-slate-500", light: "bg-slate-50", text: "text-slate-600", border: "border-slate-600" },
        { id: "emerald", hex: "#10b981", bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-500", border: "border-emerald-500" },
        { id: "amber", hex: "#f59e0b", bg: "bg-amber-500", light: "bg-amber-50", text: "text-amber-500", border: "border-amber-500" },
        { id: "rose", hex: "#f43f5e", bg: "bg-rose-500", light: "bg-rose-50", text: "text-rose-500", border: "border-rose-500" },
        { id: "purple", hex: "#8b5cf6", bg: "bg-purple-500", light: "bg-purple-50", text: "text-purple-500", border: "border-purple-500" },
    ];

    const [activeTheme, setActiveTheme] = useState(2);

    return (
        <div className="flex-1 flex flex-col justify-between mt-2 pt-2 h-full w-full group/brand relative">

            {/* Miniature UI Mockup */}
            <div className="bg-zinc-900 border border-zinc-800/60 rounded-lg p-3 sm:p-4 mb-4 relative overflow-hidden flex flex-col gap-3 z-10">
                {/* Ripple Effect Background */}
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={activeTheme}
                        initial={{ clipPath: "circle(0% at 50% 100%)", opacity: 0.5 }}
                        animate={{ clipPath: "circle(150% at 50% 100%)", opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={`absolute inset-0 ${themes[activeTheme].light} opacity-30 pointer-events-none z-0`}
                    />
                </AnimatePresence>

                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-300 ${themes[activeTheme].bg}`}>
                            <Mail size={10} className="text-white" />
                        </div>
                        <div className="h-2 w-12 sm:w-16 bg-zinc-700 rounded-full" />
                    </div>
                    <div className="h-1.5 w-6 sm:w-8 bg-zinc-700 rounded-full" />
                </div>

                <div className="space-y-1.5 relative z-10">
                    <div className="h-1 w-full bg-zinc-700 rounded-full" />
                    <div className="h-1 w-4/5 bg-zinc-700 rounded-full" />
                </div>

                <button className={`relative z-10 mt-1 w-full py-1.5 rounded-lg text-[10px] font-bold text-white transition-colors duration-300 flex items-center justify-center gap-1 ${themes[activeTheme].bg} shadow-md`}>
                    Send Reply <Send size={10} />
                </button>
            </div>

            {/* Interactive Color Picker */}
            <div className="mt-auto px-1 pb-1 relative z-20">
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Live Injection</p>
                <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800/60 p-1.5 sm:p-2 rounded-lg">
                    {themes.map((theme, i) => (
                        <div
                            key={theme.id}
                            className="relative group/btn p-1 cursor-pointer"
                            onMouseEnter={() => setActiveTheme(i)}
                        >
                            {activeTheme === i && (
                                <motion.div
                                    layoutId="active-theme-ring"
                                    className="absolute inset-0 rounded-full border-2 border-zinc-500"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <div
                                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow-sm hover:scale-110 transition-transform ${theme.bg}`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
