import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { curatedAnime, curatedMovies, curatedSeries } from "./LandingCurated";

// Helper component for scrolling columns
const PosterColumn = ({ 
  items, 
  direction = "up", 
  speed = 40,
  isDimmed = false,
  isHighlighted = false
}: { 
  items: { title: string; posterPath: string | null }[]; 
  direction?: "up" | "down";
  speed?: number;
  isDimmed?: boolean;
  isHighlighted?: boolean;
}) => {
  // Extract non-null poster paths and duplicate array for infinite scroll
  const posters = items.filter(i => i.posterPath).map(i => `https://image.tmdb.org/t/p/w500${i.posterPath}`);
  const displayPosters = [...posters, ...posters, ...posters]; // Triplicate to ensure smooth infinite wrap

  return (
    <motion.div 
      className="flex flex-col gap-4 relative px-2 sm:px-4 w-1/3"
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: isHighlighted ? 1 : isDimmed ? 0.2 : 0.6,
        scale: isHighlighted ? 1.02 : 1,
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div
        className="flex flex-col gap-4"
        animate={{
          y: direction === "up" ? ["0%", "-33.33%"] : ["-33.33%", "0%"]
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: speed
        }}
      >
        {displayPosters.map((url, idx) => (
          <div key={`poster-${idx}`} className="w-full relative aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <img 
              src={url} 
              alt="Poster" 
              className="w-full h-full object-cover" 
              loading={idx > 6 ? "lazy" : "eager"}
            />
            {/* Cinematic overlay on each poster */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [hoveredSection, setHoveredSection] = useState<"anime" | "movies" | "series" | null>(null);

  useEffect(() => {
    document.title = "Miyoro";
    // Preserve backwards compatibility for deep links that use hash routing
    if (window.location.hash && window.location.hash.startsWith("#/")) {
      navigate("/anime" + window.location.hash);
    }
  }, [navigate]);

  return (
    <div className="w-full h-screen bg-[#060608] text-white flex font-sans select-none antialiased relative overflow-hidden">
      
      {/* Background glow base */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900/10 via-[#060608] to-purple-900/10 pointer-events-none" />

      {/* LEFT SIDE: Cinematic Posters Grid */}
      <div className="absolute inset-0 lg:relative lg:w-[65%] xl:w-[70%] h-full flex justify-center items-center overflow-hidden z-0">
        
        {/* Top/Bottom edge masks for cinematic blur/fade */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#060608] via-[#060608]/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#060608] via-[#060608]/90 to-transparent z-10 pointer-events-none" />
        
        {/* Right edge fade for desktop blending */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-[#060608] to-transparent z-10 pointer-events-none" />
        {/* Mobile full overlay to ensure readability */}
        <div className="lg:hidden absolute inset-0 bg-black/60 z-10 pointer-events-none" />

        {/* 3 Columns */}
        <div className="relative w-full max-w-[1200px] h-[200%] flex gap-2 sm:gap-4 md:gap-8 justify-between z-0 px-4 -rotate-2 scale-110 opacity-70 lg:opacity-100">
          
          <PosterColumn 
            items={curatedAnime} 
            direction="down" 
            speed={45} 
            isHighlighted={hoveredSection === "anime"}
            isDimmed={hoveredSection !== null && hoveredSection !== "anime"}
          />
          
          <PosterColumn 
            items={curatedMovies} 
            direction="up" 
            speed={55} 
            isHighlighted={hoveredSection === "movies"}
            isDimmed={hoveredSection !== null && hoveredSection !== "movies"}
          />
          
          <PosterColumn 
            items={curatedSeries} 
            direction="down" 
            speed={50} 
            isHighlighted={hoveredSection === "series"}
            isDimmed={hoveredSection !== null && hoveredSection !== "series"}
          />

        </div>
      </div>

      {/* RIGHT SIDE: Premium Hero Section */}
      <div className="relative w-full lg:w-[35%] xl:w-[30%] h-full z-20 flex flex-col justify-center px-8 lg:px-12 lg:pr-16 xl:pr-24 lg:-ml-8 bg-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#060608]/95 lg:to-[#060608]">
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col space-y-12 max-w-sm mx-auto lg:mx-0 w-full"
        >
          {/* Header */}
          <div className="space-y-6 text-center lg:text-left mb-12">
             <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-white drop-shadow-2xl">
               Miyoro
             </h1>
             <p className="text-xl md:text-2xl text-white/70 font-medium tracking-tight leading-snug">
               Watch.<br />
               Whatever.<br />
               You Want.
             </p>
          </div>

          <div className="w-full h-px bg-white/[0.08] mb-12 hidden lg:block" />

          {/* Destination Selector */}
          <div className="flex flex-col gap-8">
            
            <Link 
              to="/anime"
              onMouseEnter={() => setHoveredSection("anime")}
              onMouseLeave={() => setHoveredSection(null)}
              className="group flex items-center justify-center lg:justify-start gap-4"
            >
              <span className="text-lg md:text-xl font-bold tracking-[0.2em] text-white/60 group-hover:text-white transition-colors duration-500">
                ANIME
              </span>
              <span className="text-xl text-white/40 group-hover:text-white group-hover:translate-x-3 transition-all duration-500">
                →
              </span>
            </Link>

            <Link 
              to="/movies"
              onMouseEnter={() => setHoveredSection("movies")}
              onMouseLeave={() => setHoveredSection(null)}
              className="group flex items-center justify-center lg:justify-start gap-4"
            >
              <span className="text-lg md:text-xl font-bold tracking-[0.2em] text-white/60 group-hover:text-white transition-colors duration-500">
                MOVIES
              </span>
              <span className="text-xl text-white/40 group-hover:text-white group-hover:translate-x-3 transition-all duration-500">
                →
              </span>
            </Link>

            <Link 
              to="/series"
              onMouseEnter={() => setHoveredSection("series")}
              onMouseLeave={() => setHoveredSection(null)}
              className="group flex items-center justify-center lg:justify-start gap-4"
            >
              <span className="text-lg md:text-xl font-bold tracking-[0.2em] text-white/60 group-hover:text-white transition-colors duration-500">
                SERIES
              </span>
              <span className="text-xl text-white/40 group-hover:text-white group-hover:translate-x-3 transition-all duration-500">
                →
              </span>
            </Link>

          </div>
        </motion.div>

      </div>
    </div>
  );
}

