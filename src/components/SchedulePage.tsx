import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import LazyImage from "./LazyImage";
import { fetchAnimeFeed, fetchAniList } from "../services/anilist";
import { getAniListId } from "../services/fribb";

interface SchedulePageProps {
  onSelectAnime: (id: number) => void;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const FULL_DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ScheduleAnime {
  mal_id: number;
  title: string;
  image: string;
  bannerImage?: string;
  format: string;
  broadcastTimeJST: string; // "00:00"
  airingAtUnix: number; // calculated locally
  episode?: number;
  anilistId: number | null;
}

// Convert JST time "HH:mm" on a given day to local Unix Timestamp for the NEXT occurrence
function getNextAiringTimeUnix(jstTime: string, targetDayIndex: number): number {
  if (!jstTime || jstTime === "TBA") return Number.MAX_SAFE_INTEGER;
  const [hours, minutes] = jstTime.split(":").map(Number);
  const now = new Date();
  const nowJst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const currentJstDay = (nowJst.getDay() + 6) % 7;
  let daysDiff = targetDayIndex - currentJstDay;
  if (daysDiff < 0 || (daysDiff === 0 && (nowJst.getHours() > hours || (nowJst.getHours() === hours && nowJst.getMinutes() >= minutes)))) {
    daysDiff += 7;
  }
  const targetJst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  targetJst.setDate(targetJst.getDate() + daysDiff);
  targetJst.setHours(hours, minutes, 0, 0);
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const utcMs = targetJst.getTime() - jstOffsetMs;
  return Math.floor(utcMs / 1000);
}

function formatCountdown(targetUnix: number): { text: string; state: "live" | "soon" | "normal" } {
  if (targetUnix === Number.MAX_SAFE_INTEGER) {
    return { text: "TBA", state: "normal" };
  }

  const now = Math.floor(Date.now() / 1000);
  let diff = targetUnix - now;
  
  if (diff <= 0 && diff >= -1800) {
    return { text: "LIVE NOW", state: "live" };
  } else if (diff < -1800) {
    return { text: "Aired", state: "normal" };
  }
  
  if (diff <= 1800) {
    return { text: `Airs in ${Math.floor(diff / 60)}m`, state: "soon" };
  }
  
  const days = Math.floor(diff / 86400);
  diff %= 86400;
  const hours = Math.floor(diff / 3600);
  diff %= 3600;
  const minutes = Math.floor(diff / 60);
  
  if (days > 0) {
    return { text: `Airs in ${days}d ${hours}h`, state: "normal" };
  }
  if (hours > 0) {
    return { text: `Airs in ${hours}h ${minutes}m`, state: "normal" };
  }
  return { text: `Airs in ${minutes}m`, state: "normal" };
}

export default function SchedulePage({ onSelectAnime }: SchedulePageProps) {
  const [selectedDay, setSelectedDay] = useState<number>(() => (new Date().getDay() + 6) % 7);
  const [scheduleData, setScheduleData] = useState<Record<number, ScheduleAnime[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchDaySchedule = async (dayIndex: number) => {
    if (scheduleData[dayIndex] && scheduleData[dayIndex].length > 0) return;
    
    setIsLoading(true);
    try {
      const cacheKey = `jikan_schedule_${dayIndex}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0) {
          setScheduleData(prev => ({ ...prev, [dayIndex]: parsed }));
          setIsLoading(false);
          return;
        }
      }

      const dayString = DAYS[dayIndex];
      const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${dayString}`);
      let json = await res.json();
      if (!res.ok || json.error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retry = await fetch(`https://api.jikan.moe/v4/schedules?filter=${dayString}`);
        const retryJson = await retry.json();
        if (retryJson.error) throw new Error(retryJson.error);
        json = retryJson;
      }
      
      const initAnimes: ScheduleAnime[] = [];
      const data = json.data || [];
      const seenIds = new Set<number>();
      
      const malIdsToFetch: number[] = [];

      for (const item of data) {
        if (seenIds.has(item.mal_id)) continue;
        seenIds.add(item.mal_id);
        
        let broadcastTime = item.broadcast?.time;
        if (!broadcastTime || broadcastTime === "Unknown") {
          broadcastTime = "TBA";
        }
        
        const anilistId = getAniListId(item.mal_id) || null;
        malIdsToFetch.push(item.mal_id);
        
        initAnimes.push({
          mal_id: item.mal_id,
          title: item.title_english || item.title,
          image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
          format: item.type || "TV",
          broadcastTimeJST: broadcastTime,
          airingAtUnix: broadcastTime !== "TBA" ? getNextAiringTimeUnix(broadcastTime, dayIndex) : Number.MAX_SAFE_INTEGER,
          anilistId
        });
      }

      // Batch fetch from AniList to overwrite Jikan images with AniList ones & get banners
      if (malIdsToFetch.length > 0) {
        try {
          const query = `
            query ($idMal_in: [Int]) {
              Page(page: 1, perPage: 50) {
                media(idMal_in: $idMal_in, type: ANIME) {
                  idMal
                  bannerImage
                  coverImage {
                    extraLarge
                    large
                  }
                }
              }
            }
          `;
          const aniData = await fetchAniList(query, { idMal_in: malIdsToFetch });
          if (aniData?.Page?.media) {
            const mediaMap = new Map();
            aniData.Page.media.forEach((m: any) => mediaMap.set(m.idMal, m));
            
            initAnimes.forEach(anime => {
               const aniItem = mediaMap.get(anime.mal_id);
               if (aniItem) {
                 if (aniItem.coverImage?.extraLarge || aniItem.coverImage?.large) {
                   anime.image = aniItem.coverImage.extraLarge || aniItem.coverImage.large;
                 }
                 if (aniItem.bannerImage) {
                   anime.bannerImage = aniItem.bannerImage;
                 }
               }
            });
          }
        } catch(e) {
        }
      }
      
      initAnimes.sort((a, b) => a.airingAtUnix - b.airingAtUnix);
      
      setScheduleData(prev => ({ ...prev, [dayIndex]: initAnimes }));
      if (initAnimes.length > 0) {
        sessionStorage.setItem(cacheKey, JSON.stringify(initAnimes));
      }
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDaySchedule(selectedDay);
    
    const interval = setInterval(() => {
      setScheduleData(prev => ({...prev}));
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedDay]);

  const currentAnimes = scheduleData[selectedDay] || [];

  const groupedAnimes = useMemo(() => {
    const groups: { label: string, animes: ScheduleAnime[], timestamp: number }[] = [];
    const seenIds = new Set<number>();
    
    currentAnimes.forEach(anime => {
      if (seenIds.has(anime.mal_id)) return;
      seenIds.add(anime.mal_id);
      
      let label = "TBA";
      if (anime.broadcastTimeJST !== "TBA") {
        const dbDate = new Date(anime.airingAtUnix * 1000);
        label = dbDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      let group = groups.find(g => g.label === label);
      if (!group) {
        group = { label, animes: [], timestamp: anime.airingAtUnix };
        groups.push(group);
      }
      group.animes.push(anime);
    });
    return groups.sort((a, b) => a.timestamp - b.timestamp);
  }, [currentAnimes]);

  const todayStr = new Date().toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
  const activeDayLabel = FULL_DAY_LABELS[selectedDay];
  const isToday = (new Date().getDay() + 6) % 7 === selectedDay;

  return (
    <div className="w-full min-h-screen px-4 md:px-8 pt-6 pb-20 animate-fade-in relative z-10 max-w-[1600px] mx-auto">
      
      {/* Header & Navigation */}
      <div className="mb-8 md:mb-10 text-center">
        <div className="flex flex-col gap-2 items-center">
          <div className="flex items-baseline gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-2 mask-linear-fade w-full justify-center">
            {FULL_DAY_LABELS.map((label, index) => {
              const isActive = selectedDay === index;
              return (
                <div key={label} className="flex items-center gap-2 md:gap-3 shrink-0">
                  <button
                    onClick={() => setSelectedDay(index)}
                    className={`text-3xl md:text-[40px] font-bold tracking-tight transition-all duration-200 ${
                      isActive ? "text-white" : "text-white/20 hover:text-white/40"
                    }`}
                  >
                    {label}
                  </button>
                  {index < FULL_DAY_LABELS.length - 1 && (
                    <span className="text-white/10 text-3xl md:text-[40px] font-bold pointer-events-none">/</span>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="text-white/40 text-sm md:text-sm font-medium h-6 flex items-center gap-2">
            <span className={isToday ? "text-white/80" : ""}>{activeDayLabel}</span>
            {isToday && <span>• {todayStr}</span>}
            {!isLoading && currentAnimes.length > 0 && <span>• {currentAnimes.length} Episodes Airing {isToday ? "Today" : "This Day"}</span>}
          </div>
        </div>
      </div>

      {/* Timeline Layout */}
      <div className="flex flex-col gap-6 md:gap-8">
        {isLoading ? (
          <div className="flex flex-col md:flex-row gap-3 md:gap-8">
            <div className="opacity-0 md:opacity-100 md:w-32 shrink-0 pt-2 flex items-center gap-2 text-white/20 font-bold">
              <span>{'>'}</span> <span className="w-16 h-4 bg-white/5 rounded block"></span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[72px] bg-[#121214] border border-white/[0.05] rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : groupedAnimes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-white/30 border border-white/5 rounded-xl bg-[#09090b]">
            <Calendar className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No anime scheduled for this day.</p>
          </div>
        ) : (
          groupedAnimes.map((group) => (
            <div key={group.label} className="flex flex-col md:flex-row gap-2 md:gap-8 relative">
              
              {/* Timeline Time Rail */}
              <div className="md:w-32 shrink-0 pt-0 md:pt-1.5 flex items-center md:items-start gap-2 text-white/80 font-bold text-sm md:text-[15px]">
                <span className="text-white/30 font-black">{'>'}</span> {group.label}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 flex-1">
                {group.animes.map((anime, index) => {
                  const countdown = formatCountdown(anime.airingAtUnix);
                  
                  return (
                    <motion.div
                      key={anime.mal_id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(index * 0.05, 0.3) }}
                      onClick={() => onSelectAnime(anime.mal_id)}
                      className="group relative flex gap-3 p-1.5 bg-[#121214] hover:bg-[#1a1a1d] border border-white/[0.05] hover:border-white/[0.12] transition-colors duration-200 cursor-pointer overflow-hidden rounded-lg hover:-translate-y-[1px]"
                    >
                      {/* Faded right-aligned background */}
                      <div className="absolute right-0 top-0 bottom-0 w-2/3 pointer-events-none opacity-[0.15] group-hover:opacity-[0.3] transition-opacity duration-300">
                        <LazyImage 
                          src={anime.bannerImage || anime.image} 
                          alt="" 
                          className="w-full h-full object-cover [mask-image:linear-gradient(to_right,transparent,black)] grayscale group-hover:grayscale-0 transition-all duration-300" 
                        />
                      </div>

                      {/* Compact Poster */}
                      <div className="relative w-[52px] md:w-[60px] aspect-[4/5] shrink-0 overflow-hidden rounded border border-white/[0.05] z-10 bg-black/50">
                        <LazyImage
                          src={anime.image}
                          alt={anime.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex flex-col flex-1 py-0.5 justify-between min-w-0 pr-2 z-10">
                        <h3 className="text-white/90 font-medium text-[13px] md:text-sm leading-snug line-clamp-2 group-hover:text-white transition-colors">
                          {anime.title}
                        </h3>

                        <div className="flex items-center justify-between mt-1 mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/10 text-white/80 rounded-sm leading-none">
                              {anime.format}
                            </span>
                            {countdown.state === 'live' && (
                              <span className="text-[10px] font-bold text-red-400 uppercase leading-none">
                                Live Now
                              </span>
                            )}
                            {countdown.state === 'soon' && (
                              <span className="text-[10px] font-medium text-[#ff6b35] leading-none">
                                {countdown.text}
                              </span>
                            )}
                            {countdown.state === 'normal' && countdown.text !== 'Aired' && countdown.text !== 'TBA' && (
                              <span className="text-[10px] font-medium text-white/40 leading-none">
                                {countdown.text}
                              </span>
                            )}
                          </div>
                          
                          <span className="text-[10px] font-bold text-white/50 bg-black/40 px-1.5 py-0.5 rounded leading-none shrink-0 border border-white/[0.05]">
                            {anime.broadcastTimeJST !== "TBA" ? (
                              new Date(anime.airingAtUnix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            ) : 'TBA'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

