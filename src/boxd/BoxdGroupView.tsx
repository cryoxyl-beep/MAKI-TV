import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useParams, useNavigate } from "react-router-dom";
import { subscribeToGroup, subscribeToMembers, subscribeToTitles, BoxdGroup, BoxdMember, BoxdTitle } from "../services/boxd";
import { Users, Plus, ArrowLeft, Loader2, Copy, Check, Star } from "lucide-react";
import BoxdAddTitleModal from "./BoxdAddTitleModal";

export default function BoxdGroupView({ user }: { user: User }) {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState<BoxdGroup | null>(null);
  const [members, setMembers] = useState<BoxdMember[]>([]);
  const [titles, setTitles] = useState<BoxdTitle[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [copied, setCopied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    
    let u1 = subscribeToGroup(groupId, (g) => {
      setGroup(g);
      setLoading(false);
    });
    let u2 = subscribeToMembers(groupId, setMembers);
    let u3 = subscribeToTitles(groupId, setTitles);
    
    return () => {
      u1(); u2(); u3();
    };
  }, [groupId]);

  const copyInviteLink = () => {
    if (!group) return;
    const link = `${window.location.origin}/invite/${group.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex justify-center pt-32"><Loader2 className="w-8 h-8 animate-spin text-white/50" /></div>;
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 px-4 text-center animate-fade-in">
        <h2 className="text-2xl font-bold mb-2">Group not found</h2>
        <p className="text-white/60 mb-6">This group may have been deleted or you don't have access.</p>
        <button onClick={() => navigate('/boxd')} className="px-5 py-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          Go to Boxd Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-32 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/boxd')}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">{group.name}</h1>
            <p className="text-white/50 mt-1">{titles.length} {titles.length === 1 ? 'Title' : 'Titles'} • {members.length} {members.length === 1 ? 'Member' : 'Members'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 xl:gap-12 items-start">
        {/* Main Content: Titles */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Watchlist</h2>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-white text-black hover:bg-white/90 font-semibold rounded-full transition-colors flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Title</span>
            </button>
          </div>

          {titles.length === 0 ? (
            <div className="py-24 text-center border border-white/10 rounded-3xl bg-white/[0.02] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Plus className="w-8 h-8 text-white/40" />
              </div>
              <h3 className="text-xl font-bold mb-2">No titles yet</h3>
              <p className="text-white/50 mb-6 max-w-sm mx-auto">Start building your collaborative watchlist by adding movies, series, or anime.</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full transition-colors text-sm"
              >
                Add the first title
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {titles.map(title => (
                <div 
                  key={title.id}
                  onClick={() => navigate(`/boxd/${group.id}/title/${title.id}`)}
                  className="group cursor-pointer flex flex-col gap-3 relative"
                >
                  <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 relative border border-white/10 group-hover:border-white/30 transition-all duration-300 shadow-xl group-hover:shadow-2xl">
                    {title.poster ? (
                      <img src={title.poster} alt={title.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-medium text-center p-2">No Poster</div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      {title.avgRating ? (
                        <div className="flex items-center gap-1.5 text-white">
                          <Star className="w-4 h-4 fill-white" />
                          <span className="font-bold">{title.avgRating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-white/80">Not Rated</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold truncate group-hover:text-white/80 transition-colors">{title.title}</h3>
                    {title.avgRating && title.avgRating > 0 && (
                      <div className="flex items-center gap-1 mt-1 lg:hidden">
                         <Star className="w-3 h-3 fill-white/50 text-white/50" />
                         <span className="text-xs text-white/50 font-medium">{title.avgRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Invite & Members */}
        <div className="flex flex-col gap-6">
          {/* Invite Card */}
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Invite Friends</h3>
            <p className="text-sm text-white/60 mb-4">Share this link to invite others to your Boxd group.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white/80 truncate select-all">
                {window.location.origin}/invite/{group.inviteCode}
              </div>
              <button 
                onClick={copyInviteLink}
                className="w-11 h-11 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center justify-center flex-shrink-0 border border-white/5"
                title="Copy Link"
              >
                {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Members Card */}
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">Members</h3>
            </div>
            
            <div className="flex flex-col gap-4">
              {members.map(member => (
                <div key={member.uid} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 text-sm font-bold border border-white/5">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                    ) : (
                      member.displayName[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold truncate text-white">{member.displayName}</span>
                    <span className="text-xs text-white/40">Joined recently</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && groupId && (
        <BoxdAddTitleModal 
          groupId={groupId} 
          user={user} 
          onClose={() => setShowAddModal(false)} 
        />
      )}
    </div>
  );
}
