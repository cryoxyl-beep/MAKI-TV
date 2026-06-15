import { useState, useEffect } from "react";
import Header from "./components/Header";
import SeriesSidebar from "./components/SeriesSidebar";
import SettingsPage from "./components/SettingsPage";
import { ChevronUp } from "lucide-react";

export default function SeriesApp() {
  const [activePage, setActivePage] = useState<"home" | "library" | "settings">("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    document.title = activePage === "home" ? "Series • Miyoro" : `${activePage.charAt(0).toUpperCase() + activePage.slice(1)} • Series`;
  }, [activePage]);

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
  };

  return (
    <div className="w-full min-h-screen bg-[#09090b] text-white flex flex-col font-sans select-none antialiased relative overflow-hidden">
      
      {/* Frosted Glass Floating Ambient Blobs for Series */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10vw] left-[-10vw] w-[45vw] h-[45vw] rounded-full bg-emerald-500/10 blur-[100px] opacity-60 animate-glow-1"></div>
        <div className="absolute bottom-[-10vw] right-[-10vw] w-[50vw] h-[50vw] rounded-full bg-teal-500/10 blur-[120px] opacity-50 animate-glow-2"></div>
        <div className="absolute top-[35%] right-[5vw] w-[40vw] h-[40vw] rounded-full bg-emerald-400/10 blur-[110px] opacity-60 animate-glow-3"></div>
      </div>

      <Header
        onSearch={handleSearch}
        initialSearchQuery={searchQuery}
        onNavigateHome={() => setActivePage("home")}
        onNavigateLibrary={() => setActivePage("library")}
        isHomeScreen={activePage === "home"}
        activeTab={activePage}
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      <SeriesSidebar
        activeTab={activePage}
        onNavigate={(page) => setActivePage(page)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex flex-1 pt-[56px] text-white relative">
        <main className="flex-1 min-w-0 bg-transparent pb-32 relative px-0">
          
          {activePage === "home" && (
            <div className="w-full min-h-[70vh] flex flex-col items-center justify-center animate-fade-in p-8 text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-4">Series Universe</h1>
              <p className="text-white/50 max-w-lg">
                The series streaming ecosystem is currently under construction.
                TMDB metadata and TV show providers will be integrated soon.
              </p>
            </div>
          )}

          {activePage === "library" && (
            <div className="w-full min-h-[70vh] flex items-center justify-center animate-fade-in">
              <h1 className="text-white/50 text-xl font-medium tracking-wide">
                Series Library (Coming Soon)
              </h1>
            </div>
          )}

          {activePage === "settings" && (
            <SettingsPage />
          )}

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
