import React from "react";
import { User } from "firebase/auth";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BoxdEpisodeView({ user }: { user: User }) {
  const { groupId, titleId } = useParams<{ groupId: string, titleId: string }>();
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <button 
        onClick={() => navigate(`/boxd/${groupId}/title/${titleId}`)}
        className="mb-8 p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors inline-block"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Episode Selector</h1>
        <p className="text-white/50 mb-8 max-w-lg mx-auto">
          This section allows group members to rate individual episodes. TMDB and AniList episode metadata integration goes here.
        </p>
        <div className="animate-pulse bg-white/5 h-32 rounded-2xl border border-white/10"></div>
      </div>
    </div>
  );
}
