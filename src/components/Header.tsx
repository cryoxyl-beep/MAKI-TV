/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ArrowLeft, Home, Clapperboard, History, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithGoogle, signOut, onAuthStateChanged } from "../services/auth";
import { User } from "firebase/auth";

interface HeaderProps {
  onSearch: (query: string) => void;
  initialSearchQuery?: string;
  onNavigateHome: () => void;
  onNavigateLibrary?: () => void;
  onNavigateSubscriptions?: () => void;
  isHomeScreen?: boolean;
  activeTab?: "home" | "trending" | "subscriptions" | "library" | "schedule";
}

export default function Header({
  onSearch,
  initialSearchQuery = "",
  onNavigateHome,
  onNavigateLibrary,
  onNavigateSubscriptions,
  onNavigateSchedule,
  isHomeScreen = false,
  activeTab = "home",
  variant = "global",
  breadcrumbs = []
}: HeaderProps & { onNavigateSchedule?: () => void; variant?: "global" | "slim"; breadcrumbs?: { label: string; onClick?: () => void }[] }) {
  const [searchVal, setSearchVal] = useState(initialSearchQuery);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceCollapse, setForceCollapse] = useState(false);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isExpanded = (isFocused || searchVal.length > 0) && !forceCollapse;
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchVal(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 50) {
        setIsVisible(false);
        if (isExpanded) {
          inputRef.current?.blur();
          setForceCollapse(true);
        }
      } else {
        setIsVisible(true);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isExpanded]);

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

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      setShowAuthModal(false);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowAuthModal(false);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 select-none transform-gpu transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${variant === "slim" ? "h-[48px] bg-transparent pt-1" : "h-16 bg-transparent"} ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
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
        ) : variant === "slim" ? (
          <div className="w-full h-full max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between">
            {/* Breadcrumb Left */}
            <nav className="flex-1 flex items-center text-sm font-semibold tracking-wide overflow-x-auto scrollbar-hide py-2 pr-4">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const isInteractive = !!item.onClick && !isLast;
                const isHome = item.label.toLowerCase() === "home";
                
                return (
                  <div key={index} className="flex items-center shrink-0">
                    {index > 0 && <span className="mx-2.5 text-white/30 text-[11px] font-bold">&gt;</span>}
                    <button
                      className={`flex items-center transition-colors duration-200 ${
                        isInteractive ? "hover:text-white cursor-pointer text-white/50" : "text-white/80 cursor-default pointer-events-none flex items-center"
                      }`}
                      onClick={isInteractive ? item.onClick : undefined}
                      title={item.label}
                    >
                      {isHome ? (
                        <Home className="w-[17px] h-[17px] mb-[1px]" />
                      ) : (
                        <span className="truncate max-w-[160px] sm:max-w-[260px] md:max-w-[350px]">{item.label}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </nav>
            
            {/* Right section: Search input & User Profile */}
            <div className="flex shrink-0 items-center justify-end gap-3 lg:gap-4">
              {/* Desktop & Tablet Search Bar */}
              <form
                onSubmit={handleSubmit}
                className={`hidden md:flex items-center group relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? "w-[200px] lg:w-[240px] xl:w-[280px]" : "w-9"} ${isSubmitting ? "scale-95" : isFocused ? "scale-[1.02]" : "scale-100"} ${!isExpanded ? "cursor-pointer" : "cursor-text"}`}
              >
                <div
                  onClick={() => {
                    setForceCollapse(false);
                    setIsFocused(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className={`w-full h-9 flex items-center bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/[0.08] transition-[width,background-color,border-color,box-shadow,padding-left,padding-right] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_8px_32px_rgba(0,0,0,0.22)] rounded-full focus-within:border-white/[0.16] focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-white/[0.01] ${isExpanded ? "px-3.5" : "px-0 justify-center"}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 pointer-events-none" />
                  <Search className={`text-white/70 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 w-[14px] h-[14px] group-focus-within:text-white ${isExpanded ? "mr-2.5" : "mr-0"}`} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    onFocus={() => {
                      setForceCollapse(false);
                      setIsFocused(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    className={`bg-transparent border-none text-white focus:outline-none text-[13px] font-medium tracking-wide placeholder-white/65 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? "w-full opacity-100" : "w-0 opacity-0 min-w-0 p-0"}`}
                  />
                  {isExpanded && searchVal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                      className="p-1 hover:bg-white/20 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer relative z-10 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </form>

              {/* Mobile Search Toggle */}
              <button
                onClick={() => setShowMobileSearch(true)}
                className="p-1.5 hover:bg-white/[0.08] text-white/80 hover:text-white rounded-full transition-colors md:hidden cursor-pointer"
                title="Search"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>

              {/* User Profile Avatar */}
              <div 
                onClick={() => setShowAuthModal(true)}
                className={`w-[34px] h-[34px] rounded-full flex flex-shrink-0 items-center justify-center text-white font-extrabold text-xs border border-white/20 cursor-pointer transition-all duration-300 ${currentUser ? "bg-black overflow-hidden" : "bg-gradient-to-tr from-[#ff6b35] to-[#ffa585] shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:scale-[1.08] active:scale-95"}`} 
                title="Account"
              >
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || "User"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "O"
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full max-w-[1440px] mx-auto flex items-center justify-between px-4 md:px-8 lg:px-10 relative">
            {/* Left section: Logo */}
            <div className="flex-1 flex items-center">
              <div className="flex items-center cursor-pointer group" onClick={onNavigateHome}>
                <span className="text-xl md:text-2xl font-black tracking-wider bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent hover:opacity-90 transition-all duration-300">
                  miyoro
                </span>
              </div>
            </div>

            {/* Center section: Text Navigation */}
            <nav className="hidden md:flex items-center justify-center gap-1.5 absolute left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="flex items-center gap-1.5 pointer-events-auto bg-white/[0.03] backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/[0.06] shadow-md transition-colors duration-300">
                {[
                  { id: "home" as const, label: "Home", onClick: onNavigateHome },
                  { id: "schedule" as const, label: "Schedule", onClick: onNavigateSchedule },
                  { id: "subscriptions" as const, label: "Browse", onClick: onNavigateSubscriptions },
                  { id: "library" as const, label: "Library", onClick: onNavigateLibrary },
                ].filter(item => item.onClick).map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`relative px-4 py-1.5 text-xs lg:text-sm font-semibold tracking-wide transition-all duration-300 rounded-full cursor-pointer hover:bg-white/[0.04] ${
                        isActive 
                          ? "text-white font-bold" 
                          : "text-white/65 hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabIndicatorHeader"
                          className="absolute inset-0 bg-white/[0.09] rounded-full border border-white/[0.10] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_2px_8px_rgba(0,0,0,0.1)] -z-10"
                          initial={false}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        />
                      )}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Right section: Search input & User Profile */}
            <div className="flex-1 flex items-center justify-end gap-4 lg:gap-6">
              {/* Desktop & Tablet Search Bar */}
              <form
                onSubmit={handleSubmit}
                className={`hidden md:flex items-center group relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? "w-[200px] lg:w-[240px] xl:w-[280px]" : "w-10"} ${isSubmitting ? "scale-95" : isFocused ? "scale-[1.02]" : "scale-100"} ${!isExpanded ? "cursor-pointer" : "cursor-text"}`}
              >
                <div
                  onClick={() => {
                    setForceCollapse(false);
                    setIsFocused(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className={`w-full h-10 flex items-center bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/[0.08] transition-[width,background-color,border-color,box-shadow,padding-left,padding-right] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_8px_32px_rgba(0,0,0,0.22)] rounded-full focus-within:border-white/[0.16] focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-white/[0.01] ${isExpanded ? "px-4" : "px-0 justify-center"}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 pointer-events-none" />
                  <Search className={`text-white/70 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 w-[15px] h-[15px] group-focus-within:text-white ${isExpanded ? "mr-2.5" : "mr-0"}`} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search anime..."
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    onFocus={() => {
                      setForceCollapse(false);
                      setIsFocused(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    className={`bg-transparent border-none text-white focus:outline-none text-sm font-medium tracking-wide placeholder-white/65 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? "w-full opacity-100" : "w-0 opacity-0 min-w-0 p-0"}`}
                  />
                  {isExpanded && searchVal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
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

              {/* User Profile Avatar */}
              <div 
                onClick={() => setShowAuthModal(true)}
                className={`w-8.5 h-8.5 rounded-full flex flex-shrink-0 items-center justify-center text-white font-extrabold text-xs border border-white/20 cursor-pointer transition-all duration-300 ${currentUser ? "bg-black overflow-hidden" : "bg-gradient-to-tr from-[#ff6b35] to-[#ffa585] shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:scale-[1.08] active:scale-95"}`} 
                title="Account"
              >
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || "User"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "O"
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal overlay handling */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col items-center justify-center p-8 backdrop-blur-xl shadow-2xl"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {currentUser ? (
                <div className="flex flex-col items-center gap-4 w-full text-center">
                  {currentUser.photoURL && (
                    <img src={currentUser.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-white/10" referrerPolicy="no-referrer" />
                  )}
                  <div>
                    <h3 className="text-white text-lg font-bold">{currentUser.displayName || "Signed In"}</h3>
                    <p className="text-gray-400 text-sm mt-1">{currentUser.email}</p>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-full transition-colors border border-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 w-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-2">
                    <span className="text-3xl font-black bg-gradient-to-r from-[#ff6b35] to-[#ffa585] text-transparent bg-clip-text">M</span>
                  </div>
                  <h3 className="text-white text-xl font-bold tracking-tight">Track Your Anime Progress</h3>
                  <div className="text-gray-400 text-sm space-y-2 text-left mb-4">
                    <p>Sign in with Google to:</p>
                    <ul className="list-disc list-inside ml-2">
                      <li>Save your library</li>
                      <li>Track watch progress</li>
                      <li>Sync across devices</li>
                    </ul>
                  </div>
                  <button 
                    onClick={handleSignIn}
                    className="w-full py-3 flex items-center justify-center gap-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-lg"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      <path fill="none" d="M1 1h22v22H1z"/>
                    </svg>
                    Sign in with Google
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
