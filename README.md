# doradoproject.site
Dorado Project

Webhook deployment test: 2026-09-13

## Release assistant

`release-assistant/` is a private-workflow, no-index PWA for preparing Dorado Project releases on mobile or desktop. Draft metadata is stored in the user's browser only. Its optional Chrome/Edge helper fills recognizable DistroKid fields but deliberately cannot choose local files, answer rights declarations, or submit a release.

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

When a page is added or removed, update `sitemap.xml`. Do not block search or answer-engine crawlers in `robots.txt`. The visible page text remains the primary source of truth: metadata and structured data must never make claims that are absent from the page.
