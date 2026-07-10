import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { TMDBService } from '@/components/streaming/TMDBService';
import VideoPlayer from '@/components/streaming/VideoPlayer';
import { AlertCircle } from 'lucide-react';

const VIDLINK_ADFREE_BASE = 'https://vidlink-adfree.vercel.app';
const CORSPROXY_IO = 'https://cors-proxy.iammrbeastbackup.workers.dev/?url=';
const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3d — long enough to feel instant on repeat visits, short enough to stay ahead of signed-URL expiry for binge watchers :D

// ISO 639-2/1 code → full language name
const LANG_NAMES = {
  eng: 'English', spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian',
  por: 'Portuguese', rus: 'Russian', jpn: 'Japanese', kor: 'Korean', zho: 'Chinese',
  ara: 'Arabic', hin: 'Hindi', tur: 'Turkish', pol: 'Polish', nld: 'Dutch',
  swe: 'Swedish', nor: 'Norwegian', dan: 'Danish', fin: 'Finnish', ces: 'Czech',
  slk: 'Slovak', hun: 'Hungarian', ron: 'Romanian', bul: 'Bulgarian', hrv: 'Croatian',
  srp: 'Serbian', ukr: 'Ukrainian', heb: 'Hebrew', tha: 'Thai', vie: 'Vietnamese',
  ind: 'Indonesian', msa: 'Malay', fil: 'Filipino', ben: 'Bengali', ell: 'Greek',
  pte: 'Portuguese (Brazil)', ptb: 'Portuguese (Brazil)',
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', hi: 'Hindi', tr: 'Turkish', pl: 'Polish', nl: 'Dutch',
};

function langName(code) {
  if (!code) return 'Unknown';
  return LANG_NAMES[code.toLowerCase()] || code.toUpperCase();
}

// vidlink-adfree returns captions with native display names instead of ISO codes
// (e.g. "Français", "中文", "اَلْعَرَبِيَّةُ") — map those to a code + English label.
const NATIVE_LANG_MAP = {
  'اَلْعَرَبِيَّةُ': { code: 'ar', label: 'Arabic' },
  'বাংলা': { code: 'bn', label: 'Bengali' },
  'English': { code: 'en', label: 'English' },
  'Filipino': { code: 'fil', label: 'Filipino' },
  'Français': { code: 'fr', label: 'French' },
  'Indonesian': { code: 'id', label: 'Indonesian' },
  'Malay': { code: 'ms', label: 'Malay' },
  'Português': { code: 'pt', label: 'Portuguese' },
  'Русский': { code: 'ru', label: 'Russian' },
  'اُردُو': { code: 'ur', label: 'Urdu' },
  '中文': { code: 'zh', label: 'Chinese' },
};

function resolveLangInfo(nativeName) {
  if (!nativeName) return { code: 'und', label: 'Unknown' };
  const known = NATIVE_LANG_MAP[nativeName];
  if (known) return known;
  return { code: nativeName.slice(0, 2).toLowerCase(), label: nativeName };
}

function vidlinkCacheKey(tmdbId, type, season, episode) {
  return type === 'tv'
    ? `vidlink_adfree_cache_${tmdbId}_tv_${season}_${episode}`
    : `vidlink_adfree_cache_${tmdbId}_movie`;
}

function readVidlinkCache(tmdbId, type, season, episode) {
  try {
    const raw = localStorage.getItem(vidlinkCacheKey(tmdbId, type, season, episode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeVidlinkCache(tmdbId, type, season, episode, data) {
  try {
    localStorage.setItem(vidlinkCacheKey(tmdbId, type, season, episode), JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

// Fetch the vidlink-adfree scrape response — direct fetch first, then corsproxy, then a final direct retry
async function fetchVidlinkAdfree(tmdbId, type, season, episode) {
  const url = type === 'tv'
    ? `${VIDLINK_ADFREE_BASE}/api/scrape?id=${tmdbId}&s=${season}&e=${episode}&type=tv`
    : `${VIDLINK_ADFREE_BASE}/api/scrape?id=${tmdbId}&type=movie`;

  const fetchDirect = async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const fetchViaCorsProxy = async () => {
    const res = await fetch(`${CORSPROXY_IO}${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  try {
    return await fetchViaCorsProxy();
  } catch {
    try {
      return await fetchDirect();
    } catch {
      return await fetchViaCorsProxy();
    }
  }
}

// Extract subtitle list from a vidlink-adfree response
function parseSubtitles(data) {
  const tracks = data?.captions?.tracks;
  if (!Array.isArray(tracks) || tracks.length === 0) return [];
  const corsAllowed = data?.captions?.corsAllowed !== false;
  const parsed = tracks.map((track) => {
    const { code, label } = resolveLangInfo(track.language);
    return {
      label,
      language: code,
      rawUrl: track.url,
      hasCors: !corsAllowed,
      url: null, // populated on-demand
    };
  });
  // English first (and flagged default) so it's the subtitle track selected on load
  parsed.sort((a, b) => (a.language === 'en' ? -1 : 0) - (b.language === 'en' ? -1 : 0));
  return parsed.map((sub, i) => ({ ...sub, index: i, default: sub.language === 'en' }));
}

// Extract best-quality stream URL from a vidlink-adfree response
function parseStreamUrl(data) {
  const qualities = data?.streams?.qualities;
  if (!Array.isArray(qualities) || qualities.length === 0) throw new Error('No stream in response');
  const best = [...qualities].sort((a, b) => parseInt(b.quality) - parseInt(a.quality))[0];
  if (!best?.url) throw new Error('No stream URL in response');
  return best.url;
}

// Build a vidlink-adfree embed wrapped in a nested same-origin iframe (no sandbox) to neutralize ad/frame detection
function buildVidlinkEmbed(tmdbId, type, season, episode) {
  const vidlinkUrl = type === 'tv'
    ? `https://vidlink-adfree.vercel.app/tv/${tmdbId}/${season}/${episode}`
    : `https://vidlink-adfree.vercel.app/movie/${tmdbId}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100vw;height:100vh;overflow:hidden;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${vidlinkUrl}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture"></iframe></body></html>`;
  return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
}

// Load a single subtitle on-demand — direct fetch first (captions are usually CORS-allowed), then corsproxy, then a final direct retry
async function loadSubVtt(rawUrl) {
  let subText;
  const fetchDirect = async () => {
    const res = await fetch(rawUrl);
    if (!res.ok) throw new Error(`direct HTTP ${res.status}`);
    return res.text();
  };
  const fetchViaCorsProxy = async () => {
    const res = await fetch(`${CORSPROXY_IO}${encodeURIComponent(rawUrl)}`);
    if (!res.ok) throw new Error(`proxy HTTP ${res.status}`);
    return res.text();
  };

  try {
    subText = await fetchViaCorsProxy();
  } catch {
    try {
      subText = await fetchDirect();
    } catch {
      subText = await fetchViaCorsProxy();
    }
  }

  const vttContent = subText.trimStart().startsWith('WEBVTT') ? subText
    : 'WEBVTT\n\n' + subText.replace(/\r+/g, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').trim();
  const blob = new Blob([vttContent], { type: 'text/vtt' });
  return URL.createObjectURL(blob);
}

export default function Watch() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const type = urlParams.get('type') || 'movie';
  const seasonParam = parseInt(urlParams.get('season')) || 1;
  const episodeParam = parseInt(urlParams.get('episode')) || 1;

  const [details, setDetails] = useState(null);
  const [sources, setSources] = useState([]);
  const [subtitles, setSubtitles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(seasonParam);
  const [selectedEpisode, setSelectedEpisode] = useState(episodeParam);
  const [seasonDetails, setSeasonDetails] = useState(null);
  const [startTime, setStartTime] = useState(0);
  const [posterUrl, setPosterUrl] = useState(null);

  const lastSaveRef = useRef(0);

  // Restore progress
  useEffect(() => {
    const saved = localStorage.getItem('continueWatching');
    if (saved) {
      const cwList = JSON.parse(saved);
      const item = cwList.find(i => i.id === parseInt(id) && (type === 'movie' || (i.season === selectedSeason && i.episode === selectedEpisode)));
      setStartTime(item?.progressTime && item.progress < 95 ? item.progressTime : 0);
    }
  }, [id, type, selectedSeason, selectedEpisode]);

  // Fetch content details + full-res backdrop
  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        const data = type === 'tv'
          ? await TMDBService.getTVDetails(id)
          : await TMDBService.getMovieDetails(id);
        setDetails(data);
        if (data?.backdrop_path) {
          setPosterUrl(`https://image.tmdb.org/t/p/original${data.backdrop_path}`);
        } else if (data?.poster_path) {
          setPosterUrl(`https://image.tmdb.org/t/p/original${data.poster_path}`);
        }
      } catch (err) {
        console.error('Error fetching details:', err);
      }
    };
    fetchDetails();
  }, [id, type]);

  // Fetch season details for TV shows
  useEffect(() => {
    if (type === 'tv' && details && selectedSeason) {
      TMDBService.getTVSeasonDetails(id, selectedSeason)
        .then(setSeasonDetails)
        .catch(err => console.error('Error fetching season:', err));
    }
  }, [id, type, details, selectedSeason]);

  // Fetch vidlink-adfree data once — drives both subtitles and the stream source. Cached for fast repeat loads.
  useEffect(() => {
    if (!id) return;
    const run = { aborted: false };

    const playerMode = localStorage.getItem('player_mode') || 'hls';

    setIsLoading(true);
    setSources([]);
    setSubtitles([]);
    setError(null);

    const vidlinkEmbed = buildVidlinkEmbed(id, type, selectedSeason, selectedEpisode);

    if (playerMode !== 'hls') {
      setSources([{ url: vidlinkEmbed, type: 'embed' }]);
      setIsLoading(false);
      return () => { run.aborted = true; };
    }

    const applyData = (data) => {
      const parsedSubs = parseSubtitles(data);
      const streamUrl = parseStreamUrl(data); // throws first if data is malformed, before any state is touched
      if (run.aborted) return;
      setSubtitles(parsedSubs);
      setSources([{ url: `${CORSPROXY_IO}${encodeURIComponent(streamUrl)}`, type: 'mp4' }]);
      setIsLoading(false);
    };

    // Fast path: use a cached response if it's still fresh
    const cached = readVidlinkCache(id, type, selectedSeason, selectedEpisode);
    if (cached) {
      try {
        applyData(cached);
        return () => { run.aborted = true; };
      } catch {
        // cached data was bad somehow — fall through to a fresh fetch below
      }
    }

    const attempt = () => {
      if (run.aborted) return;
      fetchVidlinkAdfree(id, type, selectedSeason, selectedEpisode)
        .then(data => {
          if (run.aborted) return;
          applyData(data);
          writeVidlinkCache(id, type, selectedSeason, selectedEpisode, data);
        })
        .catch(err => {
          if (run.aborted) return;
          console.warn('vidlink-adfree fetch failed, falling back to embed:', err.message);
          // vidlink-adfree failed — fall back to embed immediately (nested iframe, no sandbox)
          setSources([{ url: buildVidlinkEmbed(id, type, selectedSeason, selectedEpisode), type: 'embed' }]);
          setIsLoading(false);
        });
    };

    attempt();
    return () => { run.aborted = true; };
  }, [id, type, selectedSeason, selectedEpisode]);

  const handleBack = () => navigate(createPageUrl('Details') + `?id=${id}&type=${type}`);

  const handleEpisodeSelect = (season, episode) => {
    setSelectedSeason(season);
    setSelectedEpisode(episode);
    window.history.pushState({}, '', createPageUrl('Watch') + `?id=${id}&type=${type}&season=${season}&episode=${episode}`);
  };

  const handleNextEpisode = () => {
    if (!seasonDetails?.episodes) return;
    const currentIdx = seasonDetails.episodes.findIndex(e => e.episode_number === selectedEpisode);
    if (currentIdx < seasonDetails.episodes.length - 1) {
      handleEpisodeSelect(selectedSeason, selectedEpisode + 1);
    } else if (details?.seasons?.some(s => s.season_number === selectedSeason + 1)) {
      handleEpisodeSelect(selectedSeason + 1, 1);
    }
  };

  const hasNextEpisode = () => {
    if (type !== 'tv' || !seasonDetails?.episodes) return false;
    const currentIdx = seasonDetails.episodes.findIndex(e => e.episode_number === selectedEpisode);
    if (currentIdx < seasonDetails.episodes.length - 1) return true;
    return details?.seasons?.some(s => s.season_number === selectedSeason + 1) ?? false;
  };

  const title = details?.title || details?.name || 'Loading...';
  const currentEpisode = seasonDetails?.episodes?.find(e => e.episode_number === selectedEpisode);
  const displayTitle = type === 'tv' && currentEpisode
    ? `${title} - S${selectedSeason}:E${selectedEpisode} "${currentEpisode.name}"`
    : title;

  const handleTimeUpdate = (time, duration) => {
    if (!details || duration <= 0) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 5000) return;
    lastSaveRef.current = now;
    const progress = (time / duration) * 100;
    const saved = localStorage.getItem('continueWatching');
    let cwList = saved ? JSON.parse(saved) : [];
    const itemIndex = cwList.findIndex(i => i.id === parseInt(id));
    const cwItem = { ...details, media_type: type, progress, progressTime: time, season: selectedSeason, episode: selectedEpisode, timestamp: now };
    if (itemIndex >= 0) cwList[itemIndex] = cwItem;
    else cwList.unshift(cwItem);
    cwList.sort((a, b) => b.timestamp - a.timestamp);
    cwList = cwList.slice(0, 20);
    localStorage.setItem('continueWatching', JSON.stringify(cwList));
  };

  return (
    <div className="fixed inset-0 bg-black z-50" style={{ fontFamily: "'Geist', sans-serif" }}>
      {/* Full-res blurred backdrop behind everything */}
      {posterUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${posterUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px) brightness(0.25)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="w-10 h-10 border-4 border-zinc-700 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-zinc-400 text-sm">Finding a server…</p>
        </div>
      )}

      {/* Error State (only set explicitly, not from stream retries) */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center max-w-md px-4">
            <AlertCircle className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-white text-xl font-semibold mb-2">Unable to Play</h2>
            <p className="text-zinc-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleBack} className="px-6 py-2.5 bg-transparent border border-zinc-700 text-white rounded-md hover:bg-zinc-800 transition-colors font-medium">Go Back</button>
              <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-white text-black rounded-md hover:bg-zinc-200 transition-colors font-medium">Try Again</button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player — render as soon as sources are ready, regardless of loading state */}
      {sources.length > 0 && (
        <VideoPlayer
          sources={sources}
          subtitles={subtitles}
          title={displayTitle}
          onBack={handleBack}
          poster={posterUrl}
          onNextEpisode={handleNextEpisode}
          hasNextEpisode={hasNextEpisode()}
          onTimeUpdate={handleTimeUpdate}
          isMovie={type === 'movie'}
          startTime={startTime}
          onLoadSubtitle={loadSubVtt}
        />
      )}
    </div>
  );
}