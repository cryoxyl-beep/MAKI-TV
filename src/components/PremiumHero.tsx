import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy, updateDoc, doc } from "firebase/firestore";

const HERO_BANNERS: Record<string, string> = {
  "Chainsaw Man Reze Arc": "https://res.cloudinary.com/dgymbeaxk/image/upload/v1780651845/68fb908b62946_t6p1op.jpg",
  "Blue Box": "https://res.cloudinary.com/dgymbeaxk/image/upload/v1780653215/66dc0cea17539_r3c2xn.jpg",
  "Witch Hat Atelier": "https://res.cloudinary.com/dgymbeaxk/image/upload/v1781279218/69d425be0eaf9_mrvkhi.jpg",
  "Re:Zero Season 4": "https://res.cloudinary.com/dgymbeaxk/image/upload/v1780652972/66fc81bc5bbfe_fn7ypm.jpg",
  "That Time I Got Reincarnated as a Slime Season 4": "https://res.cloudinary.com/dgymbeaxk/image/upload/v1781279286/60be23b659daf_nlezah.jpg",
  "The Fragrant Flower Blooms With Dignity": "https://res.cloudinary.com/dgymbeaxk/image/upload/v1780653267/6869550eddf14_hpy73y.jpg"
};
import { db } from "../lib/firebase";
import { Play, Bookmark, Check } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/effect-fade";
import { fetchAnimeDetails } from "../services/anilist";
import { AniListAnime } from "../types";
import { useLibrary } from "../hooks/useLibrary";

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
  heroBanner?: string;
}

interface PremiumHeroProps {
  onSelectAnime: (id: number) => void;
  onHeroLoad?: () => void;
}

export default function PremiumHero({ onSelectAnime, onHeroLoad }: PremiumHeroProps) {
  const [trailers, setTrailers] = useState<HeroTrailer[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  useEffect(() => {
    if (trailers.length > 0 && trailers[activeSlideIndex]) {
      const activeHero = trailers[activeSlideIndex];
      console.log(
        "Active Hero",
        activeHero.title,
        activeHero.malId,
        activeHero.anilistId,
        activeSlideIndex
      );
    }
  }, [activeSlideIndex, trailers]);

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
        snapshot.forEach((docSnap) => {
          const trailer = docSnap.data() as HeroTrailer;
          
          // One-off migration logic to add heroBanner to Firestore docs gracefully
          if (trailer.title && HERO_BANNERS[trailer.title] && trailer.heroBanner !== HERO_BANNERS[trailer.title]) {
            updateDoc(docSnap.ref, { heroBanner: HERO_BANNERS[trailer.title] }).catch(() => {});
            trailer.heroBanner = HERO_BANNERS[trailer.title];
          }

          if (trailer.active) {
            data.push(trailer);
          }
        });
        if (mounted) {
          setTrailers(data);
          if (data.length === 0) {
            onHeroLoad?.();
          }
        }
      } catch (err) {
        console.error("Failed to fetch hero trailers", err);
        if (mounted) onHeroLoad?.();
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
        {trailers.map((trailer, idx) => (
          <HeroNavDot 
            key={`dot-${trailer.malId}`} 
            isActive={activeSlideIndex === idx} 
            onClick={() => swiperInstance?.slideTo(idx)} 
          />
        ))}
      </div>

      <Swiper
        modules={[EffectFade]}
        effect="fade"
        loop={false}
        onSwiper={setSwiperInstance}
        onSlideChange={(swiper) => setActiveSlideIndex(swiper.activeIndex)}
        className="w-full h-[55vh] md:h-[60vh] lg:h-[65vh] relative min-h-[400px]"
        allowTouchMove={true}
      >
        {trailers.map((trailer, idx) => {
          const isActiveSlide = activeSlideIndex === idx;

          return (
            <SwiperSlide key={`${trailer.malId}-${idx}`}>
              <HeroSlide 
                trailer={trailer} 
                isActive={isActiveSlide} 
                isFirstSlide={idx === 0}
                onSelect={() => onSelectAnime(trailer.malId)}
                onHeroLoad={idx === 0 ? onHeroLoad : undefined}
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

let isAppInitialLoadCompleted = false;

function HeroSlide({ trailer, isActive, isFirstSlide, onSelect, onEnded, onHeroLoad }: { trailer: HeroTrailer; isActive: boolean; isFirstSlide?: boolean; onSelect: () => void; onEnded: () => void; onHeroLoad?: () => void; }) {
  const [videoReady, setVideoReady] = useState(false);
  const [useBanner, setUseBanner] = useState(() => isFirstSlide && !isAppInitialLoadCompleted);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [metadata, setMetadata] = useState<AniListAnime | null>(null);
  const { isSubscribed, toggleSubscription, currentUser } = useLibrary();

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

  const handleVideoReady = () => {
    if (isActive) {
      setVideoReady(true);
      onHeroLoad?.();
      if (useBanner) {
        isAppInitialLoadCompleted = true;
        // Turn off the banner fully after the 400ms CSS fade-out completes
        setTimeout(() => setUseBanner(false), 500);
      }
    }
  };

  const cleanDescription = metadata?.description?.replace(/<[^>]*>?/gm, '') || "";

  const handleSelectClick = (e: React.MouseEvent) => {
    if (!isActive) return;
    e.preventDefault();
    onSelect();
  };

  const handleLibraryToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      alert("Please sign in to add to your library.");
      return;
    }
    if (metadata) { 
      await toggleSubscription(metadata);
    } else {
      await toggleSubscription({
        id: trailer.malId,
        title: { userPreferred: trailer.title },
        coverImage: { large: trailer.logoUrl || "", medium: trailer.logoUrl || "" },
        genres: [],
      } as any);
    }
  };

  const subscribed = isSubscribed(trailer.malId);

  return (
    <div 
      className={`w-full h-full relative overflow-hidden bg-[#09090b] isolation-auto transition-all duration-500 ${isActive ? 'pointer-events-auto opacity-100 z-10' : 'pointer-events-none opacity-0 z-0'}`}
    >
      {useBanner && (
        <img
          src={trailer.heroBanner || trailer.trailerUrl.replace('.mp4', '.jpg')}
          alt={trailer.title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[400ms] ease-in-out ${videoReady ? 'opacity-0' : 'opacity-100'}`}
          style={{ transform: "scale(1.08)" }}
          loading="eager"
          onLoad={() => onHeroLoad?.()}
          onError={() => onHeroLoad?.()} // Fallback just in case
        />
      )}

      <video
        ref={videoRef}
        src={trailer.trailerUrl}
        className={`absolute inset-0 w-full h-full object-cover transform scale-100 md:scale-[1.08] transition-opacity duration-[400ms] ease-in-out ${useBanner ? (videoReady ? 'opacity-100' : 'opacity-0') : 'opacity-100'}`}
        muted
        playsInline
        onEnded={onEnded}
        preload={isActive ? "auto" : "metadata"}
        onLoadedData={handleVideoReady}
        onCanPlay={handleVideoReady}
        onPlaying={() => setVideoReady(true)}
      />

      {/* Layer 3: Background vignette - subtle edge darkening */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/40" />

      {/* Layer 1: Left-side text readability gradient */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/90 via-black/40 to-transparent w-full md:w-[65%]" />

      {/* Layer 2: Bottom fade into homepage background */}
      <div className="absolute inset-0 pointer-events-none z-10 top-auto h-2/3 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />

      <div className="absolute inset-0 z-20 flex flex-col justify-end px-6 md:px-10 lg:px-14 py-8 lg:py-12 pb-6 md:pb-10 lg:pb-10 pointer-events-none wrapper">
        <div className={`w-full h-full flex flex-col justify-end ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <div className="max-w-3xl lg:max-w-4xl flex flex-col items-start gap-2 transform transition-transform duration-700 hover:translate-y-[-4px]">
            {trailer.logoUrl ? (
              <img 
                src={trailer.logoUrl} 
                alt={trailer.title} 
                className="max-w-[55vw] sm:max-w-[280px] md:max-w-[320px] max-h-[90px] md:max-h-[120px] px-1 object-contain object-left drop-shadow-2xl brightness-110 mb-1" 
              />
            ) : (
              <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight font-sans drop-shadow leading-tight line-clamp-2 px-1 mb-2">
                {trailer.title}
              </h2>
            )}

            {metadata && (
              <div className="flex flex-col gap-2 px-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-sm font-semibold text-white/90 drop-shadow-md tracking-widest uppercase">
                  {[
                    metadata.format,
                    metadata.status,
                    metadata.episodes ? `${metadata.episodes} EP` : null
                  ].filter(Boolean).join(' • ')}
                </div>

                {metadata.genres && metadata.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {metadata.genres.slice(0, 3).map(g => (
                      <span key={g} className="px-2.5 py-1 text-[10px] md:text-xs font-medium uppercase tracking-widest text-white/90 bg-white/10 backdrop-blur-md rounded-md border border-white/10">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {cleanDescription && (
              <p className="text-white/80 max-w-2xl text-[13px] md:text-sm line-clamp-2 lg:line-clamp-3 leading-relaxed drop-shadow-lg mix-blend-lighten px-1 mt-1">
                {cleanDescription}
              </p>
            )}

            <div className={`flex items-center gap-3 mt-3 md:mt-5 px-1 ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
              <button 
                onClick={handleSelectClick}
                disabled={!isActive}
                className={`px-6 py-2.5 md:px-8 md:py-3 bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-[20px] border border-white/[0.15] text-white font-bold rounded-md flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 group ${isActive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
              >
                <Play className="w-5 h-5 fill-white stroke-none group-hover:scale-105 transition-transform" />
                <span className="tracking-wide text-sm md:text-base">Play Now</span>
              </button>

              <button 
                onClick={handleLibraryToggle}
                disabled={!isActive}
                className={`px-6 py-2.5 md:px-8 md:py-3 bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-[20px] border ${subscribed ? 'border-white/[0.4]' : 'border-white/[0.15]'} text-white font-bold rounded-md flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 group ${isActive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
              >
                <Bookmark className={`w-5 h-5 transition-transform group-hover:scale-105 ${subscribed ? 'fill-white text-white' : 'text-white'}`} />
                <span className="tracking-wide text-sm md:text-base">{subscribed ? 'In Library' : 'Add to Library'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
