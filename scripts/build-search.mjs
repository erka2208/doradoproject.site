import { readdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
export async function buildSearch({ check = false } = {}) {
  const items = [];
  async function walk(dir) {
    const entries = await readdir(new URL(dir, root), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const path = `${dir}${entry.name}`;
      if (entry.isDirectory()) { if (dir || ['albums', 'releases'].includes(entry.name)) await walk(`${path}/`); continue; }
      if (!path.endsWith('.html')) continue;
      const html = await readFile(new URL(path, root), 'utf8');
      for (const match of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        const schema = JSON.parse(match[1]);
        const node = (schema['@graph'] || [schema]).find(n => ['MusicRecording', 'MusicComposition', 'MusicAlbum'].includes(n['@type']) && n.name && (n.url || n['@id']));
        if (!node) continue;
        const url = new URL(node.url || node['@id']);
        if (url.origin !== 'https://doradoproject.com' || url.pathname !== `/${path}`) continue;
        const spotify = [node.sameAs].flat().find(v => typeof v === 'string' && /^https:\/\/open\.spotify\.com\/(track|album)\//.test(v));
        items.push({ title: node.name, url: url.pathname, description: node.description || '', genre: [node.genre || []].flat().join(' / '), album: node.inAlbum?.name || '', type: node['@type'] === 'MusicAlbum' ? 'Album' : 'Nummer', ...(spotify ? { spotify } : {}) });
      }
    }
  }
  await walk('');
  items.sort((a, b) => a.title.localeCompare(b.title, 'nl'));
  const content = JSON.stringify(items) + '\n';
  const target = new URL('data/search-index.json', root);
  let previous = ''; try { previous = await readFile(target, 'utf8'); } catch {}
  if (content !== previous) {
    if (check) { console.error('Out of date: data/search-index.json'); process.exitCode = 1; }
    else await writeFile(target, content);
  }
  console.log(`Search index: ${items.length} tracks and albums.`);
}
