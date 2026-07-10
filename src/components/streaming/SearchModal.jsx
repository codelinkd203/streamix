import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, X, Loader2 } from 'lucide-react';
import { TMDBService, IMAGE_SIZES } from './TMDBService';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  const performSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const data = await TMDBService.searchMulti(searchQuery);
        setResults(data.results.filter(r => r.media_type !== 'person').slice(0, 20));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleResultClick = (item) => {
    const newRecent = [
      { id: item.id, title: item.title || item.name, media_type: item.media_type },
      ...recentSearches.filter(r => r.id !== item.id),
    ].slice(0, 10);
    
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="max-w-4xl mx-auto pt-20 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies, TV shows..."
            className="w-full bg-zinc-800 text-white text-xl py-4 pl-14 pr-12 rounded-lg outline-none focus:ring-2 focus:ring-white/20"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-white-600 animate-spin" />
          </div>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto pr-2">
            {results.map((item) => {
              const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
              const title = item.title || item.name;
              const detailUrl = createPageUrl('Details') + `?id=${item.id}&type=${mediaType}`;
              
              return (
                <Link
                  key={item.id}
                  to={detailUrl}
                  onClick={() => handleResultClick(item)}
                  className="group"
                >
                  <div className="aspect-[2/3] rounded-md overflow-hidden bg-zinc-800 mb-2">
                    {item.poster_path ? (
                      <img
                        src={`${IMAGE_SIZES.poster.medium}${item.poster_path}`}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <span className="text-xs text-center px-2">{title}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-white text-sm truncate group-hover:text-zinc-300">{title}</p>
                  <p className="text-zinc-500 text-xs capitalize">{mediaType}</p>
                </Link>
              );
            })}
          </div>
        )}

        {/* Recent Searches */}
        {!isLoading && !query && recentSearches.length > 0 && (
          <div>
            <h3 className="text-white text-lg font-medium mb-4">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <Link
                  key={item.id}
                  to={createPageUrl('Details') + `?id=${item.id}&type=${item.media_type}`}
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 text-white rounded-full text-sm hover:bg-zinc-700 transition-colors"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && query && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg">No results found for "{query}"</p>
          </div>
        )}
      </motion.div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-zinc-300"
      >
        <X className="w-8 h-8" />
      </button>
    </motion.div>
  );
}