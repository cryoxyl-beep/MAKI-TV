import LazyImage from "../components/LazyImage";
import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useParams, useNavigate } from "react-router-dom";
import { 
  subscribeToTitle, subscribeToMembers, submitRating, subscribeToEpisodes,
  BoxdMember, BoxdTitle, BoxdEpisode 
} from "../services/boxd";
import { getTVDetails, getTVSeasonDetails, TMDBTVDetails, TMDBSeasonDetails } from "../services/tmdb";
import { fetchAnimeDetails, fetchAllJikanEpisodes } from "../services/anilist";
import { ArrowLeft, Loader2, Star, ChevronDown } from "lucide-react";

export default function BoxdTitleView({ user }: { user: User }) {
  const { groupId, titleId } = useParams<{ groupId: string, titleId: string }>();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState<BoxdTitle | null>(null);
  const [members, setMembers] = useState<BoxdMember[]>([]);
  const [boxdEpisodes, setBoxdEpisodes] = useState<BoxdEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [userRating, setUserRating] = useState<number>(0);
  const [userReview, setUserReview] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TV / Anime detailed data
  const [tvDetails, setTvDetails] = useState<TMDBTVDetails | null>(null);
  const [tvSeasons, setTvSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [displayEpisodes, setDisplayEpisodes] = useState<any[]>([]);

  // Expand Episode Rating
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null);
  const [epRating, setEpRating] = useState<number>(0);
  const [epReview, setEpReview] = useState("");
  const [epHoverRating, setEpHoverRating] = useState(0);
  const [isSubmittingEp, setIsSubmittingEp] = useState(false);

  useEffect(() => {
    if (!groupId || !titleId) return;
    
    let u1 = subscribeToTitle(groupId, titleId, (t) => {
      setTitle(t);
      setLoading(false);
      
      if (t) {
        const myRating = t.ratingsByUser?.[user.uid];
        if (myRating) {
          setUserRating(myRating.rating);
          setUserReview(myRating.review || "");
        } else {
          setUserRating(0);
          setUserReview("");
        }
      }
    });
    
    let u2 = subscribeToMembers(groupId, setMembers);
    let u3 = subscribeToEpisodes(groupId, titleId, setBoxdEpisodes);
    
    return () => { u1(); u2(); u3(); };
  }, [groupId, titleId, user.uid]);

  // Fetch external details for seasons/episodes
  useEffect(() => {
    if (!title || (title.type !== 'tv' && title.type !== 'anime')) return;
    
    const fetchDetails = async () => {
      if (title.type === 'tv') {
        try {
          const details = await getTVDetails(Number(title.externalId));
          setTvDetails(details);
          if (details.seasons && details.seasons.length > 0) {
            // Filter out season 0 (Specials) if preferred, but let's keep all
            const validSeasons = details.seasons.filter(s => s.season_number > 0);
            if (validSeasons.length > 0) {
              setTvSeasons(validSeasons);
              setSelectedSeason(validSeasons[0].season_number);
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else if (title.type === 'anime') {
        try {
          // fetchAnimeDetails uses Jikan which returns pages of episodes, we can use fetchAllJikanEpisodes
          setEpisodesLoading(true);
          const allEps = await fetchAllJikanEpisodes(Number(title.externalId));
          if (allEps && allEps.length > 0) {
            // Group by 25 episodes to mimic seasons if they don't have seasons natively
            const chunks = [];
            for (let i = 0; i < allEps.length; i += 25) {
              chunks.push(allEps.slice(i, i + 25));
            }
            const fakeSeasons = chunks.map((chunk, idx) => ({
              season_number: idx + 1,
              name: `Episodes ${chunk[0].mal_id} - ${chunk[chunk.length - 1].mal_id}`,
              episodes: chunk
            }));
            setTvSeasons(fakeSeasons);
            setSelectedSeason(1);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setEpisodesLoading(false);
        }
      }
    };
    fetchDetails();
  }, [title?.externalId, title?.type]);

  // Fetch episodes for selected season
  useEffect(() => {
    if (!title || selectedSeason === 0) return;

    const fetchEps = async () => {
      setEpisodesLoading(true);
      try {
        if (title.type === 'tv') {
          const s = await getTVSeasonDetails(Number(title.externalId), selectedSeason);
          setDisplayEpisodes(s.episodes || []);
        } else if (title.type === 'anime') {
          const season = tvSeasons.find(s => s.season_number === selectedSeason);
          setDisplayEpisodes(season?.episodes || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setEpisodesLoading(false);
      }
    };

    fetchEps();
  }, [selectedSeason, title?.type, title?.externalId, tvSeasons]);

  const handleSaveRating = async () => {
    if (!groupId || !titleId) return;
    setIsSubmitting(true);
    try {
      await submitRating(groupId, titleId, null, user.uid, userRating, userReview.trim());
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEpRating = async (epId: string) => {
    if (!groupId || !titleId) return;
    setIsSubmittingEp(true);
    try {
      await submitRating(groupId, titleId, epId, user.uid, epRating, epReview.trim());
      setExpandedEpisodeId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingEp(false);
    }
  };

  const openEpisodeRater = (epId: string) => {
    if (expandedEpisodeId === epId) {
      setExpandedEpisodeId(null);
      return;
    }
    const boxdEp = boxdEpisodes.find(e => e.episodeId === String(epId));
    const myRating = boxdEp?.ratingsByUser?.[user.uid];
    if (myRating) {
      setEpRating(myRating.rating);
      setEpReview(myRating.review || "");
    } else {
      setEpRating(0);
      setEpReview("");
    }
    setExpandedEpisodeId(epId);
  };

  if (loading) {
    return <div className="flex justify-center pt-32"><Loader2 className="w-8 h-8 animate-spin text-white/50" /></div>;
  }

  if (!title) {
    return (
      <div className="text-center pt-32 px-4 animate-fade-in">
        <h2 className="text-2xl font-bold mb-4">Title not found</h2>
        <button onClick={() => navigate(`/boxd/${groupId}`)} className="px-5 py-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">Back to Group</button>
      </div>
    );
  }

  return (
    <div className="w-full relative min-h-screen pb-32 animate-fade-in">
      {/* Backdrop */}
      {title.backdrop && (
        <div className="absolute top-0 left-0 w-full h-[60vh] z-0 overflow-hidden pointer-events-none">
          <LazyImage src={title.backdrop} alt={title.title} className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/80 to-transparent" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        <button 
          onClick={() => navigate(`/boxd/${groupId}`)}
          className="mb-8 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* Poster */}
          <div className="w-[180px] md:w-[280px] flex-shrink-0 rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-white/10 relative">
            {title.poster ? (
              <LazyImage src={title.poster} alt={title.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full aspect-[2/3] bg-white/5 flex items-center justify-center text-white/20">No Poster</div>
            )}
          </div>

          {/* Info & Rating Input */}
          <div className="flex-1 w-full md:mt-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 drop-shadow-lg leading-tight">{title.title}</h1>
            
            <div className="flex items-center gap-4 mb-10">
              <span className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-bold uppercase tracking-widest border border-white/5">{title.type}</span>
              <div className="flex items-center gap-2 text-white font-bold text-xl bg-white/5 px-4 py-1.5 rounded-lg border border-white/5 shadow-inner">
                <Star className="w-5 h-5 fill-white" />
                {title.avgRating ? title.avgRating.toFixed(1) : "—"} 
                <span className="text-white/40 text-sm font-medium ml-1 uppercase tracking-wider">Avg</span>
              </div>
            </div>

            {/* User Rating Box */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-6 lg:p-8 rounded-3xl max-w-2xl shadow-2xl">
              <h3 className="text-lg font-bold mb-6 text-white/90">Your Rating</h3>
              
              <div className="flex items-center gap-2 mb-6" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onClick={() => setUserRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110 p-1"
                  >
                    <Star 
                      className={`w-10 h-10 transition-colors ${(hoverRating || userRating) >= star ? 'fill-white text-white' : 'text-white/10'}`} 
                    />
                  </button>
                ))}
                {userRating > 0 && (
                  <button onClick={() => { setUserRating(0); setUserReview(""); }} className="ml-4 px-3 py-1.5 rounded-full text-xs font-bold text-white/40 hover:text-white hover:bg-white/10 transition-colors">Clear</button>
                )}
              </div>

              <textarea 
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                maxLength={150}
                placeholder="Write a short review... (max 150 chars)"
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none h-28 mb-4 text-sm leading-relaxed"
              />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono bg-white/5 px-2 py-1 rounded-md border border-white/5">{userReview.length}/150</span>
                <button 
                  onClick={handleSaveRating}
                  disabled={isSubmitting || userRating === 0}
                  className="px-6 py-3 bg-white text-black hover:bg-white/90 disabled:opacity-50 font-bold rounded-full transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Rating"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Group Reviews */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            Group Reviews
            <span className="bg-white/10 text-white/80 text-sm py-1 px-3 rounded-full">{title.ratingsCount || 0}</span>
          </h2>
          
          {!title.ratingsByUser || Object.keys(title.ratingsByUser).length === 0 ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 text-center">
              <p className="text-white/40">No ratings yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(title.ratingsByUser).map(([uid, rating]) => {
                const member = members.find(m => m.uid === uid);
                if (!member) return null;
                if (rating.rating === 0) return null;
                
                return (
                  <div key={uid} className="bg-white/[0.02] border border-white/10 p-6 rounded-3xl flex flex-col gap-4 shadow-lg hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold border border-white/5">
                        {member.photoURL ? <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" /> : member.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-white truncate block">{member.displayName}</span>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({length: 5}).map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < rating.rating ? 'fill-white text-white' : 'text-white/10'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {rating.review && (
                      <p className="text-white/70 text-sm leading-relaxed italic bg-black/20 p-4 rounded-2xl border border-white/5">"{rating.review}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Episodes Section */}
        {(title.type === 'tv' || title.type === 'anime') && tvSeasons.length > 0 && (
          <div className="mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <h2 className="text-2xl font-bold">Episodes</h2>
              
              <div className="relative group">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="appearance-none bg-white/5 border border-white/10 rounded-full py-2.5 pl-6 pr-12 text-sm font-bold text-white focus:outline-none focus:bg-white/10 transition-colors cursor-pointer"
                >
                  {tvSeasons.map(s => (
                    <option key={s.season_number} value={s.season_number} className="bg-[#0a0a0c] text-white">
                      {s.name || `Season ${s.season_number}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-white/50 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {episodesLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-white/50" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayEpisodes.map(ep => {
                  const epId = String(title.type === 'tv' ? ep.episode_number : ep.mal_id);
                  const epNumber = title.type === 'tv' ? ep.episode_number : ep.mal_id;
                  const epTitle = title.type === 'tv' ? ep.name : (ep.title || `Episode ${epNumber}`);
                  const epImage = title.type === 'tv' && ep.still_path 
                    ? `https://image.tmdb.org/t/p/w500${ep.still_path}` 
                    : null;
                  
                  // Get Boxd Episode data
                  const boxdEp = boxdEpisodes.find(e => e.episodeId === epId);
                  const myEpRating = boxdEp?.ratingsByUser?.[user.uid];

                  return (
                    <div key={epId} className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden flex flex-col group transition-all duration-300 hover:bg-white/[0.04]">
                      <div className="flex">
                        {/* Thumbnail */}
                        <div className="w-32 sm:w-40 aspect-video bg-black/40 flex-shrink-0 relative overflow-hidden">
                          {epImage ? (
                            <LazyImage src={epImage} alt={epTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10 text-xs font-bold">EP {epNumber}</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#060608]/50" />
                        </div>
                        
                        {/* Info */}
                        <div className="p-4 flex-1 flex flex-col justify-center min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Episode {epNumber}</span>
                            {boxdEp?.avgRating && boxdEp.avgRating > 0 && (
                              <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                                <Star className="w-3 h-3 fill-white text-white" />
                                <span className="text-xs font-bold">{boxdEp.avgRating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-sm truncate">{epTitle}</h4>
                          
                          {/* Rate Button */}
                          <button 
                            onClick={() => openEpisodeRater(epId)}
                            className="mt-3 self-start text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/20 transition-colors border border-white/5 flex items-center gap-1.5"
                          >
                            {myEpRating?.rating ? (
                              <>
                                <Star className="w-3 h-3 fill-white text-white" />
                                <span>{myEpRating.rating}/5</span>
                              </>
                            ) : (
                              <>
                                <Star className="w-3 h-3 text-white/40" />
                                <span>Rate Episode</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Rating Area */}
                      {expandedEpisodeId === epId && (
                        <div className="p-4 bg-black/40 border-t border-white/5 animate-fade-in">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-1.5" onMouseLeave={() => setEpHoverRating(0)}>
                              {[1, 2, 3, 4, 5].map(star => (
                                <button 
                                  key={star}
                                  onMouseEnter={() => setEpHoverRating(star)}
                                  onClick={() => setEpRating(star)}
                                  className="focus:outline-none transition-transform hover:scale-110 p-1"
                                >
                                  <Star 
                                    className={`w-6 h-6 transition-colors ${(epHoverRating || epRating) >= star ? 'fill-white text-white' : 'text-white/10'}`} 
                                  />
                                </button>
                              ))}
                              {epRating > 0 && (
                                <button onClick={() => { setEpRating(0); setEpReview(""); }} className="ml-2 text-xs text-white/40 hover:text-white transition-colors">Clear</button>
                              )}
                            </div>
                            <textarea 
                              value={epReview}
                              onChange={(e) => setEpReview(e.target.value)}
                              maxLength={100}
                              placeholder="Episode thoughts... (optional)"
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none h-16 text-xs leading-relaxed"
                            />
                            <div className="flex justify-end">
                              <button 
                                onClick={() => handleSaveEpRating(epId)}
                                disabled={isSubmittingEp || epRating === 0}
                                className="px-4 py-2 bg-white text-black hover:bg-white/90 disabled:opacity-50 font-bold rounded-lg transition-all flex items-center gap-2 text-xs"
                              >
                                {isSubmittingEp ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
