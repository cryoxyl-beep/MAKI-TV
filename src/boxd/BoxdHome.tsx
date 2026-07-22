import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { subscribeToUserGroups, createGroup, getGroupByInviteCode, joinGroup, BoxdGroup } from "../services/boxd";
import { Users, Plus, ArrowRight, Loader2, X } from "lucide-react";

export default function BoxdHome({ user }: { user: User }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<BoxdGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = subscribeToUserGroups(user.uid, (data) => {
      setGroups(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setIsSubmitting(true);
    try {
      const id = await createGroup(groupName.trim(), user);
      setShowCreate(false);
      navigate(`/boxd/${id}`);
    } catch (err) {
      setError("Failed to create group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      const group = await getGroupByInviteCode(inviteCode.trim());
      if (group) {
        await joinGroup(group.id, user);
        setShowJoin(false);
        navigate(`/boxd/${group.id}`);
      } else {
        setError("Invalid invite code.");
      }
    } catch (err) {
      setError("Failed to join group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">Boxd</h1>
          <p className="text-white/60 text-lg">Your collaborative watchlists and ratings.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowJoin(true)}
            className="flex-1 md:flex-none px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Join Group
          </button>
          <button 
            onClick={() => setShowCreate(true)}
            className="flex-1 md:flex-none px-5 py-2.5 bg-[#ff6b35] hover:bg-[#ff8255] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/[0.02] border border-white/[0.05] rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-6">
            <Users className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Groups Yet</h3>
          <p className="text-white/50 max-w-md">Create a new group to start sharing ratings with friends, or join an existing one using an invite code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {groups.map(group => (
            <div 
              key={group.id}
              onClick={() => navigate(`/boxd/${group.id}`)}
              className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.15] p-6 rounded-2xl cursor-pointer transition-all duration-300 group/card"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff6b35]/20 to-[#ffa585]/20 flex items-center justify-center border border-[#ff6b35]/30 group-hover/card:scale-105 transition-transform">
                  <Users className="w-6 h-6 text-[#ff6b35]" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-white/[0.05] rounded-lg text-white/50">
                  {group.memberIds.length} members
                </span>
              </div>
              <h3 className="text-xl font-bold truncate mb-1">{group.name}</h3>
              <p className="text-sm text-white/40 font-mono">Code: {group.inviteCode}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modals for Create/Join */}
      {(showCreate || showJoin) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d0d11] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative">
            <button 
              onClick={() => {
                setShowCreate(false);
                setShowJoin(false);
                setError("");
              }}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold mb-6">
              {showCreate ? "Create Group" : "Join Group"}
            </h2>

            <form onSubmit={showCreate ? handleCreate : handleJoin} className="flex flex-col gap-4">
              {showCreate ? (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Group Name</label>
                  <input 
                    type="text" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Anime Club"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#ff6b35] transition-colors"
                    required
                    autoFocus
                    maxLength={30}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Invite Code</label>
                  <input 
                    type="text" 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB12C"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#ff6b35] transition-colors font-mono uppercase"
                    required
                    autoFocus
                    maxLength={5}
                  />
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button 
                type="submit"
                disabled={isSubmitting || (showCreate ? !groupName.trim() : !inviteCode.trim())}
                className="w-full py-3.5 mt-2 bg-[#ff6b35] hover:bg-[#ff8255] disabled:opacity-50 disabled:hover:bg-[#ff6b35] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : showCreate ? "Create Group" : "Join"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// X icon needs to be imported, I forgot. Let's fix that!
