import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function excerpt(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first, 'Tracking source markers must exist');
  return source.slice(first, last);
}
function deferred() {
  let resolve;
  const promise = new Promise(accept => { resolve = accept; });
  return {promise, resolve};
}
function button() {
  const span = {textContent: ''};
  const use = {setAttribute() {}};
  return {
    disabled: true,
    dataset: {inWatchlist: 'false'},
    querySelector(selector) { return selector === 'span' ? span : use; },
    setAttribute() {},
  };
}

async function watchlistDoubleClick() {
  const wait = deferred();
  const watchlist = button(), watched = button();
  const back = {isConnected: true, querySelector: selector => selector === '#watchlist' ? watchlist : watched};
  let writes = 0;
  const ctx = vm.createContext({
    back, kind: 'movie', x: {id: 4}, state: {trakt: 'fixture'},
    traktTrackTarget: () => ({kind: 'movie', ids: {tmdb: 4}}),
    getItemTracking: async () => ({available: true, watched: false, watchlist: false}),
    changeStatus: async () => { writes++; await wait.promise; return true; },
  });
  vm.runInContext(excerpt(" const watchlistButton=back.querySelector('#watchlist')", " back.querySelector('#more').onclick=") +
    '\nglobalThis.update = updateButtons;', ctx);
  await ctx.update();
  const first = watchlist.onclick();
  const second = watchlist.onclick();
  await ctx.update();
  const disabledDuringWrite = watchlist.disabled;
  const third = watchlist.onclick();
  wait.resolve();
  await Promise.all([first, second, third]);
  assert.equal(writes, 1, 'Repeated presses must start only one Watchlist write');
  assert.equal(disabledDuringWrite, true, 'A refresh during a write must keep the Watchlist action disabled');
  assert.equal(watchlist.disabled, false, 'The action must be available after a confirmed refresh');
}

async function quickEpisodeConfirmation() {
  const item = () => ({trakt_id: 33, nextEpisode: {season: 0, number: 1, title: 'Special'}});
  const ctx = vm.createContext({
    state: {trakt: 'fixture'}, traktAccountRevision: 2, episodeWritesInFlight: new Set(),
    clearTrackingCache() {}, toast() {}, refreshAfterEpisodeConfirmation() {},
  });
  vm.runInContext(excerpt('async function markNextTraktEpisode(item){', 'async function performQuickEpisode('), ctx);
  for (const response of [
    {added: {episodes: 0}}, {added: {episodes: -1}}, {added: {episodes: '1'}},
    {added: {episodes: 1.5}}, {added: {episodes: 1}, not_found: {episodes: [{ids: {trakt: 4}}]}},
    {added: {episodes: 1}, not_found: {seasons: [{number: 1}]}},
    {added: {episodes: 1}, not_found: {shows: [{ids: {trakt: 33}}]}},
  ]) {
    ctx.trakt = async () => response;
    const next = item();
    assert.equal(await ctx.markNextTraktEpisode(next), false, JSON.stringify(response));
    assert.notEqual(next.nextEpisode, null, 'Unconfirmed writes must preserve progress');
  }
  let calls = 0;
  ctx.trakt = async () => { calls++; return {added: {episodes: 1}}; };
  for (const episode of [{season: -1, number: 1}, {season: 1, number: 0}]) {
    assert.equal(await ctx.markNextTraktEpisode({trakt_id: 33, nextEpisode: episode}), false);
  }
  assert.equal(calls, 0, 'Invalid episode positions must never send requests');
  const wait = deferred();
  ctx.trakt = async (_path, options) => {
    calls++;
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload, {shows: [{ids: {trakt: 33}, seasons: [{number: 0, episodes: [{number: 1}]}]}]});
    return wait.promise;
  };
  const next = item();
  const first = ctx.markNextTraktEpisode(next);
  assert.equal(await ctx.markNextTraktEpisode(item()), false, 'Concurrent quick writes for one show must be coalesced');
  wait.resolve({added: {episodes: 1}});
  assert.equal(await first, true);
  assert.equal(calls, 1);
  assert.equal(next.nextEpisode, null, 'Confirmed writes require fresh next-episode data');
}

const failures = [];
for (const check of [watchlistDoubleClick, quickEpisodeConfirmation]) {
  try { await check(); console.log('PASS ' + check.name); }
  catch (error) { failures.push(check.name); console.error('FAIL ' + check.name + ': ' + error.message); }
}
assert.equal(failures.length, 0, failures.join(', '));
