import { readFile, readdir, access } from "node:fs/promises";
import { basename, join } from "node:path";

const root = new URL("../", import.meta.url);
async function htmlFiles(directory = '') {
  const entries = await readdir(new URL(directory || './', root), { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || ['assets', 'scripts', 'data'].includes(entry.name)) continue;
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory()) result.push(...await htmlFiles(`${path}/`));
    else if (entry.name.endsWith('.html')) result.push(path);
  }
  return result;
}
const files = await htmlFiles();
const sitemap = await readFile(new URL("sitemap.xml", root), "utf8");
const failures = [];
const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();
const incoming = new Set();
const paths = new Set(files);
const unescape = (s) => s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const checkedTargets = new Set();
async function checkTarget(target, file) {
  if (checkedTargets.has(target)) return;
  checkedTargets.add(target);
  try {
    await access(new URL(target, root));
    if (target.endsWith('.webp')) {
      const bytes = await readFile(new URL(target, root));
      if (bytes.length < 12 || bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WEBP') failures.push(`${file}: invalid WebP image ${target}`);
    }
  } catch { failures.push(`${file}: missing local target ${target}`); }
}

const required = [
  ["title", /<title>[^<]+<\/title>/i],
  ["description", /<meta\s+name=["']description["'][^>]+content=["'][^"']+["']/i],
  ["robots", /<meta\s+name=["']robots["'][^>]+content=["'][^"']*index[^"']*["']/i],
  ["canonical", /<link\s+rel=["']canonical["'][^>]+href=["']https:\/\/doradoproject\.com\/[^"]*["']/i],
  ["Open Graph title", /<meta\s+property=["']og:title["'][^>]+content=["'][^"']+["']/i],
  ["Open Graph description", /<meta\s+property=["']og:description["'][^>]+content=["'][^"']+["']/i],
  ["Open Graph URL", /<meta\s+property=["']og:url["'][^>]+content=["']https:\/\/doradoproject\.com\/[^"]*["']/i],
  ["Open Graph image", /<meta\s+property=["']og:image["'][^>]+content=["']https:\/\/doradoproject\.com\/[^"]+["']/i],
  ["Open Graph image alt", /<meta\s+property=["']og:image:alt["'][^>]+content=["'][^"']+["']/i],
  ["X/Twitter card", /<meta\s+name=["']twitter:card["'][^>]+content=["'][^"']+["']/i],
  ["X/Twitter image", /<meta\s+name=["']twitter:image["'][^>]+content=["']https:\/\/doradoproject\.com\/[^"]+["']/i],
  ["structured data", /<script\s+type=["']application\/ld\+json["']>/i]
];

for (const file of files) {
  const html = await readFile(new URL(file, root), "utf8");
  for (const [label, value, seen] of [
    ['title', html.match(/<title>([^<]+)<\/title>/i)?.[1], titles],
    ['description', html.match(/<meta name="description" content="([^"]+)"/i)?.[1], descriptions],
    ['canonical', html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1], canonicals]
  ]) {
    if (value && seen.has(value)) failures.push(`${file}: duplicate ${label} with ${seen.get(value)}`);
    if (value) seen.set(value, file);
  }
  for (const [label, pattern] of required) {
    if (!pattern.test(html)) failures.push(`${file}: missing ${label}`);
  }

  const canonical = html.match(/<link\s+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
  if (canonical && !sitemap.includes(`<loc>${canonical}</loc>`)) {
    failures.push(`${file}: canonical URL is missing from sitemap.xml`);
  }

  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); }
    catch { failures.push(`${file}: invalid JSON-LD`); }
  }

  const pageUrl = new URL(file === 'index.html' ? '/' : `/${file}`, 'https://doradoproject.com');
  for (const match of html.matchAll(/<(a|img|link)\b[^>]*\b(href|src)="([^"]+)"/gi)) {
    const url = new URL(unescape(match[3]), pageUrl);
    if (url.origin !== pageUrl.origin) continue;
    let target = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
    if (target.endsWith('/')) target += 'index.html';
    await checkTarget(target, file);
    if (match[1].toLowerCase() === 'a' && paths.has(target) && target !== file) incoming.add(target);
  }
  const preview = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if (preview) {
    const target = new URL(preview);
    if (target.origin === pageUrl.origin) {
      await checkTarget(target.pathname.replace(/^\//, ''), file);
    }
  }
}

for (const file of files) {
  if (file !== 'index.html' && !incoming.has(file)) failures.push(`${file}: no incoming crawlable link`);
}

if (failures.length) {
  console.error(`SEO validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO validation passed for ${files.length} page(s): ${files.map((file) => basename(file)).join(", ")}`);
