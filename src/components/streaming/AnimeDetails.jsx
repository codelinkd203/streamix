import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AniListService } from './AniListService';
import ContentRow from './ContentRow';
import TrailerModal from './TrailerModal';
import { Play, Plus, Check, Star, Clock, Film, Info, Building2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS = {
  RELEASING: 'Airing',
  FINISHED: 'Finished',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'On Hiatus',
};

export default function AnimeDetails({ id }) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [myList, setMyList] = useState([]);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('myList');
    if (saved) setMyList(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    AniListService.getAnimeDetails(id)
      .then(setDetails)
      .catch(err => console.error('Error fetching anime details:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const isInList = myList.some(i => i.id === parseInt(id));

  const handleAddToList = () => {
    if (!details) return;

    const item = { ...details, media_type: 'anime' };
    let newList;

    if (isInList) {
      newList = myList.filter(i => i.id !== parseInt(id));
    } else {
      newList = [item, ...myList];
    }

    setMyList(newList);
    localStorage.setItem('myList', JSON.stringify(newList));

    if (!isInList) {
      toast.success('Added to My List', { description: `${title} has been added to your list.` });
    } else {
      toast.info('Removed from My List', { description: `${title} has been removed.` });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link Copied!', { description: 'The link has been copied to your clipboard.' });
  };

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

  const title = details.title;
  const releaseYear = details.release_date?.split('-')[0];
  const backdropUrl = details.backdrop_path || null;
  const posterUrl = details.poster_path || null;
  const watchUrl = createPageUrl('Watch') + `?id=${id}&type=anime&episode=1`;

  const totalEpisodes = details.episodes
    || (details.nextAiringEpisode?.episode ? details.nextAiringEpisode.episode - 1 : 0);
  const episodeList = Array.from({ length: Math.max(totalEpisodes, 0) }, (_, i) => i + 1);
  const isOngoingUnknownTotal = !details.episodes && details.status === 'RELEASING';

  const related = (details.relations || []).filter(r =>
    ['PREQUEL', 'SEQUEL', 'SIDE_STORY', 'ADAPTATION', 'ALTERNATIVE'].includes(r.relationType)
  );

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
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">{title}</h1>

              {/* Metadata */}
              <div className="flex items-center gap-3 flex-wrap text-sm mb-4">
                {details.vote_average > 0 && (
                  <span className="text-green-500 font-semibold">
                    {Math.round(details.vote_average * 10)}% Match
                  </span>
                )}
                {releaseYear && (
                  <span className="text-zinc-400">{releaseYear}</span>
                )}
                {details.status && (
                  <span className="px-1.5 py-0.5 border border-zinc-500 text-zinc-300 text-xs font-medium rounded">
                    {STATUS_LABELS[details.status] || details.status}
                  </span>
                )}
                {details.format && (
                  <span className="text-zinc-400">{details.format.replace('_', ' ')}</span>
                )}
                {totalEpisodes > 0 && (
                  <span className="text-zinc-400">
                    {totalEpisodes} Episode{totalEpisodes > 1 ? 's' : ''}
                  </span>
                )}
                {details.episode_run_time?.[0] > 0 && (
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
              <p className="text-white/90 text-base md:text-lg leading-relaxed mb-6 line-clamp-4 whitespace-pre-line">
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

                {details.trailer?.id && (
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
            {/* Episodes */}
            {episodeList.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Film className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-xl font-semibold text-white">Episodes</h2>
                  {isOngoingUnknownTotal && (
                    <span className="text-zinc-500 text-xs font-mono">(airing)</span>
                  )}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {episodeList.map(ep => (
                    <Link
                      key={ep}
                      to={createPageUrl('Watch') + `?id=${id}&type=anime&episode=${ep}`}
                      className="flex items-center justify-center aspect-square rounded-md bg-zinc-800/50 hover:bg-white hover:text-black text-zinc-300 font-medium text-sm transition-colors"
                    >
                      {ep}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {details.studios?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-500 text-sm font-medium">Studio</span>
                </div>
                <span className="text-white pl-6 block">
                  {details.studios.slice(0, 3).join(', ')}
                </span>
              </div>
            )}

            {details.status && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-500 text-sm font-medium">Status</span>
                </div>
                <span className="text-white pl-6 block">
                  {STATUS_LABELS[details.status] || details.status}
                </span>
              </div>
            )}

            {details.vote_average > 0 && (
              <div className="mb-4">
                <span className="text-zinc-500 text-sm">Rating: </span>
                <span className="text-white flex items-center gap-1 inline-flex">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {details.vote_average.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <ContentRow
          title="More Like This"
          items={related}
          type="anime"
        />
      )}

      <TrailerModal
        isOpen={showTrailer}
        onClose={() => setShowTrailer(false)}
        mediaId={id}
        mediaType="anime"
      />
    </div>
  );
}
