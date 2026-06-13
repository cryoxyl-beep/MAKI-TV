import React, { useEffect, useState, useRef } from 'react';
import { MediaPlayer, MediaProvider, Track, MediaProviderAdapter } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { isHLSProvider } from '@vidstack/react';
import Hls from 'hls.js';

const KENJITSU_BASE = "https://kenjitsu.koyeb.app";
const PROXY_URL = "/api/anizone-test?url="; // Using our local diagnostic proxy as we don't have a HF proxy in codebase

export default function DevAnizoneLab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [m3u8Url, setM3u8Url] = useState<string>('');
  const [proxiedUrl, setProxiedUrl] = useState<string>('');
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [poster, setPoster] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const playerRef = useRef<any>(null);

  const addLog = (msg: string, data?: any, error: boolean = false) => {
    setLogs(prev => [...prev, { time: new Date().toISOString(), msg, data, error }]);
  };

  function onProviderChange(provider: MediaProviderAdapter | null) {
    if (isHLSProvider(provider)) {
      provider.library = 'https://cdn.jsdelivr.net/npm/hls.js@^1.0.0/dist/hls.js';
      
      provider.onInstance((hls) => {
        addLog("HLS.js instance attached");
        
        hls.on(Hls.Events.MANIFEST_LOADING, (event, data) => {
          addLog("Manifest Loading", { url: data?.url });
        });
        hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
          addLog("Manifest Loaded", { levels: data?.levels?.length });
        });
        hls.on(Hls.Events.LEVEL_LOADING, (event, data) => {
          addLog("Child Playlist Loading", { url: data?.url, level: data?.level });
        });
        hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
          addLog("TS Segment Request", { url: data?.frag?.url });
        });
        hls.on(Hls.Events.KEY_LOADING, (event, data) => {
          addLog("AES Key Request", { url: data?.frag?.decryptdata?.uri });
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          addLog("HLS Error", { 
            type: data?.type, 
            details: data?.details, 
            fatal: data?.fatal,
            url: data?.frag?.url || data?.url 
          }, true);
        });
      });
    }
  }

  useEffect(() => {
    async function runDiagnostic() {
      try {
        const title = "One Piece";
        addLog(`Step 1: Searching for ${title}...`);
        const searchRes = await fetch(`${KENJITSU_BASE}/api/anizone/anime/search?q=${encodeURIComponent(title)}`);
        if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.status} ${searchRes.statusText}`);
        const searchData = await searchRes.json();
        addLog("Search response:", searchData);

        const animeId = searchData.animes?.[0]?.id || searchData[0]?.id || searchData.results?.[0]?.id;
        if (!animeId) throw new Error("No anime ID found in search results");

        addLog(`Step 3: Fetching details for animeId ${animeId}`);
        const detailsRes = await fetch(`${KENJITSU_BASE}/api/anizone/anime/${animeId}`);
        if (!detailsRes.ok) throw new Error(`Details failed: ${detailsRes.status} ${detailsRes.statusText}`);
        const detailsData = await detailsRes.json();
        addLog("Details response:", detailsData);

        const episodeId = detailsData.episodes?.[0]?.id || detailsData.episodesList?.[0]?.id || detailsData.data?.episodes?.[0]?.id;
        if (!episodeId) throw new Error("No episode ID found in details");

        addLog(`Step 5: Fetching sources for episodeId ${episodeId}`);
        const sourcesRes = await fetch(`${KENJITSU_BASE}/api/anizone/sources/${episodeId}`);
        if (!sourcesRes.ok) throw new Error(`Sources failed: ${sourcesRes.status} ${sourcesRes.statusText}`);
        const sourcesData = await sourcesRes.json();
        addLog("Sources response:", sourcesData);

        const sourceList = sourcesData.sources || sourcesData.data?.sources || sourcesData;
        const mainSource = sourceList?.[0]?.url;
        if (!mainSource) throw new Error("No m3u8 URL found in sources");

        setM3u8Url(mainSource);
        
        const finalProxiedUrl = `${PROXY_URL}${encodeURIComponent(mainSource)}`;
        setProxiedUrl(finalProxiedUrl);

        if (sourcesData.subtitles || sourcesData.data?.subtitles) {
          setSubtitles(sourcesData.subtitles || sourcesData.data?.subtitles);
        }
        if (sourcesData.poster || detailsData.poster || detailsData.data?.poster) {
          setPoster(sourcesData.poster || detailsData.poster || detailsData.data?.poster);
        }

        addLog("Diagnostic setup complete. Loading into Vidstack.");
      } catch (err: any) {
        addLog(err.message || String(err), null, true);
      } finally {
        setLoading(false);
      }
    }
    runDiagnostic();
  }, []);

  return (
    <div className="p-8 mt-10 max-w-6xl mx-auto space-y-6 bg-black text-white rounded-lg">
      <h1 className="text-3xl font-bold border-b border-white/20 pb-4">Anizone Lab Diagnostics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Player</h2>
          {loading ? (
            <div className="aspect-video bg-white/5 animate-pulse rounded flex items-center justify-center">
              Loading stream...
            </div>
          ) : proxiedUrl ? (
            <div className="aspect-video bg-black rounded shadow-lg overflow-hidden border border-white/10">
              <MediaPlayer 
                ref={playerRef} 
                src={proxiedUrl} 
                poster={poster} 
                controls 
                className="w-full h-full"
                onProviderChange={onProviderChange}
              >
                <MediaProvider>
                  {subtitles.map((sub, i) => (
                    <Track 
                      key={String(i)}
                      src={sub.url}
                      kind="captions"
                      label={String(sub.lang || sub.language || 'Unknown')}
                      default={sub.lang === 'English' || sub.language === 'en'}
                    />
                  ))}
                </MediaProvider>
                <DefaultVideoLayout icons={defaultLayoutIcons} />
              </MediaPlayer>
            </div>
          ) : (
            <div className="aspect-video bg-red-900/20 text-red-500 rounded flex items-center justify-center border border-red-500/50">
              Failed to load stream. Check logs.
            </div>
          )}

          <div className="bg-white/5 p-4 rounded text-sm space-y-2 break-all overflow-hidden font-mono border border-white/10">
            <p><span className="text-gray-400">Raw URL:</span> <br/>{m3u8Url || 'N/A'}</p>
            <p><span className="text-gray-400">Proxied URL:</span> <br/>{proxiedUrl || 'N/A'}</p>
            <p><span className="text-gray-400">Subtitles Count:</span> {subtitles.length}</p>
            <p><span className="text-gray-400">Poster:</span> {poster ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Diagnostic Logs</h2>
          <div className="bg-black/50 p-4 rounded h-[600px] overflow-y-auto font-mono text-xs space-y-3 border border-white/10 shadow-inner">
            {logs.map((log, i) => (
              <div key={i} className={`p-2 rounded ${log.error ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/5 border border-white/5'}`}>
                <div className="text-[10px] text-gray-500 mb-1">{log.time}</div>
                <div className="font-semibold">{log.msg}</div>
                {log.data && (
                  <pre className="mt-2 text-gray-400 overflow-x-auto p-2 bg-black/50 rounded">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
