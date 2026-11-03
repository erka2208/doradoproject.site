// Full approved192kbpsMP3, reconstructed byte-for-byte before playback.
export const EXPECTED_SHA256 = '65bd8ffca7aedf363d61e94fd62aaeb6c85eb3b0214ef2cc64872929d51d0313';
export const EXPECTED_BYTES = 14351254;
const MAX_PART_BYTES = 262144;
class AudioLoadError extends Error {
  constructor(code, message) { super(message); this.name='AudioLoadError'; this.code=code; }
}
const hex = buffer => Array.from(new Uint8Array(buffer), n=>n.toString(16).padStart(2,'0')).join('');
async function digest(bytes, cryptoImpl) { return hex(await cryptoImpl.subtle.digest('SHA-256',bytes)); }

export async function loadVerifiedAudio(manifestUrl, options={}) {
  const fetchImpl=options.fetchImpl||globalThis.fetch,cryptoImpl=options.cryptoImpl||globalThis.crypto;
  if(!cryptoImpl?.subtle)throw new AudioLoadError('BROWSER','Secure WebCrypto unavailable');
  const url=new URL(manifestUrl,options.baseUrl||globalThis.location?.href);
  if(!['https:','http:'].includes(url.protocol))throw new AudioLoadError('BROWSER','Serve the player over HTTP(S)');
  const controller=new AbortController(),abort=()=>controller.abort();
  if(options.signal?.aborted)controller.abort();
  options.signal?.addEventListener('abort',abort,{once:true});
  try {
    const response=await fetchImpl(url.href,{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new AudioLoadError('UNAVAILABLE','Manifest HTTP'+response.status);
    const manifest=await response.json();
    if(manifest.schemaVersion!==1||manifest.mimeType!=='audio/mpeg'||manifest.totalBytes!==EXPECTED_BYTES||manifest.sha256!==EXPECTED_SHA256||!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.length>512)throw new AudioLoadError('INTEGRITY','Unexpected audio manifest');
    let sum=0;
    for(let i=0;i<manifest.parts.length;i++){
      const part=manifest.parts[i],expectedFile='chunks/part-'+String(i+1).padStart(3,'0')+'.bin';
      if(part.index!==i||part.file!==expectedFile||!Number.isInteger(part.bytes)||part.bytes<=0||part.bytes>MAX_PART_BYTES||!/^[a-f0-9]{64}$/.test(part.sha256))throw new AudioLoadError('INTEGRITY','Invalid part metadata at'+i);
      sum+=part.bytes;
    }
    if(sum!==EXPECTED_BYTES)throw new AudioLoadError('INTEGRITY','Manifest sizes do not match approved recording');
    const buffers=new Array(manifest.parts.length),base=new URL('.',url);
    let cursor=0,loadedBytes=0,finishedParts=0;
    const worker=async()=>{
      while(!controller.signal.aborted){
        const index=cursor++;if(index>=manifest.parts.length)return;
        const part=manifest.parts[index],partUrl=new URL(part.file,url);
        if(partUrl.origin!==url.origin||!partUrl.href.startsWith(base.href))throw new AudioLoadError('INTEGRITY','Part escapes manifest directory');
        const result=await fetchImpl(partUrl.href,{signal:controller.signal,cache:'no-store'});
        if(!result.ok)throw new AudioLoadError('UNAVAILABLE','Part HTTP'+result.status+':'+part.file);
        const data=await result.arrayBuffer();
        if(data.byteLength!==part.bytes)throw new AudioLoadError('INTEGRITY','Incomplete part:'+part.file);
        if(await digest(data,cryptoImpl)!==part.sha256)throw new AudioLoadError('INTEGRITY','Part digest mismatch:'+part.file);
        if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
        buffers[index]=data;loadedBytes+=data.byteLength;finishedParts++;
        options.onProgress?.({phase:'download',loadedBytes,totalBytes:EXPECTED_BYTES,finishedParts,totalParts:manifest.parts.length});
      }
      throw new DOMException('Aborted','AbortError');
    };
    await Promise.all(Array.from({length:Math.min(4,manifest.parts.length)},worker));
    options.onProgress?.({phase:'verify',loadedBytes,totalBytes:EXPECTED_BYTES,finishedParts,totalParts:manifest.parts.length});
    const joined=new Uint8Array(EXPECTED_BYTES);let position=0;
    for(let i=0;i<buffers.length;i++){if(!buffers[i])throw new AudioLoadError('INTEGRITY','Missing completed part');joined.set(new Uint8Array(buffers[i]),position);position+=buffers[i].byteLength;buffers[i]=null;}
    if(position!==EXPECTED_BYTES||await digest(joined,cryptoImpl)!==EXPECTED_SHA256)throw new AudioLoadError('INTEGRITY','Full recording digest mismatch');
    if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
    return{blob:new Blob([joined],{type:'audio/mpeg'}),sha256:EXPECTED_SHA256,bytes:EXPECTED_BYTES,durationSeconds:manifest.durationSeconds};
  } catch(error) {controller.abort();if(error instanceof AudioLoadError||error?.name==='AbortError')throw error;throw new AudioLoadError('NETWORK',error?.message||'Network request failed');}
  finally{options.signal?.removeEventListener('abort',abort);}
}

export function mountFinalePlayer(container){
  if(container.dataset.playerMounted==='true')return;
  const button=container.querySelector('[data-finale-listen]'),status=container.querySelector('[data-finale-status]'),audio=container.querySelector('audio');
  if(!button||!status||!audio||!container.dataset.manifest)return;
  container.dataset.playerMounted='true';audio.hidden=true;audio.style.display='none';let busy=false,controller,objectUrl;
  const say=text=>{status.textContent=text;};
  button.addEventListener('click',async()=>{
    if(busy)return;busy=true;button.disabled=true;container.setAttribute('aria-busy','true');say('De volledige finale wordt geladen…');controller=new AbortController();
    try{
      const result=await loadVerifiedAudio(container.dataset.manifest,{signal:controller.signal,onProgress:p=>say(p.phase==='verify'?'De finale wordt klaargezet…':'De volledige finale wordt geladen… '+Math.floor(p.loadedBytes/p.totalBytes*100)+'%')});
      if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(result.blob);audio.src=objectUrl;audio.hidden=false;audio.style.display='';audio.controls=true;audio.preload='metadata';audio.load();button.hidden=true;button.style.display='none';container.setAttribute('aria-busy','false');say('De volledige finale staat klaar.');
      try{await audio.play();say('Veel luisterplezier.');}catch{say('De volledige finale staat klaar. Druk op afspelen.');}
    }catch(error){
      button.disabled=false;button.hidden=false;button.style.display='';audio.hidden=true;audio.style.display='none';container.setAttribute('aria-busy','false');
      if(error?.code==='INTEGRITY')say('Het muziekbestand is niet goed ontvangen. Probeer het opnieuw.');
      else if(error?.code==='BROWSER')say('Deze browser kan de finale niet openen. Probeer een recente browser.');
      else if(error?.code==='UNAVAILABLE')say('De finale is tijdelijk niet beschikbaar. Probeer het later opnieuw.');
      else say('Het laden is onderbroken. Controleer je verbinding en probeer opnieuw.');
      console.warn('Finale playback preparation failed',error);
    }finally{busy=false;}
  });
  audio.addEventListener('error',()=>say('Afspelen lukt niet in deze browser. Probeer een andere browser.'));
  globalThis.addEventListener?.('pagehide',event=>{controller?.abort();if(!event.persisted&&objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}});
}
if(typeof document!=='undefined')document.querySelectorAll('[data-finale-chunk-player]').forEach(mountFinalePlayer);
