import { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Play } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/effect-fade";
import { fetchAnimeDetails } from "../services/anilist";
import { AniListAnime } from "../types";

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
    <div className="w-full relative -mt-[56px] mb-8">
      <Swiper
        modules={[EffectFade]}
        effect="fade"
        loop={false}
        onSwiper={setSwiperInstance}
        onSlideChange={(swiper) => setActiveSlideIndex(swiper.activeIndex)}
        className="w-full h-[60vh] md:h-[75vh] 2xl:h-[80vh] relative group"
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
    }
  }, [isActive]);

  const cleanDescription = metadata?.description?.replace(/<[^>]*>?/gm, '') || "";

  return (
    <div 
      className="w-full h-full relative cursor-pointer overflow-hidden bg-black isolation-auto"
      onClick={onSelect}
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
          background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.9) 100%), radial-gradient(circle at 75% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)"
        }}
      />

      <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-12 pb-12 md:pb-24 pointer-events-none wrapper">
        <div className="max-w-7xl mx-auto w-full pointer-events-auto h-full flex flex-col justify-end">
          <div className="max-w-2xl flex flex-col items-start gap-3 transform transition-transform duration-700 hover:translate-y-[-4px]">
            {trailer.logoUrl ? (
              <img 
                src={trailer.logoUrl} 
                alt={trailer.title} 
                className="max-w-[70vw] sm:max-w-[400px] max-h-[140px] md:max-h-[180px] object-contain object-left drop-shadow-2xl brightness-110 mb-2" 
              />
            ) : (
              <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight font-sans drop-shadow leading-tight line-clamp-2 mb-2">
                {trailer.title}
              </h2>
            )}

            {metadata && (
              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-semibold text-white/90 drop-shadow-md">
                {metadata.format && <span className="bg-white/10 px-2 py-1 rounded">{metadata.format}</span>}
                {metadata.episodes && <span className="bg-white/10 px-2 py-1 rounded">{metadata.episodes} Episodes</span>}
                {metadata.status && <span className="text-emerald-400 font-bold">{metadata.status}</span>}
                {metadata.genres && metadata.genres.length > 0 && (
                  <span className="hidden sm:inline-block pl-2 border-l border-white/30 text-white/70">
                    {metadata.genres.slice(0, 3).join(' • ')}
                  </span>
                )}
              </div>
            )}

            {cleanDescription && (
              <p className="text-white/80 max-w-xl text-sm md:text-base line-clamp-2 md:line-clamp-3 leading-relaxed drop-shadow-lg mix-blend-lighten">
                {cleanDescription}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3">
              <button 
                className="px-6 py-3 md:px-8 md:py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 border-t-white/40 border-l-white/30 text-white font-bold rounded-xl flex items-center gap-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Play className="w-5 h-5 fill-white stroke-none drop-shadow-md" />
                <span className="tracking-wide text-sm md:text-base drop-shadow-md">Play Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
