# doradoproject.site
Dorado Project

Webhook deployment test: 2026-09-13

## Website image rule

Photos must be optimized before they are committed to the website:

- Prefer WebP (or AVIF where appropriate) instead of full-size camera JPEGs.
- Resize to the dimensions the page actually needs; do not upload multi-megabyte originals for normal page use.
- As a default, use roughly 800–1200 px on the long edge for normal gallery/card images and up to about 1600 px for a genuine full-width hero image.
- Compress for a sensible balance between visual quality and file size; normally aim below about 200 KB per image when the photo allows it.
- Set explicit `width` and `height` attributes and use `loading="lazy"` for images below the fold.
- Keep the original source photo outside the public website if a larger master copy is still needed later.

## Mandatory page metadata

Every public HTML page must pass `node scripts/validate-pages.mjs` before it is published. This protects both conventional search visibility and previews in WhatsApp and social platforms.

Each page must contain:

- a unique `<title>` and meta description;
- an indexable robots directive;
- one absolute canonical URL;
- complete Open Graph and X/Twitter metadata;
- an absolute page-specific `og:image`, normally the release cover or the page's main image;
- useful alternative text for the preview image;
- valid JSON-LD that describes the visible page content;
- internal links from another crawlable page.

## New releases

Add or update a release card in `index.html` with a unique `id`, cover in `assets/`, accurate short description, genre and production status. Add a direct `https://open.spotify.com/track/...` button only when the correct track is live. Then run:

```sh
node scripts/build-releases.mjs
node scripts/validate-pages.mjs
```

The generator creates the individual release page, its permanent link from the homepage, MusicRecording/MusicComposition metadata and sitemap entry. Check the generated page's wording and language before publishing. Never claim a release date or streaming availability that has not been verified. To add a longer personal story, update the release data and generator rather than editing generated HTML, which gets overwritten. CI rejects a missing generation step. For non-release pages, update `sitemap.xml` when adding or removing a page. Do not block search crawlers in `robots.txt`; visible page text must match metadata and structured data.
