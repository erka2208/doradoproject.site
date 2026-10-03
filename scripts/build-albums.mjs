import { readFile } from 'node:fs/promises';

const origin = 'https://doradoproject.com';
const artist = { '@type': 'MusicGroup', '@id': `${origin}/#artist`, name: 'Dorado Project', url: `${origin}/` };
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const json = (value) => JSON.stringify(value, null, 2).replaceAll('<', '\\u003c');
const albumPath = (a) => `albums/${a.slug}.html`;
const trackPath = (a, t) => `albums/${a.slug}/${t.slug}.html`;
const abs = (path) => `${origin}/${path}`;
const breadcrumbs = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })) });
const albumSchema = (a) => ({ '@type': 'MusicAlbum', '@id': `${abs(albumPath(a))}#album`, name: a.title, url: abs(albumPath(a)), image: abs(a.image), description: a.description, byArtist: artist, genre: a.genre, numTracks: a.tracks.length, albumReleaseType: 'https://schema.org/AlbumRelease', track: { '@type': 'ItemList', numberOfItems: a.tracks.length, itemListElement: a.tracks.map((t) => ({ '@type': 'ListItem', position: t.position, item: { '@type': 'MusicRecording', '@id': `${abs(trackPath(a, t))}#recording`, name: t.title, url: abs(trackPath(a, t)) } })) }, ...(a.spotify ? { sameAs: a.spotify } : {}) });

function page({ title, description, path, image, alt, type, graph, content }) {
  const url = abs(path);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#07141c">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Dorado Project">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="${abs(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1200">
  <meta property="og:image:alt" content="${esc(alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${abs(image)}">
  <meta name="twitter:image:alt" content="${esc(alt)}">
  <script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': graph })}</script>
  <link rel="stylesheet" href="/styles.css?v=5">
  <link rel="stylesheet" href="/release.css?v=1">
  <link rel="stylesheet" href="/album.css?v=1">
</head>
<body class="release-page album-page">
  <div class="grain" aria-hidden="true"></div>
  <header class="site-header scrolled">
    <a class="brand" href="/" aria-label="Dorado Project home"><span class="brand-mark">D</span><span>DORADO PROJECT</span></a>
    <nav aria-label="Primary navigation"><a class="notranslate" translate="no" href="/#releases">Releases</a><a href="/#halloween-albums">Halloween</a><a href="/#about">About</a></nav>
  </header>
  <main class="release-main">${content}</main>
  <footer><span>© Dorado Project</span><a href="/">doradoproject.com</a></footer>
</body>
</html>
`;
}

const themes = {
  'The Gate to the Dark Forest': 'The creative brief centres on an iron gate, wet leaves, wind and the threshold of an unknown woodland. Its purpose in the collection is to establish the forest before the journey moves deeper inside.',
  'The Creaking Trees': 'Wood is the defining material of the creative brief: twigs, larger branches, creaking trunks and the movement of leaves. The scene focuses on the forest itself rather than a visible monster.',
  'Footsteps Behind You': 'The scene was conceived around footfalls on damp ground, leaves and cracking twigs. Changes of distance and moments of hesitation give the idea of being followed its identity.',
  'The Bat Cave': 'Fluttering bat wings, a swarm passing nearby, small squeaks and the space of a damp cavern were central to the creative brief. Water and stone complete the underground setting.',
  'The Ghost by the Pond': 'Water is central to the scene: ripples, a dark pond and a ghost at its edge. The creative direction gives the supernatural encounter a quieter setting than the monster and pursuit chapters.',
  'The Swamp Monster': 'The scene was imagined through dark water, bubbles, reeds and a creature hidden below the surface. Its setting gives the collection a distinctly swamp-like chapter.',
  'The Whispering Mist': 'The creative direction is built around obscured distance and uncertainty. Wind, fog and almost-seen shapes give this forest chapter its elusive character.',
  "The Witches' Circle": 'The creative brief brings together a bubbling cauldron, a secret gathering and nonverbal witch imagery. The ritual setting separates this chapter from the woodland pursuit scenes.',
  'The Moonlit Graveyard': 'Church bells, iron railings, gravel and weathered stone shaped the creative direction. The graveyard introduces a gothic setting to the forest journey.',
  'The Pumpkin Guardians': 'The creative idea uses the familiar Halloween pumpkin as a guardian of the path. Warm lantern imagery gives this chapter a different identity from the colder cave and graveyard scenes.',
  'Before the Dawn': 'The final scene is the transition from night towards morning. It closes the album’s sequence of imagined places without introducing another monster or location.',
  'The Haunted Circus': 'The creative brief calls for a recognisable circus identity: carnival atmosphere, fairground machinery and an abandoned ring. The scene belongs to the haunted circus tradition rather than a woodland setting.',
  'The Abandoned Dollhouse': 'The creative direction centres on an old music box, tiny rooms, porcelain and a mechanism that feels slightly wrong. The miniature scale gives the horror a fragile, uncanny quality.',
  'The Cellar Beneath the Forest Cabin': 'Wooden stairs, a heavy door and the confined space beneath a cabin form the creative setting. This chapter leads the album from abandoned places towards more threatening encounters.',
  'The Werewolf on the Hill': 'The full moon, an exposed hillside and wolf howls were central to the creative direction. The creature is the focus of the scene, with the wide landscape giving it room to loom.',
  'Hunted in the Black Woods': 'The creative brief moves into adult horror: pursuit through a dark forest, abrupt shocks and the idea of a hunter remaining just out of view. It is one of the collection’s more intense concepts.',
  'Night of the Monsters': 'This scene was conceived as a gathering of different creatures and horror ideas. It brings together the collection’s monster themes rather than concentrating on a single creature.',
  'The Screaming Asylum': 'The adult horror brief centres on an abandoned asylum, nonverbal screams and sudden shocks. The setting is deliberately more intense than the atmospheric forest chapters.',
  'The Possessed Cellar': 'The adult horror direction combines a confined cellar with a supernatural presence, nonverbal screams and abrupt shocks. It forms the closing confrontation of the album’s sequence.',
};

export async function buildAlbums(root) {
  let albums;
  try { albums = JSON.parse(await readFile(new URL('data/halloween-albums.json', root), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return { files: new Map(), schemas: [], section: '' }; throw error; }
  const files = new Map();
  for (const a of albums) {
    const ap = albumPath(a);
    const other = albums.find((b) => b.slug !== a.slug);
    const trackCards = a.tracks.map((t) => `<li><a class="track-tile" href="/${trackPath(a, t)}"><img src="/${t.image}" alt="${esc(t.imageAlt)}" width="1200" height="1200" loading="lazy" decoding="async"><span class="track-tile-copy"><span class="track-number">${String(t.position).padStart(2, '0')}</span><span class="track-name notranslate" translate="no">${esc(t.title)}</span><span class="track-theme">${esc(t.theme)}</span></span></a></li>`).join('\n');
    const action = a.spotify ? `<a class="button button-primary" href="${esc(a.spotify)}" target="_blank" rel="noopener noreferrer">Listen to the album on Spotify →</a>` : '<p class="release-note">Submitted to streaming services. Album links will be added here once the release is available.</p>';
    const content = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true"> / </span><a href="/#halloween-albums">Halloween albums</a><span aria-hidden="true"> / </span><span class="notranslate" translate="no">${esc(a.title)}</span></nav>
    <article class="release-feature">
      <img src="/${a.image}" alt="${esc(a.imageAlt)}" width="1200" height="1200" fetchpriority="high">
      <div class="release-feature-copy"><p class="eyebrow">ALBUM · ${a.tracks.length} TRACKS</p><h1 class="notranslate" translate="no">${esc(a.title)}</h1><p class="release-genre">Electronic / Electronica / Downtempo · Halloween horror soundscapes</p><p class="release-description">${esc(a.description)}</p>${action}<a class="button button-secondary" href="#tracklist">Explore all ${a.tracks.length} tracks ↓</a></div>
    </article>
    <section class="album-story"><h2>${a.slug.includes('dark-forest') ? 'A journey into the haunted forest' : 'From haunted carnival to adult horror'}</h2><p>${a.slug.includes('dark-forest') ? 'Follow the album in order, from the gate into the woods, through caves and water, towards witches, a graveyard and the first hint of dawn. The collection was conceived for listeners looking for Halloween atmosphere, haunted forest ambience and dark electronic soundscapes.' : 'The album begins with the theatrical world of the circus, moves into an abandoned dollhouse and cellar, then opens out to a werewolf hill and a forest pursuit. Its closing asylum and possessed-cellar chapters explore intense adult horror themes, including creative briefs built around screams and sudden shocks.'}</p><p>Parts 2, 3 and 4 identify separate recordings of the same scene. Each recording has its own page and artwork; the original keeps its title without “Part 1”. The track order below matches the album submitted to the streaming services.</p></section>
    <section id="tracklist" class="tracklist-section"><p class="eyebrow">THE COMPLETE RUNNING ORDER</p><h2>Tracklist</h2><ol class="track-grid">${trackCards}</ol></section>
    <section class="more-music"><h2>Explore the other Halloween album</h2><p>${esc(other.description)}</p><a class="button button-secondary notranslate" translate="no" href="/${albumPath(other)}">${esc(other.title)} →</a></section>`;
    files.set(ap, page({ title: `${a.title} — Halloween Album | Dorado Project`, description: a.slug.includes('dark-forest') ? 'Explore 19 Halloween tracks by Dorado Project: haunted forest ambience, bat caves, witches, water and moonlit graves. Full tracklist and individual track pages.' : 'Explore 17 Halloween horror tracks by Dorado Project: haunted circus, creepy dollhouse, werewolves, monsters and adult horror. Full tracklist and track artwork.', path: ap, image: a.image, alt: a.imageAlt, type: 'music.album', graph: [artist, albumSchema(a), breadcrumbs([['Home', ''], ['Halloween albums', '#halloween-albums'], [a.title, ap]])], content }));

    for (const t of a.tracks) {
      const tp = trackPath(a, t);
      const versions = a.tracks.filter((v) => v.baseTitle === t.baseTitle && v.slug !== t.slug);
      const previous = a.tracks[t.position - 2];
      const next = a.tracks[t.position];
      const recording = { '@type': 'MusicRecording', '@id': `${abs(tp)}#recording`, name: t.title, url: abs(tp), image: abs(t.image), description: t.description, byArtist: artist, inAlbum: { '@type': 'MusicAlbum', '@id': `${abs(ap)}#album`, name: a.title, url: abs(ap) }, genre: a.genre, ...(t.spotify ? { sameAs: t.spotify } : {}) };
      const action = t.spotify ? `<a class="button button-primary" href="${esc(t.spotify)}" target="_blank" rel="noopener noreferrer">Listen on Spotify →</a>` : '<p class="release-note">This track is part of an album submitted to streaming services. The direct listening link will appear here when it is available.</p>';
      const content = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true"> / </span><a class="notranslate" translate="no" href="/${ap}">${esc(a.title)}</a><span aria-hidden="true"> / </span><span class="notranslate" translate="no">${esc(t.title)}</span></nav>
    <article class="release-feature"><img src="/${t.image}" alt="${esc(t.imageAlt)}" width="1200" height="1200" fetchpriority="high"><div class="release-feature-copy"><p class="eyebrow">ALBUM TRACK · ${String(t.position).padStart(2, '0')} OF ${a.tracks.length}</p><h1 class="notranslate" translate="no">${esc(t.title)}</h1><p class="release-genre">${esc(t.theme)}</p><p class="release-description">${esc(t.story)}</p>${action}<a class="album-link notranslate" translate="no" href="/${ap}">From ${esc(a.title)} →</a></div></article>
    <section class="album-story"><h2>The scene behind the track</h2><p>${esc(themes[t.baseTitle])}</p><p>${esc(t.title)} is track ${t.position} of ${a.tracks.length} on <a class="notranslate" translate="no" href="/${ap}">${esc(a.title)}</a>. ${previous ? `It follows <a class="notranslate" translate="no" href="/${trackPath(a, previous)}">${esc(previous.title)}</a>` : 'It opens the album'}${next ? ` and leads into <a class="notranslate" translate="no" href="/${trackPath(a, next)}">${esc(next.title)}</a>.` : ' and closes the album.'} Explore the running order for the full Halloween journey.</p><p class="art-caption">The artwork interprets this track’s setting: ${esc(t.scene.charAt(0).toLowerCase() + t.scene.slice(1))}. It is an individual track illustration; the album has its own separate cover.</p></section>
    ${versions.length ? `<section class="version-section"><h2>Other parts of this scene</h2><p>Separate recordings on the same album:</p><ul>${versions.map((v) => `<li><a class="notranslate" translate="no" href="/${trackPath(a, v)}">${esc(v.title)}</a></li>`).join('')}</ul></section>` : ''}
    <nav class="track-navigation" aria-label="Album track navigation">${previous ? `<a href="/${trackPath(a, previous)}"><span>← Previous track</span><strong class="notranslate" translate="no">${esc(previous.title)}</strong></a>` : '<span></span>'}${next ? `<a href="/${trackPath(a, next)}"><span>Next track →</span><strong class="notranslate" translate="no">${esc(next.title)}</strong></a>` : '<span></span>'}</nav>
    <section class="more-music"><h2>Continue the Halloween collection</h2><a class="button button-secondary" href="/${ap}#tracklist">View the full album tracklist →</a><a class="album-link notranslate" translate="no" href="/${albumPath(other)}">${esc(other.title)} →</a></section>`;
      files.set(tp, page({ title: `${t.title} — Halloween Horror Track | Dorado Project`, description: t.description, path: tp, image: t.image, alt: t.imageAlt, type: 'music.song', graph: [artist, recording, breadcrumbs([['Home', ''], [a.title, ap], [t.title, tp]])], content }));
    }
  }
  const section = `<!-- HALLOWEEN_ALBUMS_START -->
      <div class="album-home-section" id="halloween-albums"><p class="eyebrow">TWO JOURNEYS INTO THE DARK</p><h3>Halloween albums</h3><p class="album-intro">Haunted forest ambience and cinematic horror soundscapes. Explore 36 tracks across two albums, each with its own scene, artwork and story.</p><div class="release-grid album-home-grid">${albums.map((a) => `<article class="album-card reveal" id="${a.slug}"><a href="/${albumPath(a)}" aria-label="Explore ${esc(a.title)}"><img src="/${a.image}" alt="${esc(a.imageAlt)}" width="1200" height="1200" loading="lazy" decoding="async"></a><div class="release-meta"><p class="release-kicker">ALBUM · ${a.tracks.length} TRACKS</p><span class="pill">Halloween / Electronic</span></div><h3 class="notranslate" translate="no">${esc(a.title)}</h3><p>${esc(a.description)}</p><p class="release-note">Submitted to streaming services</p><a class="release-detail-link" href="/${albumPath(a)}">Explore the album &amp; tracklist →</a></article>`).join('\n')}</div></div>
      <!-- HALLOWEEN_ALBUMS_END -->`;
  return { files, schemas: albums.map(albumSchema), section };
}
