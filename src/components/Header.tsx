/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ArrowLeft } from "lucide-react";

interface HeaderProps {
  onSearch: (query: string) => void;
  initialSearchQuery?: string;
  onNavigateHome: () => void;
  onNavigateHistory: () => void;
  onNavigateSubscriptions: () => void;
  isHomeScreen?: boolean;
}

export default function Header({
  onSearch,
  initialSearchQuery = "",
  onNavigateHome,
  onNavigateHistory,
  onNavigateSubscriptions,
  isHomeScreen = false,
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
      // Scroll down hides it, scroll up shows it.
      // Don't hide if we are at the very top or if input is focused.
      if (currentScrollY > lastScrollY && currentScrollY > 80 && !isFocused) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY || currentScrollY <= 80) {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isFocused]);

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
    <header className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 md:px-6 z-50 select-none bg-transparent transition-all duration-300">
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
        <>
          {/* Left Portion: Logo */}
          <div className="flex items-center gap-3 md:gap-4 flex-1" />

          {/* Central Portion: perfectly centered search bar */}
          <div className={`absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center w-[416px] z-10 pointer-events-none transition-all duration-300 ease-in-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"}`}>
            <form
              onSubmit={handleSubmit}
              className={`flex items-center justify-center group cursor-text relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-auto w-full ${isSubmitting ? "scale-95" : isFocused ? "scale-[1.02]" : "scale-100"}`}
            >
              <div
                onClick={() => {
                  setIsFocused(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className={`w-full flex items-center bg-white/[0.1] hover:bg-white/[0.15] backdrop-blur-[40px] saturate-[200%] border border-white/[0.25] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden relative shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.4)] h-10 rounded-full px-4 focus-within:border-white/[0.4] focus-within:bg-white/[0.18] focus-within:ring-4 focus-within:ring-white/[0.1]`}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.05] to-white/0 pointer-events-none" />
                <Search className={`text-white/80 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10 shrink-0 w-[18px] h-[18px] mr-2.5 group-focus-within:text-white`} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search anime..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className={`bg-transparent border-none text-white focus:outline-none text-sm font-medium tracking-wide relative z-10 block transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] min-w-0 placeholder-white/60 overflow-hidden whitespace-nowrap w-full opacity-100 ml-0`}
                />
                {searchVal && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer relative z-10 shrink-0 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right Portion: Action Buttons */}
          <div className="flex items-center justify-end gap-1 md:gap-3 flex-1">
            <button
              onClick={() => setShowMobileSearch(true)}
              className="p-2 hover:bg-white/[0.08] text-white rounded-full transition-colors md:hidden cursor-pointer"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </header>
  );
}
