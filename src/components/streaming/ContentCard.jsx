import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Play, Plus, Info, Check, Film, X } from 'lucide-react';
import { IMAGE_SIZES } from './TMDBService';
import { motion } from 'framer-motion';
import TrailerModal from './TrailerModal';

import { useNavigate } from 'react-router-dom';

export default function ContentCard({ item, type, onAddToList, isInList, index, isContinueWatching, isTop10, className, onRemoveFromContinue }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const navigate = useNavigate();
  
  const mediaType = type || item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const title = item.title || item.name;
  const releaseYear = (item.release_date || item.first_air_date)?.split('-')[0];
  const rating = item.vote_average?.toFixed(1);
  
  const displayTitle = isContinueWatching && mediaType === 'tv' && item.season && item.episode
    ? `${title} (S${item.season} E${item.episode})`
    : title;
  
  const posterUrl = item.poster_path
    ? (item.poster_path.startsWith('http') ? item.poster_path : `${IMAGE_SIZES.poster.medium}${item.poster_path}`)
    : null;

  const detailUrl = createPageUrl('Details') + `?id=${item.id}&type=${mediaType}`;
  const watchUrl = isContinueWatching && mediaType === 'tv' && item.season && item.episode
    ? createPageUrl('Watch') + `?id=${item.id}&type=${mediaType}&season=${item.season}&episode=${item.episode}`
    : createPageUrl('Watch') + `?id=${item.id}&type=${mediaType}`;

  const handleCardClick = () => {
    navigate(detailUrl);
  };

  return (
    <>
      <motion.div
        className={`relative flex-shrink-0 w-[160px] md:w-[220px] group cursor-pointer ${className || ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
        onClick={handleCardClick}
      >
        <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 transition-all duration-300 border border-zinc-800/60 group-hover:border-zinc-500 group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] group-hover:shadow-white/5">
          
          {isTop10 && index < 10 && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-20 uppercase tracking-wider">
              #{index + 1} Trending
            </div>
          )}
          
          {!isTop10 && releaseYear === new Date().getFullYear().toString() && (
            <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-20 uppercase tracking-wider">
              New
            </div>
          )}

          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
              <span className="text-xs text-center px-2">{title}</span>
            </div>
          )}
          
          {/* Remove from Continue Watching button */}
          {isContinueWatching && onRemoveFromContinue && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveFromContinue(item); }}
              className="absolute top-2 right-2 z-30 w-6 h-6 rounded-full bg-black/70 border border-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black hover:border-zinc-400 transition-all"
              title="Remove from Continue Watching"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}

          {/* Continue Watching Progress Bar */}
          {isContinueWatching && item.progress && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800 z-20">
              <div 
                className="h-full bg-white rounded-r-full" 
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}

          {/* Hover Actions */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-sm"
            initial={false}
          >
            <div className="flex items-center gap-3 mt-auto mb-8">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(watchUrl);
                }}
                className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:scale-110 hover:bg-zinc-200 group/play transition-all shadow-lg"
              >
                <Play className="w-5 h-5 text-black fill-black ml-1 transition-colors" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTrailer(true);
                }}
                className="w-10 h-10 rounded-full bg-black/80 border border-zinc-800 flex items-center justify-center hover:bg-zinc-900 hover:border-zinc-600 hover:scale-110 transition-all text-white"
              >
                <Film className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
        
        <div className="mt-3 px-1">
          <h3 className="text-zinc-200 font-medium text-sm truncate group-hover:text-white transition-colors tracking-tight">{displayTitle}</h3>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
              <span>{releaseYear}</span>
              {rating && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-800" />
                  <span>{rating}</span>
                </>
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToList?.(item, mediaType);
              }}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              {isInList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>

      <TrailerModal 
        isOpen={showTrailer} 
        onClose={() => setShowTrailer(false)} 
        mediaId={item.id} 
        mediaType={mediaType} 
      />
    </>
  );
}