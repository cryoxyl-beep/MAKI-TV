import React, { createContext, useContext, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, CheckCircle2, AlertTriangle } from "lucide-react";
import { getAnimeCollections, saveAnimeCollections, getMoviesCollections, saveMoviesCollections, getSeriesCollections, saveSeriesCollections } from "../utils";
import { CollectionItem } from "../types";

interface CollectionsMediaItem {
  id: number;
  title: string;
  posterPath?: string;
  coverImage?: string;
  backdropPath?: string;
  bannerImage?: string;
  type: "anime" | "movie" | "series";
  animeId?: number;
  tmdbId?: number;
}

interface ToastMessage {
  id: string;
  message: string;
  type?: "success" | "info" | "warning";
}

interface CollectionsContextType {
  openCollectionsModal: (item: CollectionsMediaItem) => void;
  showToast: (message: string, type?: "success" | "info" | "warning") => void;
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export function useCollections() {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error("useCollections must be used within a CollectionsProvider");
  }
  return context;
}

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<CollectionsMediaItem | null>(null);
  const [isToBinge, setIsToBinge] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Show a premium toast notification
  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Open the collection selection modal
  const openCollectionsModal = (item: CollectionsMediaItem) => {
    setActiveItem(item);
    
    // Load current collection state
    let toBingeInit = false;
    let watchedInit = false;

    if (item.type === "anime") {
      const col = getAnimeCollections();
      toBingeInit = col.toBinge.some((i) => i.id === item.id || i.animeId === item.id);
      watchedInit = col.watched.some((i) => i.id === item.id || i.animeId === item.id);
    } else if (item.type === "movie") {
      const col = getMoviesCollections();
      toBingeInit = col.toBinge.some((i) => i.id === item.id || i.tmdbId === item.id);
      watchedInit = col.watched.some((i) => i.id === item.id || i.tmdbId === item.id);
    } else if (item.type === "series") {
      const col = getSeriesCollections();
      toBingeInit = col.toBinge.some((i) => i.id === item.id || i.tmdbId === item.id);
      watchedInit = col.watched.some((i) => i.id === item.id || i.tmdbId === item.id);
    }

    setIsToBinge(toBingeInit);
    setIsWatched(watchedInit);
    setIsOpen(true);
  };

  // Handle Save
  const handleSave = () => {
    if (!activeItem) return;

    const poster = activeItem.posterPath || activeItem.coverImage || "";
    const backdrop = activeItem.backdropPath || activeItem.bannerImage || "";

    const itemToSave: CollectionItem = {
      id: activeItem.id,
      title: activeItem.title,
      posterPath: poster,
      coverImage: poster,
      backdropPath: backdrop,
      bannerImage: backdrop,
      type: activeItem.type,
      addedAt: new Date().toISOString(),
      ...(activeItem.type === "anime" ? { animeId: activeItem.id } : { tmdbId: activeItem.id }),
    };

    if (activeItem.type === "anime") {
      const col = { ...getAnimeCollections() };
      
      // Clean previous
      col.toBinge = col.toBinge.filter((i) => i.id !== activeItem.id && i.animeId !== activeItem.id);
      col.watched = col.watched.filter((i) => i.id !== activeItem.id && i.animeId !== activeItem.id);

      if (isToBinge) col.toBinge.unshift(itemToSave);
      if (isWatched) col.watched.unshift(itemToSave);

      saveAnimeCollections(col);
    } else if (activeItem.type === "movie") {
      const col = { ...getMoviesCollections() };
      
      // Clean previous
      col.toBinge = col.toBinge.filter((i) => i.id !== activeItem.id && i.tmdbId !== activeItem.id);
      col.watched = col.watched.filter((i) => i.id !== activeItem.id && i.tmdbId !== activeItem.id);

      if (isToBinge) col.toBinge.unshift(itemToSave);
      if (isWatched) col.watched.unshift(itemToSave);

      saveMoviesCollections(col);
    } else if (activeItem.type === "series") {
      const col = { ...getSeriesCollections() };
      
      // Clean previous
      col.toBinge = col.toBinge.filter((i) => i.id !== activeItem.id && i.tmdbId !== activeItem.id);
      col.watched = col.watched.filter((i) => i.id !== activeItem.id && i.tmdbId !== activeItem.id);

      if (isToBinge) col.toBinge.unshift(itemToSave);
      if (isWatched) col.watched.unshift(itemToSave);

      saveSeriesCollections(col);
    }

    setIsOpen(false);

    // Show custom toast confirmation
    if (isToBinge) {
      showToast(`Added to To Binge`);
    } else if (isWatched) {
      showToast(`Added to Watched`);
    } else {
      showToast("Removed from Collections", "info");
    }
  };

  return (
    <CollectionsContext.Provider value={{ openCollectionsModal, showToast }}>
      {children}

      {/* ================= PREMIUM MODAL LAYER ================= */}
      <AnimatePresence>
        {isOpen && activeItem && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with elegant blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="relative w-full max-w-sm bg-[#0e0e11] border border-white/[0.08] rounded-2xl overflow-hidden p-6 shadow-2xl z-10 select-none text-white text-center"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title & Cover Accent */}
              <div className="flex flex-col items-center mt-2 mb-6">
                <span className="text-xs uppercase tracking-widest text-white/40 font-bold mb-1">
                  Miyoro Collections
                </span>
                <h3 className="text-xl font-extrabold text-white leading-snug px-4 truncate max-w-full">
                  Add To Collection
                </h3>
                <p className="text-xs text-white/50 mt-1 max-w-[280px] truncate">
                  {activeItem.title}
                </p>
              </div>

              {/* Collections Options */}
              <div className="space-y-3 mb-8">
                {/* To Binge Option */}
                <button
                  onClick={() => {
                    setIsToBinge(!isToBinge);
                    if (!isToBinge) setIsWatched(false); // Mutually exclusive touch
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                    isToBinge
                      ? "bg-white/[0.06] border-white/20 text-white shadow-lg"
                      : "bg-[#121216] border-white/[0.04] text-white/50 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Flame className={`w-5 h-5 ${isToBinge ? "text-[#f97316]" : "text-white/40"}`} />
                    <span className="font-bold tracking-wide text-sm">🔥 To Binge</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      isToBinge
                        ? "border-[#f97316] bg-[#f97316] text-white"
                        : "border-white/20"
                    }`}
                  >
                    {isToBinge && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* Watched Option */}
                <button
                  onClick={() => {
                    setIsWatched(!isWatched);
                    if (!isWatched) setIsToBinge(false); // Mutually exclusive touch
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                    isWatched
                      ? "bg-white/[0.06] border-white/20 text-white shadow-lg"
                      : "bg-[#121216] border-white/[0.04] text-white/50 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`w-5 h-5 ${isWatched ? "text-[#22c55e]" : "text-white/40"}`} />
                    <span className="font-bold tracking-wide text-sm">✓ Watched</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      isWatched
                        ? "border-[#22c55e] bg-[#22c55e] text-white"
                        : "border-white/20"
                    }`}
                  >
                    {isWatched && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </button>
              </div>

              {/* Act Pills */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 bg-[#121216] hover:bg-white/[0.03] border border-white/[0.05] rounded-full text-sm font-semibold tracking-wide text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-white text-[#0a0a0c] hover:bg-white/90 rounded-full text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer shadow-lg active:scale-95"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= PREMIUM TOAST NOTIFICATION LAYER ================= */}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2.5 pointer-events-none max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-black/95 border border-white/10 shadow-2xl backdrop-blur-md pointer-events-auto"
            >
              {toast.type === "success" && (
                <div className="p-1 rounded-full bg-[#22c55e]/10 text-[#22c55e]">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </div>
              )}
              {toast.type === "info" && (
                <div className="p-1 rounded-full bg-white/10 text-white/80">
                  <Flame className="w-4.5 h-4.5 text-orange-400" />
                </div>
              )}
              {toast.type === "warning" && (
                <div className="p-1 rounded-full bg-red-500/10 text-red-400">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
              )}
              <span className="text-white text-xs sm:text-sm font-semibold tracking-wide">
                {toast.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </CollectionsContext.Provider>
  );
}
