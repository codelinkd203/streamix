import React, { useState, useEffect } from 'react';
import { TMDBService } from '@/components/streaming/TMDBService';
import ContentRow from '@/components/streaming/ContentRow';
import ContentCard from '@/components/streaming/ContentCard';
import { ChevronDown, Flame, Radio, Star, Tv, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-black pt-20 px-4 md:px-8 max-w-[1600px] mx-auto space-y-10">
      <div className="space-y-3">
        <div className="w-40 h-8 bg-zinc-900/40 rounded animate-pulse" />
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

export default function TVShows() {
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [onTheAir, setOnTheAir] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreShows, setGenreShows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGenre, setIsLoadingGenre] = useState(false);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [myList, setMyList] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('myList');
    if (saved) setMyList(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [popularData, topRatedData, onTheAirData, genresData] = await Promise.all([
          TMDBService.getPopularTV(),
          TMDBService.getTopRatedTV(),
          TMDBService.getOnTheAirTV(),
          TMDBService.getTVGenres(),
        ]);

        setPopular(popularData.results);
        setTopRated(topRatedData.results);
        setOnTheAir(onTheAirData.results);
        setGenres(genresData.genres);
      } catch (error) {
        console.error('Error fetching TV shows:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedGenre) {
      const fetchGenreShows = async () => {
        setIsLoadingGenre(true);
        try {
          const data = await TMDBService.discoverTV({ with_genres: selectedGenre.id });
          setGenreShows(data.results);
        } catch (error) {
          console.error('Error fetching genre shows:', error);
        } finally {
          setIsLoadingGenre(false);
        }
      };
      fetchGenreShows();
    }
  }, [selectedGenre]);

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
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white/5 border border-zinc-800 flex items-center justify-center backdrop-blur-sm">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tighter" style={{ letterSpacing: '-0.04em' }}>TV Shows</h1>
          </div>
          
          {/* Genre Filter */}
          <div className="relative">
            <button
              onClick={() => setShowGenreDropdown(!showGenreDropdown)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-black/60 text-zinc-300 rounded-md text-sm font-medium border border-zinc-800 hover:border-zinc-600 hover:text-white transition-all backdrop-blur-sm"
            >
              <span>{selectedGenre?.name || 'Genres'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showGenreDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showGenreDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-52 max-h-96 overflow-y-auto bg-black/90 backdrop-blur-xl rounded-md shadow-2xl border border-zinc-800 z-30 py-1 scrollbar-hide"
                >
                  <button
                    onClick={() => { setSelectedGenre(null); setShowGenreDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    All Genres
                  </button>
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => { setSelectedGenre(genre); setShowGenreDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedGenre?.id === genre.id ? 'text-white bg-white/5' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Genre Shows Grid */}
      {selectedGenre && (
        <div className="px-4 md:px-8 max-w-[1600px] mx-auto pb-8">
          <h2 className="text-lg font-semibold text-white mb-4">{selectedGenre.name} TV Shows</h2>
          {isLoadingGenre ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 text-zinc-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {genreShows.map((show) => (
                <ContentCard
                  key={show.id}
                  item={show}
                  type="tv"
                  onAddToList={handleAddToList}
                  isInList={myList.some(i => i.id === show.id)}
                  className="!w-full"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Rows */}
      {!selectedGenre && (
        <div className="pb-24 space-y-6 pt-4">
          <ContentRow title="Popular TV Shows" icon={Flame} items={popular} type="tv" onAddToList={handleAddToList} myList={myList} />
          <ContentRow title="Currently Airing" icon={Radio} items={onTheAir} type="tv" onAddToList={handleAddToList} myList={myList} />
          <ContentRow title="Top Rated" icon={Star} items={topRated} type="tv" onAddToList={handleAddToList} myList={myList} />
        </div>
      )}
    </div>
  );
}