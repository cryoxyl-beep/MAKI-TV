/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, Flame, Clapperboard, History, Sparkles } from "lucide-react";
import { SubscriptionItem } from "../types";
import { motion } from "framer-motion";

interface SidebarProps {
  activeTab: "home" | "trending" | "subscriptions" | "history";
  onNavigate: (tab: "home" | "trending" | "subscriptions" | "history") => void;
  onChannelClick: (animeId: number) => void;
  subscriptions: SubscriptionItem[];
}

export default function Sidebar({
  activeTab,
  onNavigate,
  onChannelClick,
  subscriptions,
}: SidebarProps) {
  const primaryNavItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "subscriptions" as const, label: "Subscriptions", icon: Clapperboard },
    { id: "history" as const, label: "History", icon: History },
  ];

  return (
    <>
      {/* =============== DESKTOP FLOATING LIQUID-GLASS DOCK =============== */}
      <aside
        className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 h-[52px] w-fit max-w-[calc(100vw-32px)] flex-row items-center px-4 bg-white/[0.1] backdrop-blur-[40px] saturate-[200%] border border-white/[0.25] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.4)] z-40 rounded-full select-none transition-all duration-300 hover:bg-white/[0.15] hover:scale-105"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.05] to-white/0 pointer-events-none rounded-full" />
        <div className="flex flex-row items-center justify-start overflow-x-auto overflow-y-hidden scrollbar-none h-full gap-3 relative z-10 w-fit">
          {/* Primary Navigation Items */}
          <div className="flex flex-row items-center gap-2 h-full py-1 relative">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  className="w-10 h-10 flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer relative z-20"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicatorDesktop"
                      className="absolute inset-0 bg-white/[0.2] backdrop-blur-[20px] rounded-full border border-white/[0.3] shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 transition-all duration-300 relative z-30 group-hover:scale-110 ${isActive ? "text-white" : "text-white/60 group-hover:text-white/90"}`} />
                </button>
              );
            })}
          </div>
          
          {/* User Profile */}
          <div className="pl-3 py-1 h-full flex items-center justify-center border-l border-white/[0.06]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff6b35] to-[#ffa585] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/10 cursor-pointer hover:scale-110 transition-transform" title="Account">
              O
            </div>
          </div>
        </div>
      </aside>

      {/* =============== MOBILE BOTTOM NAVIGATION FLATING DOCK =============== */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-white/[0.1] backdrop-blur-[40px] saturate-[200%] border border-white/[0.25] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.4)] rounded-full flex items-center justify-around px-3 z-40 select-none transition-all relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.05] to-white/0 pointer-events-none rounded-full" />
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center w-12 h-12 transition-all duration-300 cursor-pointer relative z-10 group"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicatorMobile"
                  className="absolute inset-0 bg-white/[0.2] backdrop-blur-[20px] rounded-full border border-white/[0.3] shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              )}
              <Icon className={`w-5.5 h-5.5 transition-all duration-300 relative z-30 group-hover:scale-110 ${isActive ? "text-white" : "text-white/60 group-hover:text-white/90"}`} />
            </button>
          );
        })}
      </nav>
    </>
  );
}
