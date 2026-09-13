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
