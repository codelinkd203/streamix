import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, Loader2, ArrowLeft,
  Captions, Languages, Monitor, ChevronRight, Check,
  RotateCcw, RotateCw, Sliders, SkipForward
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SubtitleOverlay from './SubtitleOverlay';

export default function VideoPlayer({
  sources = [],
  subtitles = [],
  title,
  onBack,
  poster,
  onNextEpisode,
  hasNextEpisode,
  onTimeUpdate,
  intro,
  isMovie,
  startTime,
  onLoadSubtitle
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const seekBarRef = useRef(null);
  const isSeeking = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buffered, setBuffered] = useState(0);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState('main');
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [qualities, setQualities] = useState([]);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(0);
  const [availableCaptions, setAvailableCaptions] = useState([]);
  const [selectedCaption, setSelectedCaption] = useState(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const currentSource = sources[selectedSourceIndex];
  const streamUrl = currentSource?.url;

  const isEmbed = currentSource?.type === 'embed';



  // ── HLS / video setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isEmbed) {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setError(null);
    setQualities([]);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHLS = streamUrl.includes('.m3u8');

    if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari / iOS)
      video.src = streamUrl;
      const onMeta = () => { 
        setIsLoading(false); 
        if (startTime > 0) {
          video.currentTime = startTime;
        }
        video.play().catch(() => {}); 
      };
      video.addEventListener('loadedmetadata', onMeta);
      return () => { video.removeEventListener('loadedmetadata', onMeta); };
    } else if (Hls.isSupported() && isHLS) {
      const hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: true,
        maxBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        const lvls = hls.levels.map((l, i) => ({ label: `${l.height}p`, index: i }));
        setQualities([{ label: 'Auto', index: -1 }, ...lvls]);
        if (hls.audioTracks?.length > 0) {
          setAudioTracks(hls.audioTracks.map((t, i) => ({ index: i, label: t.name || t.lang || `Track ${i + 1}` })));
        }
        if (startTime > 0) {
          video.currentTime = startTime;
        }
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        // Don't show error UI — Watch.jsx handles retries/fallback
      });

      return () => hls.destroy();
    } else {
      video.src = streamUrl;
      const onMeta = () => { 
        setIsLoading(false); 
        if (startTime > 0) {
          video.currentTime = startTime;
        }
        video.play().catch(() => {}); 
      };
      video.addEventListener('loadedmetadata', onMeta);
      return () => { video.removeEventListener('loadedmetadata', onMeta); };
    }
  }, [streamUrl, sources.length, selectedSourceIndex]);

  // Set audio tracks from source metadata
  useEffect(() => {
    if (currentSource?.audioTracks) {
      setAudioTracks(currentSource.audioTracks.map((t, i) => ({ index: i, label: t.label || t.language || `Track ${i + 1}` })));
    }
  }, [currentSource]);

  // Set captions from the subtitles prop
  useEffect(() => {
    const seen = new Set();
    const deduped = (subtitles || []).filter(s => {
      if (seen.has(s.label)) return false;
      seen.add(s.label);
      return true;
    });
    setAvailableCaptions(deduped.map((c, i) => ({
      index: i,
      label: c.label || c.language || `Sub ${i + 1}`,
      language: c.language,
      url: c.url || null,
      rawUrl: c.rawUrl || null,
      hasCors: c.hasCors || false,
    })));
    // Reset caption selection when subtitles change (e.g. episode switch)
    setSelectedCaption(null);
    setCaptionsEnabled(false);
  }, [subtitles]);

  // Hide all native video tracks — only external subs are used
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const hideNative = () => {
      if (v.textTracks) {
        for (let i = 0; i < v.textTracks.length; i++) {
          v.textTracks[i].mode = 'hidden';
        }
      }
    };
    v.addEventListener('loadedmetadata', hideNative);
    if (v.textTracks) v.textTracks.addEventListener('addtrack', hideNative);
    return () => {
      v.removeEventListener('loadedmetadata', hideNative);
      if (v.textTracks) v.textTracks.removeEventListener('addtrack', hideNative);
    };
  }, []);

  // ── Video event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (isEmbed) return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (!isSeeking.current) setCurrentTime(v.currentTime);
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
      if (onTimeUpdate) onTimeUpdate(v.currentTime, v.duration);
    };
    const onDur = () => setDuration(v.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWait = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('durationchange', onDur);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('waiting', onWait);
    v.addEventListener('playing', onPlaying);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('durationchange', onDur);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('waiting', onWait);
      v.removeEventListener('playing', onPlaying);
    };
  }, []);

  // ── Controls visibility ────────────────────────────────────────────────────
  const resetControlsTimer = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings) setShowControls(false);
    }, 3500);
  };

  // ── Playback helpers ───────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    v?.paused ? v.play() : v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleVolumeChange = (e) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    if (v) { v.volume = val; v.muted = val === 0; }
    setVolume(val);
    setIsMuted(val === 0);
  };

  const skip = (sec) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(Math.max(v.currentTime + sec, 0), duration);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // ── Seek bar (mouse) ───────────────────────────────────────────────────────
  const getSeekPercent = (e) => {
    const bar = seekBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
  };

  const handleSeekMouseDown = (e) => {
    isSeeking.current = true;
    const pct = getSeekPercent(e);
    setCurrentTime(pct * duration);
    if (videoRef.current) videoRef.current.currentTime = pct * duration;
  };

  const handleSeekMouseMove = (e) => {
    const pct = getSeekPercent(e);
    setHoverX(e.clientX - seekBarRef.current?.getBoundingClientRect().left || 0);
    setHoverTime(pct * duration);
    if (isSeeking.current && videoRef.current) {
      const t = pct * duration;
      setCurrentTime(t);
      videoRef.current.currentTime = t;
    }
  };

  const handleSeekMouseUp = (e) => {
    if (!isSeeking.current) return;
    isSeeking.current = false;
    const pct = getSeekPercent(e);
    const t = pct * duration;
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleSeekMouseUp);
    return () => window.removeEventListener('mouseup', handleSeekMouseUp);
  }, [duration]);

  // ── Settings handlers ──────────────────────────────────────────────────────
  const handleSpeedChange = (speed) => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
    setPlaybackSpeed(speed);
    setSettingsMenu('main');
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP failed', err);
    }
  };

  const handleQualityChange = (q) => {
    if (hlsRef.current) hlsRef.current.currentLevel = q.index;
    setSelectedQuality(q.label);
    setSettingsMenu('main');
  };

  const handleServerChange = (idx) => {
    const t = videoRef.current?.currentTime || 0;
    setSelectedSourceIndex(idx);
    setTimeout(() => { if (videoRef.current) videoRef.current.currentTime = t; }, 1200);
    setShowSettings(false);
    setSettingsMenu('main');
  };

  const handleAudioChange = (idx) => {
    if (hlsRef.current?.audioTracks) hlsRef.current.audioTrack = idx;
    setSelectedAudioTrack(idx);
    setSettingsMenu('main');
  };

  const handleCaptionChange = async (cap) => {
    if (!cap) {
      setSelectedCaption(null);
      setCaptionsEnabled(false);
      setSettingsMenu('main');
      return;
    }

    // If this sub hasn't been downloaded yet, load it now
    let resolvedCap = cap;
    if (!cap.url && cap.rawUrl && onLoadSubtitle) {
      try {
        const vttUrl = await onLoadSubtitle(cap.rawUrl, cap.hasCors);
        resolvedCap = { ...cap, url: vttUrl };
        // Update the availableCaptions list so the track element renders
        setAvailableCaptions(prev => prev.map(c => c.index === cap.index ? resolvedCap : c));
      } catch (e) {
        console.warn('[Sub] failed to load', cap.label, e);
      }
    }

    setSelectedCaption(resolvedCap);
    setCaptionsEnabled(true);
    setSettingsMenu('main');
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': skip(-10); break;
        case 'ArrowRight': skip(10); break;
        case 'ArrowUp': { const v = videoRef.current; if (v) { v.volume = Math.min(1, v.volume + 0.1); setVolume(v.volume); } break; }
        case 'ArrowDown': { const v = videoRef.current; if (v) { v.volume = Math.max(0, v.volume - 0.1); setVolume(v.volume); } break; }
        case 'm': toggleMute(); break;
        case 'f': toggleFullscreen(); break;
        case 'Escape': setShowSettings(false); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmt = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };

  const servers = sources.map((s, i) => ({
    index: i,
    name: s.provider?.name || s.provider?.id || `Server ${i + 1}`,
    quality: s.quality || '—',
    type: s.type || ''
  }));

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none"
      style={{ fontFamily: "'Geist', sans-serif", cursor: showControls ? 'default' : 'none' }}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && !showSettings && setShowControls(false)}
      onDoubleClick={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        skip(x < rect.width / 2 ? -10 : 10);
      }}
    >
      {/* ── Video / Embed ── */}
      {isEmbed ? (
        <>
          <iframe
            src={streamUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          />
          {/* Back button overlay for embed mode */}
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 bg-black/70 backdrop-blur-sm border border-zinc-700 text-white rounded-md hover:bg-black/90 transition-all text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </>
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={poster}
          playsInline
          onClick={togglePlay}
        >
          {availableCaptions.filter(cap => cap.url).map(cap => (
            <track
              key={cap.index}
              kind="subtitles"
              label={cap.label}
              srcLang={cap.language || 'en'}
              src={cap.url}
              default={selectedCaption?.index === cap.index}
            />
          ))}
        </video>
      )}

      {/* ── Custom subtitle overlay (moves up when controls shown) ── */}
      {captionsEnabled && selectedCaption && (
        <SubtitleOverlay
          videoRef={videoRef}
          caption={selectedCaption}
          showControls={showControls}
        />
      )}

      {/* ── Buffering spinner ── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/80 backdrop-blur-sm p-4 rounded-md border border-zinc-800 shadow-2xl">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error state ── */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="text-center space-y-4 px-6 bg-black p-8 rounded-md border border-zinc-800 shadow-2xl max-w-sm w-full">
            <div className="w-10 h-10 mx-auto rounded-md bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <RotateCcw className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-zinc-300 text-sm font-medium">{error}</p>
            <div className="flex flex-col gap-2 pt-2">
              {servers.length > 1 && (
                <button
                  onClick={() => handleServerChange((selectedSourceIndex + 1) % servers.length)}
                  className="w-full py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-md transition-colors"
                >
                  Try Next Server
                </button>
              )}
              <button
                onClick={onBack}
                className="w-full py-2 bg-transparent border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs font-semibold rounded-md transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Controls overlay ── */}
      <AnimatePresence>
        {showControls && !error && !isEmbed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between"
          >
            {/* Top gradient */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

            {/* ── Top bar ── */}
            <div className="relative z-10 flex items-center gap-4 px-6 pt-6">
              <button
                onClick={onBack}
                className="group flex items-center justify-center w-8 h-8 rounded-md bg-black border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="flex-1 text-zinc-200 text-sm font-medium truncate tracking-tight">{title}</h1>
              {currentSource?.provider && (
                <span className="text-[10px] font-mono text-zinc-400 bg-black border border-zinc-800 px-2 py-1 rounded-sm shrink-0 uppercase tracking-wider">
                  {currentSource.provider.name} <span className="mx-1 opacity-50">/</span> {currentSource.quality}
                </span>
              )}
            </div>

            {/* ── Center play (paused only) ── */}
            <div className="flex-1 flex items-center justify-center relative">
              <AnimatePresence>
                {!isPlaying && !isLoading && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={togglePlay}
                    className="w-16 h-16 rounded-full bg-black/80 backdrop-blur-md border border-zinc-800 flex items-center justify-center hover:border-zinc-500 hover:bg-zinc-900 transition-all group shadow-2xl"
                  >
                    <Play className="w-6 h-6 text-white fill-white ml-1 transition-colors" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* ── Bottom controls ── */}
            <div className="relative z-10 px-6 pb-6 space-y-4">

              {/* ── Seek bar ── */}
              <div
                ref={seekBarRef}
                className="group/seek relative h-6 flex items-center cursor-pointer"
                onMouseDown={handleSeekMouseDown}
                onMouseMove={handleSeekMouseMove}
                onMouseLeave={() => setHoverTime(null)}
              >
                {/* Track */}
                <div className="relative w-full h-1 group-hover/seek:h-1.5 transition-all duration-200 bg-zinc-800 overflow-hidden rounded-sm">
                  {/* Buffered */}
                  <div
                    className="absolute inset-y-0 left-0 bg-zinc-700"
                    style={{ width: `${bufferedPct}%` }}
                  />
                  {/* Progress */}
                  <div
                    className="absolute inset-y-0 left-0 bg-white"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {/* Thumb — only appears on hover */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `calc(${progress}% - 6px)` }}
                />
                {/* Hover time tooltip */}
                {hoverTime !== null && (
                  <div
                    className="absolute -top-10 bg-black text-zinc-300 font-mono text-[10px] px-2 py-1 rounded-sm pointer-events-none border border-zinc-800"
                    style={{ left: `${hoverX}px`, transform: 'translateX(-50%)' }}
                  >
                    {fmt(hoverTime)}
                  </div>
                )}
              </div>

              {/* ── Button row ── */}
              <div className="flex items-center gap-2">
                {/* Left group */}
                <div className="flex items-center gap-1 flex-1">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-900 transition-all"
                  >
                    {isPlaying
                      ? <Pause className="w-5 h-5 fill-current" />
                      : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  {/* Skip back */}
                  <button
                    onClick={() => skip(-10)}
                    className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-900 transition-all hidden sm:block"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Skip forward */}
                  <button
                    onClick={() => skip(10)}
                    className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-900 transition-all hidden sm:block"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center group/vol ml-1">
                    <button
                      onClick={toggleMute}
                      className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-900 transition-all"
                    >
                      {isMuted || volume === 0
                        ? <VolumeX className="w-4 h-4" />
                        : <Volume2 className="w-4 h-4" />}
                    </button>
                    <div className="overflow-hidden w-0 group-hover/vol:w-24 transition-all duration-300 hidden sm:flex items-center justify-center">
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 accent-white h-1 bg-zinc-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-zinc-400 font-mono text-[11px] ml-4 tabular-nums tracking-wider">
                    <span className="text-zinc-200">{fmt(currentTime)}</span> <span className="text-zinc-600 mx-1">/</span> {fmt(duration)}
                  </div>
                </div>

                {/* Right group */}
                <div className="flex items-center gap-1">
                  {/* Next episode */}
                  {hasNextEpisode && (
                    <button
                      onClick={onNextEpisode}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-zinc-300 hover:text-white text-xs font-medium bg-black border border-zinc-800 hover:border-zinc-600 rounded-md transition-all mr-2"
                    >
                      Next <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* PiP */}
                  {document.pictureInPictureEnabled && (
                    <button
                      onClick={togglePiP}
                      className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-900 transition-all hidden sm:block"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
                        <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                        <rect x="12" y="11" width="7" height="6" rx="1" ry="1"></rect>
                      </svg>
                    </button>
                  )}

                  {/* Airplay */}
                  {window.WebKitPlaybackTargetAvailabilityEvent && (
                    <button
                      onClick={() => videoRef.current?.webkitShowPlaybackTargetPicker()}
                      className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-900 transition-all hidden sm:block"
                    >
                      <Monitor className="w-5 h-5" />
                    </button>
                  )}

                  {/* CC shortcut */}
                  {availableCaptions.length > 0 && (
                    <button
                      onClick={() => { setShowSettings(true); setSettingsMenu('captions'); }}
                      className={`p-2 rounded-md transition-all ${captionsEnabled ? 'text-black bg-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                    >
                      <Captions className="w-5 h-5" />
                    </button>
                  )}

                  {/* Settings */}
                  <button
                    onClick={() => { setShowSettings(v => !v); setSettingsMenu('main'); }}
                    className={`p-2 rounded-md transition-all ${showSettings ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-900 transition-all"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Settings panel ── */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-[88px] right-6 w-64 rounded-md overflow-hidden shadow-2xl bg-black border border-zinc-800"
                >
                  {/* Main menu */}
                  {settingsMenu === 'main' && (
                    <div className="py-1">
                      <div className="px-3 pt-2 pb-1 border-b border-zinc-800/50 mb-1">
                        <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Playback</p>
                      </div>
                      {/* Server menu removed — single source API */}
                      {qualities.length > 0 && (
                        <MenuItem
                          icon={<Sliders className="w-4 h-4" />}
                          label="Quality"
                          value={selectedQuality}
                          onClick={() => setSettingsMenu('quality')}
                        />
                      )}
                      {audioTracks.length > 1 && (
                        <MenuItem
                          icon={<Languages className="w-4 h-4" />}
                          label="Audio"
                          value={audioTracks[selectedAudioTrack]?.label}
                          onClick={() => setSettingsMenu('audio')}
                        />
                      )}
                      {availableCaptions.length > 0 && (
                        <MenuItem
                          icon={<Captions className="w-4 h-4" />}
                          label="Subtitles"
                          value={selectedCaption?.label || 'Off'}
                          onClick={() => setSettingsMenu('captions')}
                        />
                      )}
                      <MenuItem
                        icon={<RotateCw className="w-4 h-4" />}
                        label="Speed"
                        value={playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}
                        onClick={() => setSettingsMenu('speed')}
                      />
                      <div className="h-2" />
                    </div>
                  )}

                  {/* Sub-menus */}
                  {settingsMenu !== 'main' && (
                    <div className="py-1">
                      <button
                        onClick={() => setSettingsMenu('main')}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors border-b border-zinc-800/50 mb-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono uppercase tracking-widest">
                          {settingsMenu === 'server' ? 'Server' : settingsMenu === 'quality' ? 'Quality' : settingsMenu === 'audio' ? 'Audio' : settingsMenu === 'speed' ? 'Speed' : 'Subtitles'}
                        </span>
                      </button>
                      <div className="max-h-56 overflow-y-auto pb-1 scrollbar-hide">
                        {/* server menu removed */}
                        {settingsMenu === 'quality' && qualities.map(q => (
                          <OptionItem
                            key={q.index}
                            label={q.label}
                            selected={selectedQuality === q.label}
                            onClick={() => handleQualityChange(q)}
                          />
                        ))}
                        {settingsMenu === 'audio' && audioTracks.map(t => (
                          <OptionItem
                            key={t.index}
                            label={t.label}
                            selected={selectedAudioTrack === t.index}
                            onClick={() => handleAudioChange(t.index)}
                          />
                        ))}
                        {settingsMenu === 'captions' && (
                          <>
                            <OptionItem
                              label="Off"
                              selected={!selectedCaption}
                              onClick={() => handleCaptionChange(null)}
                            />
                            {availableCaptions.map(c => (
                              <OptionItem
                                key={c.index}
                                label={c.label}
                                selected={selectedCaption?.index === c.index}
                                onClick={() => handleCaptionChange(c)}
                              />
                            ))}
                          </>
                        )}
                        {settingsMenu === 'speed' && [0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                          <OptionItem
                            key={s}
                            label={s === 1 ? 'Normal' : `${s}x`}
                            selected={playbackSpeed === s}
                            onClick={() => handleSpeedChange(s)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Small shared sub-components ───────────────────────────────────────────────
function MenuItem({ icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-900 transition-colors group"
    >
      <div className="flex items-center gap-2.5 text-zinc-400 group-hover:text-zinc-200 transition-colors">
        {React.cloneElement(icon, { className: 'w-3.5 h-3.5' })}
        <span className="text-xs font-medium text-zinc-200">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-zinc-500 group-hover:text-zinc-400 transition-colors">
        <span className="text-[10px] font-mono truncate max-w-[80px]">{value}</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
}

function OptionItem({ label, badge, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${selected ? 'text-white bg-zinc-900' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{label}</span>
        {badge && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-zinc-800 rounded-sm text-zinc-400">{badge}</span>
        )}
      </div>
      {selected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
    </button>
  );
}
