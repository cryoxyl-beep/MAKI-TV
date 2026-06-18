import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import MoviesSidebar from "./components/MoviesSidebar";
import MoviesHome from "./components/movies/MoviesHome";
import MoviesSearch from "./components/movies/MoviesSearch";
import MovieChannel from "./components/movies/MovieChannel";
import MovieWatch from "./components/movies/MovieWatch";
import MoviesLibrary from "./components/movies/MoviesLibrary";
import MoviesSettings from "./components/movies/MoviesSettings";
import { ChevronUp } from "lucide-react";

export default function MoviesApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(location.search).get("q") || "";
  });

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q") || "";
    setSearchQuery(q);
  }, [location.search]);

  const getActiveTab = () => {
    if (location.pathname === "/movies/library") return "library";
    if (location.pathname === "/movies/settings") return "settings";
    return "home";
  };

  const activePage = getActiveTab();

  useEffect(() => {
    if (location.pathname === "/movies" || location.pathname === "/movies/") {
      document.title = "Movies - Miyoro";
    } else if (location.pathname === "/movies/library") {
      document.title = "Library - Miyoro";
    } else if (location.pathname === "/movies/settings") {
      document.title = "Settings - Miyoro";
    } else if (location.pathname.startsWith("/movies/search")) {
      document.title = "Search - Miyoro";
    }
  }, [location.pathname]);

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
      navigate(`/movies/search?q=${encodeURIComponent(query)}`);
    } else {
      navigate("/movies");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#09090b] text-white flex flex-col font-sans select-none antialiased relative overflow-hidden">
      
      {/* Frosted Glass Floating Ambient Blobs for Movies */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10vw] left-[-10vw] w-[45vw] h-[45vw] rounded-full movies-glass-blur-bg-1 blur-[100px] opacity-60 animate-glow-1"></div>
        <div className="absolute bottom-[-10vw] right-[-10vw] w-[50vw] h-[50vw] rounded-full movies-glass-blur-bg-2 blur-[120px] opacity-50 animate-glow-2"></div>
        <div className="absolute top-[35%] right-[5vw] w-[40vw] h-[40vw] rounded-full movies-glass-blur-bg-3 blur-[110px] opacity-60 animate-glow-3"></div>
      </div>

      {!location.pathname.includes("/watch/") && (
        <Header
          onSearch={handleSearch}
          initialSearchQuery={searchQuery}
          onNavigateHome={() => navigate("/movies")}
          onNavigateLibrary={() => navigate("/movies/library")}
          isHomeScreen={activePage === "home" && location.pathname === "/movies"}
          activeTab={activePage as any}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
      )}

      {!location.pathname.includes("/watch/") && (
        <MoviesSidebar
          activeTab={activePage}
          onNavigate={(page) => {
            if (page === "home") navigate("/movies");
            else navigate(`/movies/${page}`);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`flex flex-1 ${location.pathname.includes('/watch/') ? 'pt-0' : 'pt-[56px]'} text-white relative`}>
        <main className="flex-1 min-w-0 bg-transparent pb-0 relative px-0">
          <Routes>
             <Route path="/" element={<MoviesHome />} />
             <Route path="/search" element={<MoviesSearch />} />
             <Route path="/movie/:tmdbId" element={<MovieChannel />} />
             <Route path="/watch/:tmdbId" element={<MovieWatch />} />
             <Route path="/library" element={<MoviesLibrary />} />
             <Route path="/settings" element={<MoviesSettings />} />
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
