import React, { useState, useEffect } from 'react';
import { TMDBService } from '@/components/streaming/TMDBService';
import HeroBanner from '@/components/streaming/HeroBanner';
import ContentRow from '@/components/streaming/ContentRow';
import { Loader2, PlayCircle, List, TrendingUp, Film, Tv, Star, Clock, Calendar, Radio } from 'lucide-react';
import SportsCarousel from '@/components/streaming/SportsCarousel';

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [topRatedTV, setTopRatedTV] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [onTheAirTV, setOnTheAirTV] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myList, setMyList] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('myList');
    if (saved) setMyList(JSON.parse(saved));
    
    const savedCw = localStorage.getItem('continueWatching');
    if (savedCw) {
      const cwList = JSON.parse(savedCw).filter(i => i.progress < 95 && i.progress > 1);
      setContinueWatching(cwList);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          trendingData,
          popularMoviesData,
          topRatedMoviesData,
          popularTVData,
          topRatedTVData,
          nowPlayingData,
          upcomingMoviesData,
          onTheAirTVData,
        ] = await Promise.all([
          TMDBService.getTrending('all', 'week'),
          TMDBService.getPopularMovies(),
          TMDBService.getTopRatedMovies(),
          TMDBService.getPopularTV(),
          TMDBService.getTopRatedTV(),
          TMDBService.getNowPlayingMovies(),
          TMDBService.getUpcomingMovies(),
          TMDBService.getOnTheAirTV(),
        ]);

        setTrending(trendingData.results);
        setPopularMovies(popularMoviesData.results);
        setTopRatedMovies(topRatedMoviesData.results);
        setPopularTV(popularTVData.results);
        setTopRatedTV(topRatedTVData.results);
        
        // Filter out popular movies from now playing to make it distinct
        const popularIds = new Set(popularMoviesData.results.map(m => m.id));
        const distinctNowPlaying = nowPlayingData.results.filter(m => !popularIds.has(m.id));
        setNowPlaying(distinctNowPlaying.length > 5 ? distinctNowPlaying : nowPlayingData.results.slice(5, 25));
        
        setUpcomingMovies(upcomingMoviesData.results);
        setOnTheAirTV(onTheAirTVData.results);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRemoveFromContinue = (item) => {
    const saved = localStorage.getItem('continueWatching');
    let cwList = saved ? JSON.parse(saved) : [];
    cwList = cwList.filter(i => i.id !== item.id);
    localStorage.setItem('continueWatching', JSON.stringify(cwList));
    setContinueWatching(cwList.filter(i => i.progress < 95 && i.progress > 1));
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent pt-20 px-4 md:px-8 max-w-[1600px] mx-auto space-y-12">
        <div className="w-full h-[60vh] rounded-lg bg-zinc-900/20 animate-pulse border border-zinc-800/50 backdrop-blur-sm" />
        <div className="space-y-4">
          <div className="w-48 h-6 bg-zinc-900/30 rounded animate-pulse" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-[160px] md:w-[220px] aspect-[2/3] rounded-md bg-zinc-900/20 animate-pulse flex-shrink-0 border border-zinc-800/50 backdrop-blur-sm" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="w-48 h-6 bg-zinc-900/30 rounded animate-pulse" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-[160px] md:w-[220px] aspect-[2/3] rounded-md bg-zinc-900/20 animate-pulse flex-shrink-0 border border-zinc-800/50 backdrop-blur-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="relative z-10">
        <HeroBanner items={trending.slice(0, 5)} />
      </div>
      
      <div className="relative pb-24 space-y-6 -mt-24 md:-mt-32 bg-gradient-to-t from-black via-black/90 to-transparent pt-32">
        {continueWatching.length > 0 && (
          <ContentRow 
            title="Continue Watching for You" 
            icon={PlayCircle}
            items={continueWatching} 
            onAddToList={handleAddToList}
            myList={myList}
            isContinueWatching={true}
            onRemoveFromContinue={handleRemoveFromContinue}
          />
        )}
        {myList.length > 0 && (
          <ContentRow 
            title="My List" 
            icon={List}
            items={myList} 
            onAddToList={handleAddToList}
            myList={myList}
          />
        )}
        <ContentRow 
          title="Top 10 Today" 
          icon={TrendingUp}
          items={trending} 
          onAddToList={handleAddToList}
          myList={myList}
          isTop10={true}
        />
        <SportsCarousel />
        <ContentRow 
          title="Popular Movies" 
          icon={Film}
          items={popularMovies} 
          type="movie"
          onAddToList={handleAddToList}
          myList={myList}
        />
        <ContentRow 
          title="Now Playing in Theaters" 
          icon={Clock}
          items={nowPlaying} 
          type="movie"
          onAddToList={handleAddToList}
          myList={myList}
        />
        <ContentRow 
          title="Upcoming Movies" 
          icon={Calendar}
          items={upcomingMovies} 
          type="movie"
          onAddToList={handleAddToList}
          myList={myList}
        />
        <ContentRow 
          title="Popular TV Shows" 
          icon={Tv}
          items={popularTV} 
          type="tv"
          onAddToList={handleAddToList}
          myList={myList}
        />
        <ContentRow 
          title="Airing Today" 
          icon={Radio}
          items={onTheAirTV} 
          type="tv"
          onAddToList={handleAddToList}
          myList={myList}
        />
        <ContentRow 
          title="Top Rated Movies" 
          icon={Star}
          items={topRatedMovies} 
          type="movie"
          onAddToList={handleAddToList}
          myList={myList}
        />
        <ContentRow 
          title="Top Rated TV Shows" 
          icon={Star}
          items={topRatedTV} 
          type="tv"
          onAddToList={handleAddToList}
          myList={myList}
        />
      </div>
    </div>
  );
}