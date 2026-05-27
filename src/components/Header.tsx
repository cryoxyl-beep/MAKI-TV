/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Menu, Search, Bell, User, Tv, X, ArrowLeft } from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
  onSearch: (query: string) => void;
  initialSearchQuery?: string;
  onNavigateHome: () => void;
  onNavigateHistory: () => void;
  onNavigateSubscriptions: () => void;
}

export default function Header({
  onToggleSidebar,
  onSearch,
  initialSearchQuery = "",
  onNavigateHome,
  onNavigateHistory,
  onNavigateSubscriptions,
}: HeaderProps) {
  const [searchVal, setSearchVal] = useState(initialSearchQuery);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    setSearchVal(initialSearchQuery);
  }, [initialSearchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal.trim());
    setShowMobileSearch(false);
  };

  const handleClear = () => {
    setSearchVal("");
    onSearch("");
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#0a0a0c]/60 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between px-4 z-50">
      {/* Search Header for Mobile overlay */}
      {showMobileSearch ? (
        <form onSubmit={handleSubmit} className="absolute inset-0 bg-[#09090b]/90 backdrop-blur-xl flex items-center px-4 gap-2">
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
            className="p-2 bg-white/[0.04] border border-white/[0.08] rounded-full text-white hover:bg-white/[0.12] transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>
      ) : (
        <>
          {/* Left Portion: Hamburger & Logo */}
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-white/[0.08] text-white rounded-full transition-colors hidden md:inline-flex items-center justify-center cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div
              onClick={onNavigateHome}
              className="flex items-center cursor-pointer select-none group py-1"
            >
              <span className="text-white text-xl md:text-2xl font-black tracking-tight font-sans flex items-center group-hover:scale-105 transition-all duration-200 pl-3 md:pl-1">
                Maki<span className="text-[#ff6b35]">TV</span>
              </span>
            </div>
          </div>

          {/* Central Portion: Search bar (Middle screen + Desktop) */}
          <form
            onSubmit={handleSubmit}
            className="hidden md:flex items-center w-full max-w-lg lg:max-w-xl mx-4"
          >
            <div className="flex-1 flex items-center bg-white/[0.04] backdrop-blur-md rounded-l-full border border-white/[0.08] focus-within:border-[#ff6b35] focus-within:bg-black/35 transition-all px-4 py-1.5">
              <input
                type="text"
                placeholder="Search anime, genres or studios..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:outline-none text-sm"
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
              className="py-1.5 px-6 bg-white/[0.08] border-y border-r border-white/[0.08] rounded-r-full text-white hover:bg-white/[0.15] hover:border-white/[0.15] transition-all flex items-center justify-center cursor-pointer shadow-sm"
              title="Search"
            >
              <Search className="w-4 h-4 text-[#aaa] group-hover:text-white" />
            </button>
          </form>

          {/* Right Portion: Action Buttons */}
          <div className="flex items-center gap-1 md:gap-3">
            <button
              onClick={() => setShowMobileSearch(true)}
              className="p-2 hover:bg-white/[0.08] text-white rounded-full transition-colors md:hidden cursor-pointer"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-white/[0.08] text-white rounded-full transition-colors hidden sm:inline-flex cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ff6b35] rounded-full animate-pulse"></span>
            </button>
            <div
              className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-white/[0.08] rounded-full transition-all cursor-pointer border border-transparent hover:border-white/[0.08] ml-1 select-none"
              title="Account"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#ff6b35] to-[#ffa585] flex items-center justify-center text-white font-bold text-xs shadow-sm ring-1 ring-white/10">
                M
              </div>
              <span className="text-white text-xs font-medium hidden lg:inline-block">Otaku Guest</span>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
