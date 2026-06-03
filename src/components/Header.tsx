/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ArrowLeft, Home, Clapperboard, History } from "lucide-react";
import { motion } from "framer-motion";

interface HeaderProps {
  onSearch: (query: string) => void;
  initialSearchQuery?: string;
  onNavigateHome: () => void;
  onNavigateHistory: () => void;
  onNavigateSubscriptions: () => void;
  isHomeScreen?: boolean;
  activeTab?: "home" | "trending" | "subscriptions" | "history";
}

export default function Header({
  onSearch,
  initialSearchQuery = "",
  onNavigateHome,
  onNavigateHistory,
  onNavigateSubscriptions,
  isHomeScreen = false,
  activeTab = "home",
}: HeaderProps) {
  const [searchVal, setSearchVal] = useState(initialSearchQuery);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchVal(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (isFocused) {
        setIsVisible(true);
      } else if (currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal.trim());
    setShowMobileSearch(false);
    
    // Trigger submit bounce animation
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 300);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setSearchVal("");
    onSearch("");
    inputRef.current?.focus();
  };

  return (
    <header className={`fixed top-0 left-0 right-0 h-16 z-50 select-none bg-transparent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
      {/* Search Header for Mobile overlay */}
      {showMobileSearch ? (
        <form onSubmit={handleSubmit} className="absolute inset-0 bg-[#0a0a0c] flex items-center px-4 gap-2 z-50">
          <button
            type="button"
            onClick={() => setShowMobileSearch(false)}
            className="p-2 hover:bg-white/[0.08] rounded-full text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center bg-white/[0.04] backdrop-blur-md rounded-full border border-white/[0.08] focus-within:border-[#ff6b35] focus-within:bg-black/40 px-3 py-1 transition-all">
            <input
              type="text"
              placeholder="Search anime, genres or studios..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:outline-none text-sm py-1"
              autoFocus
            />
            {searchVal && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-white/[0.08] rounded-full text-[#aaa] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="p-2 bg-[#ff6b35] rounded-full text-white hover:bg-opacity-90 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>
      ) : (
        <div className="w-full h-full max-w-[1440px] mx-auto flex items-center justify-between px-4 md:px-8 lg:px-10">
          {/* Left section: Logo & Text Navigation */}
          <div className="flex items-center gap-6 lg:gap-10">
            <div className="flex items-center cursor-pointer group" onClick={onNavigateHome}>
              <span className="text-xl md:text-2xl font-black tracking-wider bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent hover:opacity-90 transition-all duration-300">
                miyoro
              </span>
            </div>

            {/* Desktop & Tablet Text Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {[
                { id: "home" as const, label: "Home", onClick: onNavigateHome },
                { id: "subscriptions" as const, label: "Browse", onClick: onNavigateSubscriptions },
                { id: "history" as const, label: "History", onClick: onNavigateHistory },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className={`relative px-4 py-1.5 text-xs lg:text-sm font-semibold tracking-wide transition-all duration-300 rounded-full cursor-pointer ${
                      isActive 
                        ? "text-white font-bold" 
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicatorHeader"
                        className="absolute inset-0 bg-white/[0.08] backdrop-blur-md rounded-full border border-white/[0.1] -z-10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      />
                    )}
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right section: Search input & User Profile */}
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Desktop & Tablet Search Bar */}
            <form
              onSubmit={handleSubmit}
              className={`hidden md:flex items-center group cursor-text relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] w-[200px] lg:w-[240px] xl:w-[280px] ${isSubmitting ? "scale-95" : isFocused ? "scale-[1.02]" : "scale-100"}`}
            >
              <div
                onClick={() => {
                  setIsFocused(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="w-full h-10 flex items-center bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden relative shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1),_0_4px_16px_rgba(0,0,0,0.15)] rounded-full px-4 focus-within:border-white/[0.22] focus-within:bg-white/[0.1] focus-within:ring-4 focus-within:ring-white/[0.03]"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 pointer-events-none" />
                <Search className="text-white/50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 w-[15px] h-[15px] mr-2.5 group-focus-within:text-white" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search anime..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="bg-transparent border-none text-white focus:outline-none text-sm font-medium tracking-wide w-full placeholder-white/45"
                />
                {searchVal && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 hover:bg-white/20 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer relative z-10 shrink-0 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className="p-2.5 hover:bg-white/[0.08] text-white/80 hover:text-white rounded-full transition-colors md:hidden cursor-pointer"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* User Profile Avatar with matched height/thickness */}
            <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-[#ff6b35] to-[#ffa585] flex items-center justify-center text-white font-extrabold text-xs shadow-[0_4px_12px_rgba(255,107,53,0.3)] border border-white/20 cursor-pointer hover:scale-[1.08] active:scale-95 transition-all duration-300" title="Account">
              O
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
