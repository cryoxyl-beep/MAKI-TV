import { Settings2, PlayCircle, Subtitles } from "lucide-react";

export default function MoviesSettings() {
  return (
    <div className="w-full flex-col p-4 md:p-8 pt-8 md:pt-12 animate-fade-in pb-32 text-white">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">Movie Settings</h1>
          <p className="text-white/50 text-base md:text-lg">Configure your cinematic experience.</p>
        </div>

        <div className="flex flex-col gap-8">
          
          {/* Server & Playback */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/10">
              <PlayCircle className="w-5 h-5 text-rose-400" />
              <h2 className="text-xl font-bold text-white">Playback</h2>
            </div>
            
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-white">Default Movie Server</span>
                  <span className="text-sm text-white/50">Preferred source for movie streaming</span>
                </div>
                <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none cursor-pointer">
                  <option value="auto">Auto Select</option>
                  <option value="sflix">SFlix</option>
                  <option value="vidsrc">VidSrc</option>
                </select>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-white">Preferred Quality</span>
                  <span className="text-sm text-white/50">Default resolution when available</span>
                </div>
                <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none cursor-pointer">
                  <option value="auto">Auto (Adaptive)</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-white">Autoplay Next File</span>
                  <span className="text-sm text-white/50">Automatically play the next part if a movie is split</span>
                </div>
                <div className="w-12 h-6 bg-rose-500 rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                   <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </section>

          {/* Subtitles */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/10">
              <Subtitles className="w-5 h-5 text-rose-400" />
              <h2 className="text-xl font-bold text-white">Subtitles</h2>
            </div>
            
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-white">Subtitle Language</span>
                  <span className="text-sm text-white/50">Default language for movie CC</span>
                </div>
                <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none cursor-pointer">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

               <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-white">Render Subtitles</span>
                  <span className="text-sm text-white/50">Display captions by default</span>
                </div>
                <div className="w-12 h-6 bg-rose-500 rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                   <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </section>
          
        </div>
      </div>
    </div>
  );
}
