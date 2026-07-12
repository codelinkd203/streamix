const ANILIST_URL = 'https://graphql.anilist.co';

// AniList's CDN sends response headers that trigger ORB/CORP blocking when hotlinked
// cross-origin, so route cover/banner images through the same proxy worker used elsewhere.
const IMAGE_PROXY = 'https://cors-proxy.iammrbeastbackup.workers.dev/?url=';
function proxyImage(url) {
  return url ? `${IMAGE_PROXY}${encodeURIComponent(url)}` : null;
}

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  coverImage { extraLarge large medium color }
  bannerImage
  averageScore
  meanScore
  popularity
  episodes
  duration
  format
  status
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  genres
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode airingAt }
`;

async function anilistFetch(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error('AniList API Error');
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message || 'AniList API Error');
  return json.data;
}

// AniList descriptions contain light HTML (<br>, <i>, etc) — strip it down to plain text
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(i|b|em|strong)>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function toDateString(d) {
  if (!d?.year) return null;
  return `${d.year}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}`;
}

// Normalize an AniList Media object into the TMDB-shaped fields ContentCard/ContentRow/HeroBanner
// already know how to render (title/name, poster_path, release_date, vote_average, etc).
// poster_path/backdrop_path are full absolute URLs here (unlike TMDB's relative paths).
export function normalizeAnime(m) {
  if (!m) return null;
  const title = m.title?.english || m.title?.romaji || m.title?.native || 'Untitled';
  const poster = m.coverImage?.extraLarge || m.coverImage?.large || m.coverImage?.medium || null;
  return {
    id: m.id,
    idMal: m.idMal,
    title,
    name: title,
    poster_path: proxyImage(poster),
    backdrop_path: proxyImage(m.bannerImage || poster),
    overview: stripHtml(m.description),
    release_date: toDateString(m.startDate),
    first_air_date: toDateString(m.startDate),
    vote_average: m.averageScore != null ? m.averageScore / 10 : (m.meanScore != null ? m.meanScore / 10 : 0),
    vote_count: m.popularity || 0,
    genres: (m.genres || []).map(g => ({ id: g, name: g })),
    media_type: 'anime',
    episodes: m.episodes,
    episode_run_time: m.duration ? [m.duration] : [],
    format: m.format,
    status: m.status,
    season: m.season,
    seasonYear: m.seasonYear,
    studios: (m.studios?.nodes || []).map(s => s.name),
    nextAiringEpisode: m.nextAiringEpisode,
  };
}

async function fetchPage({ sort, perPage = 24, page = 1, genre, status, season, seasonYear, search }) {
  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $status: MediaStatus, $season: MediaSeason, $seasonYear: Int, $search: String) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: $sort, genre: $genre, status: $status, season: $season, seasonYear: $seasonYear, search: $search, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch(query, {
    page,
    perPage,
    sort: sort ? [sort] : undefined,
    genre,
    status,
    season,
    seasonYear,
    search,
  });
  return (data.Page?.media || []).map(normalizeAnime);
}

export const AniListService = {
  getTrending: (page = 1) => fetchPage({ sort: 'TRENDING_DESC', page }),
  getPopular: (page = 1) => fetchPage({ sort: 'POPULARITY_DESC', page }),
  getTopRated: (page = 1) => fetchPage({ sort: 'SCORE_DESC', page }),
  getCurrentlyAiring: (page = 1) => fetchPage({ sort: 'POPULARITY_DESC', status: 'RELEASING', page }),
  getUpcoming: (page = 1) => fetchPage({ sort: 'POPULARITY_DESC', status: 'NOT_YET_RELEASED', page }),
  discoverByGenre: (genre, page = 1) => fetchPage({ sort: 'POPULARITY_DESC', genre, page }),
  search: (query, page = 1) => fetchPage({ sort: 'SEARCH_MATCH', search: query, page, perPage: 20 }),

  getGenres: async () => {
    const data = await anilistFetch(`query { GenreCollection }`);
    return (data.GenreCollection || []).map(g => ({ id: g, name: g }));
  },

  getAnimeDetails: async (id) => {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${MEDIA_FIELDS}
          trailer { id site thumbnail }
          relations {
            edges {
              relationType
              node { ${MEDIA_FIELDS} }
            }
          }
        }
      }
    `;
    const data = await anilistFetch(query, { id: parseInt(id) });
    const m = data.Media;
    if (!m) throw new Error('Anime not found');
    const details = normalizeAnime(m);
    details.trailer = m.trailer;
    details.relations = (m.relations?.edges || [])
      .filter(e => e.node?.id)
      .map(e => ({ relationType: e.relationType, ...normalizeAnime(e.node) }));
    return details;
  },
};

export default AniListService;
