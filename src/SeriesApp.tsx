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
  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(location.search).get("q") || "";
  });

  const getActiveTab = () => {
    if (location.pathname === "/series/library") return "library";
    if (location.pathname === "/series/settings") return "settings";
    return "home";
  };

  const activePage = getActiveTab();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
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
        className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-300 ease-out cursor-pointer ${
          showScrollTop ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4 pointer-events-none"
        } hover:bg-black/80 hover:border-white/20 active:scale-95`}
      >
        <ChevronUp className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}
