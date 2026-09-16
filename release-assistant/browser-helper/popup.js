const status = document.getElementById('status');
document.getElementById('fill').addEventListener('click', async () => {
  let data;
  try {
    data = JSON.parse(document.getElementById('payload').value);
    if (data.schema !== 'dorado-release-v1') throw new Error('Onbekend pakket');
  } catch { status.textContent = 'Dit is geen geldig Dorado-releasepakket.'; return; }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('https://distrokid.com/')) { status.textContent = 'Open eerst de uploadpagina van DistroKid.'; return; }
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fillDistroKid, args: [data] });
  status.textContent = `${result.filled} veld(en) ingevuld. Controleer alles in DistroKid.`;
});

function fillDistroKid(data) {
  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const visible = (element) => element && element.getClientRects().length > 0 && !element.disabled;
  const fields = [...document.querySelectorAll('input:not([type="hidden"]):not([type="file"]), select, textarea')].filter(visible);
  let filled = 0;

  const context = (field) => normalize([
    field.name, field.id, field.placeholder, field.getAttribute('aria-label'),
    field.labels ? [...field.labels].map((label) => label.textContent).join(' ') : '',
    field.closest('label,fieldset,.form-group,.control-group')?.textContent?.slice(0, 240)
  ].join(' '));

  const set = (patterns, value) => {
    if (value === undefined || value === null || value === '') return false;
    const field = fields.find((candidate) => patterns.some((pattern) => context(candidate).includes(pattern)) && !candidate.dataset.doradoFilled);
    if (!field) return false;
    if (field.tagName === 'SELECT') {
      const option = [...field.options].find((item) => normalize(item.textContent).includes(normalize(value)) || normalize(item.value) === normalize(value));
      if (!option) return false;
      field.value = option.value;
    } else field.value = value;
    field.dataset.doradoFilled = 'true';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.style.outline = '3px solid #d6a13e';
    filled += 1;
    return true;
  };

  set(['song title','track title','titel van nummer','title'], data.title);
  set(['artist band name','artist name','artiest'], data.artist);
  set(['record label','label name','platenlabel'], data.label);
  set(['songwriter','composer','componist'], data.songwriters);
  set(['primary genre','genre'], data.genre);
  set(['secondary genre','subgenre'], data.subgenre);
  set(['language','taal'], data.language === 'nl' ? 'Dutch' : data.language === 'en' ? 'English' : 'Instrumental');

  const notice = document.createElement('div');
  notice.textContent = `Dorado-hulp: ${filled} velden ingevuld. Controleer alle geel gemarkeerde velden. Bestanden, rechtenvragen en publiceren blijven handmatig.`;
  Object.assign(notice.style,{position:'fixed',left:'16px',right:'16px',bottom:'16px',zIndex:'2147483647',padding:'14px 18px',borderRadius:'12px',background:'#07141c',color:'#f4f1e8',border:'2px solid #d6a13e',boxShadow:'0 12px 40px rgba(0,0,0,.45)',font:'600 14px system-ui'});
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 9000);
  return { filled };
}
