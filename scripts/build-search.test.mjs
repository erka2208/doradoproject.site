import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateHomepageSpotify } from './build-search.mjs';

const spotify = 'https://open.spotify.com/track/76GIGuqKAEbLPikUncWRsE';
const card = `<article class="release-card reveal"><a href="chamonix.html">CHAMONIX 2712</a><a href="${spotify}">Spotify</a><a href="/chamonix.html">Story &amp; photos</a></article>`;
const item = { title: 'CHAMONIX 2712', url: '/chamonix.html', spotify };

test('accepts a matching Spotify link and story destination', () => {
  assert.doesNotThrow(() => validateHomepageSpotify([item], card));
});

test('reports the original missing sameAs regression', () => {
  assert.throws(() => validateHomepageSpotify([{ ...item, spotify: undefined }], card), /chamonix\.html: missing Spotify link.*sameAs/);
});

test('reports a missing search entry and an incorrect Spotify link', () => {
  assert.throws(() => validateHomepageSpotify([], card), /missing Spotify link/);
  assert.throws(() => validateHomepageSpotify([{ ...item, spotify: 'https://open.spotify.com/track/0000000000000000000000' }], card), /differs from homepage/);
});

test('does not borrow Spotify links from another card or require unreleased tracks', () => {
  const pending = '<article><a href="/releases/pending.html">Pending</a></article>';
  assert.doesNotThrow(() => validateHomepageSpotify([item, { url: '/releases/pending.html' }], card + pending));
  assert.doesNotThrow(() => validateHomepageSpotify([], '<article><a href="https://open.spotify.com/search/Chamonix">Search</a><a href="chamonix.html">Story</a></article>'));
});

test('checks album cards as well as singles', () => {
  const album = '<article class="album-card"><a href="/albums/example.html">Album</a><a href="https://open.spotify.com/album/28cec3nND2vngqLYuKEE1c">Spotify</a></article>';
  assert.throws(() => validateHomepageSpotify([{ url: '/albums/example.html' }], album), /missing Spotify link/);
});

test('generated CHAMONIX entry preserves the photo story and has the verified Spotify URL', async () => {
  const entries = JSON.parse(await readFile(new URL('../data/search-index.json', import.meta.url), 'utf8'));
  const matches = entries.filter(entry => entry.title === item.title);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].url, item.url);
  assert.equal(matches[0].spotify, spotify);
  const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotThrow(() => validateHomepageSpotify(entries, homepage));
});

// Exercise the normalization and matching expressions from the shipped browser code.
async function searchCatalogue(query) {
  const { runInNewContext } = await import('node:vm');
  const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
  const normalizeSource = source.match(/const normalize = ([^\n]+);/)[1];
  const normalize = runInNewContext(`(${normalizeSource})`);
  const filterSource = source.match(/catalogue\.filter\((.*?)\)\.sort/)[1];
  const tokens = normalize(query).split(' ');
  const matches = runInNewContext(`(${filterSource})`, { tokens });
  const entries = JSON.parse(await readFile(new URL('../data/search-index.json', import.meta.url), 'utf8'));
  return entries.map(item => ({ ...item, searchText: normalize([item.title, item.genre, item.album, item.description].join(' ')) })).filter(matches);
}

for (const [query, titles] of [
  ['piano house', ['Neon Under Skin', "Everybody's Awake Somewhere"]],
  ['acid house', ['Static in My Blood']],
  ['deep house', ['Before the First Train']],
  ['breakbeat', ['Somewhere Between Stations']],
  ['ambient house', ['Daylight Finds Us']],
  ['dub house', ['The Room Behind the Noise']],
  ['UK garage', ['After The Last Train']],
  ['disco house', ['Midnight Chemistry']],
]) {
  test(`browser search finds the expected tracks for ${query}`, async () => {
    const matches = await searchCatalogue(query);
    for (const title of titles) assert.ok(matches.some(item => item.title === title), `${query}: missing ${title}`);
  });
}

test('all album tracks preserve album genres and include explicit track genres in metadata and index', async () => {
  const { buildAlbums } = await import('./build-albums.mjs');
  const root = new URL('../', import.meta.url);
  const albums = JSON.parse(await readFile(new URL('data/halloween-albums.json', root), 'utf8'));
  const entries = JSON.parse(await readFile(new URL('data/search-index.json', root), 'utf8'));
  const { files } = await buildAlbums(root);
  for (const album of albums) for (const track of album.tracks) {
    const path = `albums/${album.slug}/${track.slug}.html`;
    const html = files.get(path);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const recording = schema['@graph'].find(node => node['@type'] === 'MusicRecording');
    const entry = entries.find(item => item.url === `/${path}`);
    assert.ok(entry, path);
    assert.equal(entry.genre, recording.genre.join(' / '), `${path}: metadata/index mismatch`);
    const genres = recording.genre.map(value => value.toLowerCase());
    assert.equal(new Set(genres).size, genres.length, `${path}: duplicate genres`);
    for (const genre of [...album.genre, ...[track.genre || []].flat()]) {
      assert.ok(genres.includes(genre.toLowerCase()), `${path}: missing ${genre}`);
    }
  }
});

test('track genre handling supports strings, whitespace, duplicates and missing genres', async () => {
  const { trackGenres } = await import('./build-albums.mjs');
  assert.deepEqual(trackGenres({ genre: ['Progressive House', 'Electronic'] }, { genre: [' progressive house ', 'Piano house', ''] }), ['Progressive House', 'Electronic', 'Piano house']);
  assert.deepEqual(trackGenres({ genre: 'Electronic' }, { genre: 'Acid house' }), ['Electronic', 'Acid house']);
  assert.deepEqual(trackGenres({ genre: ['Electronic'] }, { theme: 'A scene in the forest' }), ['Electronic']);
  assert.deepEqual(trackGenres({}, {}), []);
});
