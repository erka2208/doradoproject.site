const STORAGE_KEY = 'dorado-release-draft-v1';
const form = document.getElementById('releaseForm');
const panels = [...document.querySelectorAll('.step-panel')];
const stepButtons = [...document.querySelectorAll('.step')];
const toast = document.getElementById('toast');
const audioInput = document.getElementById('audioFile');
const coverInput = document.getElementById('coverFile');
let audioMeta = null;
let coverMeta = null;

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
};

const showStep = (number) => {
  panels.forEach((panel) => panel.classList.toggle('active', Number(panel.dataset.panel) === number));
  stepButtons.forEach((button) => button.classList.toggle('active', Number(button.dataset.step) === number));
  if (number === 3) renderReview();
  window.scrollTo({ top: Math.max(0, document.querySelector('.steps').offsetTop - 90), behavior: 'smooth' });
};

const serialize = () => {
  const data = Object.fromEntries(new FormData(form).entries());
  data.stores = [...form.querySelectorAll('[name="stores"]:checked')].map((input) => input.value);
  data.artist = data.artist || 'Dorado Project';
  data.releaseType = data.releaseType || 'single';
  data.audio = audioMeta;
  data.cover = coverMeta;
  data.schema = 'dorado-release-v1';
  data.createdAt = new Date().toISOString();
  return data;
};

const persist = () => {
  const draft = serialize();
  delete draft.audio;
  delete draft.cover;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  document.getElementById('saveState').textContent = 'Lokaal opgeslagen';
};

const restore = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'stores' && Array.isArray(value)) {
        form.querySelectorAll('[name="stores"]').forEach((input) => { input.checked = value.includes(input.value); });
        return;
      }
      const fields = [...form.querySelectorAll(`[name="${CSS.escape(key)}"]`)];
      if (!fields.length) return;
      if (fields[0].type === 'radio') {
        const match = fields.find((field) => field.value === value);
        if (match) match.checked = true;
      } else fields[0].value = value;
    });
  } catch { localStorage.removeItem(STORAGE_KEY); }
};

const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const renderFileChecks = () => {
  const checks = [];
  if (audioMeta) checks.push(`<div class="check ok">✓ Audio gekozen: ${escapeHtml(audioMeta.name)} (${formatBytes(audioMeta.size)})</div>`);
  else checks.push('<div class="check bad">! Kies nog het definitieve audiobestand.</div>');
  if (coverMeta) {
    const square = coverMeta.width === coverMeta.height;
    const large = coverMeta.width >= 3000 && coverMeta.height >= 3000;
    checks.push(`<div class="check ${square ? 'ok' : 'bad'}">${square ? '✓' : '!'} Hoes is ${square ? 'vierkant' : 'niet vierkant'}: ${coverMeta.width} × ${coverMeta.height} px</div>`);
    checks.push(`<div class="check ${large ? 'ok' : 'bad'}">${large ? '✓' : '!'} ${large ? 'Resolutie is geschikt' : 'Resolutie is kleiner dan 3000 × 3000 px'}</div>`);
  } else checks.push('<div class="check bad">! Kies nog een vierkante JPG-albumhoes.</div>');
  document.getElementById('fileChecks').innerHTML = checks.join('');
};

audioInput.addEventListener('change', () => {
  const file = audioInput.files[0];
  audioMeta = file ? { name: file.name, size: file.size, type: file.type || 'audio' } : null;
  document.getElementById('audioName').textContent = file?.name || 'Kies audiobestand';
  renderFileChecks();
});

coverInput.addEventListener('change', () => {
  const file = coverInput.files[0];
  if (!file) return;
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => {
    coverMeta = { name: file.name, size: file.size, type: file.type || 'image', width: image.naturalWidth, height: image.naturalHeight };
    document.getElementById('coverPreview').style.backgroundImage = `url('${url}')`;
    document.getElementById('coverPreview').firstElementChild.style.visibility = 'hidden';
    document.getElementById('coverName').textContent = file.name;
    renderFileChecks();
  };
  image.src = url;
});

const validateMetadata = () => {
  let valid = true;
  form.querySelectorAll('[required]').forEach((field) => {
    const empty = !String(field.value).trim();
    field.classList.toggle('invalid', empty);
    if (empty) valid = false;
  });
  if (!valid) showToast('Vul eerst alle verplichte releasegegevens in.');
  return valid;
};

document.querySelectorAll('.next').forEach((button) => button.addEventListener('click', () => {
  const next = Number(button.dataset.next);
  if (next === 3 && !validateMetadata()) return;
  showStep(next);
}));
document.querySelectorAll('.back').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
stepButtons.forEach((button) => button.addEventListener('click', () => {
  const step = Number(button.dataset.step);
  if (step === 3 && !validateMetadata()) return;
  showStep(step);
}));

const labels = { title:'Titel', artist:'Artiest', releaseType:'Type', language:'Taal', genre:'Genre', subgenre:'Subgenre', releaseDate:'Releasedatum', label:'Label', songwriters:'Songwriter(s)', lyrics:'Uitvoering', explicit:'Expliciet', stores:'Diensten', audio:'Audio', cover:'Hoes', notes:'Notities' };
const renderReview = () => {
  const data = serialize();
  const values = {
    ...data,
    releaseType: data.releaseType === 'single' ? 'Single' : 'Album',
    language: ({nl:'Nederlands',en:'Engels',zxx:'Instrumentaal / geen tekst'})[data.language] || data.language,
    lyrics: data.lyrics === 'instrumental' ? 'Instrumentaal' : 'Met zang/tekst',
    explicit: data.explicit === 'yes' ? 'Ja' : 'Nee',
    stores: data.stores.join(', ') || 'Geen gekozen',
    audio: data.audio?.name || 'Nog niet gekozen op dit apparaat',
    cover: data.cover?.name || 'Nog niet gekozen op dit apparaat'
  };
  document.getElementById('review').innerHTML = `<dl>${Object.keys(labels).map((key) => `<dt>${labels[key]}</dt><dd>${escapeHtml(values[key] || '—')}</dd>`).join('')}</dl>`;
};

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
const packageJson = () => JSON.stringify(serialize(), null, 2);

document.getElementById('approval').addEventListener('change', (event) => {
  const approved = event.target.checked;
  document.getElementById('copyPackage').disabled = !approved;
  document.getElementById('downloadPackage').disabled = !approved;
  const link = document.getElementById('openDistroKid');
  link.classList.toggle('disabled', !approved);
  link.setAttribute('aria-disabled', String(!approved));
});

document.getElementById('copyPackage').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(packageJson()); showToast('Releasepakket gekopieerd. Plak dit in de browserhulp.'); }
  catch { showToast('Kopiëren lukt niet in deze browser. Download het pakket.'); }
});

document.getElementById('downloadPackage').addEventListener('click', () => {
  const data = serialize();
  const slug = (data.title || 'release').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const blob = new Blob([packageJson()], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${slug || 'release'}-distrokid.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Releasepakket gedownload.');
});

document.getElementById('newRelease').addEventListener('click', () => {
  if (!confirm('Huidig concept wissen en een nieuwe release beginnen?')) return;
  localStorage.removeItem(STORAGE_KEY);
  form.reset();
  form.artist.value = 'Dorado Project';
  form.label.value = 'Dorado Project';
  form.songwriters.value = 'Rutger Kussendrager';
  audioMeta = null; coverMeta = null;
  location.reload();
});

form.addEventListener('input', persist);
restore();
if (!form.releaseDate.value) {
  const suggested = new Date();
  suggested.setDate(suggested.getDate() + 14);
  form.releaseDate.value = suggested.toISOString().slice(0, 10);
  persist();
}
renderFileChecks();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
