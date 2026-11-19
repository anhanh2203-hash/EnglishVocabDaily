/* English Daily with Ms. Anh – pronunciation playback 1.2.
 * Primary: dictionary human-recorded audio where the public API lists a compatible file.
 * Fallback: browser Web Speech voice for missing terms/phrases, with explicit diagnostics.
 * No audio is played automatically; user gesture is required for mobile compatibility.
 */
'use strict';
const Pronunciation = (() => {
  const cache = new Map();
  let activeAudio = null;
  let pending = 0;
  let currentUtterance = null;
  const $ = id => document.getElementById(id);
  const supported = () => ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);
  const accent = () => $('pronAccent')?.value === 'en-US' ? 'en-US' : 'en-GB';
  const speed = () => $('pronSpeed')?.value === '0.8' ? 0.8 : 1;
  const status = msg => {const el=$('pronStatus');if(el)el.textContent=msg;};
  function stop(){pending++;if(activeAudio){activeAudio.pause();activeAudio.removeAttribute('src');activeAudio.load();activeAudio=null;}if(supported())window.speechSynthesis.cancel();currentUtterance=null;}
  function getVoice(){
    if(!supported())return null;
    const voices=window.speechSynthesis.getVoices();
    const lang=accent().toLowerCase();
    return voices.find(v=>v.lang.toLowerCase()===lang && /natural|enhanced|premium|neural/i.test(v.name))
      || voices.find(v=>v.lang.toLowerCase()===lang && v.localService)
      || voices.find(v=>v.lang.toLowerCase()===lang)
      || voices.find(v=>v.lang.toLowerCase().startsWith('en-'))
      || voices.find(v=>v.lang.toLowerCase().startsWith('en')) || null;
  }
  // Some browsers populate voices after initial page load.
  if(supported()){window.speechSynthesis.addEventListener?.('voiceschanged',()=>{if(!$('pronStatus')?.textContent)status('Đã sẵn sàng giọng đọc trên thiết bị.');});}
  async function findRecording(word, locale){
    const key=locale+'|'+word.toLowerCase();
    if(cache.has(key))return cache.get(key);
    // Dictionary APIs usually contain single headwords, not arbitrary phrases.
    if(!/^[a-z][a-z' -]{0,54}$/i.test(word)||word.trim().includes(' '))return null;
    let url=null;
    try{
      const ac=new AbortController();
      const abort=setTimeout(()=>ac.abort(),3500);
      let resp;
      try{resp=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word.trim()),{signal:ac.signal,mode:'cors',cache:'force-cache'});}finally{clearTimeout(abort);}
      if(resp.ok){
        const entries=await resp.json();
        const candidates=entries.flatMap(entry=>entry.phonetics||[]).map(p=>p.audio).filter(x=>typeof x==='string'&&x.trim());
        const safe=candidates.map(x=>x.startsWith('//')?'https:'+x:x).filter(x=>/^https:\/\//i.test(x));
        const marker=locale==='en-GB'?/(uk|gb)/i:/(us|american)/i;
        // Do not silently substitute a known opposite-accent audio recording.
        const preferred=safe.filter(x=>marker.test(x));
        const unknown=safe.filter(x=>!/(uk|gb|us|american)/i.test(x));
        const options=[...preferred,...unknown];
        const playable=options.find(x=>/\.(mp3|mpeg|m4a|wav)(\?|$)/i.test(x))||options.find(x=>/\.(ogg|oga|opus)(\?|$)/i.test(x)&&new Audio().canPlayType('audio/ogg'));
        url=playable||null;
      }
    }catch(_){/* offline, network/CORS denial: use installed voice */}
    if(url)cache.set(key,url);
    return url;
  }
  async function sayWithVoice(text, ticket){
    if(ticket!==pending)return;
    if(!supported()){status('Thiết bị chưa hỗ trợ giọng đọc dự phòng. Hãy bật Internet hoặc thử Chrome/Safari/Edge.');return;}
    const voice=getVoice();
    if(!voice){status('Không tìm thấy giọng tiếng Anh trên thiết bị. Hãy cài thêm giọng English (UK/US) trong cài đặt máy.');return;}
    try{
      const u=new SpeechSynthesisUtterance(text);
      currentUtterance=u;
      u.voice=voice;u.lang=voice.lang||accent();u.rate=speed()===0.8?0.78:0.95;u.pitch=1;u.volume=1;
      u.onerror=()=>{if(ticket===pending)status('Không phát được giọng đọc trên thiết bị. Hãy kiểm tra âm lượng hoặc đổi trình duyệt.');};
      u.onstart=()=>{if(ticket===pending)status('Đang phát bằng giọng English '+voice.name+' (dự phòng).');};
      u.onend=()=>{if(ticket===pending)status('Đã phát xong.');};
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      // Some Safari/iOS versions may leave synth paused after a previous interaction.
      if(window.speechSynthesis.paused)window.speechSynthesis.resume();
    }catch(e){status('Không thể khởi động giọng đọc trên trình duyệt này.');}
  }
  async function play(input,button){
    const word=String(input||'').trim();if(!word)return;
    stop();const ticket=pending;
    status('Đang tìm bản phát âm...');
    if(button)button.disabled=true;
    try{
      const src=await findRecording(word,accent());
      if(ticket!==pending)return;
      if(src){
        const audio=new Audio();activeAudio=audio;audio.preload='auto';audio.src=src;audio.playbackRate=speed();
        audio.onended=()=>{if(ticket===pending)status('Đã phát xong.');};
        audio.onerror=()=>{if(ticket===pending){activeAudio=null;sayWithVoice(word,ticket);}};
        try{await audio.play();if(ticket===pending)status('Đang phát bản ghi âm từ điển.');return;}
        catch(_){if(ticket!==pending)return;activeAudio=null;}
      }
      await sayWithVoice(word,ticket);
    }finally{if(button)button.disabled=false;}
  }
  const onReady=()=>{
    const a=$('pronAccent'),s=$('pronSpeed'),b=$('pronTest');
    if(a){a.value=localStorage.getItem('msanh-pron-accent')==='en-US'?'en-US':'en-GB';a.addEventListener('change',()=>{stop();localStorage.setItem('msanh-pron-accent',a.value);status('Đã đổi giọng.');});}
    if(s){s.value=localStorage.getItem('msanh-pron-speed')==='0.8'?'0.8':'1';s.addEventListener('change',()=>{stop();localStorage.setItem('msanh-pron-speed',s.value);status('Đã đổi tốc độ.');});}
    if(b)b.addEventListener('click',()=>play('hello',b));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onReady);else onReady();
  return {play,stop};
})();
