/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, Flame, Clapperboard, Library, Sparkles, Calendar, Settings, Compass, Shuffle, LogIn, ChevronRight, X } from "lucide-react";
import { SubscriptionItem } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "../hooks/useLibrary";

interface SidebarProps {
  activeTab: "home" | "trending" | "subscriptions" | "library" | "schedule";
  onNavigate: (tab: "home" | "trending" | "subscriptions" | "library" | "schedule") => void;
  onChannelClick: (animeId: number) => void;
  subscriptions: SubscriptionItem[];
  isOpen?: boolean;
  onClose?: () => void;
  onSignInClick?: () => void;
}

export default function Sidebar({
  activeTab,
  onNavigate,
  onChannelClick,
  subscriptions,
  isOpen,
  onClose,
  onSignInClick
}: SidebarProps) {
  const { currentUser } = useLibrary();

  const primaryNavItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "schedule" as const, label: "Schedule", icon: Calendar },
    { id: "subscriptions" as const, label: "Subscriptions", icon: Clapperboard },
    { id: "library" as const, label: "Library", icon: Library },
  ];

  const desktopNavItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "trending" as const, label: "Browse Anime", icon: Compass },
    { id: "schedule" as const, label: "Schedule", icon: Calendar },
    { id: "random" as const, label: "Random", icon: Shuffle },
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

      {/* =============== DESKTOP OVERLAY SIDEBAR =============== */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] hidden md:block"
            />
            
            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-black/40 backdrop-blur-[40px] shadow-[20px_0_80px_rgba(0,0,0,0.6)] z-[100] hidden md:flex flex-col select-none"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

              {/* Header */}
              <div className="p-6 pb-2 pt-8 flex items-center justify-between relative z-10">
                <div className="flex items-center">
                  <span className="text-xl md:text-2xl font-black tracking-wider bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                    miyoro
                  </span>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto custom-scrollbar py-6 px-3 flex flex-col gap-1 relative z-10">
                {desktopNavItems.map((item) => {
                  const Icon = item.icon;
                  // For random, we don't have a real route, just match others
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "random") {
                          // Ignore for now or handle random
                        } else {
                          onNavigate(item.id as any);
                        }
                        onClose?.();
                      }}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 w-full text-left group ${isActive ? 'bg-white/[0.08] text-white' : 'text-white/60 hover:text-white/90 hover:bg-white/[0.04]'}`}
                    >
                      <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'} drop-shadow-md`} />
                      <span className="font-semibold text-[15px] tracking-wide">{item.label}</span>
                    </button>
                  );
                })}

                <div className="h-px bg-white/[0.05] w-full my-4" />

                <button
                  className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 w-full text-left group text-white/60 hover:text-white/90 hover:bg-white/[0.04]"
                >
                  <Settings className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45 drop-shadow-md" />
                  <span className="font-semibold text-[15px] tracking-wide">Settings</span>
                </button>
              </div>

              {/* User Section Footer */}
              <div className="p-4 border-t border-white/[0.05] relative z-10 bg-black/20">
                {currentUser ? (
                  <div className="flex items-center gap-3 px-2 py-2 rounded-xl group hover:bg-white/[0.05] transition-colors cursor-pointer">
                    <img src={currentUser.photoURL || ""} className="w-10 h-10 rounded-full border border-white/20" referrerPolicy="no-referrer" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-bold text-white truncate">{currentUser.displayName || "User"}</span>
                      <span className="text-xs text-white/40 truncate">Free Plan</span>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      onClose?.();
                      if (onSignInClick) {
                        onSignInClick();
                      } else {
                        window.dispatchEvent(new CustomEvent("openAuthModal"));
                      }
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-all duration-300 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center shadow-lg shadow-[#ff6b35]/20">
                      <LogIn className="w-4 h-4 text-white ml-0.5" />
                    </div>
                    <div className="flex flex-col items-start flex-1">
                      <span className="text-sm font-bold text-white tracking-wide group-hover:text-[#ff6b35] transition-colors">Sign In</span>
                      <span className="text-[11px] text-white/50">Sync your library</span>
                    </div>
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
