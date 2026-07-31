import React from "react";
import { Home, Users, HeartHandshake, Share2, Sparkles } from "lucide-react"; // Thêm icon Sparkles
import { TabType } from "../types";

interface NavbarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export default function Navbar({ activeTab, onChangeTab }: NavbarProps) {
  const tabs = [
    { id: "home" as TabType, label: "Home", icon: Home },
    { id: "characters" as TabType, label: "Characters", icon: Users },
    { id: "confession" as TabType, label: "Confession", icon: HeartHandshake },
    { id: "manifestation" as TabType, label: "Manifest", icon: Sparkles }, // Thêm tab Manifest ở đây
    { id: "socials" as TabType, label: "Socials", icon: Share2 },
  ];

  return (
    <nav 
      id="navbar"
      className="absolute top-3 right-3 sm:top-6 sm:right-6 z-[100] flex items-center gap-0.5 sm:gap-1.5 p-1 sm:p-1.5 rounded-full glass-panel shadow-lg max-w-[calc(100vw-1.5rem)] sm:max-w-none"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`px-1.5 sm:px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 transition-all duration-300 shrink-0 ${
              isActive
                ? "bg-white/70 text-pink-600 shadow-sm border border-white/50"
                : "text-slate-700 hover:bg-white/30 hover:text-pink-500"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-pink-500 scale-110" : "text-slate-600"}`} />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
