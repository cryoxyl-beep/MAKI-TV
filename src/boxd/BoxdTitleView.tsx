import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useParams, useNavigate } from "react-router-dom";
import { subscribeToTitles, subscribeToRatings, subscribeToMembers, submitRating, BoxdTitle, BoxdRating, BoxdMember } from "../services/boxd";
import { ArrowLeft, Loader2, Star } from "lucide-react";

export default function BoxdTitleView({ user }: { user: User }) {
  const { groupId, titleId } = useParams<{ groupId: string, titleId: string }>();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState<BoxdTitle | null>(null);
  const [ratings, setRatings] = useState<BoxdRating[]>([]);
  const [members, setMembers] = useState<BoxdMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Current user's rating state
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (!groupId || !titleId) return;
    
    let u1 = subscribeToTitles(groupId, (titles) => {
      const found = titles.find(t => t.id === titleId);
      setTitle(found || null);
      setLoading(false);
    });
    
    let u2 = subscribeToRatings(groupId, (allRatings) => {
      // Filter ratings for this title that are NOT episode ratings
      const titleRatings = allRatings.filter(r => r.titleId === titleId && !r.episodeId);
      setRatings(titleRatings);
      
      const myRating = titleRatings.find(r => r.userId === user.uid);
      if (myRating) {
        setUserRating(myRating.rating);
        setUserReview(myRating.review);
      }
    });
    
    let u3 = subscribeToMembers(groupId, setMembers);
    
    return () => { u1(); u2(); u3(); };
  }, [groupId, titleId, user.uid]);

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

  if (loading) {
    return <div className="flex justify-center pt-32"><Loader2 className="w-8 h-8 animate-spin text-[#ff6b35]" /></div>;
  }

  if (!title) {
    return (
      <div className="text-center pt-32 px-4">
        <h2 className="text-2xl font-bold mb-4">Title not found</h2>
        <button onClick={() => navigate(`/boxd/${groupId}`)} className="px-5 py-2.5 bg-white/10 rounded-full hover:bg-white/20">Back to Group</button>
      </div>
    );
  }

  const avgRating = ratings.length > 0 ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1) : "—";

  return (
    <div className="w-full relative min-h-screen pb-32">
      {/* Backdrop */}
      {title.backdrop && (
        <div className="absolute top-0 left-0 w-full h-[50vh] z-0 overflow-hidden">
          <img src={title.backdrop} alt={title.title} className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/80 to-transparent" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        <button 
          onClick={() => navigate(`/boxd/${groupId}`)}
          className="mb-6 p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors inline-block"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster */}
          <div className="w-[160px] md:w-[240px] flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
            {title.poster ? (
              <img src={title.poster} alt={title.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full aspect-[2/3] bg-white/5 flex items-center justify-center text-white/20">No Poster</div>
            )}
          </div>

          {/* Info & Rating Input */}
          <div className="flex-1 w-full mt-4 md:mt-10">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2 drop-shadow-lg">{title.title}</h1>
            <div className="flex items-center gap-3 mb-8">
              <span className="px-3 py-1 bg-white/10 rounded-lg text-sm font-bold uppercase tracking-wide">{title.type}</span>
              <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-lg">
                <Star className="w-5 h-5 fill-current" />
                {avgRating} <span className="text-white/40 text-sm font-normal ml-1">Group Avg</span>
              </div>
            </div>

            {/* User Rating Box */}
            <div className="bg-[#121217]/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl max-w-2xl">
              <h3 className="text-lg font-bold mb-4">Your Rating</h3>
              
              {/* Star selector (0.5 to 5.0) - For simplicity, standard 1-5 stars */}
              <div className="flex items-center gap-2 mb-4" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onClick={() => setUserRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-8 h-8 ${(hoverRating || userRating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} 
                    />
                  </button>
                ))}
                {userRating > 0 && (
                  <button onClick={() => { setUserRating(0); setUserReview(""); }} className="ml-4 text-sm text-white/40 hover:text-white transition-colors">Clear</button>
                )}
              </div>

              <textarea 
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                maxLength={100}
                placeholder="Write a short review... (max 100 chars)"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#ff6b35] transition-colors resize-none h-24 mb-4"
              />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono">{userReview.length}/100</span>
                <button 
                  onClick={handleSaveRating}
                  disabled={isSubmitting || userRating === 0}
                  className="px-6 py-2 bg-[#ff6b35] hover:bg-[#ff8255] disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Rating"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Group Reviews */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Group Reviews</h2>
          {ratings.length === 0 ? (
            <p className="text-white/40">No ratings yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ratings.map(rating => {
                const member = members.find(m => m.uid === rating.userId);
                if (!member) return null;
                
                return (
                  <div key={rating.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff6b35] to-[#ffa585] flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold">
                      {member.photoURL ? <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" /> : member.displayName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{member.displayName}</span>
                        <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                          <Star className="w-3 h-3 fill-current" /> {rating.rating}
                        </div>
                      </div>
                      {rating.review && <p className="text-white/70 text-sm mt-2">"{rating.review}"</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Episode Selector (placeholder link for Series/Anime) */}
        {(title.type === 'tv' || title.type === 'anime') && (
          <div className="mt-16 bg-[#121217] border border-white/10 p-6 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">Rate Episodes</h2>
              <p className="text-white/50 text-sm">Rate and review individual episodes.</p>
            </div>
            <button 
              onClick={() => navigate(`/boxd/${groupId}/title/${title.id}/episode/selector`)}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors"
            >
              View Episodes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
