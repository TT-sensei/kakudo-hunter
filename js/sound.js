import { soundList } from 'https://raw.githubusercontent.com/TT-sensei/sounds-recipe-/main/sounds.js';

let audioContext=null;
let muted=localStorage.getItem('angleHunter.soundMuted')==='1';
const sounds=new Map(soundList.map(sound=>[sound.id,sound]));

async function ensureAudio(){
  if(muted)return null;
  try{
    if(!audioContext) audioContext=new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended') await audioContext.resume();
    return audioContext;
  }catch(e){return null}
}

window.eduSound=async id=>{
  const ctx=await ensureAudio();
  if(!ctx)return;
  const sound=sounds.get(id);
  if(!sound)return;
  try{sound.play(ctx,.72)}catch(e){}
};

window.eduSoundToggle=async()=>{
  muted=!muted;
  localStorage.setItem('angleHunter.soundMuted',muted?'1':'0');
  if(!muted) await ensureAudio();
  window.eduSoundUpdate?.();
};

window.eduSoundIsMuted=()=>muted;
