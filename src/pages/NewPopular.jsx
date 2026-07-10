import React, { useState, useEffect } from 'react';
import { TMDBService } from '@/components/streaming/TMDBService';
import ContentRow from '@/components/streaming/ContentRow';
import { TrendingUp, Film, Tv, Calendar, Flame } from 'lucide-react';

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-black pt-20 px-4 md:px-8 max-w-[1600px] mx-auto space-y-10">
      <div className="space-y-3">
        <div className="w-56 h-8 bg-zinc-900/40 rounded animate-pulse" />
        <div className="w-72 h-4 bg-zinc-900/30 rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="w-48 h-6 bg-zinc-900/30 rounded animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-[160px] md:w-[220px] aspect-[2/3] rounded-md bg-zinc-900/20 animate-pulse flex-shrink-0 border border-zinc-800/50 backdrop-blur-sm" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="w-48 h-6 bg-zinc-900/30 rounded animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-[160px] md:w-[220px] aspect-[2/3] rounded-md bg-zinc-900/20 animate-pulse flex-shrink-0 border border-zinc-800/50 backdrop-blur-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NewPopular() {
  const [trending, setTrending] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myList, setMyList] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('myList');
    if (saved) setMyList(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingData, trendingMoviesData, trendingTVData, upcomingData] = await Promise.all([
          TMDBService.getTrending('all', 'day'),
          TMDBService.getTrending('movie', 'week'),
          TMDBService.getTrending('tv', 'week'),
          TMDBService.getUpcomingMovies(),
        ]);

        setTrending(trendingData.results);
        setTrendingMovies(trendingMoviesData.results);
        setTrendingTV(trendingTVData.results);
        setUpcoming(upcomingData.results);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddToList = (item, mediaType) => {
    const itemWithType = { ...item, media_type: mediaType };
    const exists = myList.some(i => i.id === item.id);
    
    let newList;
    if (exists) {
      newList = myList.filter(i => i.id !== item.id);
    } else {
      newList = [itemWithType, ...myList];
    }
    
    setMyList(newList);
    localStorage.setItem('myList', JSON.stringify(newList));
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-black relative z-10">
      {/* Header */}
      <div className="pt-24 pb-2 px-4 md:px-8 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-md bg-white/5 border border-zinc-800 flex items-center justify-center backdrop-blur-sm">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tighter" style={{ letterSpacing: '-0.04em' }}>New & Popular</h1>
        </div>
        <p className="text-zinc-500 text-sm">The latest and greatest content, trending right now</p>
      </div>

      <div className="pb-24 space-y-6 pt-4">
        <ContentRow title="Trending Today" icon={TrendingUp} items={trending} onAddToList={handleAddToList} myList={myList} />
        <ContentRow title="Trending Movies This Week" icon={Film} items={trendingMovies} type="movie" onAddToList={handleAddToList} myList={myList} />
        <ContentRow title="Trending TV Shows This Week" icon={Tv} items={trendingTV} type="tv" onAddToList={handleAddToList} myList={myList} />
        <ContentRow title="Coming Soon" icon={Calendar} items={upcoming} type="movie" onAddToList={handleAddToList} myList={myList} />
      </div>
    </div>
  );
}