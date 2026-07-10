const TMDB_API_KEY = '34928409ba993b18e5692ff675303cdf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const IMAGE_SIZES = {
  poster: {
    small: `${TMDB_IMAGE_BASE}/w185`,
    medium: `${TMDB_IMAGE_BASE}/w342`,
    large: `${TMDB_IMAGE_BASE}/w500`,
    original: `${TMDB_IMAGE_BASE}/original`,
  },
  backdrop: {
    small: `${TMDB_IMAGE_BASE}/w300`,
    medium: `${TMDB_IMAGE_BASE}/w780`,
    large: `${TMDB_IMAGE_BASE}/w1280`,
    original: `${TMDB_IMAGE_BASE}/original`,
  },
  profile: {
    small: `${TMDB_IMAGE_BASE}/w45`,
    medium: `${TMDB_IMAGE_BASE}/w185`,
    large: `${TMDB_IMAGE_BASE}/h632`,
  },
};

const fetchTMDB = async (endpoint, params = {}) => {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('TMDB API Error');
  return response.json();
};

export const TMDBService = {
  // Trending
  getTrending: (mediaType = 'all', timeWindow = 'week') =>
    fetchTMDB(`/trending/${mediaType}/${timeWindow}`),
  
  // Movies
  getPopularMovies: (page = 1) =>
    fetchTMDB('/movie/popular', { page }),
  
  getTopRatedMovies: (page = 1) =>
    fetchTMDB('/movie/top_rated', { page }),
  
  getNowPlayingMovies: (page = 1) =>
    fetchTMDB('/movie/now_playing', { page }),
  
  getUpcomingMovies: (page = 1) =>
    fetchTMDB('/movie/upcoming', { page }),
  
  getMovieDetails: (id) =>
    fetchTMDB(`/movie/${id}`, { append_to_response: 'credits,videos,similar,recommendations,release_dates' }),

  getImages: (id, type = 'movie') =>
    fetchTMDB(`/${type}/${id}/images`, { include_image_language: 'en,null' }),
  
  // TV Shows
  getPopularTV: (page = 1) =>
    fetchTMDB('/tv/popular', { page }),
  
  getTopRatedTV: (page = 1) =>
    fetchTMDB('/tv/top_rated', { page }),
  
  getOnTheAirTV: (page = 1) =>
    fetchTMDB('/tv/on_the_air', { page }),
  
  getTVDetails: (id) =>
    fetchTMDB(`/tv/${id}`, { append_to_response: 'credits,videos,similar,recommendations,content_ratings,aggregate_credits' }),
  
  getTVSeasonDetails: (tvId, seasonNumber) =>
    fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`),
  
  // Search
  searchMulti: (query, page = 1) =>
    fetchTMDB('/search/multi', { query, page }),
  
  searchMovies: (query, page = 1) =>
    fetchTMDB('/search/movie', { query, page }),
  
  searchTV: (query, page = 1) =>
    fetchTMDB('/search/tv', { query, page }),
  
  // Genres
  getMovieGenres: () =>
    fetchTMDB('/genre/movie/list'),
  
  getTVGenres: () =>
    fetchTMDB('/genre/tv/list'),
  
  // Discover
  discoverMovies: (params = {}) =>
    fetchTMDB('/discover/movie', params),
  
  discoverTV: (params = {}) =>
    fetchTMDB('/discover/tv', params),
};

export default TMDBService;