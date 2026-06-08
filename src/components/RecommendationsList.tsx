import React, { useEffect, useState } from 'react';
import LazyImage from "./LazyImage";

interface Recommendation {
  id: number;
  idMal?: number;
  title: {
    english: string | null;
    romaji: string | null;
    userPreferred: string | null;
  };
  coverImage: {
    large: string | null;
    medium: string | null;
  };
  bannerImage: string | null;
  format: string | null;
  season: string | null;
  seasonYear: number | null;
}

interface RecommendationsListProps {
  anilistId: number;
  onNavigateToChannel: (id: number) => void;
}

export default function RecommendationsList({ anilistId, onNavigateToChannel }: RecommendationsListProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchRecommendations() {
      setIsLoading(true);
      try {
        const query = `
          query ($id: Int) {
            Media(id: $id, type: ANIME) {
              recommendations(sort: RATING_DESC, perPage: 12) {
                nodes {
                  mediaRecommendation {
                    id
                    idMal
                    title {
                      english
                      romaji
                      userPreferred
                    }
                    coverImage {
                      large
                      medium
                    }
                    bannerImage
                    format
                    season
                    seasonYear
                  }
                }
              }
              relations {
                edges {
                  node {
                    id
                    idMal
                    title {
                      english
                      romaji
                      userPreferred
                    }
                    coverImage {
                      large
                      medium
                    }
                    bannerImage
                    format
                    season
                    seasonYear
                  }
                }
              }
            }
          }
        `;
        
        const response = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({ query, variables: { id: anilistId } })
        });
        
        const json = await response.json();
        if (!mounted) return;

        if (json.data && json.data.Media) {
          let recs: Recommendation[] = [];
          
          if (json.data.Media.recommendations?.nodes?.length > 0) {
            recs = json.data.Media.recommendations.nodes
              .map((n: any) => n.mediaRecommendation)
              .filter(Boolean);
          } else if (json.data.Media.relations?.edges?.length > 0) {
            recs = json.data.Media.relations.edges
              .map((e: any) => e.node)
              .filter(Boolean);
          }
          
          setRecommendations(recs);
        }
      } catch (err) {
        console.error("Failed to fetch recs", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    if (anilistId) {
      fetchRecommendations();
    }
    
    return () => { mounted = false; };
  }, [anilistId]);

  if (isLoading) {
    return (
      <div className="mt-8 flex flex-col gap-3 pb-24">
         <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
         {[1,2,3,4].map(i => (
           <div key={i} className="h-28 w-full bg-white/5 rounded-xl animate-pulse" />
         ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 mb-24 flex flex-col gap-3">
      <h3 className="text-white text-base font-bold font-sans tracking-tight">More Like This</h3>
      <div className="flex flex-col gap-3">
        {recommendations.map(anime => {
          const bgImage = anime.bannerImage || anime.coverImage.large || "";
          const posterImage = anime.coverImage.large || anime.coverImage.medium || "";
          const title = anime.title.english || anime.title.romaji || anime.title.userPreferred || "Unknown";
          const format = anime.format ? anime.format.replace(/_/g, " ") : "TV";
          
          return (
            <div 
              key={anime.id}
              onClick={() => onNavigateToChannel(anime.idMal || anime.id)}
              className="relative h-28 rounded-xl overflow-hidden cursor-pointer group shadow-md"
            >
              {/* Diffuse Banner Background */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-500 ease-out"
                style={{ backgroundImage: `url(${bgImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#121214] via-[#121214]/90 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#121214]/30 to-[#121214]/90" />

              {/* Content */}
              <div className="absolute inset-0 flex items-center p-2.5 gap-3">
                <div className="h-full w-16 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 relative z-10 shadow-lg">
                  <LazyImage src={posterImage} alt={title} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex flex-col justify-center min-w-0 pr-4 z-10">
                  <h4 className="text-sm font-bold text-white tracking-tight leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors">
                    {title}
                  </h4>
                  {(format || anime.season || anime.seasonYear) && (
                    <span className="text-[11px] font-semibold text-white/50 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-md border border-white/5 mt-1.5 inline-block w-fit uppercase tracking-wider">
                      {format} {anime.season ? `• ${anime.season}` : ""} {anime.seasonYear ? anime.seasonYear : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
