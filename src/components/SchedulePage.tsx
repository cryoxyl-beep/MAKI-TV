import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play, Calendar } from "lucide-react";
import LazyImage from "./LazyImage";
import { AniListAnime } from "../types";
import { fetchAnimeFeed } from "../services/anilist";
import { getAniListId } from "../services/fribb";

interface SchedulePageProps {
  onSelectAnime: (id: number) => void;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ScheduleAnime {
  mal_id: number;
  title: string;
  image: string;
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
  
  // If diff is negative but within 30 minutes, we consider it "Live" (assuming 30min episodes)
  if (diff <= 0 && diff >= -1800) {
    return { text: "LIVE NOW", state: "live" };
  } else if (diff < -1800) {
    // If it's more than 30 mins past, it means the API hasn't updated to next week. Let's just say it aired.
    return { text: "Aired", state: "normal" };
  }
  
  if (diff <= 1800) {
    return { text: `AIRS IN ${Math.floor(diff / 60)}m`, state: "soon" };
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
        setScheduleData(prev => ({ ...prev, [dayIndex]: JSON.parse(cached) }));
        setIsLoading(false);
        return;
      }

      const dayString = DAYS[dayIndex];
      const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${dayString}`);
      const json = await res.json();
      console.log("Jikan raw response:", json);
      console.log("Data length:", json.data?.length);
      console.log("First item:", json.data?.[0]);
      
      const animes: ScheduleAnime[] = [];
      const data = json.data || [];
      
      for (const item of data) {
        let broadcastTime = item.broadcast?.time;
        if (!broadcastTime || broadcastTime === "Unknown") {
          broadcastTime = "TBA";
        }
        
        const anilistId = getAniListId(item.mal_id) || null;
        
        animes.push({
          mal_id: item.mal_id,
          title: item.title_english || item.title,
          image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
          format: item.type || "TV",
          broadcastTimeJST: broadcastTime,
          airingAtUnix: broadcastTime !== "TBA" ? getNextAiringTimeUnix(broadcastTime, dayIndex) : Number.MAX_SAFE_INTEGER,
          anilistId
        });
      }
      
      // Sort by airing time
      animes.sort((a, b) => a.airingAtUnix - b.airingAtUnix);
      
      setScheduleData(prev => ({ ...prev, [dayIndex]: animes }));
      sessionStorage.setItem(cacheKey, JSON.stringify(animes));
    } catch (err) {
      console.error("Failed to fetch schedule", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDaySchedule(selectedDay);
    
    // Auto-refresh countdowns every minute
    const interval = setInterval(() => {
      setScheduleData(prev => ({...prev}));
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedDay]);

  const currentAnimes = scheduleData[selectedDay] || [];

  // Group animes by formatted local hour
  const groupedAnimes = useMemo(() => {
    const groups: { label: string, animes: ScheduleAnime[], timestamp: number }[] = [];
    currentAnimes.forEach(anime => {
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

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
  const activeDayLabel = FULL_DAY_LABELS[selectedDay];
  const isToday = (new Date().getDay() + 6) % 7 === selectedDay;

  return (
    <div className="w-full min-h-screen px-4 md:px-8 pt-6 pb-20 animate-fade-in relative z-10 max-w-[1440px] mx-auto">
      
      {/* 1. Header Section */}
      <div className="flex flex-col gap-1.5 mb-8">
        <h1 className="text-white text-3xl font-black tracking-tight flex items-center gap-3">
          <Calendar className="w-7 h-7 text-[#ff6b35]" />
          Anime Schedule
        </h1>
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className="text-white/90 bg-white/10 px-3 py-1 rounded-full shadow-sm">
            {isToday ? "Today" : activeDayLabel} &bull; {isToday ? todayStr : activeDayLabel}
          </span>
          {!isLoading && currentAnimes.length > 0 && (
            <span className="text-white/50">
              {currentAnimes.length} Episodes Airing {isToday ? "Today" : activeDayLabel}
            </span>
          )}
        </div>
      </div>

      {/* 2. Day Navigation */}
      <div className="sticky top-16 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.08] mb-8 pb-4 pt-2 -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="flex overflow-x-auto gap-2 md:gap-4 scrollbar-hide py-1 snap-x">
          {DAY_LABELS.map((label, index) => {
            const isActive = selectedDay === index;
            return (
              <button
                key={label}
                onClick={() => setSelectedDay(index)}
                className={`relative px-5 py-2.5 rounded-full text-sm font-bold transition-colors cursor-pointer snap-start whitespace-nowrap ${
                  isActive ? "text-white" : "text-white/60 hover:text-white/90 bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="scheduleDayIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-[#ff6b35] to-[#ffa585] rounded-full shadow-[0_4px_12px_rgba(255,107,53,0.3)] -z-10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 & 4. Time Grouping & Schedule Cards */}
      <div className="flex flex-col gap-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] relative overflow-hidden">
                <div className="w-[100px] aspect-[2/3] rounded-xl shimmer-bone shrink-0" />
                <div className="flex flex-col justify-center gap-3 flex-1 px-2">
                  <div className="h-5 shimmer-bone rounded w-3/4" />
                  <div className="h-4 shimmer-bone rounded w-1/2" />
                  <div className="h-6 shimmer-bone rounded-full w-24 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedAnimes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-white/40">
            <Calendar className="w-12 h-12 mb-4 opacity-50" />
            <p>No anime airing on this day.</p>
          </div>
        ) : (
          groupedAnimes.map((group, groupIndex) => (
            <div key={group.label} className="flex flex-col gap-5">
              
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-white/[0.08]" />
                <span className="text-white/80 font-bold tracking-widest text-sm bg-white/5 py-1 px-4 rounded-full border border-white/10">
                  {group.label}
                </span>
                <div className="h-[1px] flex-1 bg-white/[0.08]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 group/row">
                {group.animes.map((anime, index) => {
                  const countdown = formatCountdown(anime.airingAtUnix);
                  
                  return (
                    <div
                      key={anime.mal_id}
                      onClick={() => {
                        onSelectAnime(anime.mal_id);
                      }}
                      className={`group/card relative flex gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1 sm:group-hover/row:opacity-50 sm:hover:!opacity-100 animate-fade-in`}
                      style={{ animationDelay: `${(index % 10) * 50}ms`, animationFillMode: "both" }}
                    >
                      {/* Poster */}
                      <div className="relative w-[90px] md:w-[100px] aspect-[2/3] rounded-xl overflow-hidden shadow-md shrink-0 bg-black/50">
                        <LazyImage
                          src={anime.image}
                          alt={anime.title}
                          className="w-full h-full object-cover transform scale-100 group-hover/card:scale-[1.04] transition-transform duration-300 ease-out"
                        />
                        <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] pointer-events-none rounded-xl border border-white/[0.05]" />
                      </div>

                      {/* Details */}
                      <div className="flex flex-col flex-1 py-1 pr-2 min-w-0">
                        <h3 className="text-white font-bold text-sm md:text-base leading-tight line-clamp-2 mb-1 group-hover/card:text-[#ff6b35] transition-colors duration-300">
                          {anime.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-white/50 text-xs font-semibold mb-auto">
                          <span className="bg-white/[0.08] px-1.5 py-0.5 rounded text-[10px] tracking-wider relative overflow-hidden transition-all duration-300 group-hover/card:bg-white/[0.12] group-hover/card:text-white/80 opacity-80 group-hover/card:opacity-100 transform group-hover/card:-translate-y-[2px]">
                            {anime.format}
                          </span>
                        </div>

                        {/* Metadata Bottom cluster */}
                        <div className="flex flex-col mt-3 gap-1.5 transform translate-y-2 group-hover/card:-translate-y-[4px] opacity-80 group-hover/card:opacity-100 transition-all duration-300 ease-out">
                          
                          {/* Countdown Badge */}
                          <div className={`self-start px-2.5 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 border shadow-sm transition-transform duration-300 group-hover/card:scale-[1.05] ${
                            countdown.state === "live" 
                              ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
                              : countdown.state === "soon"
                                ? "bg-[#ff6b35]/20 text-[#ff6b35] border-[#ff6b35]/30"
                                : "bg-white/[0.06] text-white/80 border-white/[0.1]"
                          }`}>
                            <Clock className={`w-3.5 h-3.5 ${countdown.state === "live" ? "animate-spin-slow" : ""}`} />
                            {countdown.text}
                          </div>

                          <span className="text-white/40 text-[11px] font-medium tracking-wide translate-x-1">
                            {group.label}
                          </span>
                          
                        </div>
                      </div>

                      {/* Premium Glow effect on hover */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/[0.04] to-white/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
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
