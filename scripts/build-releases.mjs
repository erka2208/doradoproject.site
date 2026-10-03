import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { buildAlbums } from './build-albums.mjs';

const root = new URL('../', import.meta.url);
const origin = 'https://doradoproject.com/';
const check = process.argv.includes('--check');
const today = new Date().toISOString().slice(0, 10);
const read = (file) => readFile(new URL(file, root), 'utf8');
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const clean = (s) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const field = (html, pattern) => clean(html.match(pattern)?.[1] || '');
const current = await read('index.html');
const albumBuild = await buildAlbums(root);
const homeSchema = JSON.parse(current.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || '{}');
const oldSitemap = await read('sitemap.xml');
const dates = new Map([...oldSitemap.matchAll(/<url>\s*<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/gs)].map(([, url, date]) => [url, date]));
const releases = [];
const cardRE = /<article class="release-card reveal"(?: id="([^"]+)")?>([\s\S]*?)<\/article>/g;
let home = current.replace(cardRE, (whole, id, body) => {
  const image = body.match(/background:url\('([^']+)'\)/)?.[1]?.split('?')[0];
  const slug = id || image?.match(/assets\/([^/]+)\.webp$/)?.[1];
  const title = field(body, /<h3[^>]*>([\s\S]*?)<\/h3>/);
  const description = field(body, /<p>([\s\S]*?)<\/p>/);
  const genre = field(body, /<span class="pill">([\s\S]*?)<\/span>/);
  const status = field(body, /<p class="release-kicker">([\s\S]*?)<\/p>/);
  const spotify = body.match(/href="(https:\/\/open\.spotify\.com\/track\/[^"]+)"/)?.[1];
  if (!slug || !title || !description || !image || slug === 'chamonix-2712') return whole;
  if (releases.some((r) => r.slug === slug)) throw new Error(`Duplicate release slug: ${slug}`);
  const sourceSchema = (homeSchema['@graph'] || []).find((item) => item['@id'] === `${origin}#${slug}` || item['@id'] === `${origin}releases/${slug}.html#recording`);
  releases.push({ slug, title, description, image, genre, status, spotify, language: sourceSchema?.inLanguage });
  const detail = `<a class="release-detail-link" href="releases/${slug}.html" aria-label="${escape(title)} — meer over dit nummer">${/^(Een|De|Drie|Het)\b/i.test(description) ? 'Meer over dit nummer' : 'Discover the track'} →</a>`;
  return `<article class="release-card reveal" id="${slug}">${body.replace(/\s*<a class="release-detail-link"[\s\S]*?<\/a>/g, '')}\n          ${detail}\n        </article>`;
});

// Keep the home page's structured data aligned with the new permanent song URLs.
if (albumBuild.section) {
  if (home.includes('<!-- HALLOWEEN_ALBUMS_START -->')) {
    home = home.replace(/<!-- HALLOWEEN_ALBUMS_START -->[\s\S]*?<!-- HALLOWEEN_ALBUMS_END -->/, albumBuild.section);
  } else {
    home = home.replace('      <div class="release-grid">', `${albumBuild.section}\n\n      <div class="release-grid">`);
  }
  if (!home.includes('href="album.css?v=1"')) home = home.replace('<link rel="stylesheet" href="styles.css?v=5">', '<link rel="stylesheet" href="styles.css?v=5">\n  <link rel="stylesheet" href="album.css?v=1">');
}
home = home.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (whole, json) => {
  const graph = JSON.parse(json);
  graph['@graph'] = (graph['@graph'] || []).filter((item) => !albumBuild.schemas.some((a) => item['@id'] === a['@id']));
  graph['@graph'].push(...albumBuild.schemas);
  for (const item of graph['@graph'] || []) {
    if (item['@type'] === 'MusicComposition' && item.byArtist) {
      item.composer = item.byArtist;
      delete item.byArtist;
    }
    const release = releases.find((r) => item['@id'] === `${origin}#${r.slug}`);
    if (release) {
      item['@id'] = `${origin}releases/${release.slug}.html#recording`;
      item.url = `${origin}releases/${release.slug}.html`;
      if (release.spotify && !item.sameAs) item.sameAs = release.spotify;
    }
  }
  return `<script type="application/ld+json">\n  ${JSON.stringify(graph, null, 2).replaceAll('\n', '\n  ')}\n  </script>`;
});
home = home.replace(/[ \t]+$/gm, '');

const files = new Map([['index.html', home], ...albumBuild.files]);
for (const r of releases) {
  const lang = r.language || (/\b(een|het|de|met|naar|van|niet|en|wordt|komt|blijft|door)\b/i.test(r.description) ? 'nl' : 'en');
  const url = `${origin}releases/${r.slug}.html`;
  const image = `${origin}${r.image}`;
  const title = `${r.title} — Dorado Project`;
  const summary = `${r.description} ${r.spotify ? (lang === 'nl' ? 'Beluister op Spotify.' : 'Listen on Spotify.') : (lang === 'nl' ? 'Ontdek de track en volg de release.' : 'Discover the track and follow its release.')}`;
  const schema = {
    '@context': 'https://schema.org', '@type': r.spotify ? 'MusicRecording' : 'MusicComposition',
    '@id': `${url}#recording`, name: r.title, url, description: r.description,
    image, genre: r.genre.split(/\s*\/\s*/), inLanguage: lang,
    [r.spotify ? 'byArtist' : 'composer']: { '@id': `${origin}#artist`, '@type': 'MusicGroup', name: 'Dorado Project', url: origin },
    ...(r.spotify ? { sameAs: r.spotify } : {})
  };
  const action = r.spotify
    ? `<a class="button button-primary" href="${escape(r.spotify)}" target="_blank" rel="noopener noreferrer">${lang === 'nl' ? 'Luister op Spotify' : 'Listen on Spotify'} →</a>`
    : `<p class="release-note">${lang === 'nl' ? 'De Spotify-link volgt zodra het nummer daar beschikbaar is.' : 'Spotify link to follow when the track is available.'}</p>`;
  files.set(`releases/${r.slug}.html`, `<!doctype html>\n<html lang="${lang}">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <meta name="theme-color" content="#07141c">\n  <title>${escape(title)}</title>\n  <meta name="description" content="${escape(summary.slice(0, 300))}">\n  <meta name="robots" content="index, follow, max-image-preview:large">\n  <link rel="canonical" href="${url}">\n  <meta property="og:type" content="music.song">\n  <meta property="og:title" content="${escape(title)}">\n  <meta property="og:description" content="${escape(r.description)}">\n  <meta property="og:url" content="${url}">\n  <meta property="og:site_name" content="Dorado Project">\n  <meta property="og:image" content="${image}">\n  <meta property="og:image:alt" content="${escape(r.title)} cover by Dorado Project">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:title" content="${escape(title)}">\n  <meta name="twitter:description" content="${escape(r.description)}">\n  <meta name="twitter:image" content="${image}">\n  <script type="application/ld+json">\n  ${JSON.stringify(schema, null, 2).replaceAll('<', '\\u003c').replaceAll('\n', '\n  ')}\n  </script>\n  <link rel="stylesheet" href="../styles.css?v=5">\n  <link rel="stylesheet" href="../release.css?v=1">\n</head>\n<body class="release-page">\n  <div class="grain" aria-hidden="true"></div>\n  <header class="site-header scrolled">\n    <a class="brand" href="../index.html" aria-label="Dorado Project home"><span class="brand-mark">D</span><span>DORADO PROJECT</span></a>\n    <nav aria-label="Primary navigation"><a href="../index.html#releases">Releases</a><a href="../index.html#about">About</a></nav>\n  </header>\n  <main class="release-main">\n    <a class="back-link" href="../index.html#${r.slug}">← ${lang === 'nl' ? 'Alle releases' : 'All releases'}</a>\n    <article class="release-feature">\n      <img src="../${escape(r.image)}" alt="${escape(r.title)} cover by Dorado Project" width="1200" height="1200">\n      <div class="release-feature-copy">\n        <p class="eyebrow">${escape(r.status)}</p>\n        <h1 class="notranslate" translate="no">${escape(r.title)}</h1>\n        <p class="release-genre">${escape(r.genre)}</p>\n        <p class="release-description">${escape(r.description)}</p>\n        ${action}\n      </div>\n    </article>\n    <section class="more-music"><h2>${lang === 'nl' ? 'Meer van Dorado Project' : 'More from Dorado Project'}</h2><p>${lang === 'nl' ? 'Van synthpop tot rock: ontdek de andere nummers en het verhaal achter Dorado Project.' : 'From synthpop to rock: explore more tracks and the story behind Dorado Project.'}</p><a class="button button-secondary" href="../index.html#releases">${lang === 'nl' ? 'Bekijk alle nummers' : 'Explore all tracks'} →</a></section>\n  </main>\n  <footer><span>© Dorado Project</span><a href="../index.html">doradoproject.com</a></footer>\n</body>\n</html>\n`);
}

const basePages = ['index.html', 'chamonix.html'];
const urls = [...basePages, ...releases.map((r) => `releases/${r.slug}.html`), ...albumBuild.files.keys()];
const dateFor = async (file) => {
  const url = file === 'index.html' ? origin : origin + file;
  let existing;
  try { existing = await read(file); } catch { /* new page */ }
  return existing === files.get(file) && dates.has(url) ? dates.get(url) : (files.has(file) ? today : dates.get(url) || today);
};
let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const file of urls) {
  const url = file === 'index.html' ? origin : origin + file;
  sitemap += `  <url><loc>${url}</loc><lastmod>${await dateFor(file)}</lastmod></url>\n`;
}
sitemap += '</urlset>\n';
files.set('sitemap.xml', sitemap);

const stale = (await readdir(new URL('releases/', root))).filter((f) => f.endsWith('.html') && !files.has(`releases/${f}`));
if (stale.length) throw new Error(`Unreferenced release pages: ${stale.join(', ')}`);
let changed = 0;
for (const [file, content] of files) {
  let existing;
  try { existing = await read(file); } catch { /* new page */ }
  if (existing !== content) {
    changed++;
    if (!check) {
      await mkdir(new URL('./', new URL(file, root)), { recursive: true });
      await writeFile(new URL(file, root), content);
    }
    else console.error(`Out of date: ${file}`);
  }
}
if (check && changed) process.exitCode = 1;
console.log(`${releases.length} release pages; ${changed} ${check ? 'out of date' : 'updated'} files.`);
