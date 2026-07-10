const CORS_PROXY = 'https://cors-proxy.iammrbeastbackup.workers.dev/?url=';
export const BASE_URL = 'https://streamed.pk';

export const proxyFetchJSON = (url) => fetch(CORS_PROXY + encodeURIComponent(url)).then(r => r.json());

export const SPORT_EMOJI = {
  basketball: '🏀', football: '⚽', 'american-football': '🏈', hockey: '🏒',
  baseball: '⚾', 'motor-sports': '🏎️', fight: '🥊', tennis: '🎾',
  rugby: '🏉', golf: '⛳', billiards: '🎱', afl: '🏈', darts: '🎯', cricket: '🏏', other: '🏆',
};

export function formatMatchDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function badgeUrl(badge) {
  if (!badge) return null;
  return `${BASE_URL}/api/images/proxy/${badge}`;
}

export function posterUrl(poster) {
  if (!poster) return null;
  return `${BASE_URL}${poster}`;
}