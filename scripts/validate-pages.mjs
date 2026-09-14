import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const root = new URL("../", import.meta.url);
const files = (await readdir(root)).filter((file) => file.endsWith(".html"));
const sitemap = await readFile(new URL("sitemap.xml", root), "utf8");
const failures = [];

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
}

if (failures.length) {
  console.error(`SEO validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO validation passed for ${files.length} page(s): ${files.map((file) => basename(file)).join(", ")}`);
