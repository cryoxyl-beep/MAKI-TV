import { useState, useRef, useEffect } from "react";
import { useSettings, AppSettings } from "../hooks/useSettings";
import { useLibrary } from "../hooks/useLibrary";
import { Trash2, RotateCcw, ChevronDown, Check } from "lucide-react";
import { storage } from "../utils";

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { currentUser } = useLibrary();
  
  const handleUpdate = (section: keyof AppSettings, key: string, value: any) => {
    updateSettings({
      [section]: {
        ...(settings[section as keyof AppSettings] as any),
        [key]: value
      }
    });
  };

  const GroupTitle = ({ title }: { title: string }) => (
    <h3 className="text-white/30 font-bold mb-5 uppercase text-[11px] tracking-widest pl-1">
      {title}
    </h3>
  );

  const ToggleRow = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (c: boolean) => void }) => (
    <div className="flex items-center justify-between py-3.5 px-1 cursor-pointer group" onClick={() => onChange(!checked)}>
      <span className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">{label}</span>
      <button 
        className={`w-[42px] h-[24px] rounded-full transition-colors duration-300 ease-in-out relative ${checked ? 'bg-white' : 'bg-white/10'}`}
      >
        <div className={`w-[18px] h-[18px] rounded-full absolute top-[3px] transition-all duration-300 ease-in-out shadow-sm ${checked ? 'translate-x-[21px] bg-black' : 'translate-x-[3px] bg-white/50'}`} />
      </button>
    </div>
  );

  const SelectRow = ({ label, value, options, onChange }: { label: string, value: string, options: {label: string, value: string}[], onChange: (v: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-1 gap-3 relative" ref={dropdownRef}>
        <span className="text-gray-300 text-sm font-medium">{label}</span>
        
        <div className="relative w-full sm:w-56">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-between gap-2 border rounded-xl px-4 py-2.5 text-sm text-white w-full transition-colors duration-200 ${isOpen ? 'bg-white/10 border-white/20' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'}`}
          >
            <span className="truncate text-left flex-1 font-medium">{options.find(o => o.value === value)?.label || "Select..."}</span>
            <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          <div
            className={`absolute right-0 top-full mt-2 w-full bg-[#151515] border border-white/10 rounded-2xl shadow-2xl py-1 z-50 overflow-hidden origin-top transition-all duration-200 ease-out ${
              isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-white/[0.08] transition-colors text-left"
              >
                <span className={value === o.value ? "text-white font-medium" : "text-gray-400"}>{o.label}</span>
                {value === o.value && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen pb-20 animate-fade-in">
      <div className="px-5 md:px-10 pt-10 pb-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
          {/* Main Left Column */}
          <div className="flex flex-col gap-10">
            {/* Playback Settings */}
            <div className="bg-black/20 border border-white/[0.05] rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
              <GroupTitle title="Playback" />
              <div className="flex flex-col gap-1">
                <SelectRow 
                  label="Default Start Server (Anime)" 
                  value={settings.playback.defaultServer}
                  options={[
                    {label: "AnimeGG (GG)", value: "animegg"},
                    {label: "AniNeko (Neko)", value: "anineko"},
                    {label: "Kyou", value: "megaplay"},
                    {label: "Kami", value: "origami"},
                    {label: "Nest", value: "vidnest"},
                    {label: "Miru", value: "animepahe"}
                  ]}
                  onChange={(v) => handleUpdate("playback", "defaultServer", v)}
                />
                <SelectRow 
                  label="Default Start Server (Movies)" 
                  value={settings.playback.defaultServerMovies || "vidnest"}
                  options={[
                    {label: "Nest", value: "vidnest"},
                    {label: "Taberu", value: "cinesrc"},
                    {label: "Matsuri", value: "vidfast"},
                    {label: "Onigiri", value: "movies111"}
                  ]}
                  onChange={(v) => handleUpdate("playback", "defaultServerMovies", v)}
                />
                <SelectRow 
                  label="Default Start Server (Series)" 
                  value={settings.playback.defaultServerSeries || "vidnest"}
                  options={[
                    {label: "Nest", value: "vidnest"},
                    {label: "Taberu", value: "cinesrc"},
                    {label: "Matsuri", value: "vidfast"},
                    {label: "Onigiri", value: "movies111"}
                  ]}
                  onChange={(v) => handleUpdate("playback", "defaultServerSeries", v)}
                />
                <SelectRow 
                  label="Default Audio Track" 
                  value={settings.playback.defaultAudio}
                  options={[
                    {label: "Japanese", value: "Japanese"},
                    {label: "English Dub", value: "English Dub"},
                    {label: "Auto", value: "Auto"}
                  ]}
                  onChange={(v) => handleUpdate("playback", "defaultAudio", v)}
                />
                <SelectRow 
                  label="Default Subtitle Language" 
                  value={settings.playback.defaultSubtitle}
                  options={[
                    {label: "English", value: "English"},
                    {label: "None", value: "None"},
                    {label: "Auto", value: "Auto"}
                  ]}
                  onChange={(v) => handleUpdate("playback", "defaultSubtitle", v)}
                />
                <div className="h-px bg-white/5 my-3 w-full" />
                <ToggleRow label="Auto Play Next Episode" checked={settings.playback.autoPlayNext} onChange={(v) => handleUpdate("playback", "autoPlayNext", v)} />
                <ToggleRow label="Auto Resume Progress" checked={settings.playback.autoResume} onChange={(v) => handleUpdate("playback", "autoResume", v)} />
                <ToggleRow label="Skip Intro Automatically" checked={settings.playback.skipIntro} onChange={(v) => handleUpdate("playback", "skipIntro", v)} />
                <ToggleRow label="Skip Outro Automatically" checked={settings.playback.skipOutro} onChange={(v) => handleUpdate("playback", "skipOutro", v)} />
              </div>
            </div>

            {/* Video Quality */}
            <div className="bg-black/20 border border-white/[0.05] rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
              <GroupTitle title="Video Quality" />
              <div className="flex flex-col gap-1">
                <SelectRow 
                  label="Preferred Quality" 
                  value={settings.videoQuality.preferredQuality}
                  options={[
                    {label: "Auto", value: "Auto"},
                    {label: "1080p", value: "1080p"},
                    {label: "720p", value: "720p"},
                    {label: "480p", value: "480p"}
                  ]}
                  onChange={(v) => handleUpdate("videoQuality", "preferredQuality", v)}
                />
                <div className="h-px bg-white/5 my-3 w-full" />
                <ToggleRow label="Data Saver Mode" checked={settings.videoQuality.dataSaver} onChange={(v) => handleUpdate("videoQuality", "dataSaver", v)} />
                <ToggleRow label="Preload Next Episode" checked={settings.videoQuality.preloadNext} onChange={(v) => handleUpdate("videoQuality", "preloadNext", v)} />
              </div>
            </div>
          </div>

          {/* Main Right Column */}
          <div className="flex flex-col gap-10">
            {/* Homepage */}
            <div className="bg-black/20 border border-white/[0.05] rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
              <GroupTitle title="Homepage" />
              <div className="flex flex-col gap-1">
                <ToggleRow label="Enable Hero Section" checked={settings.homepage.enableHero} onChange={(v) => handleUpdate("homepage", "enableHero", v)} />
                <ToggleRow label="Enable Continue Watching Row" checked={settings.homepage.enableContinueWatching} onChange={(v) => handleUpdate("homepage", "enableContinueWatching", v)} />
                <ToggleRow label="Enable Recently Added Row" checked={settings.homepage.enableRecentlyAdded} onChange={(v) => handleUpdate("homepage", "enableRecentlyAdded", v)} />
                <ToggleRow label="Enable Trending Row" checked={settings.homepage.enableTrending} onChange={(v) => handleUpdate("homepage", "enableTrending", v)} />
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-black/20 border border-white/[0.05] rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
              <GroupTitle title="Appearance" />
              <div className="flex flex-col gap-1">
                <SelectRow 
                  label="Theme" 
                  value={settings.appearance.theme}
                  options={[
                    {label: "Dark", value: "Dark"},
                    {label: "System", value: "System"}
                  ]}
                  onChange={(v) => handleUpdate("appearance", "theme", v)}
                />
                <div className="h-px bg-white/5 my-3 w-full" />
                <ToggleRow label="Reduce Animations" checked={settings.appearance.reduceAnimations} onChange={(v) => handleUpdate("appearance", "reduceAnimations", v)} />
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-black/20 border border-white/[0.05] rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
              <GroupTitle title="Notifications" />
              <div className="flex flex-col gap-1">
                <ToggleRow label="New Episode Notifications" checked={settings.notifications.newEpisodes} onChange={(v) => handleUpdate("notifications", "newEpisodes", v)} />
                <ToggleRow label="Continue Watching Reminders" checked={settings.notifications.continueWatching} onChange={(v) => handleUpdate("notifications", "continueWatching", v)} />
              </div>
            </div>

            {/* Account */}
            <div className="bg-black/20 border border-white/[0.05] rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
              <GroupTitle title="Account" />
              <div className="flex flex-col gap-3 mt-1">
                <button 
                  onClick={() => {
                    storage.remove("history");
                    alert("Watch history cleared (local only)");
                  }}
                  className="flex items-center gap-3 px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-colors text-sm font-medium w-full"
                >
                  <Trash2 className="w-5 h-5 text-gray-400" />
                  Clear Watch History
                </button>
                <button 
                  onClick={() => {
                    storage.remove("searchHistory");
                    alert("Search history cleared");
                  }}
                  className="flex items-center gap-3 px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-colors text-sm font-medium w-full"
                >
                  <Trash2 className="w-5 h-5 text-gray-400" />
                  Clear Search History
                </button>
                <button 
                  onClick={() => {
                    if (confirm("Are you sure you want to reset all settings to their defaults?")) {
                      resetSettings();
                    }
                  }}
                  className="flex items-center gap-3 px-5 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-colors text-sm font-medium w-full mt-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset All Settings
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
