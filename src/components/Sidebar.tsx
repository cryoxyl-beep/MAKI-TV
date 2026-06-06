/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, Flame, Clapperboard, Library, Sparkles, Calendar } from "lucide-react";
import { SubscriptionItem } from "../types";
import { motion } from "framer-motion";

interface SidebarProps {
  activeTab: "home" | "trending" | "subscriptions" | "library" | "schedule";
  onNavigate: (tab: "home" | "trending" | "subscriptions" | "library" | "schedule") => void;
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
    { id: "schedule" as const, label: "Schedule", icon: Calendar },
    { id: "subscriptions" as const, label: "Subscriptions", icon: Clapperboard },
    { id: "library" as const, label: "Library", icon: Library },
  ];

  return (
    <>
      {/* =============== MOBILE BOTTOM NAVIGATION FLOATING DOCK =============== */}
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
