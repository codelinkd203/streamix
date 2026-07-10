import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { TMDBService, IMAGE_SIZES } from './TMDBService';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AIDiscoverModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Suggest 3 movies or TV shows based on this request: "${query}". Return ONLY a JSON object with a "recommendations" array containing objects with "title" and "type" ("movie" or "tv").`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: { type: "string" }
                }
              }
            }
          }
        }
      });

      const recs = response.recommendations || [];
      const tmdbResults = await Promise.all(
        recs.map(async (rec) => {
          const res = rec.type === 'tv' 
            ? await TMDBService.searchTV(rec.title)
            : await TMDBService.searchMovies(rec.title);
          return res.results[0];
        })
      );
      
      setResults(tmdbResults.filter(Boolean));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(10px)' }}
        transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="w-full max-w-2xl bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-2 text-zinc-400">
            <Sparkles className="w-4 h-4" />
            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-300">AI Discover</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSearch} className="relative mb-8 group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., A mind-bending sci-fi movie like Inception..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all text-sm shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-6 bg-white hover:bg-zinc-200 text-black font-medium rounded-md text-sm transition-all disabled:opacity-50 flex items-center justify-center hover:scale-[0.98] active:scale-[0.95]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          {results.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Recommendations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {results.map((item, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    onClick={() => {
                      onClose();
                      navigate(createPageUrl('Details') + `?id=${item.id}&type=${item.media_type || (item.first_air_date ? 'tv' : 'movie')}`);
                    }}
                    className="group relative aspect-[2/3] rounded-md overflow-hidden bg-black cursor-pointer border border-zinc-800 hover:border-zinc-600 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                  >
                    {item.poster_path && (
                      <img
                        src={`${IMAGE_SIZES.poster.medium}${item.poster_path}`}
                        alt={item.title || item.name}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4 opacity-100 transition-opacity">
                      <h4 className="text-zinc-200 font-medium text-sm line-clamp-2 tracking-tight">{item.title || item.name}</h4>
                      <p className="text-[10px] font-mono text-zinc-500 mt-1">{(item.release_date || item.first_air_date)?.split('-')[0]}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}