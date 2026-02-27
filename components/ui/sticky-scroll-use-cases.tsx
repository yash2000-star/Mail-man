"use client";

import React, { useRef } from "react";
import { useScroll, motion, useTransform, useMotionValueEvent } from "framer-motion";
import { BarChart3, Bot, Shield, ChevronRight } from "lucide-react";
import { Instrument_Serif } from "next/font/google";

const serif = Instrument_Serif({
    subsets: ["latin"],
    weight: ["400"],
    style: ["normal", "italic"],
});

const USE_CASES_DATA = [
    {
        icon: <BarChart3 className="text-amber-500" size={28} />,
        title: "Founders & Startups",
        desc: "Organize investor updates, pitch deck intros, and customer conversations automatically.",
        details: "Mail-man acts as your chief of staff. Connect your API key and let the AI automatically sort fundraising threads from customer support, extracting action items so you can focus on building.",
        layerColor: "bg-amber-500/10 border-amber-500/20",
        iconColor: "text-amber-500/60",
    },
    {
        icon: <Bot className="text-zinc-400" size={28} />,
        title: "Freelancers",
        desc: "Never miss a client follow-up. Extract project deadlines and create tasks from inbound emails.",
        details: "Stop dropping the ball on client communication. Mail-man pulls out deadlines, requested changes, and meeting times directly into your master to-do dashboard.",
        layerColor: "bg-zinc-700/40 border-zinc-600/30",
        iconColor: "text-zinc-500/70",
    },
    {
        icon: <Shield className="text-amber-400" size={28} />,
        title: "Enterprise Teams",
        desc: "Classify thousands of emails per team with custom labels, private key vaults, and thread summaries.",
        details: "Scale your email operations with absolute privacy. Mail-man processes everything in-memory using your own LLM keys, ensuring your enterprise data never touches our disks.",
        layerColor: "bg-amber-400/15 border-amber-400/30",
        iconColor: "text-amber-400/70",
    }
];

export function StickyScrollUseCases() {
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    const activeStepFloat = useTransform(scrollYProgress, [0, 1], [0, USE_CASES_DATA.length - 1]);
    const [activeStep, setActiveStep] = React.useState(0);

    useMotionValueEvent(activeStepFloat, "change", (latest) => {
        setActiveStep(Math.round(latest));
    });

    return (
        <section ref={containerRef} className="relative z-10 w-full max-w-6xl mx-auto px-6 py-10 md:py-28">
            {/* Section header */}
            <div className="text-center mb-16 md:mb-24">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-5">Use Cases</p>
                <h2 className={`${serif.className} text-4xl md:text-5xl font-normal tracking-[0.02em] text-white leading-[1.15] mb-4`}>
                    The AI inbox built for <span className="text-amber-500">everyone.</span>
                </h2>
                <p className="text-zinc-500 font-medium text-base mt-4 max-w-2xl mx-auto leading-relaxed">
                    Whatever you do, Mail-man shapes itself to your workflow. See how different teams leverage custom AI models to save hours every week.
                </p>
            </div>

            <div className="flex flex-col md:flex-row-reverse gap-8 md:gap-16 relative items-start">
                {/* RIGHT SIDE: Scrollable Text Blocks */}
                <div className="w-full md:w-1/2 flex flex-col pt-[10vh] pb-[30vh]">
                    {USE_CASES_DATA.map((item, idx) => (
                        <div
                            key={idx}
                            className={`min-h-[50vh] flex flex-col justify-center transition-all duration-700 ${idx === activeStep ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                }`}
                        >
                            {/* Icon */}
                            <div className="w-12 h-12 bg-zinc-900 border border-zinc-800/60 flex items-center justify-center mb-8">
                                {item.icon}
                            </div>

                            <h3 className={`${serif.className} text-3xl font-normal tracking-[0.02em] text-white mb-4`}>
                                {item.title}
                            </h3>
                            <p className="text-lg font-medium text-zinc-300 mb-6 leading-relaxed">
                                {item.desc}
                            </p>
                            <p className="text-zinc-500 leading-relaxed text-sm">
                                {item.details}
                            </p>

                            <button className="mt-8 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors w-fit group">
                                Learn more <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* LEFT SIDE: Sticky Visual — dark isometric diamonds */}
                <div className="hidden md:flex w-1/2 sticky top-32 h-[60vh] items-center justify-center relative z-20 bg-zinc-950 border border-zinc-800/60 overflow-hidden">

                    {/* Isometric Canvas */}
                    <div
                        className="relative w-full h-full flex items-center justify-center scale-90"
                        style={{ transformStyle: "preserve-3d", transform: "rotateX(60deg) rotateZ(-45deg)" }}
                    >
                        {/* Base shadow floor */}
                        <div className="absolute w-64 h-64 bg-zinc-900 rounded-3xl blur-2xl -translate-z-[100px]" />

                        {/* Layer 0: Founders (Amber) */}
                        <motion.div
                            initial={false}
                            animate={{
                                translateZ: activeStep >= 0 ? 0 : -50,
                                opacity: activeStep >= 0 ? 1 : 0,
                            }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className={`absolute w-72 h-72 ${USE_CASES_DATA[0].layerColor} border backdrop-blur-md flex items-center justify-center`}
                        >
                            <BarChart3 className={USE_CASES_DATA[0].iconColor} style={{ width: 96, height: 96, strokeWidth: 1 }} />
                        </motion.div>

                        {/* Layer 1: Freelancers (Zinc) */}
                        <motion.div
                            initial={false}
                            animate={{
                                translateZ: activeStep >= 1 ? 80 : 0,
                                opacity: activeStep >= 1 ? 1 : 0,
                            }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className={`absolute w-72 h-72 ${USE_CASES_DATA[1].layerColor} border backdrop-blur-md flex items-center justify-center`}
                        >
                            <Bot className={USE_CASES_DATA[1].iconColor} style={{ width: 96, height: 96, strokeWidth: 1.5 }} />
                        </motion.div>

                        {/* Layer 2: Enterprise (Amber) */}
                        <motion.div
                            initial={false}
                            animate={{
                                translateZ: activeStep >= 2 ? 160 : 0,
                                opacity: activeStep >= 2 ? 1 : 0,
                            }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className={`absolute w-72 h-72 ${USE_CASES_DATA[2].layerColor} border backdrop-blur-md flex items-center justify-center`}
                        >
                            <Shield className={USE_CASES_DATA[2].iconColor} style={{ width: 96, height: 96, strokeWidth: 2 }} />
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
