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
