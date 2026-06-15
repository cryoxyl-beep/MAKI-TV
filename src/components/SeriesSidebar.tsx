import { Home, Library, Settings, LogIn, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface SeriesSidebarProps {
  activeTab: "home" | "library" | "settings";
  onNavigate: (tab: "home" | "library" | "settings") => void;
  isOpen?: boolean;
  onClose?: () => void;
  onSignInClick?: () => void;
}

export default function SeriesSidebar({
  activeTab,
  onNavigate,
  isOpen,
  onClose,
  onSignInClick
}: SeriesSidebarProps) {
  const primaryNavItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "library" as const, label: "Library", icon: Library },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const desktopNavItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "library" as const, label: "Library", icon: Library },
  ];

  return (
    <>
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
                  layoutId="activeTabIndicatorMobileSeries"
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

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] hidden md:block"
            />
            
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-black/40 backdrop-blur-[40px] shadow-[20px_0_80px_rgba(0,0,0,0.6)] z-[100] hidden md:flex flex-col select-none"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

              <div className="p-6 pb-2 pt-8 flex items-center justify-between relative z-10">
                <div className="flex flex-col">
                  <span className="text-xl md:text-2xl font-black tracking-wider bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                    miyoro
                  </span>
                  <span className="text-xs text-white/50 font-bold tracking-widest uppercase">Series</span>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/[0.05] rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar py-6 px-3 flex flex-col gap-1 relative z-10">
                {desktopNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose?.();
                      }}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 w-full text-left group ${isActive ? 'bg-white/[0.08] text-emerald-400' : 'text-white/60 hover:text-white/90 hover:bg-white/[0.04]'}`}
                    >
                      <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'} drop-shadow-md`} />
                      <span className="font-semibold text-[15px] tracking-wide">{item.label}</span>
                    </button>
                  );
                })}

                <div className="h-px bg-white/[0.05] w-full my-4" />

                <button
                  onClick={() => {
                    onNavigate("settings");
                    onClose?.();
                  }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 w-full text-left group ${activeTab === 'settings' ? 'bg-white/[0.08] text-emerald-400' : 'text-white/60 hover:text-white/90 hover:bg-white/[0.04]'}`}
                >
                  <Settings className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45 drop-shadow-md" />
                  <span className="font-semibold text-[15px] tracking-wide">Settings</span>
                </button>
              </div>

            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
