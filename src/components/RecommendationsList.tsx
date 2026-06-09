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
    color: string | null;
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

export default function RecommendationsList({ anilistId, onNavigateToChannel, limit }: RecommendationsListProps & { limit?: number }) {
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
                      color
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
                      color
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
          
          if (limit) {
            recs = recs.slice(0, limit);
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
    <div className="mt-8 mb-24 flex flex-col gap-4">
      <h3 className="text-white text-xl font-bold font-sans tracking-tight">More like this</h3>
      <div className="flex flex-col gap-3">
        {recommendations.map(anime => {
          const bgImage = anime.bannerImage || anime.coverImage.large || "";
          const posterImage = anime.coverImage.large || anime.coverImage.medium || "";
          const title = anime.title.english || anime.title.romaji || anime.title.userPreferred || "Unknown";
          const format = anime.format ? anime.format.replace(/_/g, " ") : "TV";
          
          // Capture the dynamic color from AniList; default to soft white/silver if none is set
          const accentColor = anime.coverImage.color || "#ffffff";
          
          return (
            <div 
              key={anime.id}
              onClick={() => onNavigateToChannel(anime.idMal || anime.id)}
              className="relative h-[100px] rounded-xl overflow-hidden cursor-pointer bg-[#121214] border border-white/5 hover:border-white/10 transition-all duration-150 hover:scale-[1.015] hover:brightness-110 active:scale-[0.98] group select-none shadow-md transform-gpu z-0"
              style={{ "--hover-color": accentColor } as React.CSSProperties}
            >
              {/* Sharp and crisp unblurred background banner on the right side */}
              {bgImage && (
                <div 
                  className="absolute right-0 top-0 bottom-0 w-[55%] bg-cover bg-center pointer-events-none transition-transform duration-150 ease-out group-hover:scale-[1.03]"
                  style={{ 
                    backgroundImage: `url(${bgImage})`,
                    opacity: 0.65,
                  }}
                />
              )}

              {/* A sharp solid mask for high text readability on the left side */}
              <div className="absolute inset-y-0 left-0 right-[40%] pointer-events-none bg-[#121214] z-1" />
              <div className="absolute inset-y-0 left-[60%] w-[15%] pointer-events-none bg-gradient-to-r from-[#121214] to-transparent z-1" />

              {/* Interactive Content */}
              <div className="absolute inset-0 flex items-center p-3 gap-4 z-10">
                <div className="h-full w-[60px] flex-shrink-0 rounded-md overflow-hidden bg-black/40 relative z-10 transition-transform duration-150 ease-out group-hover:scale-105 shadow-lg shadow-black/40">
                  <LazyImage src={posterImage} alt={title} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex flex-col justify-center min-w-0 pr-4 z-10 flex-1">
                  <h4 className="text-[15px] font-bold text-white tracking-tight leading-tight line-clamp-2 transition-colors duration-150 group-hover:text-[var(--hover-color)]">
                    {title}
                  </h4>
                  {(format || anime.season || anime.seasonYear) && (
                    <span className="text-[12px] font-medium text-white/50 mt-1 uppercase tracking-widest">
                      {format} {anime.season ? ` ${anime.season}` : ""} {anime.seasonYear ? anime.seasonYear : ""}
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
