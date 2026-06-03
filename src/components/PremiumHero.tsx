import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Play, ChevronUp, ChevronDown } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/effect-fade";
import { fetchAnimeDetails } from "../services/anilist";
import { AniListAnime } from "../types";

class EventEmitter {
  callbacks: ((progress: number) => void)[] = [];
  emit(progress: number) {
    this.callbacks.forEach(c => c(progress));
  }
  subscribe(c: (progress: number) => void) {
    this.callbacks.push(c);
    return () => { this.callbacks = this.callbacks.filter(x => x !== c); };
  }
}
const heroProgress = new EventEmitter();

const HeroNavDot: React.FC<{ isActive: boolean; onClick: () => void; }> = ({ isActive, onClick }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isActive) {
      return heroProgress.subscribe(setProgress);
    } else {
      setProgress(0);
    }
  }, [isActive]);

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isActive ? circumference - (progress * circumference) : circumference;

  return (
    <button onClick={onClick} className="relative w-9 h-9 flex items-center justify-center group flex-shrink-0 cursor-pointer pointer-events-auto transition-transform duration-300 hover:scale-110">
      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-white scale-125 shadow-[0_0_12px_rgba(255,255,255,0.6)] animate-pulse' : 'bg-white/40 group-hover:bg-white/80'}`} />
      
      {isActive && (
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-md" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />
          <circle
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-none"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

interface HeroTrailer {
  title: string;
  malId: number;
  anilistId: number;
  trailerUrl: string;
  logoUrl: string;
  order: number;
  active: boolean;
}

interface PremiumHeroProps {
  onSelectAnime: (id: number) => void;
}

export default function PremiumHero({ onSelectAnime }: PremiumHeroProps) {
  const [trailers, setTrailers] = useState<HeroTrailer[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchTrailers = async () => {
      if (!db) return;
      try {
        const q = query(
          collection(db, "heroTrailers"),
          orderBy("order", "asc")
        );
        const snapshot = await getDocs(q);
        const data: HeroTrailer[] = [];
        snapshot.forEach((doc) => {
          const trailer = doc.data() as HeroTrailer;
          if (trailer.active) {
            data.push(trailer);
          }
        });
        if (mounted) {
          setTrailers(data);
        }
      } catch (err) {
        console.error("Failed to fetch hero trailers", err);
      }
    };
    fetchTrailers();
    return () => {
      mounted = false;
    };
  }, []);

  if (trailers.length === 0) return null;

  return (
    <div className="w-full relative -mt-[56px] mb-8 group/hero">
      <div className="absolute right-4 md:right-6 lg:right-10 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 md:gap-3 pointer-events-none opacity-100 transition-opacity duration-500">
        <button 
          onClick={() => {
            if (swiperInstance) {
              if (swiperInstance.isBeginning) swiperInstance.slideTo(trailers.length - 1);
              else swiperInstance.slidePrev();
            }
          }} 
          className="p-1 mb-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors pointer-events-auto shadow-sm shadow-black/20"
        >
          <ChevronUp size={18} />
        </button>
        
        {trailers.map((trailer, idx) => (
          <HeroNavDot 
            key={`dot-${trailer.malId}`} 
            isActive={activeSlideIndex === idx} 
            onClick={() => swiperInstance?.slideTo(idx)} 
          />
        ))}

        <button 
          onClick={() => {
            if (swiperInstance) {
              if (swiperInstance.isEnd) swiperInstance.slideTo(0);
              else swiperInstance.slideNext();
            }
          }} 
          className="p-1 mt-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors pointer-events-auto shadow-sm shadow-black/20"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      <Swiper
        modules={[EffectFade]}
        effect="fade"
        loop={false}
        onSwiper={setSwiperInstance}
        onSlideChange={(swiper) => setActiveSlideIndex(swiper.activeIndex)}
        className="w-full h-[60vh] md:h-[75vh] 2xl:h-[85vh] relative"
        allowTouchMove={true}
      >
        {trailers.map((trailer, idx) => {
          const isActiveSlide = activeSlideIndex === idx;

          return (
            <SwiperSlide key={`${trailer.malId}-${idx}`}>
              <HeroSlide 
                trailer={trailer} 
                isActive={isActiveSlide} 
                onSelect={() => onSelectAnime(trailer.malId)}
                onEnded={() => {
                  if (swiperInstance) {
                    if (swiperInstance.isEnd) {
                      swiperInstance.slideTo(0);
                    } else {
                      swiperInstance.slideNext();
                    }
                  }
                }}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}

function HeroSlide({ trailer, isActive, onSelect, onEnded }: { trailer: HeroTrailer; isActive: boolean; onSelect: () => void; onEnded: () => void; }) {
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [metadata, setMetadata] = useState<AniListAnime | null>(null);

  useEffect(() => {
    let mounted = true;
    if (trailer.malId) {
      fetchAnimeDetails(trailer.malId).then((data) => {
        if (mounted && data) setMetadata(data);
      });
    }
    return () => { mounted = false; };
  }, [trailer.malId]);

  useEffect(() => {
    let animationFrameId: number;
    const updateProgress = () => {
      if (videoRef.current && isActive) {
        const { currentTime, duration } = videoRef.current;
        if (duration > 0) {
          heroProgress.emit(currentTime / duration);
        }
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    if (!isActive && videoRef.current) {
      videoRef.current.pause();
      // Reset video time slightly later to avoid visual flash before slide fades out completely
      setTimeout(() => {
        if (videoRef.current) videoRef.current.currentTime = 0;
      }, 500);
      setVideoReady(false);
    } else if (isActive && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      updateProgress();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isActive]);

  const cleanDescription = metadata?.description?.replace(/<[^>]*>?/gm, '') || "";

  const handleSelectClick = (e: React.MouseEvent) => {
    if (!isActive) return;
    e.preventDefault();
    console.log(
      "Hero Click",
      trailer.title,
      trailer.malId,
      trailer.anilistId
    );
    onSelect();
  };

  return (
    <div 
      className={`w-full h-full relative cursor-pointer overflow-hidden bg-black isolation-auto transition-all duration-500 ${isActive ? 'pointer-events-auto opacity-100 z-10' : 'pointer-events-none opacity-0 z-0'}`}
      onClick={handleSelectClick}
    >
      {trailer.trailerUrl && (
        <img
          src={trailer.trailerUrl.replace('.mp4', '.jpg')}
          alt={trailer.title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1000ms] ${videoReady ? 'opacity-0' : 'opacity-100'}`}
          style={{ transform: "scale(1.08)" }}
        />
      )}

      <video
        ref={videoRef}
        src={trailer.trailerUrl}
        className={`absolute inset-0 w-full h-full object-cover transform scale-100 md:scale-[1.08] transition-opacity duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${videoReady ? 'opacity-100' : 'opacity-0'}`}
        muted
        playsInline
        onEnded={onEnded}
        preload={isActive ? "auto" : "metadata"}
        onCanPlay={() => { if (isActive) setVideoReady(true); }}
        onPlaying={() => setVideoReady(true)}
      />

      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.95) 100%), radial-gradient(circle at 75% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)"
        }}
      />
      
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/80 via-black/30 to-transparent w-full md:w-[70%]" />
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-12 pb-6 md:pb-12 lg:pb-14 pointer-events-none wrapper">
        <div className="max-w-7xl mx-auto w-full pointer-events-auto h-full flex flex-col justify-end">
          <div className="max-w-3xl lg:max-w-4xl flex flex-col items-start gap-3 transform transition-transform duration-700 hover:translate-y-[-4px]">
            {trailer.logoUrl ? (
              <img 
                src={trailer.logoUrl} 
                alt={trailer.title} 
                className="max-w-[60vw] sm:max-w-[320px] max-h-[110px] md:max-h-[140px] px-1 object-contain object-left drop-shadow-2xl brightness-110 mb-2" 
              />
            ) : (
              <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight font-sans drop-shadow leading-tight line-clamp-2 px-1 mb-2">
                {trailer.title}
              </h2>
            )}

            {metadata && (
              <div className="flex flex-col gap-3 px-1">
                <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-semibold text-white/90 drop-shadow-md tracking-widest uppercase">
                  {[
                    metadata.format,
                    metadata.status,
                    metadata.episodes ? `${metadata.episodes} EP` : null
                  ].filter(Boolean).join(' • ')}
                </div>

                {metadata.genres && metadata.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {metadata.genres.slice(0, 3).map(g => (
                      <span key={g} className="px-2.5 py-1 text-[10px] md:text-xs font-medium uppercase tracking-widest text-white/90 bg-white/10 backdrop-blur-md rounded-md border border-white/10 uppercase">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {cleanDescription && (
              <p className="text-white/80 max-w-2xl text-sm md:text-base line-clamp-2 lg:line-clamp-3 leading-relaxed drop-shadow-lg mix-blend-lighten px-1 mt-2">
                {cleanDescription}
              </p>
            )}

            <div className="flex items-center gap-4 mt-6 md:mt-8 px-1">
              <button 
                onClick={handleSelectClick}
                className="px-6 py-2.5 md:px-8 md:py-3 bg-white hover:bg-white/90 text-black font-extrabold rounded-md flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] shadow-black/20 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
              >
                <Play className="w-5 h-5 fill-black stroke-none" />
                <span className="tracking-wide text-sm md:text-base">Play Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
