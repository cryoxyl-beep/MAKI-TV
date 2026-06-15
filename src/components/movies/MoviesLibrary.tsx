import { Film, Star, Clock } from "lucide-react";

export default function MoviesLibrary() {
  return (
    <div className="w-full flex-col p-4 md:p-8 pt-8 md:pt-12 animate-fade-in pb-32 text-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">Your Library</h1>
          <p className="text-white/50 text-base md:text-lg">Your personal collection of movies.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Saved Movies</h3>
              <p className="text-sm text-white/50">Movies you plan to watch.</p>
            </div>
          </div>
          
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Favorites</h3>
              <p className="text-sm text-white/50">Your top-rated content.</p>
            </div>
          </div>

          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Watch History</h3>
              <p className="text-sm text-white/50">Recently watched movies.</p>
            </div>
          </div>
        </div>

        <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white/[0.02] border border-white/5 rounded-3xl border-dashed">
          <Film className="w-12 h-12 text-white/20 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Library is Empty</h2>
          <p className="text-white/50 max-w-sm">
            The movies library architecture is in place. User persistence and synchronization will be connected in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
