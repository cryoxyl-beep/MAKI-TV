import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import Header from "../components/Header";
import BoxdHome from "./BoxdHome";
import BoxdGroupView from "./BoxdGroupView";
import BoxdTitleView from "./BoxdTitleView";
import BoxdEpisodeView from "./BoxdEpisodeView";

export default function BoxdApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Boxd | Miyoro";
    const unsubs = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubs();
  }, []);

  if (loading) {
    return <div className="w-full h-screen bg-[#060608]" />;
  }

  return (
    <div className="w-full h-screen bg-[#060608] text-white flex flex-col font-sans select-none antialiased overflow-hidden">
      <div className="flex-shrink-0 z-50">
        <Header variant="slim" />
      </div>
      
      <div className="flex-1 overflow-y-auto relative z-0">
        <Routes>
          <Route path="/" element={user ? <BoxdHome user={user} /> : <Navigate to="/" replace />} />
          <Route path="/:groupId" element={user ? <BoxdGroupView user={user} /> : <Navigate to="/" replace />} />
          <Route path="/:groupId/title/:titleId" element={user ? <BoxdTitleView user={user} /> : <Navigate to="/" replace />} />
          <Route path="/:groupId/title/:titleId/episode/:episodeId" element={user ? <BoxdEpisodeView user={user} /> : <Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
