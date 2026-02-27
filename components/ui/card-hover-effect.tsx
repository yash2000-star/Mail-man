import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export const HoverEffect = ({
    items,
    className,
}: {
    items: {
        title?: string;
        description?: string;
        link?: string;
        children?: React.ReactNode;
        className?: string; // allow overriding classes for specific cards
    }[];
    className?: string;
}) => {
    let [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div
            className={cn(
                "grid grid-cols-1 md:grid-cols-12 gap-5 py-10",
                className
            )}
        >
            {items.map((item, idx) => {
                // We use a div if no link is provided, else we use Link
                const CardWrapper = item.link ? Link : "div";
                const wrapperProps = item.link
                    ? { href: item.link }
                    : {};

                return (
                    <div
                        key={item?.link || idx}
                        className={cn("relative group block h-full", item.className)}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <AnimatePresence>
                            {hoveredIndex === idx && (
                                <motion.span
                                    className="absolute inset-0 h-full w-full bg-zinc-800/60 block"
                                    layoutId="hoverBackground"
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: 1,
                                        transition: { duration: 0.15 },
                                    }}
                                    exit={{
                                        opacity: 0,
                                        transition: { duration: 0.15, delay: 0.2 },
                                    }}
                                />
                            )}
                        </AnimatePresence>
                        <CardWrapper {...(wrapperProps as any)} className="h-full w-full relative z-20">
                            <Card>
                                {item.children}
                            </Card>
                        </CardWrapper>
                    </div>
                );
            })}
        </div>
    );
};

export const Card = ({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "h-full w-full p-8 overflow-hidden bg-zinc-900 border border-zinc-800/60 group-hover:border-zinc-700 relative z-20 transition-all duration-300",
                className
            )}
        >
            <div className="relative z-50 h-full">
                {children}
            </div>
        </div>
    );
};
