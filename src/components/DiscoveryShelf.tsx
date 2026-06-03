import { useState, useEffect } from "react";
import { fetchAnimeFeed } from "../services/anilist";
import { AniListAnime } from "../types";
import AnimeCard from "./AnimeCard";
import SkeletonLoader from "./SkeletonLoader";

interface DiscoveryShelfProps {
  title: string;
  subtitle: string;
  category: string;
  onSelectAnime: (id: number) => void;
}

export default function DiscoveryShelf({ title, subtitle, category, onSelectAnime }: DiscoveryShelfProps) {
  const [animes, setAnimes] = useState<AniListAnime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await fetchAnimeFeed(category, undefined, 1);
        if (mounted) {
          setAnimes(data.slice(0, 15)); // Take top 15 for shelf
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [category]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 relative isolate mb-8">
        <div className="px-4 md:px-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
        <div className="px-4 md:px-6 overflow-hidden">
             <SkeletonLoader type="grid" />
        </div>
      </div>
    );
  }

  if (animes.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 relative isolate mb-8 group/shelf">
      {/* Shelf Header */}
      <div className="px-4 md:px-6 flex flex-col">
        <h2 className="text-2xl font-bold text-[#f1f1f1] tracking-tight">{title}</h2>
        <p className="text-[13px] text-gray-400 font-medium mt-0.5">{subtitle}</p>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="flex overflow-x-auto gap-5 px-4 md:px-6 scroll-px-4 md:scroll-px-6 pb-6 pt-2 snap-x snap-mandatory scroll-smooth" style={{ scrollbarWidth: "none" }}>
        {animes.map((anime, index) => (
          <div key={`${anime.id}-${index}`} className="snap-start shrink-0">
            <AnimeCard anime={anime} onClick={() => onSelectAnime(anime.id)} layout="grid" />
          </div>
        ))}
      </div>
    </div>
  );
}
