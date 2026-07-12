import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trophy, Radio } from 'lucide-react';
import { proxyFetchJSON, BASE_URL, posterUrl, formatMatchDate } from './SportsService';

export default function SportsCarousel() {
  const [matches, setMatches] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    proxyFetchJSON(`${BASE_URL}/api/matches/all`).
    then((data) => setMatches(data.filter((m) => m.popular).slice(0, 15))).
    catch(() => {});
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 400, behavior: 'smooth' });
  };

  if (matches.length === 0) return null;

  return (
    <div className="group/row relative py-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between px-4 md:px-8 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-zinc-400" />
          <h2 className="text-white text-lg font-medium tracking-tight">
            Live Sports
          </h2>
        </div>
        <Link to="/Sports" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-mono uppercase tracking-wider">
          View All
        </Link>
      </div>

      <div className="relative">
        <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 border border-zinc-800 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 border border-zinc-800 flex items-center justify-center text-white opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black">
          <ChevronRight className="w-4 h-4" />
        </button>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 scroll-smooth pb-4">
          {matches.map((match) =>
          <Link key={match.id} to={`/Sports?game=${match.id}`} className="flex-shrink-0 w-[260px] group/card">
              <div className="relative aspect-video rounded-md overflow-hidden bg-zinc-900 border border-zinc-800/60 group-hover/card:border-zinc-600 transition-all">
                {posterUrl(match.poster) &&
              <img src={posterUrl(match.poster)} alt={match.title} loading="lazy" className="w-full h-full object-cover" onError={(e) => {e.target.style.display = 'none';}} />
              }
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                {match.popular &&
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    <Radio className="w-2.5 h-2.5" /> Live
                  </div>
              }
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white font-semibold text-sm truncate">{match.title}</h3>
                  {match.date &&
                <p className="text-zinc-400 text-[10px] font-mono mt-0.5">{formatMatchDate(match.date)}</p>
                }
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>);

}