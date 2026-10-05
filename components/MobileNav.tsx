"use client";

import { Bot, ListTodo, Mail, Menu, Pencil, type LucideIcon } from "lucide-react";

interface MobileNavProps {
  activeMailbox: string;
  isAiChatOpen: boolean;
  onOpenMenu: () => void;
  onOpenMailbox: (mailbox: string) => void;
  onCompose: () => void;
  onToggleAi: () => void;
}

/** Bottom navigation bar on phones. */
export default function MobileNav({ activeMailbox, isAiChatOpen, onOpenMenu, onOpenMailbox, onCompose, onToggleAi }: MobileNavProps) {
  const items: { label: string; icon: LucideIcon; active: boolean; onClick: () => void }[] = [
    { label: "Menu", icon: Menu, active: false, onClick: onOpenMenu },
    { label: "Inbox", icon: Mail, active: activeMailbox === "Inbox", onClick: () => onOpenMailbox("Inbox") },
    { label: "Compose", icon: Pencil, active: false, onClick: onCompose },
    { label: "To-do", icon: ListTodo, active: activeMailbox === "To-do", onClick: () => onOpenMailbox("To-do") },
    { label: "AI", icon: Bot, active: isAiChatOpen, onClick: onToggleAi },
  ];

  return (
    <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-zinc-950 border-t border-zinc-800 flex items-center justify-around px-2 h-16">
      {items.map(({ label, icon: Icon, active, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          aria-current={active ? "page" : undefined}
          className={`flex flex-col items-center gap-1 transition px-3 py-2 ${active ? "text-amber-500" : "text-zinc-500 hover:text-amber-500"}`}
        >
          <Icon size={22} strokeWidth={1.8} />
          <span className="text-[10px] font-bold">{label}</span>
        </button>
      ))}
    </nav>
  );
}
