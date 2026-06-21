import { Link, useNavigate } from "react-router-dom";
import { TMDBMovie, TMDB_IMAGE_BASE_URL_W500 } from "../../services/tmdb";
import { Play, Star } from "lucide-react";
import LazyImage from "../LazyImage";
import React, { useState } from "react";
import { motion } from "framer-motion";

interface MovieCardProps {
  movie: TMDBMovie;
  index?: number;
}

export const MovieCard = React.memo(
  ({ movie, index = 0 }: MovieCardProps) => {
    const [isCardReady, setIsCardReady] = useState(false);
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const navigate = useNavigate();

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (window.matchMedia("(hover: none)").matches) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((centerY - y) / centerY) * 2;
      const rotateY = ((x - centerX) / centerX) * 2;

      setRotate({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
      setRotate({ x: 0, y: 0 });
    };

    const poster = movie.poster_path
      ? `${TMDB_IMAGE_BASE_URL_W500}${movie.poster_path}`
      : "";
    const year = movie.release_date
      ? movie.release_date.substring(0, 4)
      : "TBA";

    const motionProps = {
      initial: { opacity: 0, y: 24 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.1 },
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
        delay: Math.min(index * 0.03, 0.2),
      },
    };

    const onClick = () => navigate(`/movies/movie/${movie.id}`);

    return (
      <motion.div
        {...motionProps}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`group relative flex flex-col cursor-pointer transition-all duration-300 ease-out sm:hover:-translate-y-[4px] active:scale-[0.97] sm:hover:!opacity-100 transform-gpu will-change-[transform,opacity]`}
        style={{ width: "200px" }}
      >
        <div
          className={`absolute inset-0 z-50 flex flex-col pointer-events-none transition-opacity duration-300 ease-out ${isCardReady ? "opacity-0" : "opacity-100"} transform-gpu`}
        >
          <div
            className="relative w-[200px] flex-shrink-0 aspect-[2/3] rounded-[20px] shimmer-bone border border-white/[0.04] shadow-sm transform-gpu"
            style={{
              transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
            }}
          />
          <div className="mt-3.5 flex flex-col gap-1.5 z-0 px-1">
            <div className="space-y-2">
              <div className="h-4 bg-white/[0.06] rounded w-11/12" />
              <div className="h-3 bg-white/[0.03] rounded w-2/3" />
            </div>
          </div>
        </div>

        <div
          className={`flex flex-col transition-opacity duration-300 ease-out ${isCardReady ? "opacity-100" : "opacity-0"}`}
        >
          <div
            className="relative w-[200px] aspect-[2/3] rounded-[20px] overflow-hidden bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-lg sm:group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.8)] sm:group-hover:border-white/[0.2] transition-transform duration-100 ease-out z-10 isolate group/wrapper transform-gpu"
            style={{
              transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
            }}
          >
            {poster ? (
              <LazyImage
                src={poster}
                alt={movie.title}
                className="w-full h-full object-cover transform sm:group-hover:scale-[1.04] transition-transform duration-300 ease-out"
                referrerPolicy="no-referrer"
                onLoadComplete={() => setIsCardReady(true)}
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center text-white/20 text-[10px] bg-white/[0.02]"
                onLoad={() => setIsCardReady(true)}
              >
                No Image
              </div>
            )}

            {movie.vote_average ? (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-md transition-transform duration-300 sm:group-hover:scale-[1.08] ease-out">
                <Star className="w-3.5 h-3.5 fill-[#ff6b35] stroke-none drop-shadow-md" />
                <span className="text-white text-xs font-bold tracking-tight">
                  {movie.vote_average.toFixed(1)}
                </span>
              </div>
            ) : null}

            <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] backdrop-blur-lg border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] transform scale-95 sm:group-hover:scale-100 transition-transform duration-300 ease-out">
                <Play className="w-4 h-4 text-white fill-white drop-shadow-lg" />
                <span className="text-white text-sm font-bold tracking-wide drop-shadow-md lg:block hidden">
                  Watch Now
                </span>
              </div>
            </div>

            <div className="absolute inset-0 rounded-[20px] border border-white/[0.06] pointer-events-none group-hover:border-white/[0.15] transition-colors duration-300" />
            <div className="absolute inset-0 rounded-[20px] shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] pointer-events-none" />
          </div>

          <div className="mt-3.5 flex flex-col gap-1.5 z-0 transition-transform duration-300 ease-out">
            <div className="flex flex-col gap-1.5 font-sans">
              <h3 className="text-[#f1f1f1] text-[15px] font-bold leading-snug tracking-tight line-clamp-2 group-hover:text-white transition-colors duration-300">
                {movie.title}
              </h3>

              <div className="flex items-center text-[11px] sm:text-[12px] text-[#999] font-medium gap-2 mt-0.5 opacity-80 sm:group-hover:opacity-100 transform sm:group-hover:-translate-y-[4px] transition-all duration-300 ease-out">
                <span>{year}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="uppercase tracking-wider">Movie</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
  (prev, next) => {
    return prev.movie.id === next.movie.id && prev.index === next.index;
  },
);

export default MovieCard;
