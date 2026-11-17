import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function excerpt(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, start);
  return source.slice(a, b);
}
function deferred() {
  let resolve;
  const promise = new Promise(accept => { resolve = accept; });
  return {promise, resolve};
}
function library(progress) {
  return {MediaListCollection: {lists: [{entries: [{
    id: 61, progress, status: 'CURRENT', media: {id: 501},
  }]}]}};
}
const libraryCode = excerpt('let animeLibraryToken = state.anilist;', '// Step 9: provider-backed progress');
const reconcileCode = excerpt('function reconcileAnimeProgress(', 'function refreshAfterEpisodeConfirmation(');
const statusCode = excerpt('async function changeStatus(', '// mokumokuren_rc2_enrichment');
const refreshCase = async () => {
  const stale = deferred();
  let collectionReads = 0;
  const state = {anilist: 'same-account', animeLibrary: [], animeLibraryLoaded: false};
  const ctx = vm.createContext({state, ani: async query => {
    if (query.includes('Viewer')) return {Viewer: {id: 7}};
    collectionReads++;
    return collectionReads === 1 ? stale.promise : library(8);
  }});
  vm.runInContext(libraryCode, ctx);
  const first = ctx.fetchAnimeLibrary();
  for (let i = 0; i < 5 && collectionReads === 0; i++) await Promise.resolve();
  assert.equal(collectionReads, 1);
  ctx.clearAnimeLibraryCache();
  const fresh = await ctx.fetchAnimeLibrary();
  assert.equal(fresh[0].progress, 8);
  stale.resolve(library(3));
  await first;
  assert.equal(state.animeLibrary[0].progress, 8, 'An earlier read must not replace refreshed progress');
};
const mutationCase = async () => {
  const stale = deferred();
  let collectionReads = 0;
  const state = {
    anilist: 'same-account', section: 'Anime', items: [],
    recommendationPool: [], modal: null, animeLibrary: [], animeLibraryLoaded: false,
  };
  const ctx = vm.createContext({state, ani: async query => {
    if (query.includes('Viewer')) return {Viewer: {id: 7}};
    collectionReads++;
    return collectionReads === 1 ? stale.promise : library(8);
  }});
  vm.runInContext(libraryCode + '\n' + reconcileCode, ctx);
  const first = ctx.fetchAnimeLibrary();
  for (let i = 0; i < 5 && collectionReads === 0; i++) await Promise.resolve();
  ctx.reconcileAnimeProgress(501, 8, 'CURRENT');
  stale.resolve(library(3));
  await first;
  const result = await ctx.fetchAnimeLibrary();
  assert.equal(result[0].progress, 8, 'A mutation must invalidate collection reads started before it');
  assert.equal(collectionReads, 2);
};
const statusCase = async () => {
  const x = {id: 501, progress: 3, status: 'CURRENT', repeat: 1};
  const visible = {...x}, pool = {...x}, modal = {...x};
  const entry = {id: 61, progress: 3, status: 'CURRENT', repeat: 1, media: {id: 501}};
  const state = {section: 'Anime', anilist: 'account', items: [visible],
    recommendationPool: [pool], modal, animeLibrary: [entry], animeLibraryLoaded: true};
  let reply = {id: 61, progress: 12, status: 'COMPLETED', repeat: 2};
  const calls = [];
  const ctx = vm.createContext({state, animeLibraryPending: null, anilistAccountRevision: 1,
    episodeWritesInFlight: new Set(), toast() {}, load: async () => {},
    ani: async (query, variables) => {calls.push({query, variables}); return {SaveMediaListEntry: reply};}});
  vm.runInContext(reconcileCode + '\n' + statusCode, ctx);
  assert.equal(await ctx.changeStatus(x, 'COMPLETED'), true);
  for (const record of [x, visible, pool, modal, entry]) {
    assert.equal(record.progress, 12, 'Apply confirmed progress to each existing title representation');
    assert.equal(record.status, 'COMPLETED');
    assert.equal(record.repeat, 2);
  }
  assert.ok(calls[0].query.includes('id progress status repeat'), 'Request the provider state needed by the UI');
  assert.equal(state.animeLibraryLoaded, false);
  reply = {id: 61, progress: 0, status: 'REPEATING', repeat: 2};
  assert.equal(await ctx.changeStatus(x, 'REPEATING'), true);
  assert.equal(x.progress, 0, 'Use the provider-confirmed reset when a rewatch starts');
  reply = {id: 61, progress: 99, status: 'DROPPED', repeat: 3};
  assert.equal(await ctx.changeStatus(x, 'PAUSED'), false);
  assert.equal(x.status, 'REPEATING', 'A rejected status cannot alter local state');
  assert.equal(x.progress, 0);
  reply = {id: 61, progress: null, status: 'PAUSED', repeat: null};
  assert.equal(await ctx.changeStatus(x, 'PAUSED'), true);
  assert.equal(x.progress, 0, 'Nullable response fields preserve the known count');
  assert.equal(x.repeat, 2);
};

const concurrentCase = async () => {
  const wait = deferred();
  let calls = 0;
  const x = {id: 501, episodes: 12, progress: 3, status: 'CURRENT'};
  const state = {section: 'Anime', anilist: 'account', items: [x],
    recommendationPool: [], modal: null, animeLibrary: [], animeLibraryLoaded: false};
  const locks = new Set();
  const ctx = vm.createContext({state, animeLibraryPending: null, anilistAccountRevision: 1,
    episodeWritesInFlight: locks, toast() {}, load: async () => {},
    syncAnimeTrackingDetails() {}, refreshAfterEpisodeConfirmation() {},
    ani: async () => {calls++; return wait.promise;}});
  const progressCode = excerpt('async function updateAnimeProgress(', '// Personalised home rails');
  vm.runInContext(reconcileCode + '\n' + statusCode + '\n' + progressCode, ctx);
  const pending = ctx.changeStatus(x, 'COMPLETED');
  assert.equal(await ctx.updateAnimeProgress(x, 4, null), false, 'Progress and status share the same write lock');
  assert.equal(await ctx.changeStatus(x, 'PAUSED'), false);
  assert.equal(calls, 1);
  assert.equal(locks.size, 1, 'A rejected competing write must retain the active lock');
  wait.resolve({SaveMediaListEntry: {id: 61, progress: 12, status: 'COMPLETED'}});
  assert.equal(await pending, true);
  assert.equal(locks.size, 0, 'The completed write releases its lock');
  ctx.ani = async () => {calls++; throw Error('Unavailable');};
  assert.equal(await ctx.changeStatus(x, 'PAUSED'), false);
  assert.equal(locks.size, 0, 'A failed write releases its lock');
};

const sectionCase = async () => {
  const movie = {id: 501, progress: '45%', status: 'In Progress'};
  const pool = {...movie}, modal = {...movie};
  const entry = {media: {id: 501}, progress: 3, status: 'CURRENT'};
  const state = {section: 'Movies', items: [movie], recommendationPool: [pool],
    modal, animeLibrary: [entry], animeLibraryLoaded: true};
  const ctx = vm.createContext({state, animeLibraryPending: null});
  vm.runInContext(reconcileCode, ctx);
  ctx.reconcileAnimeProgress(501, 12, 'COMPLETED', 1);
  for (const record of [movie, pool, modal]) {
    assert.equal(record.progress, '45%', 'An anime response cannot change a different section with the same numeric ID');
    assert.equal(record.status, 'In Progress');
  }
  assert.equal(entry.progress, 12, 'The anime collection still receives its confirmed state');
  assert.equal(entry.repeat, 1);
};

const detailCase = async () => {
  const count = {textContent: ''}, track = {style: {}}, bar = {setAttribute(name, value) {this[name] = value;}};
  const minus = {}, plus = {}, edit = {};
  const statuses = ['CURRENT', 'COMPLETED', 'REPEATING'].map(status => ({
    dataset: {animeStatus: status},
    classList: {toggle(_name, value) {this.active = value;}},
    setAttribute(name, value) {this[name] = value;},
  }));
  const selectors = {'#progress-count': count, '.progress-track span': track,
    '.replica-anime-progress-track': bar, '#episode-minus': minus, '#episode-plus': plus};
  const box = {isConnected: true, dataset: {},
    querySelector: selector => selectors[selector],
    querySelectorAll: selector => selector === '[data-anime-status]' ? statuses : [minus, plus, edit, ...statuses]};
  const ctx = vm.createContext({state: {anilist: 'account'}});
  vm.runInContext(excerpt('function syncAnimeTrackingDetails(', 'function renderAnimeTracking('), ctx);
  ctx.syncAnimeTrackingDetails(box, {episodes: 12, progress: 12, status: 'COMPLETED'});
  assert.equal(count.textContent, '12 / 12');
  assert.equal(track.style.width, '100%');
  assert.equal(bar['aria-valuenow'], '12');
  assert.equal(plus.disabled, true);
  assert.equal(statuses[1]['aria-pressed'], 'true');
  ctx.syncAnimeTrackingDetails(box, {episodes: 12, progress: 0, status: 'REPEATING'});
  assert.equal(count.textContent, '0 / 12');
  assert.equal(plus.disabled, false);
  assert.equal(minus.disabled, true);
  box.dataset.syncBusy = 'true';
  ctx.syncAnimeTrackingDetails(box, {episodes: 12, progress: 2, status: 'REPEATING'});
  assert.ok([minus, plus, edit, ...statuses].every(control => control.disabled));
};

let failures = 0;
for (const check of [refreshCase, mutationCase, statusCase, concurrentCase, sectionCase, detailCase]) {
  try {await check(); console.log('PASS ' + check.name);}
  catch (error) {failures++; console.error('FAIL ' + check.name + ': ' + error.message);}
}
assert.equal(failures, 0, 'AniList confirmed state regression');
