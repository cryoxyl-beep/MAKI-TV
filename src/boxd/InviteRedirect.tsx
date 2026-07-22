import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { getGroupByInviteCode, joinGroup } from "../services/boxd";
import Header from "../components/Header";

export default function InviteRedirect() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [userChecked, setUserChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setUserChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userChecked) return;
    
    if (currentUser && inviteCode) {
      // Process invite
      getGroupByInviteCode(inviteCode).then(group => {
        if (group) {
          joinGroup(group.id, currentUser).then(() => {
            navigate(`/boxd/${group.id}`, { replace: true });
          }).catch(() => {
            setError("Failed to join group.");
          });
        } else {
          setError("Invalid or expired invite code.");
        }
      }).catch(() => setError("Error validating invite code."));
    }
  }, [userChecked, currentUser, inviteCode, navigate]);

  return (
    <div className="w-full h-screen bg-[#060608] text-white flex flex-col font-sans">
      <div className="flex-shrink-0 z-50">
        <Header variant="slim" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        {!userChecked ? (
          <div className="animate-pulse text-white/50">Loading...</div>
        ) : !currentUser ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Join Group</h2>
            <p className="text-white/60 mb-6 max-w-sm mx-auto">
              You must be logged in to join this Boxd group.
            </p>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent("openAuthModal"))}
              className="px-6 py-2.5 bg-[#ff6b35] text-white font-bold rounded-full hover:bg-[#ff8255] transition-colors"
            >
              Sign In to Join
            </button>
          </div>
        ) : error ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-400">Oops!</h2>
            <p className="text-white/60 mb-6">{error}</p>
            <button 
              onClick={() => navigate('/boxd')}
              className="px-6 py-2.5 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 transition-colors"
            >
              Go to Boxd
            </button>
          </div>
        ) : (
          <div className="animate-pulse text-white/50">Joining group...</div>
        )}
      </div>
    </div>
  );
}
