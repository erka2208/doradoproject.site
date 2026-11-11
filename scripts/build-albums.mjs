import { readFile } from 'node:fs/promises';

const origin = 'https://doradoproject.com';
const artist = { '@type': 'MusicGroup', '@id': `${origin}/#artist`, name: 'Dorado Project', url: `${origin}/` };
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const json = (value) => JSON.stringify(value, null, 2).replaceAll('<', '\\u003c');
const albumPath = (a) => `albums/${a.slug}.html`;
const trackPath = (a, t) => `albums/${a.slug}/${t.slug}.html`;
const abs = (path) => `${origin}/${path}`;
const breadcrumbs = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })) });
const albumSchema = (a) => ({ '@type': 'MusicAlbum', '@id': `${abs(albumPath(a))}#album`, name: a.title, url: abs(albumPath(a)), image: abs(a.image), description: a.description, byArtist: artist, genre: a.genre, ...(a.language ? { inLanguage: a.language } : {}), numTracks: a.tracks.length, albumReleaseType: 'https://schema.org/AlbumRelease', track: { '@type': 'ItemList', numberOfItems: a.tracks.length, itemListElement: a.tracks.map((t) => ({ '@type': 'ListItem', position: t.position, item: { '@type': 'MusicRecording', '@id': `${abs(trackPath(a, t))}#recording`, name: t.title, url: abs(trackPath(a, t)), ...(t.duration ? { duration: t.duration } : {}) } })) }, ...(a.duration ? { duration: a.duration } : {}), ...(a.spotify ? { sameAs: a.spotify } : {}) });

function page({ title, description, path, image, alt, type, graph, content }) {
  const url = abs(path);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f4eb">
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
  <link rel="stylesheet" href="/styles.css?v=6">
  <link rel="stylesheet" href="/release.css?v=1">
  <link rel="stylesheet" href="/album.css?v=3">
</head>
<body class="release-page album-page">
  <div class="grain" aria-hidden="true"></div>
  <header class="site-header scrolled">
    <a class="brand" href="/" aria-label="Dorado Project home"><span class="brand-mark">D</span><span>DORADO PROJECT</span></a>
    <nav aria-label="Primary navigation"><a class="notranslate" translate="no" href="/#releases">Releases</a><a href="/#albums">Albums</a><a href="/halloween.html">Halloween</a><a href="/#about">About</a></nav>
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
    const isHalloween = (a.category || 'halloween') === 'halloween';
    const sectionAnchor = isHalloween ? 'halloween-albums' : 'albums';
    const sectionName = isHalloween ? 'Halloween albums' : 'Albums';
    const other = albums.find((b) => b.slug !== a.slug && (b.category || 'halloween') === (a.category || 'halloween')) || albums.find((b) => b.slug !== a.slug);
    const defaultStoryTitle = a.slug.includes('dark-forest') ? 'A journey into the haunted forest' : 'From haunted carnival to adult horror';
    const defaultStory = a.slug.includes('dark-forest') ? 'Follow the album in order, from the gate into the woods, through caves and water, towards witches, a graveyard and the first hint of dawn. The collection was conceived for listeners looking for Halloween atmosphere, haunted forest ambience and dark electronic soundscapes.' : 'The album begins with the theatrical world of the circus, moves into an abandoned dollhouse and cellar, then opens out to a werewolf hill and a forest pursuit. Its closing asylum and possessed-cellar chapters explore intense adult horror themes, including creative briefs built around screams and sudden shocks.';
    const defaultOrderNote = 'Parts 2, 3 and 4 identify separate recordings of the same scene. Each recording has its own page and artwork; the original keeps its title without “Part 1”. The track order below matches the album submitted to the streaming services.';
    const storyParagraphs = a.story || (isHalloween ? [defaultStory, defaultOrderNote] : []);
    const albumNote = a.statusNote || (isHalloween ? 'Submitted to streaming services. Album links will be added here once the release is available.' : 'In production. Streaming links will be added only after a release is confirmed.');
    const trackNote = a.trackStatusNote || (isHalloween ? 'This track is part of an album submitted to streaming services. The direct listening link will appear here when it is available.' : 'Part of an album in production. A direct listening link will appear after the release is confirmed.');
    const trackCards = a.tracks.map((t) => `<li><a class="track-tile" href="/${trackPath(a, t)}"><img src="/${t.image}" alt="${esc(t.imageAlt)}" width="1200" height="1200" loading="lazy" decoding="async"><span class="track-tile-copy"><span class="track-number">${String(t.position).padStart(2, '0')}</span><span class="track-name notranslate" translate="no">${esc(t.title)}</span><span class="track-theme">${esc(t.theme)}${a.showTrackDurations && t.durationLabel ? ` · ${esc(t.durationLabel)}` : ''}</span></span></a></li>`).join('\n');
    const action = a.spotify ? `<a class="button button-primary" href="${esc(a.spotify)}" target="_blank" rel="noopener noreferrer">Listen to the album on Spotify →</a>` : `<p class="release-note">${esc(albumNote)}</p>`;
    const content = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true"> / </span><a href="/#${sectionAnchor}">${sectionName}</a><span aria-hidden="true"> / </span><span class="notranslate" translate="no">${esc(a.title)}</span></nav>
    <article class="release-feature">
      <img src="/${a.image}" alt="${esc(a.imageAlt)}" width="1200" height="1200" fetchpriority="high">
      <div class="release-feature-copy"><p class="eyebrow">ALBUM · ${a.tracks.length} TRACKS${a.durationLabel ? ` · ${esc(a.durationLabel)}` : ''}</p><h1 class="notranslate" translate="no">${esc(a.title)}</h1><p class="release-genre">${esc(a.genreLabel || (isHalloween ? 'Electronic / Electronica / Downtempo · Halloween horror soundscapes' : a.genre.join(' / ')))}</p><p class="release-description">${esc(a.description)}</p>${action}${!a.spotify && a.hyperfollow ? `<a class="button button-primary" href="${esc(a.hyperfollow)}" target="_blank" rel="noopener noreferrer">Pre-save on Spotify →</a>` : ''}<a class="button button-secondary" href="#tracklist">Explore all ${a.tracks.length} tracks ↓</a></div>
    </article>
    <section class="album-story"><h2>${esc(a.storyTitle || (isHalloween ? defaultStoryTitle : 'The story behind the album'))}</h2>${storyParagraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
    <section id="tracklist" class="tracklist-section"><p class="eyebrow">THE COMPLETE RUNNING ORDER</p><h2>Tracklist</h2><ol class="track-grid">${trackCards}</ol></section>
    ${other ? `<section class="more-music"><h2>${isHalloween ? 'Explore the other Halloween album' : 'More Dorado Project albums'}</h2><p>${esc(other.description)}</p><a class="button button-secondary notranslate" translate="no" href="/${albumPath(other)}">${esc(other.title)} →</a></section>` : ''}`;
    files.set(ap, page({ title: a.pageTitle || `${a.title} — ${isHalloween ? 'Halloween Album | ' : ''}Dorado Project`, description: a.metaDescription || (!isHalloween ? a.description : a.slug.includes('dark-forest') ? 'Explore 19 Halloween tracks by Dorado Project: haunted forest ambience, bat caves, witches, water and moonlit graves. Full tracklist and individual track pages.' : 'Explore 17 Halloween horror tracks by Dorado Project: haunted circus, creepy dollhouse, werewolves, monsters and adult horror. Full tracklist and track artwork.'), path: ap, image: a.image, alt: a.imageAlt, type: 'music.album', graph: [artist, albumSchema(a), breadcrumbs([['Home', ''], [sectionName, isHalloween ? 'halloween.html' : '#albums'], [a.title, ap]])], content }));

    for (const t of a.tracks) {
      const tp = trackPath(a, t);
      const versions = t.baseTitle ? a.tracks.filter((v) => v.baseTitle === t.baseTitle && v.slug !== t.slug) : [];
      const previous = a.tracks[t.position - 2];
      const next = a.tracks[t.position];
      const recording = { '@type': 'MusicRecording', '@id': `${abs(tp)}#recording`, name: t.title, url: abs(tp), image: abs(t.image), description: t.description, byArtist: artist, inAlbum: { '@type': 'MusicAlbum', '@id': `${abs(ap)}#album`, name: a.title, url: abs(ap) }, genre: a.genre, ...(a.language ? { inLanguage: a.language } : {}), ...(t.duration ? { duration: t.duration } : {}), ...(t.spotify ? { sameAs: t.spotify } : {}) };
      const songerAction = t.songer ? `<a class="button button-secondary" href="${esc(t.songer)}" target="_blank" rel="noopener noreferrer">Listen on Songer →</a>` : '';
      const action = (t.spotify ? `<a class="button button-primary" href="${esc(t.spotify)}" target="_blank" rel="noopener noreferrer">Listen on Spotify →</a>` : `<p class="release-note">${esc(trackNote)}</p>`) + songerAction;
      const content = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true"> / </span><a class="notranslate" translate="no" href="/${ap}">${esc(a.title)}</a><span aria-hidden="true"> / </span><span class="notranslate" translate="no">${esc(t.title)}</span></nav>
    <article class="release-feature"><img src="/${t.image}" alt="${esc(t.imageAlt)}" width="1200" height="1200" fetchpriority="high"><div class="release-feature-copy"><p class="eyebrow">ALBUM TRACK · ${String(t.position).padStart(2, '0')} OF ${a.tracks.length}${t.durationLabel ? ` · ${esc(t.durationLabel)}` : ''}</p><h1 class="notranslate" translate="no">${esc(t.title)}</h1><p class="release-genre">${esc(t.theme)}</p><p class="release-description">${esc(t.story)}</p>${action}${!a.spotify && !t.spotify && a.hyperfollow ? `<a class="button button-primary" href="${esc(a.hyperfollow)}" target="_blank" rel="noopener noreferrer">Pre-save the album on Spotify →</a>` : ''}<a class="album-link notranslate" translate="no" href="/${ap}">From ${esc(a.title)} →</a></div></article>
    <section class="album-story"><h2>The scene behind the track</h2><p>${esc(t.creativeDirection || themes[t.baseTitle] || t.story)}</p><p>${esc(t.title)} is track ${t.position} of ${a.tracks.length} on <a class="notranslate" translate="no" href="/${ap}">${esc(a.title)}</a>. ${previous ? `It follows <a class="notranslate" translate="no" href="/${trackPath(a, previous)}">${esc(previous.title)}</a>` : 'It opens the album'}${next ? ` and leads into <a class="notranslate" translate="no" href="/${trackPath(a, next)}">${esc(next.title)}</a>.` : ' and closes the album.'} Explore the running order for the full ${isHalloween ? 'Halloween journey' : 'album story'}.</p><p class="art-caption">${t.artworkCaption ? esc(t.artworkCaption) : `The artwork interprets this track’s setting: ${esc(t.scene.charAt(0).toLowerCase() + t.scene.slice(1))}. It is an individual track illustration; the album has its own separate cover.`}</p></section>
    ${versions.length ? `<section class="version-section"><h2>Other parts of this scene</h2><p>Separate recordings on the same album:</p><ul>${versions.map((v) => `<li><a class="notranslate" translate="no" href="/${trackPath(a, v)}">${esc(v.title)}</a></li>`).join('')}</ul></section>` : ''}
    <nav class="track-navigation" aria-label="Album track navigation">${previous ? `<a href="/${trackPath(a, previous)}"><span>← Previous track</span><strong class="notranslate" translate="no">${esc(previous.title)}</strong></a>` : '<span></span>'}${next ? `<a href="/${trackPath(a, next)}"><span>Next track →</span><strong class="notranslate" translate="no">${esc(next.title)}</strong></a>` : '<span></span>'}</nav>
    <section class="more-music"><h2>${isHalloween ? 'Continue the Halloween collection' : 'Continue the album story'}</h2><a class="button button-secondary" href="/${ap}#tracklist">View the full album tracklist →</a>${other ? `<a class="album-link notranslate" translate="no" href="/${albumPath(other)}">${esc(other.title)} →</a>` : ''}</section>`;
      files.set(tp, page({ title: t.pageTitle || `${t.title} — ${isHalloween ? 'Halloween Horror Track | ' : ''}Dorado Project`, description: t.description, path: tp, image: t.image, alt: t.imageAlt, type: 'music.song', graph: [artist, recording, breadcrumbs([['Home', ''], [a.title, ap], [t.title, tp]])], content }));
    }
  }
  const halloweenAlbums = albums.filter((a) => (a.category || 'halloween') === 'halloween');
  const otherAlbums = albums.filter((a) => (a.category || 'halloween') !== 'halloween');
  const generalSection = otherAlbums.length ? `<div class="album-home-section" id="albums"><p class="eyebrow">STORIES ACROSS A WHOLE RECORD</p><h3>Albums</h3><p class="album-intro">Explore Dorado Project's album projects, their stories and complete running orders.</p><div class="release-grid album-home-grid">${otherAlbums.map((a) => `<article class="album-card reveal" id="${a.slug}"><a href="/${albumPath(a)}" aria-label="Explore ${esc(a.title)}"><img src="/${a.image}" alt="${esc(a.imageAlt)}" width="1200" height="1200" loading="lazy" decoding="async"></a><div class="release-meta"><p class="release-kicker">ALBUM · ${a.tracks.length} TRACKS</p><span class="pill">${esc(a.cardGenre || a.genre.join(' / '))}</span></div><h3 class="notranslate" translate="no">${esc(a.title)}</h3><p>${esc(a.description)}</p>${a.spotify ? `<a class="button button-primary" href="${esc(a.spotify)}" target="_blank" rel="noopener noreferrer">Listen to the album on Spotify →</a>` : `<p class="release-note">${esc(a.status || 'In production')}</p>`}${!a.spotify && a.hyperfollow ? `<a class="release-detail-link" href="${esc(a.hyperfollow)}" target="_blank" rel="noopener noreferrer">Pre-save on Spotify →</a>` : ''}<a class="release-detail-link" href="/${albumPath(a)}">Explore the album &amp; tracklist →</a></article>`).join('\n')}</div></div>` : '';
  const halloweenSection = `<div class="album-home-section" id="halloween-albums"><p class="eyebrow">TWO JOURNEYS INTO THE DARK</p><h3>Halloween albums</h3><p class="album-intro">Haunted forest ambience and cinematic horror soundscapes. Explore 36 tracks across two albums, each with its own scene, artwork and story.</p><div class="release-grid album-home-grid">${halloweenAlbums.map((a) => `<article class="album-card reveal" id="${a.slug}"><a href="/${albumPath(a)}" aria-label="Explore ${esc(a.title)}"><img src="/${a.image}" alt="${esc(a.imageAlt)}" width="1200" height="1200" loading="lazy" decoding="async"></a><div class="release-meta"><p class="release-kicker">ALBUM · ${a.tracks.length} TRACKS</p><span class="pill">Halloween / Electronic</span></div><h3 class="notranslate" translate="no">${esc(a.title)}</h3><p>${esc(a.description)}</p>${a.spotify ? `<a class="button button-primary" href="${esc(a.spotify)}" target="_blank" rel="noopener noreferrer">Listen to the album on Spotify →</a>` : `<p class="release-note">${esc(a.status || "Submitted to streaming services")}</p>`}<a class="release-detail-link" href="/${albumPath(a)}">Explore the album &amp; tracklist →</a></article>`).join('\n')}</div></div>
      `;
  const section = `<!-- HALLOWEEN_ALBUMS_START -->${generalSection}<!-- HALLOWEEN_ALBUMS_END -->`;
  files.set('halloween.html', page({
    title: 'Halloween Albums & Horror Soundscapes | Dorado Project',
    description: 'Explore 36 Halloween tracks across The Dark Forest and Night Of Terror by Dorado Project. Listen on Spotify and discover every scene and album track.',
    path: 'halloween.html', image: halloweenAlbums[0].image, alt: halloweenAlbums[0].imageAlt, type: 'website',
    graph: [artist, { "@type": "CollectionPage", "@id": abs("halloween.html") + "#collection", name: "Dorado Project Halloween collection", url: abs("halloween.html"), mainEntity: { "@type": "ItemList", itemListElement: halloweenAlbums.map((a, i) => ({ "@type": "ListItem", position: i + 1, name: a.title, url: abs(albumPath(a)) })) } }, breadcrumbs([["Home", ""], ["Halloween", "halloween.html"]])],
    content: `<a class="back-link" href="/">← All Dorado Project releases</a><header><p class="eyebrow">THE HALLOWEEN COLLECTION</p><h1>Enter the dark.</h1><p class="release-description">Two albums, 36 tracks: haunted forest ambience and cinematic horror soundscapes. Choose an album, listen on Spotify or explore the story behind every track.</p></header>${halloweenSection.replaceAll("album-card reveal", "album-card").replace("<h3>Halloween albums</h3>", "<h2>Halloween albums</h2>")}`
  }));
  return { files, schemas: otherAlbums.map(albumSchema), section };
}

