const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// Add MoreVertical import
content = content.replace(
  /import \{ Search, X, ArrowLeft, Home, Clapperboard, History, LogOut, Menu, Users \} from "lucide-react";/, 
  'import { Search, X, ArrowLeft, Home, Clapperboard, History, LogOut, Menu, Users, MoreVertical, LayoutGrid } from "lucide-react";'
);

// Add showMoreMenu state
content = content.replace(
  /const \[showMobileSearch, setShowMobileSearch\] = useState\(false\);/,
  `const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);`
);

// Add the 3 dots menu instead of the Users icon (slim variant)
const boxdSlim = `              {/* Boxd Collaborative */}
              <div 
                onClick={() => {
                  if (currentUser) {
                    navigate('/boxd');
                  } else {
                    setShowAuthModal(true);
                  }
                }}
                className="w-[34px] h-[34px] rounded-full flex flex-shrink-0 items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.08] cursor-pointer transition-all duration-300"
                title="Boxd Collaborative"
              >
                <Users className="w-[18px] h-[18px]" />
              </div>`;

const dotsMenuSlim = `              {/* More Menu */}
              <div className="relative">
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="w-[34px] h-[34px] rounded-full flex flex-shrink-0 items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.08] cursor-pointer transition-all duration-300"
                  title="More Options"
                >
                  <MoreVertical className="w-[18px] h-[18px]" />
                </button>
                <AnimatePresence>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 top-[calc(100%+8px)] w-56 bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                      >
                        <div 
                          onClick={() => {
                            setShowMoreMenu(false);
                            if (currentUser) {
                              navigate('/boxd');
                            } else {
                              setShowAuthModal(true);
                            }
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white cursor-pointer transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b35]/20 to-[#ffa585]/20 flex items-center justify-center border border-[#ff6b35]/30">
                            <LayoutGrid className="w-4 h-4 text-[#ff6b35]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">Boxd</span>
                            <span className="text-[10px] text-white/50">Collaborative Ratings</span>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>`;

content = content.replace(boxdSlim, dotsMenuSlim);

// Replace for the regular variant as well
const boxdGlobal = `              {/* Boxd Collaborative */}
              <div 
                onClick={() => {
                  if (currentUser) {
                    navigate('/boxd');
                  } else {
                    setShowAuthModal(true);
                  }
                }}
                className="w-8.5 h-8.5 rounded-full flex flex-shrink-0 items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.08] cursor-pointer transition-all duration-300"
                title="Boxd Collaborative"
              >
                <Users className="w-5 h-5" />
              </div>`;

const dotsMenuGlobal = `              {/* More Menu */}
              <div className="relative">
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="w-8.5 h-8.5 rounded-full flex flex-shrink-0 items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.08] cursor-pointer transition-all duration-300"
                  title="More Options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 top-[calc(100%+8px)] w-56 bg-[#0a0a0c]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                      >
                        <div 
                          onClick={() => {
                            setShowMoreMenu(false);
                            if (currentUser) {
                              navigate('/boxd');
                            } else {
                              setShowAuthModal(true);
                            }
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white cursor-pointer transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b35]/20 to-[#ffa585]/20 flex items-center justify-center border border-[#ff6b35]/30">
                            <LayoutGrid className="w-4 h-4 text-[#ff6b35]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">Boxd</span>
                            <span className="text-[10px] text-white/50">Collaborative Ratings</span>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>`;

content = content.replace(boxdGlobal, dotsMenuGlobal);

fs.writeFileSync('src/components/Header.tsx', content);
