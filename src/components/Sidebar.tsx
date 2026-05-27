/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, Flame, Clapperboard, History, Sparkles } from "lucide-react";
import { SubscriptionItem } from "../types";

interface SidebarProps {
  activeTab: "home" | "trending" | "subscriptions" | "history";
  isCollapsed: boolean;
  onNavigate: (tab: "home" | "trending" | "subscriptions" | "history") => void;
  onChannelClick: (animeId: number) => void;
  subscriptions: SubscriptionItem[];
}

export default function Sidebar({
  activeTab,
  isCollapsed,
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
      {/* =============== DESKTOP SIDEBAR =============== */}
      <aside
        className={`hidden md:block fixed top-14 left-0 bottom-0 bg-[#0a0a0c]/40 backdrop-blur-xl border-r border-white/[0.06] z-40 transition-all duration-200 select-none ${
          isCollapsed ? "w-[72px]" : "w-[240px]"
        }`}
      >
        <div className="flex flex-col h-full py-3 overflow-y-auto overflow-x-hidden scrollbar-none gap-4">
          
          {/* Primary Navigation Items */}
          <div className="flex flex-col px-2 gap-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              if (isCollapsed) {
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-xl gap-1 transition-all group cursor-pointer ${
                      isActive
                        ? "bg-[#ff6b35]/20 text-[#ff6b35] font-semibold border border-[#ff6b35]/20 shadow-sm"
                        : "text-white hover:bg-white/[0.06] hover:text-[#ff6b35]"
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? "text-[#ff6b35]" : "text-gray-400 group-hover:text-white"}`} />
                    <span className="text-[10px] leading-none text-center truncate w-full scale-95">{item.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center px-4 py-2.5 rounded-lg gap-6 transition-all group cursor-pointer text-left ${
                    isActive
                      ? "bg-[#ff6b35]/15 text-white font-semibold border border-[#ff6b35]/20 shadow-sm shadow-[#ff6b35]/5"
                      : "text-white hover:bg-white/[0.06] hover:text-[#ff6b35]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? "text-[#ff6b35] stroke-[2.5]" : "text-gray-400 group-hover:text-white"
                    }`}
                  />
                  <span className="text-sm tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Subscribed "Anime Channels" Section (only when sidebar is expanded and subscriptions exist) */}
          {!isCollapsed && subscriptions.length > 0 && (
            <div className="border-t border-white/[0.06] pt-4 px-2">
              <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                <span>Subscriptions</span>
              </div>
              
              <div className="flex flex-col gap-1">
                {subscriptions.map((sub) => (
                  <button
                    key={sub.animeId}
                    onClick={() => onChannelClick(sub.animeId)}
                    className="w-full flex items-center px-4 py-2 rounded-lg gap-4 text-left hover:bg-white/[0.06] transition-all group cursor-pointer"
                  >
                    {sub.coverImage ? (
                      <img
                        src={sub.coverImage}
                        alt={sub.animeTitle}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#ff6b35] to-[#ffa585] flex items-center justify-center text-white text-[10px] font-bold">
                        {sub.animeTitle.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm text-gray-300 group-hover:text-white truncate font-medium flex-1 max-w-[150px]">
                      {sub.animeTitle}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b35] opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* =============== MOBILE BOTTOM NAVBAR =============== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0c]/70 backdrop-blur-md border-t border-white/[0.08] flex items-center justify-around px-2 z-40 select-none shadow-lg">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                isActive ? "text-[#ff6b35] font-semibold scale-105" : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#ff6b35]" : "text-gray-400"}`} />
              <span className="text-[10px] leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
