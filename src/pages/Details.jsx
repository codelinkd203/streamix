import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { TMDBService, IMAGE_SIZES } from '@/components/streaming/TMDBService';
import ContentRow from '@/components/streaming/ContentRow';
import AnimeDetails from '@/components/streaming/AnimeDetails';
import { Play, Plus, Check, Star, Calendar, Clock, X, ChevronDown, Users, Film, Info, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Details() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get('id');
  const type = urlParams.get('type') || 'movie';

  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [myList, setMyList] = useState([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonDetails, setSeasonDetails] = useState(null);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [certification, setCertification] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('myList');
    if (saved) setMyList(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const data = type === 'tv' 
          ? await TMDBService.getTVDetails(id)
          : await TMDBService.getMovieDetails(id);
        setDetails(data);
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id && type !== 'anime') fetchDetails();
  }, [id, type]);

  useEffect(() => {
    if (!id || type === 'anime') return;
    setLogoUrl(null);
    TMDBService.getImages(id, type).then(data => {
      const logos = data.logos || [];
      const enLogo = logos.find(l => l.iso_639_1 === 'en') || logos[0];
      if (enLogo) setLogoUrl(`${IMAGE_SIZES.poster.original}${enLogo.file_path}`);
    }).catch(() => {});
  }, [id, type]);

  useEffect(() => {
    if (!details) return;
    if (type === 'movie') {
      const releaseDates = details.release_dates?.results || [];
      const usRelease = releaseDates.find(r => r.iso_3166_1 === 'US');
      setCertification(usRelease?.release_dates?.find(d => d.certification)?.certification || null);
    } else {
      const contentRatings = details.content_ratings?.results || [];
      const usRating = contentRatings.find(r => r.iso_3166_1 === 'US');
      setCertification(usRating?.rating || null);
    }
  }, [details, type]);

  useEffect(() => {
    if (type === 'tv' && details && selectedSeason) {
      const fetchSeason = async () => {
        setIsLoadingSeason(true);
        try {
          const data = await TMDBService.getTVSeasonDetails(id, selectedSeason);
          setSeasonDetails(data);
        } catch (error) {
          console.error('Error fetching season:', error);
        } finally {
          setIsLoadingSeason(false);
        }
      };
      fetchSeason();
    }
  }, [id, type, details, selectedSeason]);

  const isInList = myList.some(i => i.id === parseInt(id));

  const handleAddToList = () => {
    if (!details) return;
    
    const item = { ...details, media_type: type };
    let newList;
    
    if (isInList) {
      newList = myList.filter(i => i.id !== parseInt(id));
    } else {
      newList = [item, ...myList];
    }
    
    setMyList(newList);
    localStorage.setItem('myList', JSON.stringify(newList));
    
    if (!isInList) {
      toast.success('Added to My List', {
        description: `${title} has been added to your list.`,
      });
    } else {
      toast.info('Removed from My List', {
        description: `${title} has been removed.`,
      });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link Copied!', {
      description: 'The link has been copied to your clipboard.',
    });
  };

  if (type === 'anime') {
    return <AnimeDetails id={id} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] animate-pulse">
        <div className="h-[70vh] md:h-[80vh] bg-zinc-900 w-full relative">
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-12">
            <div className="flex gap-8 items-end">
              <div className="hidden md:block w-64 h-96 bg-zinc-800 rounded-lg" />
              <div className="flex-1 space-y-4">
                <div className="h-12 bg-zinc-800 w-2/3 rounded" />
                <div className="h-6 bg-zinc-800 w-1/3 rounded" />
                <div className="h-24 bg-zinc-800 w-full max-w-3xl rounded" />
                <div className="flex gap-4">
                  <div className="h-12 w-32 bg-zinc-800 rounded" />
                  <div className="h-12 w-32 bg-zinc-800 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!details) return null;

  const title = details.title || details.name;
  const releaseDate = details.release_date || details.first_air_date;
  const releaseYear = releaseDate?.split('-')[0];
  const runtime = details.runtime || (details.episode_run_time?.[0]);
  const backdropUrl = details.backdrop_path 
    ? `${IMAGE_SIZES.backdrop.original}${details.backdrop_path}` 
    : null;
  const posterUrl = details.poster_path 
    ? `${IMAGE_SIZES.poster.large}${details.poster_path}` 
    : null;
  
  const trailer = details.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const cast = details.credits?.cast?.slice(0, 10) || [];
  const directors = details.credits?.crew?.filter(c => c.job === 'Director') || [];
  const creators = details.created_by || [];
  
  const watchUrl = createPageUrl('Watch') + `?id=${id}&type=${type}`;

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Hero Section */}
      <div className="relative h-[70vh] md:h-[80vh] overflow-hidden">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#141414] to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-12">
          <div className="flex flex-col md:flex-row gap-8 items-end md:items-end">
            {/* Poster */}
            <div className="hidden md:block w-64 flex-shrink-0">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt={title}
                  className="w-full rounded-lg shadow-2xl"
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 max-w-3xl">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={title}
                  className="max-h-28 md:max-h-36 w-auto max-w-xs md:max-w-md object-contain mb-4 drop-shadow-2xl"
                />
              ) : (
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">{title}</h1>
              )}
              
              {/* Metadata */}
              <div className="flex items-center gap-3 flex-wrap text-sm mb-4">
                <span className="text-green-500 font-semibold">
                  {Math.round(details.vote_average * 10)}% Match
                </span>
                {releaseYear && (
                  <span className="text-zinc-400">{releaseYear}</span>
                )}
                {certification && (
                  <span className="px-1.5 py-0.5 border border-zinc-500 text-zinc-300 text-xs font-medium rounded">
                    {certification}
                  </span>
                )}
                {type === 'movie' && runtime > 0 && (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    {Math.floor(runtime / 60)}h {runtime % 60}m
                  </span>
                )}
                {type === 'tv' && details.number_of_seasons && (
                  <span className="text-zinc-400">
                    {details.number_of_seasons} Season{details.number_of_seasons > 1 ? 's' : ''}
                    {details.number_of_episodes ? ` · ${details.number_of_episodes} Episodes` : ''}
                  </span>
                )}
                {type === 'tv' && details.episode_run_time?.[0] > 0 && (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    ~{details.episode_run_time[0]}m / ep
                  </span>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-4">
                {details.genres?.map(genre => (
                  <span key={genre.id} className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm">
                    {genre.name}
                  </span>
                ))}
              </div>

              {/* Overview */}
              <p className="text-white/90 text-base md:text-lg leading-relaxed mb-6 line-clamp-4">
                {details.overview}
              </p>

              {/* Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  to={watchUrl}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded hover:bg-white/90 transition-colors"
                >
                  <Play className="w-5 h-5 fill-black" />
                  Play
                </Link>
                
                {trailer && (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-600/70 text-white font-semibold rounded hover:bg-zinc-600/50 transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    Trailer
                  </button>
                )}
                
                <button
                  onClick={handleAddToList}
                  className="w-12 h-12 rounded-full border-2 border-zinc-400 flex items-center justify-center hover:border-white hover:bg-white/10 transition-all"
                  title={isInList ? "Remove from List" : "Add to List"}
                >
                  {isInList ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Plus className="w-5 h-5 text-white" />
                  )}
                </button>

                <button
                  onClick={handleShare}
                  className="w-12 h-12 rounded-full border-2 border-zinc-400 flex items-center justify-center hover:border-white hover:bg-white/10 transition-all ml-auto md:ml-0"
                  title="Share"
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="px-4 md:px-12 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {/* Cast */}
            {cast.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-xl font-semibold text-white">Cast</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {cast.map(person => (
                    <div key={person.id} className="flex-shrink-0 w-32">
                      <div className="w-32 h-32 rounded-lg overflow-hidden bg-zinc-800 mb-2">
                        {person.profile_path ? (
                          <img
                            src={`${IMAGE_SIZES.profile.medium}${person.profile_path}`}
                            alt={person.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            No Image
                          </div>
                        )}
                      </div>
                      <p className="text-white text-sm font-medium truncate">{person.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{person.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Episodes (TV Shows) */}
            {type === 'tv' && details.seasons && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-zinc-400" />
                    <h2 className="text-xl font-semibold text-white">Episodes</h2>
                  </div>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                    className="bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-600"
                  >
                    {details.seasons
                      .filter(s => s.season_number > 0)
                      .map(season => (
                        <option key={season.id} value={season.season_number}>
                          Season {season.season_number}
                        </option>
                      ))}
                  </select>
                </div>

                {isLoadingSeason ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                ) : seasonDetails?.episodes ? (
                  <div className="space-y-4">
                    {seasonDetails.episodes.map(episode => (
                      <Link
                        key={episode.id}
                        to={createPageUrl('Watch') + `?id=${id}&type=tv&season=${selectedSeason}&episode=${episode.episode_number}`}
                        className="flex gap-4 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors group"
                      >
                        <div className="relative w-40 h-24 flex-shrink-0 rounded overflow-hidden bg-zinc-800">
                          {episode.still_path ? (
                            <img
                              src={`${IMAGE_SIZES.backdrop.small}${episode.still_path}`}
                              alt={episode.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Play className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-10 h-10 text-white fill-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-zinc-400 text-sm">E{episode.episode_number}</span>
                            <h3 className="text-white font-medium truncate">{episode.name}</h3>
                          </div>
                          <p className="text-zinc-400 text-sm line-clamp-2">{episode.overview}</p>
                          {episode.runtime && (
                            <span className="text-zinc-500 text-xs">{episode.runtime} min</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {(directors.length > 0 || creators.length > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-500 text-sm font-medium">
                    {type === 'tv' ? 'Creators' : 'Directors'}
                  </span>
                </div>
                <span className="text-white pl-6 block">
                  {(type === 'tv' ? creators : directors).map(p => p.name).join(', ')}
                </span>
              </div>
            )}
            
            {details.production_companies?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-500 text-sm font-medium">Production</span>
                </div>
                <span className="text-white pl-6 block">
                  {details.production_companies.slice(0, 3).map(c => c.name).join(', ')}
                </span>
              </div>
            )}

            {details.vote_average > 0 && (
              <div className="mb-4">
                <span className="text-zinc-500 text-sm">Rating: </span>
                <span className="text-white flex items-center gap-1 inline-flex">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {details.vote_average.toFixed(1)} ({details.vote_count} votes)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Similar Content */}
      {details.similar?.results?.length > 0 && (
        <ContentRow 
          title="More Like This" 
          items={details.similar.results} 
          type={type}
        />
      )}

      {details.recommendations?.results?.length > 0 && (
        <ContentRow 
          title="Recommendations" 
          items={details.recommendations.results} 
          type={type}
        />
      )}

      {/* Trailer Modal */}
      <AnimatePresence>
        {showTrailer && trailer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowTrailer(false)}
          >
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 text-white hover:text-zinc-300"
            >
              <X className="w-8 h-8" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}