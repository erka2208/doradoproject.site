const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const header = document.querySelector('.site-header');
const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 24);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach((el) => observer.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('visible'));
}

// Search the complete catalogue, including individual album tracks.
(() => {
  const input = document.getElementById('music-search');
  if (!input) return;
  const section = document.getElementById('releases');
  const panel = document.getElementById('music-search-panel');
  const results = document.getElementById('music-search-results');
  const status = document.getElementById('music-search-status');
  const clear = document.getElementById('music-search-clear');
  const browse = [...section.children].filter(el => el !== panel && el !== section.firstElementChild);
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  let catalogue;
  let request;
  let revision = 0;
  function load() {
    if (!request) request = fetch('/data/search-index.json', { cache: 'no-cache' }).then(response => {
      if (!response.ok) throw new Error('Search unavailable');
      return response.json();
    }).then(items => items.map(item => ({ ...item, searchText: normalize([item.title, item.genre, item.album, item.description].join(' ')), titleText: normalize(item.title) }))).catch(error => { request = null; throw error; });
    return request;
  }
  function link(text, href, className) {
    const a = document.createElement('a'); a.textContent = text; a.href = href; a.className = className; return a;
  }
  async function search() {
    const current = ++revision;
    const query = normalize(input.value);
    clear.hidden = !input.value;
    results.replaceChildren();
    browse.forEach(el => { el.hidden = !!query; });
    if (!query) { status.textContent = ''; return; }
    status.textContent = 'Zoeken…';
    try {
      catalogue = catalogue || await load();
      if (current !== revision) return;
      const tokens = query.split(' ');
      const matches = catalogue.filter(item => tokens.every(token => item.searchText.includes(token))).sort((a, b) => {
        const rank = item => item.titleText === query ? 0 : item.titleText.startsWith(query) ? 1 : item.titleText.includes(query) ? 2 : 3;
        return rank(a) - rank(b) || a.title.localeCompare(b.title, 'nl');
      });
      status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'resultaat' : 'resultaten'}` : 'Geen nummers gevonden. Probeer een andere titel, een album of een genre.';
      const fragment = document.createDocumentFragment();
      for (const item of matches) {
        const card = document.createElement('article'); card.className = 'search-result';
        const label = document.createElement('p'); label.className = 'eyebrow'; label.textContent = item.album ? `${item.type} · ${item.album}` : item.type;
        const title = document.createElement('h3'); title.translate = false; title.append(link(item.title, item.url, 'search-result-title'));
        const description = document.createElement('p'); description.textContent = item.description;
        const actions = document.createElement('div'); actions.className = 'release-actions';
        actions.append(link(item.type === 'Album' ? 'Bekijk album →' : 'Bekijk nummer →', item.url, 'button button-secondary'));
        if (item.spotify) { const spotify = link('Luister op Spotify →', item.spotify, 'button button-primary'); spotify.target = '_blank'; spotify.rel = 'noopener noreferrer'; actions.append(spotify); }
        card.append(label, title, description, actions); fragment.append(card);
      }
      results.append(fragment);
    } catch {
      if (current !== revision) return;
      browse.forEach(el => { el.hidden = false; });
      status.textContent = 'Zoeken lukt even niet. Probeer opnieuw of bekijk de nummers hieronder.';
    }
  }
  input.addEventListener('input', search);
  clear.addEventListener('click', () => { input.value = ''; search(); input.focus(); });
  input.addEventListener('keydown', event => { if (event.key === 'Escape') { input.value = ''; search(); } });
  input.closest('form').addEventListener('submit', event => { event.preventDefault(); search(); });
  document.querySelectorAll('a[href="#albums"], a[href="#singles"]').forEach(anchor => {
    anchor.addEventListener('click', () => { input.value = ''; search(); });
  });
  panel.hidden = false;
})();
