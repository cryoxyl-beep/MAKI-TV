import { useState, useEffect } from "react";
import { fetchAnimeFeed } from "../services/anilist";
import { AniListAnime } from "../types";
import AnimeCard from "./AnimeCard";
import SkeletonLoader from "./SkeletonLoader";
import ShelfScroller from "./ShelfScroller";

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
    return <SkeletonLoader type="shelf" />;
  }

  if (animes.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 relative isolate mb-8 animate-fade-in">
      {/* Shelf Header */}
      <div className="px-4 md:px-6 flex flex-col">
        <h2 className="text-2xl font-bold text-[#f1f1f1] tracking-tight">{title}</h2>
        <p className="text-[13px] text-gray-400 font-medium mt-0.5">{subtitle}</p>
      </div>

      {/* Smart Scrolling Container with Navigation Arrows */}
      <ShelfScroller>
        {animes.map((anime, index) => (
          <div key={`${anime.id}-${index}`} className="snap-start shrink-0">
            <AnimeCard anime={anime} onClick={() => onSelectAnime(anime.id)} layout="grid" />
          </div>
        ))}
      </ShelfScroller>
    </div>
  );
}
