/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import HomeFeed from "./components/HomeFeed";
import ChannelPage from "./components/ChannelPage";
import WatchPage from "./components/WatchPage";
import LibraryPage from "./components/LibraryPage";
import SchedulePage from "./components/SchedulePage";
import LazyImage from "./components/LazyImage";
import { parseEpisodeSearch } from "./utils";
import { fetchAnimeFeed } from "./services/anilist";
import { Tv, Flame, Play, Sparkles, ChevronUp } from "lucide-react";
import { useLibrary } from "./hooks/useLibrary";
import { initializeFribbMapping } from "./services/fribb";

export default function App() {
  // Navigation states
  const [activePage, setActivePage] = useState<"home" | "trending" | "subscriptions" | "library" | "channel" | "watch" | "schedule">("home");
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize Fribb Mapping on startup
  useEffect(() => {
    initializeFribbMapping();
  }, []);

  // Sub-states for specific pages
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [watchDetails, setWatchDetails] = useState<{ animeId: number; seasonNumber: number; episodeNumber: number } | null>(null);

  // Live Subscription list via useLibrary
  const { library: subscriptionsList } = useLibrary();

  // Update browser tab title dynamically based on activePage & searchQuery
  useEffect(() => {
    if (activePage === "home") {
      if (searchQuery.trim().length > 0) {
        document.title = "Search • Miyoro";
      } else {
        document.title = "Miyoro";
      }
    } else if (activePage === "subscriptions" || activePage === "trending") {
      document.title = "Browse • Miyoro";
    } else if (activePage === "library") {
      document.title = "Library • Miyoro";
    } else if (activePage === "schedule") {
      document.title = "Schedule • Miyoro";
    }
  }, [activePage, searchQuery]);

  const handleSyncSubscriptions = () => {
    // Left empty for compatibility.
  };

  // Floating Scroll to Top state
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // 400px is within the requested 300px-500px range
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // Browser state routing via hash listeners (e.g. #/channel/32, #/watch/12/1/4)
  useEffect(() => {
    const handleHashChange = () => {
      // Global scroll reset on every route change
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
      });

      const hash = window.location.hash || "#/";

      if (hash.startsWith("#/channel/")) {
        const id = parseInt(hash.replace("#/channel/", ""), 10);
        if (!isNaN(id)) {
          setSelectedChannelId(id);
          setActivePage("channel");
          setSearchQuery("");
        }
      } else if (hash.startsWith("#/watch/")) {
        const parts = hash.replace("#/watch/", "").split("/");
        const animeId = parseInt(parts[0], 10);
        let seasonNumber = 1;
        let episodeNumber = 1;

        if (parts[1] === "season" && parts[3] === "episode") {
          seasonNumber = parseInt(parts[2], 10) || 1;
          episodeNumber = parseInt(parts[4], 10) || 1;
        } else {
          seasonNumber = parseInt(parts[1], 10) || 1;
          episodeNumber = parseInt(parts[2], 10) || 1;
        }

        if (!isNaN(animeId)) {
          setWatchDetails({ animeId, seasonNumber, episodeNumber });
          setActivePage("watch");
          setSearchQuery("");
        }
      } else if (hash === "#/trending") {
        setActivePage("trending");
        setSearchQuery("");
      } else if (hash === "#/subscriptions") {
        setActivePage("subscriptions");
        setSearchQuery("");
      } else if (hash === "#/library") {
        setActivePage("library");
        setSearchQuery("");
      } else if (hash === "#/schedule") {
        setActivePage("schedule");
        setSearchQuery("");
      } else {
        // Default to home page
        setActivePage("home");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    // Execute hash change check at load
    handleHashChange();

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Helpers to push link state
  const handleNavigate = (page: "home" | "trending" | "subscriptions" | "library" | "schedule") => {
    if (page === "home") {
      window.location.hash = "/";
    } else {
      window.location.hash = `/${page}`;
    }
    setSearchQuery("");
  };

  const handleSearchTrigger = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchQuery("");
      return;
    }

    const parsed = parseEpisodeSearch(trimmed);
    if (parsed) {
      try {
        const results = await fetchAnimeFeed(undefined, parsed.titleQuery);
        if (results && results.length > 0) {
          const matchedAnime = results[0];
          handleOpenEpisode(matchedAnime.id, parsed.seasonNumber, parsed.episodeNumber);
          return;
        }
      } catch (err) {
        console.error("Direct episode routing search failed:", err);
      }
    }

    setSearchQuery(trimmed);
    if (activePage !== "home") {
      window.location.hash = "/"; // search triggers on the homepage recommendations feed
    }
  };

  const handleOpenChannel = (animeId: number) => {
    window.location.hash = `/channel/${animeId}`;
  };

  const handleOpenEpisode = (animeId: number, seasonNumber: number, episodeNumber: number) => {
    window.location.hash = `/watch/${animeId}/${seasonNumber}/${episodeNumber}`;
  };

  return (
    <div className="w-full min-h-screen bg-[#09090b] text-white flex flex-col font-sans select-none antialiased relative overflow-hidden">
      
      {/* Frosted Glass Floating Ambient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10vw] left-[-10vw] w-[45vw] h-[45vw] rounded-full glass-blur-bg-1 blur-[100px] opacity-60 animate-glow-1"></div>
        <div className="absolute bottom-[-10vw] right-[-10vw] w-[50vw] h-[50vw] rounded-full glass-blur-bg-2 blur-[120px] opacity-50 animate-glow-2"></div>
        <div className="absolute top-[35%] right-[5vw] w-[40vw] h-[40vw] rounded-full glass-blur-bg-3 blur-[110px] opacity-60 animate-glow-3"></div>
      </div>

      {/* 1. Youtube-style Top header layout */}
      <Header
        onSearch={handleSearchTrigger}
        initialSearchQuery={searchQuery}
        onNavigateHome={() => handleNavigate("home")}
        onNavigateSchedule={() => handleNavigate("schedule")}
        onNavigateLibrary={() => handleNavigate("library")}
        onNavigateSubscriptions={() => handleNavigate("subscriptions")}
        isHomeScreen={activePage === "home"}
        activeTab={
          activePage === "channel" || activePage === "watch"
            ? "home" // default highlighted
            : (activePage as any)
        }
      />

      <div className="flex flex-1 pt-[56px] text-white z-10 relative">
        
        {/* 2. Left side expandable dynamic Sidebar (Collapses slightly on small desktop screens, hidden or bottom bar on mobile) */}
        <Sidebar
          activeTab={
            activePage === "channel" || activePage === "watch"
              ? "home" // default highlighted drawer
              : (activePage as any)
          }
          onNavigate={handleNavigate}
          onChannelClick={handleOpenChannel}
          subscriptions={subscriptionsList}
        />

        {/* 3. Right main contents stage viewport with standard padding scale */}
        <main
          className="flex-1 min-w-0 bg-transparent pb-32 z-10 relative px-0"
        >
          {/* RENDER LAYER 1: Home recommender Feed */}
          {activePage === "home" && (
            <HomeFeed
              onSelectAnime={handleOpenChannel}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery("")}
            />
          )}

          {/* RENDER LAYER 2: Trending content (Re-use feed query sorted by trendings) */}
          {activePage === "trending" && (
            <div className="w-full min-h-screen">
              <div className="px-4 md:px-6 pt-5 flex items-center gap-2">
                <Flame className="w-6 h-6 text-[#ff6b35]" />
                <h1 className="text-white text-xl sm:text-2xl font-black font-sans tracking-tight leading-none">
                  Trending Anime Channels
                </h1>
              </div>
              <HomeFeed
                onSelectAnime={handleOpenChannel}
                searchQuery=""
              />
            </div>
          )}

          {/* RENDER LAYER 3: Subscription pages displaying all subscribed series channels */}
          {activePage === "subscriptions" && (
            <div className="w-full min-h-[70vh] flex items-center justify-center animate-fade-in">
              <h1 className="text-white/50 text-xl font-medium tracking-wide">
                we are cooking
              </h1>
            </div>
          )}

          {/* RENDER LAYER 4: Watch History Dashboard */}
          {activePage === "library" && (
            <LibraryPage
              onWatchEpisode={handleOpenEpisode}
              onNavigateToChannel={handleOpenChannel}
              onHistoryCleared={handleSyncSubscriptions} // full status refresh
            />
          )}

          {/* RENDER LAYER 7: Schedule Page */}
          {activePage === "schedule" && (
            <SchedulePage onSelectAnime={handleOpenChannel} />
          )}

          {/* RENDER LAYER 5: Specific Hub Anime channel System Dashboard */}
          {activePage === "channel" && selectedChannelId && (
            <ChannelPage
              animeId={selectedChannelId}
              onWatchEpisode={handleOpenEpisode}
              onSubscriptionChanged={handleSyncSubscriptions}
            />
          )}

          {/* RENDER LAYER 6: Watching interface stage */}
          {activePage === "watch" && watchDetails && (
            <WatchPage
              animeId={watchDetails.animeId}
              seasonNumber={watchDetails.seasonNumber}
              episodeNumber={watchDetails.episodeNumber}
              onNavigateToChannel={handleOpenChannel}
              onNavigateToEpisode={handleOpenEpisode}
              onSubscriptionChanged={handleSyncSubscriptions}
            />
          )}
        </main>
      </div>

      {/* Premium Floating Scroll to Top button */}
      <button
        type="button"
        onClick={handleScrollToTop}
        className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-300 ease-out cursor-pointer ${
          showScrollTop && (activePage === "home" || activePage === "subscriptions" || activePage === "channel")
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-90 translate-y-4 pointer-events-none"
        } hover:bg-black/80 hover:border-white/20 active:scale-95`}
        aria-label="Scroll to top"
      >
        <ChevronUp className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}
