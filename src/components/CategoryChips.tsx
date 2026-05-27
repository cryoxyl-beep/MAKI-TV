/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryChips({
  selectedCategory,
  onSelectCategory,
}: CategoryChipsProps) {
  const chips = [
    "All",
    "Trending",
    "Action",
    "Romance",
    "Fantasy",
    "Shounen",
    "Comedy",
    "Adventure",
    "Sci-Fi",
    "Drama",
    "Mystery",
    "Sports",
    "Supernatural",
    "Horror",
  ];

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 250;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative w-full bg-transparent py-3.5 px-4 md:px-6 flex items-center group select-none z-10">
      
      {/* Left Scroll Button */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-1 z-20 p-1.5 bg-[#0a0a0c]/80 backdrop-blur-md hover:bg-white/[0.15] rounded-full border border-white/[0.08] text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center cursor-pointer"
        title="Scroll Left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Horizontal Scrollable chips feed */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2.5 overflow-x-auto overflow-y-hidden scrollbar-none scroll-smooth w-full flex-nowrap pr-12 sm:pr-0"
      >
        {chips.map((chip) => {
          const isActive = selectedCategory === chip;
          return (
            <button
              key={chip}
              onClick={() => onSelectCategory(chip)}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
                isActive
                  ? "bg-white text-black font-semibold shadow-lg shadow-white/5 border border-white"
                  : "bg-white/[0.04] border border-white/[0.08] text-gray-200 hover:bg-white/[0.12] hover:border-white/[0.15]"
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Right Scroll Button */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-1 z-20 p-1.5 bg-[#0a0a0c]/80 backdrop-blur-md hover:bg-white/[0.15] rounded-full border border-white/[0.08] text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center cursor-pointer"
        title="Scroll Right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
