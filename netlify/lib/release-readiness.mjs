import {approvedCallbackUri} from './oauth-origin.mjs';

// Public OAuth application IDs, mirrored in app.js. Unit tests enforce parity.
const CLIENT_IDS = Object.freeze({
  TRAKT_CLIENT_ID: '42rPcHWAppxsSkWTIuApWjcED9nBfgXO6ay9bNioynw',
  ANILIST_CLIENT_ID: '56513',
});
const configured = value => typeof value === 'string' && value.trim().length > 0 && value === value.trim();

/** Pure, credential-free release readiness report. Does not make network requests. */
export function inspectReleaseConfiguration(env, requestOrigin) {
  const origin = env.get('MOKUMOKUREN_ORIGIN');
  const callback = approvedCallbackUri({get: name => name === 'MOKUMOKUREN_ORIGIN' ? (origin || 'invalid') : undefined});
  const checks = {
    canonical_origin: configured(origin) && !!callback && `${origin}/callback` === callback && origin === requestOrigin,
    tmdb_token: configured(env.get('TMDB_READ_TOKEN')),
    trakt_client_id: env.get('TRAKT_CLIENT_ID') === CLIENT_IDS.TRAKT_CLIENT_ID,
    anilist_client_id: env.get('ANILIST_CLIENT_ID') === CLIENT_IDS.ANILIST_CLIENT_ID,
    anilist_secret: configured(env.get('ANILIST_CLIENT_SECRET')),
  };
  return {ready:Object.values(checks).every(Boolean),checks};
}
