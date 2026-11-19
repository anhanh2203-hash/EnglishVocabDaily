/* English Daily with Ms. Anh — compatible pronunciation 1.4.
 * Start audio within the user's click, before any network await.
 * Browser TTS does not require a preloaded voice list; dictionary recordings
 * are cached for subsequent clicks, so network requests cannot block speech.
 */
'use strict';
const Pronunciation = (() => {
  const cache = new Map();
  const lookupInFlight = new Set();
  let activeAudio = null;
  let utterance = null;
  let serial = 0;
  const $ = id => document.getElementById(id);
  const supported = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const accent = () => $('pronAccent')?.value === 'en-US' ? 'en-US' : 'en-GB';
  const speed = () => $('pronSpeed')?.value === '0.8' ? .8 : 1;
  const status = message => { const node = $('pronStatus'); if(node) node.textContent = message; };
  function stop(){
    ++serial;
    if(activeAudio){try{activeAudio.pause();activeAudio.src='';}catch(_){} activeAudio=null;}
    if(supported()){try{window.speechSynthesis.cancel();}catch(_){}}
    utterance=null;
  }
  function chooseVoice(lang){
    let voices=[];
    try{voices=window.speechSynthesis.getVoices()||[];}catch(_){}
    const matching = voices.filter(v=>v.lang?.toLowerCase()===lang.toLowerCase());
    return matching.find(v=>/natural|enhanced|premium|neural/i.test(v.name))
      || matching.find(v=>v.localService) || matching[0]
      || voices.find(v=>v.lang?.toLowerCase().startsWith('en')) || null;
  }
  function speakNow(word, ticket){
    if(!supported()){
      status('Trình duyệt không hỗ trợ giọng đọc tự động. Hãy dùng Chrome, Safari hoặc Edge và bật âm thanh.');
      return false;
    }
    try{
      const u=new SpeechSynthesisUtterance(word);
      const voice=chooseVoice(accent());
      // IMPORTANT: If getVoices() is empty, let the system choose a voice.
      if(voice)u.voice=voice;
      u.lang=voice?.lang||accent();
      u.rate=speed()===.8?.78:.95;
      u.volume=1;u.pitch=1;
      u.onstart=()=>{if(ticket===serial)status('🔊 Đang phát âm ('+u.lang+').');};
      u.onend=()=>{if(ticket===serial)status('Đã phát xong.');};
      u.onerror=e=>{if(ticket===serial)status('Không phát được giọng đọc ('+(e.error||'lỗi thiết bị')+'). Hãy thử đổi giọng UK/US hoặc trình duyệt.');};
      utterance=u;
      window.speechSynthesis.cancel();
      // Critical for Safari/iOS: call speak synchronously in the click handler.
      window.speechSynthesis.speak(u);
      if(window.speechSynthesis.paused)window.speechSynthesis.resume();
      status('🔊 Đang khởi động giọng đọc…');
      return true;
    }catch(_){status('Không thể khởi động phát âm. Hãy thử trình duyệt khác.');return false;}
  }
  async function findRecording(word, locale){
    if(!/^[a-z][a-z' -]{0,54}$/i.test(word)||word.includes(' '))return;
    const key=locale+'|'+word.toLowerCase();
    if(cache.has(key)||lookupInFlight.has(key))return;
    lookupInFlight.add(key);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),2500);
    try{
      const resp=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word),{signal:controller.signal,mode:'cors'});
      if(!resp.ok)return;
      const entries=await resp.json();
      const urls=entries.flatMap(e=>e.phonetics||[]).map(p=>p.audio).filter(Boolean)
        .map(x=>x.startsWith('//')?'https:'+x:x).filter(x=>/^https:\/\//.test(x));
      const preferred=locale==='en-GB'?/(uk|gb)/i:/(us|american)/i;
      const matches=urls.filter(x=>preferred.test(x));
      const unmarked=urls.filter(x=>!/(uk|gb|us|american)/i.test(x));
      const canPlay=x=>/\.(mp3|mpeg|m4a|wav)(\?|$)/i.test(x)
        || (/\.(ogg|oga|opus)(\?|$)/i.test(x)&&!!new Audio().canPlayType('audio/ogg'));
      const result=[...matches,...unmarked].find(canPlay);
      if(result)cache.set(key,result);
    }catch(_){}finally{clearTimeout(timer);lookupInFlight.delete(key);}
  }
  function play(input, button){
    const word=String(input||'').trim();if(!word)return;
    stop();const ticket=serial;
    const key=accent()+'|'+word.toLowerCase();
    const src=cache.get(key);
    if(src){
      try{
        const audio=new Audio(src);activeAudio=audio;audio.playbackRate=speed();
        audio.onended=()=>{if(ticket===serial)status('Đã phát xong.');};
        audio.onerror=()=>{if(ticket===serial){activeAudio=null;speakNow(word,ticket);}};
        // Direct call from user click; no await before audio.play().
        const result=audio.play();
        status('🔊 Đang phát bản ghi từ điển…');
        if(result&&typeof result.catch==='function')result.catch(()=>{if(ticket===serial){activeAudio=null;speakNow(word,ticket);}});
        return;
      }catch(_){activeAudio=null;}
    }
    speakNow(word,ticket);
    // Preload dictionary pronunciation for the NEXT click, never block this click.
    void findRecording(word,accent());
  }
  function ready(){
    const a=$('pronAccent'),s=$('pronSpeed'),test=$('pronTest');
    try{
      if(a){a.value=localStorage.getItem('msanh-pron-accent')==='en-US'?'en-US':'en-GB';a.addEventListener('change',()=>{stop();localStorage.setItem('msanh-pron-accent',a.value);status('Đã đổi giọng.');});}
      if(s){s.value=localStorage.getItem('msanh-pron-speed')==='0.8'?'0.8':'1';s.addEventListener('change',()=>{stop();localStorage.setItem('msanh-pron-speed',s.value);status('Đã đổi tốc độ.');});}
    }catch(_){/* private browsing can block localStorage; playback should still work */}
    if(test)test.addEventListener('click',()=>play('hello',test));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
  return {play,stop};
})();
