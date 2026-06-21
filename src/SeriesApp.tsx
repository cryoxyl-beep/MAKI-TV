import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import SeriesSidebar from "./components/SeriesSidebar";
import SeriesHome from "./components/series/SeriesHome";
import SeriesSearch from "./components/series/SeriesSearch";
import SeriesChannel from "./components/series/SeriesChannel";
import SeriesWatch from "./components/series/SeriesWatch";
import SeriesLibrary from "./components/series/SeriesLibrary";
import SeriesSettings from "./components/series/SeriesSettings";
import { ChevronUp } from "lucide-react";

export default function SeriesApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollTopBottom, setScrollTopBottom] = useState(24); // bottom offset in px
  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(location.search).get("q") || "";
  });

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q") || "";
    setSearchQuery(q);
  }, [location.search]);

  const getActiveTab = () => {
    if (location.pathname === "/series/library") return "library";
    if (location.pathname === "/series/settings") return "settings";
    return "home";
  };

  const activePage = getActiveTab();

  useEffect(() => {
    if (location.pathname === "/series" || location.pathname === "/series/") {
      document.title = "Series - Miyoro";
    } else if (location.pathname === "/series/library") {
      document.title = "Library - Miyoro";
    } else if (location.pathname === "/series/settings") {
      document.title = "Settings - Miyoro";
    } else if (location.pathname.startsWith("/series/search")) {
      document.title = "Search - Miyoro";
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      // Calculate distance to bottom to dynamically shift above footer
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollY = window.scrollY;
      const distanceToBottom = scrollHeight - (scrollY + clientHeight);

      const isMobile = window.innerWidth < 768;
      const footerThreshold = isMobile ? 180 : 100; // threshold where footer starts entering
      const basePadding = isMobile ? 24 : 32;

      if (distanceToBottom < footerThreshold) {
        const offset = basePadding + (footerThreshold - distanceToBottom);
        setScrollTopBottom(offset);
      } else {
        setScrollTopBottom(basePadding);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      navigate(`/series/search?q=${encodeURIComponent(query)}`);
    } else {
      navigate("/series");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#09090b] text-white flex flex-col font-sans select-none antialiased relative overflow-hidden">
      
      {/* Frosted Glass Floating Ambient Blobs for Series */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10vw] left-[-10vw] w-[45vw] h-[45vw] rounded-full series-glass-blur-bg-1 blur-[100px] opacity-60 animate-glow-1"></div>
        <div className="absolute bottom-[-10vw] right-[-10vw] w-[50vw] h-[50vw] rounded-full series-glass-blur-bg-2 blur-[120px] opacity-50 animate-glow-2"></div>
        <div className="absolute top-[35%] right-[5vw] w-[40vw] h-[40vw] rounded-full series-glass-blur-bg-3 blur-[110px] opacity-60 animate-glow-3"></div>
      </div>

      {!location.pathname.includes("/watch/") && (
        <Header
          onSearch={handleSearch}
          initialSearchQuery={searchQuery}
          onNavigateHome={() => navigate("/series")}
          onNavigateLibrary={() => navigate("/series/library")}
          isHomeScreen={activePage === "home" && location.pathname === "/series"}
          activeTab={activePage as any}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
      )}

      {!location.pathname.includes("/watch/") && (
        <SeriesSidebar
          activeTab={activePage as any}
          onNavigate={(page) => {
            if (page === "home") navigate("/series");
            else navigate(`/series/${page}`);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`flex flex-1 ${location.pathname.includes('/watch/') ? 'pt-0' : 'pt-[56px]'} text-white relative`}>
        <main className="flex-1 min-w-0 bg-transparent pb-0 relative px-0">
          <Routes>
             <Route path="/" element={<SeriesHome />} />
             <Route path="/search" element={<SeriesSearch />} />
             <Route path="/show/:tmdbId" element={<SeriesChannel />} />
             <Route path="/watch/:tmdbId/:season/:episode" element={<SeriesWatch />} />
             <Route path="/library" element={<SeriesLibrary />} />
             <Route path="/settings" element={<SeriesSettings />} />
          </Routes>
        </main>
      </div>

      <button
        type="button"
        onClick={handleScrollToTop}
        style={{ bottom: `${scrollTopBottom}px` }}
        className={`fixed right-6 md:right-8 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900/90 backdrop-blur-xl border border-white/25 text-white shadow-[0_0_20px_rgba(244,63,94,0.25),0_4px_24px_rgba(0,0,0,0.6)] hover:shadow-[0_0_30px_rgba(244,63,94,0.45),0_8px_32px_rgba(0,0,0,0.8)] border-white/20 hover:border-rose-500/40 text-white transition-all duration-300 ease-out cursor-pointer ${
          showScrollTop ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4 pointer-events-none"
        } hover:scale-105 active:scale-95`}
      >
        <ChevronUp className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}
