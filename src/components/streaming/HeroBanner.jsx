import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Play, Info, VolumeX, Volume2, Film } from 'lucide-react';
import { TMDBService, IMAGE_SIZES } from './TMDBService';
import { motion, AnimatePresence } from 'framer-motion';
import TrailerModal from './TrailerModal';

export default function HeroBanner({ items }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [rating, setRating] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const intervalRef = useRef(null);

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(items?.length || 1, 5));
    }, 8000);
  };

  useEffect(() => {
    if (!items || items.length === 0) return;
    startInterval();
    return () => clearInterval(intervalRef.current);
  }, [items]);

  const handleDotClick = (idx) => {
    setCurrentIndex(idx);
    startInterval(); // reset timer on manual click
  };

  const item = items?.[currentIndex];
  const mediaType = item?.media_type || (item?.first_air_date ? 'tv' : 'movie');

  useEffect(() => {
    if (!item) return;
    
    const fetchRating = async () => {
      try {
        if (mediaType === 'movie') {
          const details = await TMDBService.getMovieDetails(item.id);
          const releaseDates = details.release_dates?.results || [];
          const usRelease = releaseDates.find(r => r.iso_3166_1 === 'US');
          const certification = usRelease?.release_dates?.[0]?.certification;
          setRating(certification || (item.adult ? 'R' : 'PG-13'));
        } else {
          const details = await TMDBService.getTVDetails(item.id);
          const contentRatings = details.content_ratings?.results || [];
          const usRating = contentRatings.find(r => r.iso_3166_1 === 'US');
          setRating(usRating?.rating || (item.adult ? 'TV-MA' : 'TV-14'));
        }
      } catch (error) {
        setRating(item.adult ? '18+' : 'PG-13');
      }
    };

    fetchRating();
  }, [item, mediaType]);

  useEffect(() => {
    if (!item) return;
    setLogoUrl(null);
    setImgLoaded(false);
    TMDBService.getImages(item.id, mediaType).then(data => {
      const logos = data.logos || [];
      const enLogo = logos.find(l => l.iso_639_1 === 'en') || logos[0];
      if (enLogo) setLogoUrl(`${IMAGE_SIZES.poster.original}${enLogo.file_path}`);
    }).catch(() => {});
  }, [item, mediaType]);

  if (!items || items.length === 0 || !item) return null;
  const title = item.title || item.name;
  const backdropUrl = item.backdrop_path
    ? `${IMAGE_SIZES.backdrop.original}${item.backdrop_path}`
    : null;

  const watchUrl = createPageUrl('Watch') + `?id=${item.id}&type=${mediaType}`;
  const detailUrl = createPageUrl('Details') + `?id=${item.id}&type=${mediaType}`;

  return (
    <div className="pt-24 pb-8 px-4 md:px-8 max-w-[1600px] mx-auto">
      <div className="relative h-[60vh] min-h-[450px] w-full overflow-hidden rounded-lg bg-black border border-zinc-800">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {/* Shimmer skeleton while image loads */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-zinc-900 animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 animate-[shimmer_1.5s_infinite]" 
                  style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', backgroundImage: 'linear-gradient(90deg, #18181b 0%, #27272a 50%, #18181b 100%)' }} />
              </div>
            )}
            {backdropUrl && (
              <>
                <img
                  src={backdropUrl}
                  alt={title}
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-cover object-center opacity-70 transition-opacity duration-500 ${imgLoaded ? 'opacity-70' : 'opacity-0'}`}
                  style={{ animation: 'slowZoom 20s ease-in-out infinite alternate' }}
                />
                <style>{`
                  @keyframes slowZoom {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                  }
                `}</style>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-10 flex flex-col justify-end h-full">
          <motion.div
            key={`content-${currentIndex}`}
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-widest bg-white text-black rounded-sm uppercase">
                {mediaType === 'tv' ? 'SERIES' : 'MOVIE'}
              </span>
            </div>

            {logoUrl ? (
              <img
                src={logoUrl}
                alt={title}
                className="max-h-24 md:max-h-32 w-auto max-w-xs md:max-w-sm object-contain mb-4 drop-shadow-2xl"
              />
            ) : (
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tighter" style={{ letterSpacing: '-0.04em' }}>
                {title}
              </h1>
            )}
            
            <p className="text-sm md:text-base text-zinc-400 line-clamp-3 mb-8 max-w-xl leading-relaxed font-light">
              {item.overview}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={watchUrl}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-black" />
                Play Now
              </Link>
              
              <button
                onClick={() => setShowTrailer(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-black/50 backdrop-blur-md text-white text-sm font-medium rounded-md border border-zinc-800 hover:bg-zinc-900 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Film className="w-4 h-4" />
                Watch Trailer
              </button>

              <Link
                to={detailUrl}
                className="flex items-center gap-2 px-6 py-2.5 bg-transparent text-zinc-400 text-sm font-medium rounded-md hover:text-white transition-colors"
              >
                <Info className="w-4 h-4" />
                Details
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-8 right-8 flex gap-2">
          {items.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'bg-white w-8' : 'bg-zinc-600 w-4 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      </div>

      <TrailerModal 
        isOpen={showTrailer} 
        onClose={() => setShowTrailer(false)} 
        mediaId={item.id} 
        mediaType={mediaType} 
      />
    </div>
  );
}