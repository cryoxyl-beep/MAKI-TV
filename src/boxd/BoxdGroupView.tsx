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
    return <div className="flex justify-center pt-32"><Loader2 className="w-8 h-8 animate-spin text-[#ff6b35]" /></div>;
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 px-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Group not found</h2>
        <p className="text-white/60 mb-6">This group may have been deleted or you don't have access.</p>
        <button onClick={() => navigate('/boxd')} className="px-5 py-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          Go to Boxd Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/boxd')}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight">{group.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* Main Content: Titles */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Watchlist</h2>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#ff6b35] hover:bg-[#ff8255] text-white font-semibold rounded-lg transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Title</span>
            </button>
          </div>

          {titles.length === 0 ? (
            <div className="py-20 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
              <p className="text-white/50 mb-4">No titles added to this group yet.</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Add the first title
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
              {titles.map(title => (
                <div 
                  key={title.id}
                  onClick={() => navigate(`/boxd/${group.id}/title/${title.id}`)}
                  className="group cursor-pointer flex flex-col gap-2"
                >
                  <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-white/5 relative border border-white/10 group-hover:border-white/30 transition-colors">
                    {title.poster ? (
                      <img src={title.poster} alt={title.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs text-center p-2">No Poster</div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  </div>
                  <h3 className="text-sm font-semibold truncate group-hover:text-[#ff6b35] transition-colors">{title.title}</h3>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Invite & Members */}
        <div className="flex flex-col gap-6">
          {/* Invite Card */}
          <div className="p-5 rounded-2xl bg-[#121217] border border-white/10">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Invite Link</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/80 truncate">
                {window.location.origin}/invite/{group.inviteCode}
              </div>
              <button 
                onClick={copyInviteLink}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                title="Copy Link"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Members Card */}
          <div className="p-5 rounded-2xl bg-[#121217] border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-white/50" />
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Members ({members.length})</h3>
            </div>
            <div className="flex flex-col gap-3">
              {members.map(member => (
                <div key={member.uid} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff6b35] to-[#ffa585] flex items-center justify-center overflow-hidden flex-shrink-0 text-xs font-bold">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                    ) : (
                      member.displayName[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold truncate">{member.displayName}</span>
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
