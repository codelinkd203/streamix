import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Loader2, Users, Play, ChevronDown, Calendar, Signal, Radio, ChevronLeft, ChevronRight } from 'lucide-react';
import { proxyFetchJSON, BASE_URL, badgeUrl, posterUrl, formatMatchDate, SPORT_EMOJI } from '@/components/streaming/SportsService';

// ── Match Card ──────────────────────────────────────────────────────────────
function MatchCard({ match, onClick, className }) {
  const pUrl = posterUrl(match.poster);
  const homeBadge = badgeUrl(match.teams?.home?.badge);
  const awayBadge = badgeUrl(match.teams?.away?.badge);
  const homeName = match.teams?.home?.name;
  const awayName = match.teams?.away?.name;

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
      onClick={onClick}
      className={`relative rounded-md overflow-hidden bg-zinc-900 border border-zinc-800/60 hover:border-zinc-500 hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all group text-left ${className || 'w-full'}`}>
      
      <div className="relative aspect-video bg-gradient-to-br from-zinc-800 to-zinc-950">
        {pUrl && <img src={pUrl} alt={match.title} loading="lazy" className="w-full h-full object-cover" onError={(e) => {e.target.style.display = 'none';}} />}

        {!pUrl &&
        <div className="absolute inset-0 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              {homeBadge && <img src={homeBadge} alt="" className="w-12 h-12 object-contain" onError={(e) => {e.target.style.display = 'none';}} />}
              {homeName && <span className="text-zinc-400 text-xs font-medium truncate max-w-[100px]">{homeName}</span>}
            </div>
            <span className="text-zinc-600 text-xl font-bold">VS</span>
            <div className="flex flex-col items-center gap-2">
              {awayBadge && <img src={awayBadge} alt="" className="w-12 h-12 object-contain" onError={(e) => {e.target.style.display = 'none';}} />}
              {awayName && <span className="text-zinc-400 text-xs font-medium truncate max-w-[100px]">{awayName}</span>}
            </div>
          </div>
        }

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        {match.popular &&
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">
            <Radio className="w-3 h-3" /> Popular
          </div>
        }
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-semibold text-base truncate" style={{ letterSpacing: '-0.02em' }}>{match.title}</h3>
          {match.date &&
          <div className="flex items-center gap-1.5 mt-1 text-zinc-400 text-xs font-mono">
              <Calendar className="w-3 h-3" />
              {formatMatchDate(match.date)}
            </div>
          }
        </div>
      </div>

      {pUrl && (homeName || awayName) &&
      <div className="flex items-center justify-center gap-3 py-2.5 px-4 bg-zinc-900/80 border-t border-zinc-800/50">
          {homeBadge && <img src={homeBadge} alt="" className="w-5 h-5 object-contain" onError={(e) => {e.target.style.display = 'none';}} />}
          <span className="text-zinc-300 text-xs font-medium truncate">{homeName}</span>
          <span className="text-zinc-600 text-[10px] font-mono">VS</span>
          <span className="text-zinc-300 text-xs font-medium truncate">{awayName}</span>
          {awayBadge && <img src={awayBadge} alt="" className="w-5 h-5 object-contain" onError={(e) => {e.target.style.display = 'none';}} />}
        </div>
      }
    </motion.button>);

}

// ── Stream Card ─────────────────────────────────────────────────────────────
function StreamCard({ stream, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="flex items-center gap-3 p-4 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 rounded-md transition-all group text-left">
      
      <div className="w-10 h-10 rounded-md bg-black/60 border border-zinc-800 flex items-center justify-center shrink-0">
        <Play className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors ml-0.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-200 font-medium text-sm truncate">{stream.language}</span>
          {stream.hd &&
          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded-sm border border-blue-600/30">HD</span>
          }
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 font-mono">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{stream.viewers?.toLocaleString()}</span>
          <span>Stream #{stream.streamNo}</span>
        </div>
      </div>
    </motion.button>);

}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function Sports() {
  const [view, setView] = useState('home');
  const [allMatches, setAllMatches] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [streams, setStreams] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const popularScrollRef = useRef(null);
  const controlsTimerRef = useRef(null);

  // Keep the URL in sync (?game=<id>&src=<source>&stream=<streamNo>) so reloads restore state
  const updateUrl = (gameId, sourceName, streamNo) => {
    const params = new URLSearchParams();
    if (gameId != null) params.set('game', gameId);
    if (sourceName) params.set('src', sourceName);
    if (streamNo != null) params.set('stream', streamNo);
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  };

  // Fetch all data on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [sportsData, matchesData] = await Promise.all([
        proxyFetchJSON(`${BASE_URL}/api/sports`),
        proxyFetchJSON(`${BASE_URL}/api/matches/all`)]
        );
        setSports(sportsData);
        setAllMatches(matchesData);

        // Deep link: ?game=<id>&src=<sourceName>&stream=<streamNo>
        const urlParams = new URLSearchParams(window.location.search);
        const deepGameId = urlParams.get('game');
        const deepSrc = urlParams.get('src');
        const deepStream = urlParams.get('stream');

        if (deepGameId) {
          const match = matchesData.find((m) => String(m.id) === String(deepGameId));
          if (match) {
            const source = (deepSrc && match.sources.find((s) => s.source === deepSrc))
              || match.sources.find((s) => s.source === 'admin')
              || match.sources[0];
            setSelectedMatch(match);
            setSelectedSource(source);
            setView('streams');
            const data = await fetchStreams(match, source);
            const stream = deepStream && data ? data.find((s) => String(s.streamNo) === String(deepStream)) : null;
            if (stream) {
              setSelectedStream(stream);
              setView('player');
              updateUrl(match.id, source.source, stream.streamNo);
            } else {
              updateUrl(match.id, source.source);
            }
          }
        }
      } catch (e) {
        setError('Failed to load sports.');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Auto-hide player controls after 3s of inactivity
  const resetControlsTimer = useCallback(() => {
    if (view !== 'player') return;
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (!showSourceDropdown) setShowControls(false);
    }, 3000);
  }, [view, showSourceDropdown]);

  useEffect(() => {
    if (view === 'player') resetControlsTimer();
    return () => {if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);};
  }, [view, resetControlsTimer]);

  const fetchStreams = async (match, source) => {
    setIsLoading(true);
    setError(null);
    setStreams([]);
    setSelectedStream(null);
    try {
      const data = await proxyFetchJSON(`${BASE_URL}/api/stream/${source.source}/${source.id}`);
      setStreams(data);
      return data;
    } catch (e) {
      setError('Failed to load streams.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    const source = match.sources.find((s) => s.source === 'admin') || match.sources[0];
    setSelectedSource(source);
    setView('streams');
    updateUrl(match.id, source.source);
    fetchStreams(match, source);
  };

  const handleChangeSource = (source) => {
    setSelectedSource(source);
    setShowSourceDropdown(false);
    updateUrl(selectedMatch.id, source.source);
    fetchStreams(selectedMatch, source);
  };

  const handleSelectStream = (stream) => {
    setSelectedStream(stream);
    setView('player');
    updateUrl(selectedMatch.id, selectedSource.source, stream.streamNo);
  };

  const handlePlayerSourceChange = async (source) => {
    setShowSourceDropdown(false);
    setSelectedSource(source);
    try {
      const data = await proxyFetchJSON(`${BASE_URL}/api/stream/${source.source}/${source.id}`);
      setStreams(data);
      if (data.length > 0) {
        setSelectedStream(data[0]);
        updateUrl(selectedMatch.id, source.source, data[0].streamNo);
      } else {
        setSelectedStream(null);
        setView('streams');
        updateUrl(selectedMatch.id, source.source);
      }
    } catch (e) {
      setError('Failed to load streams for new source.');
      setView('streams');
      updateUrl(selectedMatch.id, source.source);
    }
  };

  const scrollPopular = (dir) => {
    if (popularScrollRef.current) popularScrollRef.current.scrollBy({ left: dir * 400, behavior: 'smooth' });
  };

  const filteredMatches = selectedSport ?
  allMatches.filter((m) => m.category === selectedSport.id) :
  allMatches;
  const popularMatches = allMatches.filter((m) => m.popular);

  // ── Loading skeleton ──
  if (isLoading && view === 'home' && allMatches.length === 0) {
    return (
      <div className="min-h-screen bg-black relative z-10 pt-24 px-4 md:px-8 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-md bg-zinc-900/40 animate-pulse" />
          <div className="w-32 h-8 bg-zinc-900/40 rounded animate-pulse" />
        </div>
        <div className="flex gap-2 mb-8 overflow-hidden">
          {[...Array(8)].map((_, i) =>
          <div key={i} className="w-24 h-9 bg-zinc-900/30 rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) =>
          <div key={i} className="aspect-video rounded-md bg-zinc-900/20 animate-pulse border border-zinc-800/50" />
          )}
        </div>
      </div>);

  }

  if (error && view === 'home' && allMatches.length === 0) {
    return (
      <div className="min-h-screen bg-black relative z-10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-md hover:bg-zinc-200 transition-colors">
            Retry
          </button>
        </div>
      </div>);

  }

  // ── Player view (fullscreen overlay, matches Watch page look) ──
  if (view === 'player' && selectedStream) {
    return createPortal(
      <div className="fixed inset-0 bg-black z-[100]" style={{ fontFamily: "'Geist', sans-serif" }}>
        <div className="relative w-full h-full bg-black overflow-hidden">
          
          <iframe
            src={selectedStream.embedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture" />
          

          {/* Invisible catcher — the iframe swallows mousemove once hovered, so this is the only way
              to detect activity while controls are hidden. It disappears once controls are shown
              again so it never blocks the embed's own play/pause/seek controls. */}
          {!showControls &&
          <div
            className="absolute inset-0 z-[5] cursor-pointer"
            onMouseMove={resetControlsTimer}
            onClick={resetControlsTimer} />
          }

          <AnimatePresence>
            {showControls &&
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onMouseMove={resetControlsTimer}
              className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
              
                <div className="flex items-center gap-4">
                  <button
                  onClick={() => {setView('streams');updateUrl(selectedMatch?.id, selectedSource?.source);}}
                  className="flex items-center gap-2 px-3 py-2 bg-black/70 backdrop-blur-sm border border-zinc-700 text-white rounded-md hover:bg-black/90 transition-all text-sm font-medium">
                  
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <h1 className="flex-1 text-zinc-200 text-sm font-medium truncate" style={{ letterSpacing: '-0.02em' }}>{selectedMatch?.title}</h1>
                  <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-black/70 border border-zinc-800 px-2 py-1 rounded-sm uppercase tracking-wider">
                    {selectedStream.language} {selectedStream.hd && '· HD'} · {selectedStream.viewers?.toLocaleString()} viewers
                  </span>

                  {/* Source picker */}
                  <div className="relative">
                    <button
                    onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                    className="flex items-center gap-2 px-3 py-2 bg-black/70 backdrop-blur-sm border border-zinc-700 text-zinc-300 rounded-md hover:text-white hover:border-zinc-500 transition-all text-sm font-medium">
                    
                      <Signal className="w-4 h-4" />
                      <span className="capitalize">{selectedSource?.source}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSourceDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showSourceDropdown &&
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-44 bg-black/90 backdrop-blur-xl rounded-md shadow-2xl border border-zinc-800 z-30 py-1">
                      
                          {selectedMatch?.sources.map((src) =>
                      <button
                        key={src.source + src.id}
                        onClick={() => handlePlayerSourceChange(src)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors capitalize ${selectedSource?.source === src.source ? 'text-white bg-white/5' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                        
                              {src.source}
                            </button>
                      )}
                        </motion.div>
                    }
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </div>,
      document.body
    );

  }

  return (
    <div className="min-h-screen bg-black relative z-10">
      {/* Header */}
      <div className="pt-24 pb-2 px-4 md:px-8 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4 flex-wrap">
          {view === 'streams' &&
          <button
            onClick={() => {setView('home');setSelectedStream(null);updateUrl(null);}}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-black/60 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all">
            
              <ArrowLeft className="w-5 h-5" />
            </button>
          }

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white/5 border border-zinc-800 flex items-center justify-center backdrop-blur-sm">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tighter" style={{ letterSpacing: '-0.04em' }}>
                {view === 'streams' ? selectedMatch?.title : 'Sports'}
              </h1>
              {view === 'streams' && selectedMatch?.category &&
              <p className="text-zinc-500 text-xs font-mono mt-0.5 capitalize">{selectedMatch.category.replace('-', ' ')}</p>
              }
            </div>
          </div>

          {/* Source picker (streams view) */}
          {view === 'streams' && selectedMatch?.sources?.length > 1 &&
          <div className="relative ml-auto">
              <button
              onClick={() => setShowSourceDropdown(!showSourceDropdown)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-black/60 text-zinc-300 rounded-md text-sm font-medium border border-zinc-800 hover:border-zinc-600 hover:text-white transition-all backdrop-blur-sm">
              
                <Signal className="w-4 h-4" />
                <span className="capitalize">{selectedSource?.source}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSourceDropdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showSourceDropdown &&
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-44 bg-black/90 backdrop-blur-xl rounded-md shadow-2xl border border-zinc-800 z-30 py-1">
                
                    {selectedMatch.sources.map((src) =>
                <button
                  key={src.source + src.id}
                  onClick={() => handleChangeSource(src)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors capitalize ${selectedSource?.source === src.source ? 'text-white bg-white/5' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                  
                        {src.source}
                      </button>
                )}
                  </motion.div>
              }
              </AnimatePresence>
            </div>
          }
        </div>
      </div>

      {/* ── Home view ── */}
      {view === 'home' &&
      <>
          {/* Sport filter pills */}
          <div className="px-4 md:px-8 max-w-[1600px] mx-auto pb-6">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
              onClick={() => setSelectedSport(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${!selectedSport ? 'bg-white text-black border-white' : 'bg-black/60 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600'}`}>
              
                All
              </button>
              {sports.map((sport) =>
            <button
              key={sport.id}
              onClick={() => setSelectedSport(selectedSport?.id === sport.id ? null : sport)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border ${selectedSport?.id === sport.id ? 'bg-white text-black border-white' : 'bg-black/60 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600'}`}>
              
                  <span>{SPORT_EMOJI[sport.id] || '🏆'}</span>
                  {sport.name}
                </button>
            )}
            </div>
          </div>

          {/* Popular matches (horizontal row) */}
          {!selectedSport && popularMatches.length > 0 &&
        <div className="px-4 md:px-8 max-w-[1600px] mx-auto pb-8">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-bold text-white tracking-tight" style={{ letterSpacing: '-0.03em' }}>Popular Matches</h2>
              </div>
              <div className="group/popular relative">
                <button onClick={() => scrollPopular(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 border border-zinc-800 flex items-center justify-center text-white opacity-0 group-hover/popular:opacity-100 transition-opacity hover:bg-black">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => scrollPopular(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 border border-zinc-800 flex items-center justify-center text-white opacity-0 group-hover/popular:opacity-100 transition-opacity hover:bg-black">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div ref={popularScrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {popularMatches.map((match) =>
              <MatchCard key={match.id} match={match} onClick={() => handleSelectMatch(match)} className="w-[300px] flex-shrink-0" />
              )}
                </div>
              </div>
            </div>
        }

          {/* All matches grid */}
          <div className="px-4 md:px-8 max-w-[1600px] mx-auto pb-24">
            <h2 className="text-lg font-bold text-white tracking-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
              {selectedSport ? `${selectedSport.name} Matches` : 'All Matches'}
            </h2>
            {filteredMatches.length === 0 ?
          <div className="text-center py-16 text-zinc-500 text-sm">No matches available</div> :

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatches.map((match) =>
            <MatchCard key={match.id} match={match} onClick={() => handleSelectMatch(match)} />
            )}
              </div>
          }
          </div>
        </>
      }

      {/* ── Streams view ── */}
      {view === 'streams' &&
      <div className="px-4 md:px-8 max-w-[1600px] mx-auto pb-24 pt-4">
          {error && <p className="text-center py-16 text-zinc-500 text-sm">{error}</p>}
          {isLoading ?
        <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 text-zinc-500 animate-spin" />
            </div> :
        streams.length === 0 ?
        <div className="text-center py-16 text-zinc-500 text-sm">No streams available</div> :

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {streams.map((stream) =>
          <StreamCard key={stream.streamNo} stream={stream} onClick={() => handleSelectStream(stream)} />
          )}
            </div>
        }
        </div>
      }
    </div>);

}