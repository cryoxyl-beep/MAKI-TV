import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Film, Tv, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Miyoro";
    // Preserve backwards compatibility for deep links that use hash routing
    if (window.location.hash && window.location.hash.startsWith("#/")) {
      navigate("/anime" + window.location.hash);
    }
  }, [navigate]);

  return (
    <div className="w-full min-h-screen bg-[#09090b] text-white flex flex-col font-sans select-none antialiased relative overflow-hidden items-center justify-center">
      {/* Frosted Glass Floating Ambient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10vw] left-[-10vw] w-[45vw] h-[45vw] rounded-full bg-blue-500/20 blur-[100px] opacity-60 animate-pulse"></div>
        <div className="absolute bottom-[-10vw] right-[-10vw] w-[50vw] h-[50vw] rounded-full bg-purple-500/20 blur-[120px] opacity-50 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-[35%] right-[5vw] w-[40vw] h-[40vw] rounded-full bg-indigo-500/20 blur-[110px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="z-10 flex flex-col items-center justify-center space-y-16 mt-[-5vh] w-full max-w-6xl px-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-2 text-white/50 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase">Miyoro Multiverse</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-2">
            What's your mood today?
          </h1>
          <p className="text-lg text-white/60 max-w-lg mx-auto">
            Choose your destination to begin streaming.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full">
          {/* Anime Card */}
          <Link to="/anime">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              whileHover={{ y: -10, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group h-72 md:h-96 rounded-[2rem] overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-all duration-500 z-0" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all duration-500">
                  <PlayCircle className="w-6 h-6 stroke-[2]" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight group-hover:translate-x-2 transition-transform duration-500">Anime</h2>
                <p className="text-white/60 font-medium group-hover:translate-x-2 transition-transform duration-500 delay-75">The original Miyoro experience.</p>
              </div>
            </motion.div>
          </Link>

          {/* Movies Card */}
          <Link to="/movies">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              whileHover={{ y: -10, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group h-72 md:h-96 rounded-[2rem] overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-all duration-500 z-0" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all duration-500 group-hover:border-rose-400/50">
                  <Film className="w-6 h-6 stroke-[2]" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight group-hover:translate-x-2 transition-transform duration-500">Movies</h2>
                <p className="text-white/60 font-medium group-hover:translate-x-2 transition-transform duration-500 delay-75">Cinematic universe.</p>
              </div>
            </motion.div>
          </Link>

          {/* Series Card */}
          <Link to="/series">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              whileHover={{ y: -10, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group h-72 md:h-96 rounded-[2rem] overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-all duration-500 z-0" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 group-hover:border-emerald-400/50">
                  <Tv className="w-6 h-6 stroke-[2]" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight group-hover:translate-x-2 transition-transform duration-500">Series</h2>
                <p className="text-white/60 font-medium group-hover:translate-x-2 transition-transform duration-500 delay-75">Binge-worthy shows.</p>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
}
