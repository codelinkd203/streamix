export const StreamingService = {
  getMovieStream: async (tmdbId) => {
    return {
      url: `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
      type: 'embed'
    };
  },

  getTVStream: async (tmdbId, season, episode) => {
    return {
      url: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
      type: 'embed'
    };
  },

  // Subtitles via OpenSubtitles.com REST API (open, no key needed for basic use)
  getSubtitles: async (tmdbId, type, season, episode) => {
    try {
      const params = new URLSearchParams({ tmdb_id: tmdbId, languages: 'en' });
      if (type === 'tv') {
        params.set('type', 'episode');
        params.set('season_number', season);
        params.set('episode_number', episode);
      } else {
        params.set('type', 'movie');
      }

      const response = await StreamingService.fetchWithTimeout(
        `https://opensubtitles-v3.strem.io/subtitles/${type === 'tv' ? 'series' : 'movie'}/${tmdbId}${type === 'tv' ? `:${season}:${episode}` : ''}.json`
      );

      if (!response.ok) throw new Error('OpenSubtitles stremio failed');
      const data = await response.json();
      const subs = data?.subtitles || [];

      // Map to {label, url} format — prefer English, dedupe by lang
      const seen = new Set();
      return subs
        .filter(s => {
          const lang = s.lang || s.langcode || 'en';
          if (seen.has(lang)) return false;
          seen.add(lang);
          return true;
        })
        .slice(0, 10)
        .map(s => ({
          label: s.lang || 'English',
          language: s.lang || 'en',
          url: s.url
        }));
    } catch {
      return [];
    }
  },

  get BASE_URL() {
    return StreamingService.getApiBase();
  },
};

export default StreamingService;