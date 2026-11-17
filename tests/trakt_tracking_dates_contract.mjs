import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

process.env.TZ = 'Europe/London';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('const trackHistoryLimit=');
const end = source.indexOf('function openTraktTrackDrawer', start);
assert.ok(start >= 0 && end > start, 'tracking functions are available');
const context = vm.createContext({
  Date,
  state: {trakt: 'fixture-token'},
  traktCalls: [],
  traktAccountRevision: 3,
  cacheClears: 0,
  title: item => item.title,
  mediaId: item => Number(item.tmdb_id || item.ids?.tmdb || ((item.ids?.trakt || item.trakt_id) ? 0 : item.id) || 0),
});
context.trakt = async (path, request) => {
  context.traktCalls.push({path, method: request.method, body: JSON.parse(request.body)});
  return {added: {movies: 1, episodes: 1}};
};
context.clearTrackingCache = () => { context.cacheClears++; };
vm.runInContext(source.slice(start, end), context);
const {traktTrackTarget, traktEpisodeTrackTarget, formatTrackLocalTime, parseTrackLocalTime,
  buildTraktTrackPayload, watchHistorySlots, recordTraktWatch} = context;
const plain = value => JSON.parse(JSON.stringify(value));

const now = Date.parse('2026-11-17T12:00:00Z');
const movie = traktTrackTarget({title: 'Film', ids: {trakt: 7, tmdb: 12}}, 'Movies');
const show = traktTrackTarget({title: 'Series', id: 33}, 'TV Shows');
const special = traktEpisodeTrackTarget({title: 'Series', ids: {trakt: 8}}, {episode_number: 4}, 0);
const episode = traktEpisodeTrackTarget(null, {title: 'Pilot', ids: {trakt: 9}}, 1);

assert.deepEqual(plain(movie), {kind: 'movie', name: 'Film', ids: {trakt: 7}});
assert.deepEqual(plain(show), {kind: 'show', name: 'Series', ids: {tmdb: 33}});
assert.equal(traktTrackTarget({id: 12}, 'Anime'), null);
assert.equal(traktTrackTarget({ids: {trakt: -1}}, 'Movies'), null);
assert.equal(traktEpisodeTrackTarget({id: 33}, {number: 0}, 1), null);
assert.equal(traktEpisodeTrackTarget({id: 33}, {number: 1}, -1), null);
assert.deepEqual(plain(buildTraktTrackPayload(movie, 'now')), {movies: [{ids: {trakt: 7}}]});
assert.deepEqual(plain(buildTraktTrackPayload(show, 'released')), {
  shows: [{ids: {tmdb: 33}, watched_at: 'released'}],
});
assert.deepEqual(plain(buildTraktTrackPayload(episode, 'unknown')), {
  episodes: [{ids: {trakt: 9}, watched_at: 'unknown'}],
});
assert.deepEqual(plain(buildTraktTrackPayload(special, 'custom', '2026-07-12T22:30', now)), {
  shows: [{ids: {trakt: 8}, seasons: [{number: 0, episodes: [{number: 4, watched_at: '2026-07-12T21:30:00.000Z'}]}]}],
});
assert.throws(() => buildTraktTrackPayload(movie, 'tomorrow'), /valid date/);
assert.throws(() => buildTraktTrackPayload(null, 'now'), /identify this title/);
assert.throws(() => buildTraktTrackPayload(movie, 'custom', '2026-11-17T12:01', now), /valid date/);
assert.equal(parseTrackLocalTime('2025-02-30T12:00', now), null);
assert.equal(parseTrackLocalTime('2025-03-30T01:30', now), null, 'local time skipped when clocks go forward');
assert.equal(parseTrackLocalTime('2025-01-01T12:00Z', now), null);
assert.equal(parseTrackLocalTime('2025-01-01T12:00', now), '2025-01-01T12:00:00.000Z');
const repeatedHour = Date.parse('2025-10-26T01:30:00Z');
assert.equal(formatTrackLocalTime(repeatedHour), '2025-10-26T01:30');
assert.equal(parseTrackLocalTime(repeatedHour, now), '2025-10-26T01:30:00.000Z');
assert.equal(parseTrackLocalTime('2025-10-26T01:30', now), '2025-10-26T00:30:00.000Z');
assert.equal(parseTrackLocalTime(Infinity, now), null);

const rows = [
  {watched_at: '2026-11-17T10:00:01Z', type: 'episode', show: {title: 'Series'}, episode: {title: 'Pilot'}},
  null,
  {watched_at: '2026-11-17T11:00:00Z', movie: {title: 'Film'}},
  {watched_at: '2026-11-17T11:00:00Z', movie: {title: 'Same minute'}},
  {watched_at: '2026-11-17T12:00:01Z'},
  {watched_at: '1970-01-01T00:00:00Z'},
  {watched_at: 'unknown'},
  {watched_at: null},
];
const slots = plain(watchHistorySlots(rows, now));
assert.equal(slots.length, 3);
assert.equal(slots[0].name, 'Film');
assert.equal(slots[0].slot, Date.parse('2026-11-17T11:30:00Z'));
assert.equal(slots[1].slot, null);
assert.equal(slots[2].name, 'Series · Pilot');
assert.equal(slots[2].slot, Date.parse('2026-11-17T10:30:00Z'));
assert.ok(slots.every(({slot, time, upper}) => slot === null || (slot % 60000 === 0 && time < slot && slot < upper)));
assert.equal(watchHistorySlots(Array.from({length: 20}, (_, i) => ({
  watched_at: new Date(now - 180000 * (i + 1)).toISOString(),
})), now).length, 15);
console.log('Trakt date payloads, episode scope, history gaps and local time: PASS');

assert.equal(await recordTraktWatch(movie, 'released'), 1);
assert.deepEqual(context.traktCalls, [{
  path: '/sync/history', method: 'POST', body: {movies: [{ids: {trakt: 7}, watched_at: 'released'}]},
}]);
assert.equal(context.cacheClears, 1);
context.state.trakt = '';
await assert.rejects(recordTraktWatch(movie, 'now'), /Connect Trakt/);
context.state.trakt = 'fixture-token';
await assert.rejects(recordTraktWatch(movie, 'now', '', 1), /account changed/);
assert.equal(context.traktCalls.length, 1, 'disconnected or stale writes never start');

context.trakt = async () => ({added: {movies: 0}});
await assert.rejects(recordTraktWatch(movie, 'now'), /did not confirm/);
context.trakt = async () => ({added: {movies: 1}});
await assert.rejects(recordTraktWatch(episode, 'unknown'), /did not confirm/);
context.trakt = async () => ({added: {episodes: 1}, not_found: {episodes: [{ids: {trakt: 9}}]}});
await assert.rejects(recordTraktWatch(episode, 'unknown'), /could not match/);
assert.equal(context.cacheClears, 1);

let release;
context.trakt = () => new Promise(resolve => { release = resolve; });
const pending = recordTraktWatch(episode, 'unknown');
await assert.rejects(recordTraktWatch(episode, 'unknown'), /already being saved/);
release({added: {episodes: 1}});
assert.equal(await pending, 1);
assert.equal(context.cacheClears, 2);
const pendingAfterAccountChange = recordTraktWatch(episode, 'now');
context.traktAccountRevision++;
release({added: {episodes: 1}});
await assert.rejects(pendingAfterAccountChange, /account changed during tracking/);
assert.equal(context.cacheClears, 2);

context.trakt = async () => ({added: {episodes: 4}});
assert.equal(await recordTraktWatch(show, 'released'), 4);
assert.equal(context.cacheClears, 3);
console.log('Trakt write confirmation, duplicate submit prevention and account isolation: PASS');
