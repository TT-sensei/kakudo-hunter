let mode='hunter',step=30,target=0,pos=0,anim=null,locked=false,timerId=null,timeLeft=60,score=0,stats=loadStats(),protractorVisualTarget=0,currentNavian=null;
const $=id=>document.getElementById(id),C={cx:200,cy:200,r:155,navR:132};
function loadStats(){try{return JSON.parse(localStorage.getItem('angleHunter.stats.v2'))||{attempts:0,correct:0,weak:{}}}catch(e){return{attempts:0,correct:0,weak:{}}}}function saveStats(){localStorage.setItem('angleHunter.stats.v2',JSON.stringify(stats))}function recordNavianGet(monsterId){try{const key='angleHunter.navianGets.v2';const gets=JSON.parse(localStorage.getItem(key))||{};if(!monsterId)return;gets[monsterId]=(Number(gets[monsterId])||0)+1;localStorage.setItem(key,JSON.stringify(gets))}catch(e){}}function point(deg,r=C.navR){const a=-deg*Math.PI/180;return{x:C.cx+Math.cos(a)*r,y:C.cy+Math.sin(a)*r}}function sectorPath(deg,r=104){if(deg<=0)return `M ${C.cx} ${C.cy} L ${C.cx+r} ${C.cy} Z`;const a=-deg*Math.PI/180,x=C.cx+Math.cos(a)*r,y=C.cy+Math.sin(a)*r,large=deg>180?1:0;return `M ${C.cx} ${C.cy} L ${C.cx+r} ${C.cy} A ${r} ${r} 0 ${large} 0 ${x} ${y} Z`}function setSector(deg,strong=false){const e=$('angleSector');if(!e)return;e.setAttribute('d',sectorPath(deg));e.setAttribute('class',strong?'angle-sector active':'angle-sector')}
function drawField(){let s='<svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden="true">';s+='<path id="angleSector" class="angle-sector" d="'+sectorPath(0)+'"/><circle cx="200" cy="200" r="155" fill="none" stroke="#24344f" stroke-width="2.5" opacity=".65"/>';for(let d=0;d<360;d+=step){const a=-d*Math.PI/180,major=d%30===0,r1=major?143:150,r2=160,x1=200+Math.cos(a)*r1,y1=200+Math.sin(a)*r1,x2=200+Math.cos(a)*r2,y2=200+Math.sin(a)*r2;s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#24344f" stroke-width="${major?3.5:2}" opacity="${major?'.9':'.62'}" stroke-linecap="round"/>`;if(major)s+=`<text x="${200+Math.cos(a)*128}" y="${200+Math.sin(a)*128+5}" text-anchor="middle" font-size="13" font-weight="800" fill="#24344f">${d}°</text>`}s+='</svg>';$('field').innerHTML=s}
function buildAngles(){const box=$('angles');box.innerHTML='';if(step===15){for(let d=0;d<360;d+=15){const b=document.createElement('button');b.type='button';b.className='angle';b.textContent=d+'°';const choose=ev=>{ev.preventDefault();answer(d,b)};b.addEventListener('pointerup',choose);box.appendChild(b)}return}for(let d=0;d<360;d+=step){const b=document.createElement('button');b.type='button';b.className='angle';b.textContent=d+'°';const choose=ev=>{ev.preventDefault();answer(d,b)};b.addEventListener('pointerup',choose);box.appendChild(b)}}function setLine(el,deg,len=C.r){el.style.width=len+'px';el.style.transform=`rotate(${-deg}deg)`}function posNav(deg){const p=point(deg);$('navian').style.left=p.x/400*100+'%';$('navian').style.top=p.y/400*100+'%'}function resetLines(){['aim','correctLine','net'].forEach(id=>{const e=$(id);e.className=id;e.style.width='0';e.style.opacity='0'});setSector(0,false);$('message').className='message';$('message').textContent=''}function randomNav(){
  // モードごとに出現するナビアンを固定：
  // 30°モード＝ナビアン、15°モード＝エボナビ、1°モード＝ボスナビ
  const level=step===30?1:step===15?2:3;
  const pool=MONSTERS.filter(m=>m.level===level);
  currentNavian=pool[Math.floor(Math.random()*pool.length)];
  return currentNavian;
}
function spawn(){randomNav();cancelAnimationFrame(anim);anim=null;locked=false;resetLines();$('next').style.display='none';$('navian').className='navian';$('navian').src=MONSTER_BASE+currentNavian.path+'/'+currentNavian.file;target=Math.floor(Math.random()*(360/step))*step;posNav(0);let duration=850+target*3.1;if(mode==='challenge')duration=420;$('navian').classList.add('running');$('aim').classList.add('show');setLine($('aim'),0,205);setSector(0,false);const t0=performance.now();function tick(t){const p=Math.min(1,(t-t0)/duration),e=1-Math.pow(1-p,2),deg=target*e;posNav(deg);setLine($('aim'),deg,205);setSector(deg,false);if(p<1)anim=requestAnimationFrame(tick);else{$('navian').classList.remove('running');posNav(target);setLine($('aim'),target,205);setSector(target,true);locked=true;anim=null}}anim=requestAnimationFrame(tick)}
function playSound(id){try{window.eduSound?.(id)}catch(e){}}function feedback(text,kind){const m=$('message');m.textContent=text;m.className='message show '+kind}function answer(choice,button){if(!locked)return;locked=false;stats.attempts++;const ok=choice===target;if(ok){stats.correct++;score++;recordNavianGet(currentNavian.id);playSound('correct');button.classList.add('correct');$('navian').classList.add('caught');setLine($('net'),choice,C.r);$('net').classList.add('right');setSector(target,true);feedback('GET！ '+target+'°','hit')}else{playSound('wrong');stats.weak[target]=(stats.weak[target]||0)+1;button.classList.add('wrong');setLine($('net'),choice,C.r);$('net').classList.add('wrong');setLine($('correctLine'),target,C.r);$('correctLine').classList.add('show');setSector(target,true);feedback('おしい！ 正解は '+target+'°','miss')}saveStats();renderStats();if(mode==='challenge'){setTimeout(()=>{if(timeLeft>0)spawn()},ok?260:1000)}else{$('next').style.display='inline-flex'}}
function renderStats(){$('attempts').textContent=stats.attempts;$('correct').textContent=stats.correct;$('rate').textContent=stats.attempts?Math.round(stats.correct/stats.attempts*100)+'%':'0%';$('score').textContent=score;$('timer').textContent=timeLeft;$('timer').classList.toggle('hidden',mode!=='challenge');$('stepLabel').textContent=step===1?'1°刻み':step+'°'}
function startGame(newMode,newStep=30){playSound(newMode==='challenge'?'start':'start');mode=newMode;step=Number(newStep);if(mode==='book'){openBook();return}if(mode==='place'){startPlace();return}if(step===1){startProtractor();return}clearInterval(timerId);timerId=null;$('start').classList.add('hidden');$('result').classList.add('hidden');$('app').classList.remove('hidden');$('normalGame').classList.remove('hidden');$('protractorGame').classList.add('hidden');$('placeGame').classList.add('hidden');$('modeLabel').textContent=mode==='challenge'?'チャレンジ':'ハンター';$('recordTitle').textContent=mode==='challenge'?'今回の記録':'きろく';$('challengePanel').classList.toggle('hidden',mode!=='challenge');$('brandHint').textContent='ナビアンが止まった角度を見抜こう';score=0;timeLeft=60;renderStats();drawField();buildAngles();if(mode==='challenge'){renderStats();timerId=setInterval(()=>{timeLeft--;renderStats();const timerEl=$('timer');if(timerEl)timerEl.classList.toggle('urgent',timeLeft<=10&&timeLeft>0);if(timeLeft<=0){clearInterval(timerId);timerId=null;if(timerEl){timerEl.textContent='0';timerEl.classList.remove('urgent')}finishChallenge()}},1000);}spawn()}
function finishChallenge(){playSound('clear');cancelAnimationFrame(anim);anim=null;locked=false;$('navian').className='navian';$('resultNumber').textContent=score;$('result').classList.remove('hidden')}
function buildProtractor(){const ticks=$('protractorTicks'),nums=$('protractorNumbers');ticks.innerHTML='';nums.innerHTML='';const cx=400,cy=370,r=286,inner=268;for(let d=0;d<=180;d++){const a=Math.PI-d*Math.PI/180,major=d%10===0,mid=d%5===0,r1=major?inner-12:mid?inner-7:inner-3,r2=r,x1=cx+Math.cos(a)*r1,y1=cy-Math.sin(a)*r1,x2=cx+Math.cos(a)*r2,y2=cy-Math.sin(a)*r2,line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',x1);line.setAttribute('y1',y1);line.setAttribute('x2',x2);line.setAttribute('y2',y2);line.setAttribute('stroke',major?'#344054':mid?'#667085':'#98a2b3');line.setAttribute('stroke-width',major?'2.5':mid?'1.7':'1');ticks.appendChild(line);if(major){const t=document.createElementNS('http://www.w3.org/2000/svg','text'),nr=inner-29;t.setAttribute('x',cx+Math.cos(a)*nr);t.setAttribute('y',cy-Math.sin(a)*nr+5);t.setAttribute('text-anchor','middle');t.setAttribute('font-size','16');t.setAttribute('fill','#24344f');t.textContent=d;nums.appendChild(t);const t2=document.createElementNS('http://www.w3.org/2000/svg','text'),nr2=inner-57;t2.setAttribute('x',cx+Math.cos(a)*nr2);t2.setAttribute('y',cy-Math.sin(a)*nr2+5);t2.setAttribute('text-anchor','middle');t2.setAttribute('font-size','15');t2.setAttribute('fill','#3478c8');t2.setAttribute('opacity','.72');t2.textContent=180-d;nums.appendChild(t2)}}}
function proPoint(deg,r=320){const a=Math.PI-deg*Math.PI/180;return{x:400+Math.cos(a)*r,y:370-Math.sin(a)*r}}
function setProtractorLine(deg){const line=$('protractorRay'),correct=$('protractorCorrectLine'),len=330;line.style.left='50%';line.style.bottom='13%';line.style.width=len+'px';line.style.transform=`rotate(${deg-180}deg)`;correct.style.left='50%';correct.style.bottom='13%';correct.style.width=len+'px';correct.style.transform=`rotate(${deg-180}deg)`}
function setProtractorArc(startDeg,endDeg){const arc=$('protractorAngleArc');if(!arc)return;const r=92,rad=d=>(Math.PI-d*Math.PI/180),pt=d=>({x:400+Math.cos(rad(d))*r,y:370-Math.sin(rad(d))*r}),a=pt(startDeg),b=pt(endDeg),sweep=endDeg>startDeg?1:0;arc.setAttribute('d',`M ${a.x} ${a.y} A ${r} ${r} 0 0 ${sweep} ${b.x} ${b.y}`)}
function protractorPos(deg){const navRadius=currentNavian?.level===3?352:320;const p=proPoint(deg,navRadius);$('protractorNavian').style.left=p.x/800*100+'%';$('protractorNavian').style.top=p.y/424*100+'%';setProtractorLine(deg);setProtractorArc(window.protractorArcStart??0,deg)}
function startProtractor(){clearInterval(timerId);timerId=null;cancelAnimationFrame(anim);anim=null;locked=false;$('start').classList.add('hidden');$('result').classList.add('hidden');$('app').classList.remove('hidden');$('normalGame').classList.add('hidden');$('protractorGame').classList.remove('hidden');$('placeGame').classList.add('hidden');$('brandHint').textContent=mode==='challenge'?'60秒で分度器を読んでつかまえよう':'分度器の目盛を読んで、1°単位で答えよう';$('stepLabel').textContent='1°刻み';$('recordTitle').textContent=mode==='challenge'?'チャレンジ（分度器）':'ハンター（分度器）';$('challengePanel').classList.toggle('hidden',mode!=='challenge');if(mode==='challenge'){score=0;timeLeft=60;renderStats();timerId=setInterval(()=>{timeLeft--;renderStats();if(timeLeft<=0){clearInterval(timerId);timerId=null;finishChallenge()}},1000)}else{renderStats()}buildProtractor();requestAnimationFrame(spawnProtractor)}
function spawnProtractor(){randomNav();locked=false;$('protractorNext').style.display='none';$('degreeInput').value='';$('degreeInput').className='degree-input';$('degreeSubmit').disabled=true;$('protractorNavian').className='protractor-navian';$('protractorRay').className='protractor-ray show';$('protractorCorrectLine').className='protractor-correct-line';$('protractorNavian').src=MONSTER_BASE+currentNavian.path+'/'+currentNavian.file;target=Math.floor(Math.random()*179)+1;const fromLeft=Math.random()<.5;protractorVisualTarget=fromLeft?target:180-target;window.protractorArcStart=fromLeft?0:180;$('protractorLabel').textContent=fromLeft?'左の0°から読もう':'右の0°から読もう';$('protractorLabel').className='protractor-label';setProtractorArc(window.protractorArcStart,window.protractorArcStart);$('protractorNavian').classList.add('running');const t0=performance.now(),duration=1050;function tick(t){const p=Math.min(1,(t-t0)/duration),e=1-Math.pow(1-p,2),deg=window.protractorArcStart+(protractorVisualTarget-window.protractorArcStart)*e;protractorPos(deg);if(p<1)anim=requestAnimationFrame(tick);else{locked=true;anim=null;protractorPos(protractorVisualTarget);$('protractorNavian').classList.remove('running');$('degreeSubmit').disabled=false}}anim=requestAnimationFrame(tick)}
function answerProtractor(){if(!locked)return;const input=$('degreeInput'),value=Number(input.value);if(!Number.isInteger(value)||value<0||value>180)return;locked=false;$('degreeSubmit').disabled=true;stats.attempts++;const ok=Math.abs(value-target)<=1;if(ok){stats.correct++;score++;recordNavianGet(currentNavian.id);playSound('correct');input.classList.add('protractor-correct');$('protractorNavian').classList.add('caught');$('protractorCorrectLine').className='protractor-correct-line show';setProtractorLine(protractorVisualTarget);setProtractorArc(window.protractorArcStart,protractorVisualTarget);feedbackPro('ぴったり！ '+target+'°','hit')}else{playSound('wrong');stats.weak[target]=(stats.weak[target]||0)+1;input.classList.add('protractor-wrong');$('protractorCorrectLine').className='protractor-correct-line show';setProtractorLine(protractorVisualTarget);setProtractorArc(window.protractorArcStart,protractorVisualTarget);feedbackPro('正解は '+target+'°。目盛をもう一度確認しよう','miss')}saveStats();renderStats();if(mode==='challenge'){setTimeout(()=>{if(timeLeft>0)spawnProtractor()},ok?260:380)}else $('protractorNext').style.display='inline-flex'}function feedbackPro(text,kind){$('protractorLabel').textContent=text;$('protractorLabel').className='protractor-label '+kind}
function title(){clearInterval(timerId);timerId=null;cancelAnimationFrame(anim);anim=null;locked=false;$('app').classList.add('hidden');$('result').classList.add('hidden');$('book').classList.add('hidden');$('start').classList.remove('hidden')}function openBook(){playSound('notify');clearInterval(timerId);timerId=null;cancelAnimationFrame(anim);anim=null;locked=false;$('start').classList.add('hidden');$('app').classList.add('hidden');$('book').classList.remove('hidden');const g=$('bookGrid');g.innerHTML='';const groups=[{label:'レベル1　ナビアン',level:1},{label:'レベル2　エボナビ',level:2},{label:'レベル3　ボスナビ',level:3}];for(const group of groups){const h=document.createElement('h3');h.className='book-group-title';h.textContent=group.label;g.appendChild(h);const wrap=document.createElement('div');wrap.className='book-group-grid';MONSTERS.filter(m=>m.level===group.level).forEach(m=>{const c=document.createElement('div');c.className='book-card';c.innerHTML=`<img src="${MONSTER_BASE+m.path+'/'+m.file}" alt="${m.name}"><span>${m.name}</span><small>Lv.${m.level}</small>`;wrap.appendChild(c)});g.appendChild(wrap)}}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',ev=>{ev.stopPropagation();startGame(b.dataset.mode,b.dataset.step||30)}));$('next').onclick=()=>{playSound('decide');spawn()};$('protractorNext').onclick=()=>{playSound('click');spawnProtractor()};$('titleBtn').onclick=()=>{playSound('click');title()};$('resultTitle').onclick=()=>{playSound('click');title()};$('again').onclick=()=>startGame('challenge',step);$('bookBack').onclick=()=>{playSound('click');title()};$('degreeSubmit').onclick=()=>{playSound('decide');answerProtractor()};$('degreeInput').addEventListener('keydown',e=>{if(e.key==='Enter')answerProtractor()});window.eduSoundUpdate=()=>{const b=$('soundBtn');if(b)b.textContent=window.eduSoundIsMuted?.()?'🔇 音':'🔊 音'};
$('soundBtn')?.addEventListener('click',()=>window.eduSoundToggle?.());
window.eduSoundUpdate();
renderStats();

// STANDALONE_BOOK_LINK
document.addEventListener('click',function(e){
  const b=e.target.closest('.book-mode');
  if(b){e.preventDefault();e.stopImmediatePropagation();location.href='book.html';}
},true);

currentNavian=randomNav();

/* ===== 分度器あてようモード =====
   分度器を指で動かして、中心を頂点に、0°の線をはじめの辺に合わせてから読む。 */
const PL = { x: 400, y: 300, rot: 0, centerOk: false, rotState: null, answering: false, drag: null, built: false, wasAligned: false };
const PLV = { x: 400, y: 390 };           // 頂点（ステージ座標）
const PL_R = 186;                          // 分度器の半径
function plPt(deg, r, c) { const a = -deg * Math.PI / 180; const o = c || PLV; return { x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r }; }
function plNorm(d) { d = ((d % 360) + 360) % 360; return d > 180 ? d - 360 : d; }
function plCorrectRot() { return PL.side > 0 ? PL.baseDeg : PL.baseDeg - 180; }

function buildPlaceProtractor() {
  if (PL.built) return; PL.built = true;
  const g = $('placeProtractor'), NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || g).appendChild(e); return e; };
  // 本体（半円）＝移動ゾーン
  mk('path', { d: `M ${-PL_R} 0 H ${PL_R} A ${PL_R} ${PL_R} 0 0 0 ${-PL_R} 0 Z`, fill: 'rgba(179,216,240,.40)', stroke: '#24344f', 'stroke-width': 2.5, class: 'pl-body pl-body-main' });
  mk('path', { d: `M ${-(PL_R - 18)} 0 A ${PL_R - 18} ${PL_R - 18} 0 0 1 ${PL_R - 18} 0`, fill: 'none', stroke: '#b8c4d1', 'stroke-width': 1.5, class: 'pl-nodrag' });
  // 目盛と数字
  const ticks = mk('g', { class: 'pl-nodrag' });
  for (let d = 0; d <= 180; d++) {
    const major = d % 10 === 0, mid = d % 5 === 0, len = major ? 15 : mid ? 10 : 5;
    const p1 = plPt(d, PL_R - len, { x: 0, y: 0 }), p2 = plPt(d, PL_R, { x: 0, y: 0 });
    mk('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: major ? '#344054' : mid ? '#667085' : '#98a2b3', 'stroke-width': major ? 2.4 : mid ? 1.6 : 1 }, ticks);
    if (major) {
      const np = plPt(d, PL_R - 32, { x: 0, y: 0 });
      const t = mk('text', { x: np.x, y: np.y + 5, 'text-anchor': 'middle', 'font-size': 15, fill: '#24344f' }, ticks); t.textContent = d;
      const ip = plPt(d, PL_R - 56, { x: 0, y: 0 });
      const t2 = mk('text', { x: ip.x, y: ip.y + 5, 'text-anchor': 'middle', 'font-size': 13, fill: '#3478c8', opacity: .75 }, ticks); t2.textContent = 180 - d;
    }
  }
  // 底辺（0°の線）
  mk('line', { x1: -PL_R - 12, y1: 0, x2: PL_R + 12, y2: 0, stroke: '#24344f', 'stroke-width': 3.5, class: 'pl-body' });
  // 縁（回転ゾーン）
  mk('path', { d: `M ${-PL_R} 0 A ${PL_R} ${PL_R} 0 0 1 ${PL_R} 0`, fill: 'none', stroke: 'rgba(0,0,0,0)', 'stroke-width': 34, class: 'pl-rot' });
  // 中心
  mk('line', { x1: -15, y1: 0, x2: 15, y2: 0, stroke: '#24344f', 'stroke-width': 2, class: 'pl-body' });
  mk('line', { x1: 0, y1: -15, x2: 0, y2: 15, stroke: '#24344f', 'stroke-width': 2, class: 'pl-body' });
  mk('circle', { cx: 0, cy: 0, r: 8, fill: '#17233b', stroke: '#fff', 'stroke-width': 3, class: 'pl-body pl-center-dot' });
  // 回転つまみ
  const knob = mk('g', { class: 'pl-rot' });
  mk('circle', { cx: 0, cy: -PL_R, r: 18, fill: '#e3a400', stroke: '#fff', 'stroke-width': 3.5, class: 'pl-rot' }, knob);
  const kt = mk('text', { x: 0, y: -PL_R + 7, 'text-anchor': 'middle', 'font-size': 18, fill: '#fff', class: 'pl-rot' }, knob); kt.textContent = '↻';
  plApplyTransform(); plWireDrag();
}
function plApplyTransform() {
  $('placeProtractor').setAttribute('transform', `translate(${PL.x} ${PL.y}) rotate(${-PL.rot})`);
  const g = $('placeProtractor');
  g.classList.toggle('pl-center-ok', PL.centerOk);
  g.classList.toggle('pl-aligned', PL.centerOk && PL.rotState === 'ok');
}
function plUpdateStatus() {
  const st = $('placeStatus'); if (!st) return;
  let text, cls = 'place-status';
  if (PL.centerOk && PL.rotState === 'ok') { text = '合った！ 目盛を読もう'; cls += ' ok'; }
  else if (PL.centerOk && PL.rotState === 'flip') text = '向きが反対。半円が角度にかぶるように回そう';
  else if (PL.centerOk) text = '中心は合った。0°の線をはじめの辺に合わせよう';
  else if (PL.rotState === 'ok') text = '0°の線は合った。中心を頂点に合わせよう';
  else text = '中心と 0°の線を合わせよう';
  st.textContent = text; st.className = cls;
  const aligned = PL.centerOk && PL.rotState === 'ok';
  if (aligned && !PL.wasAligned) playSound('click');
  PL.wasAligned = aligned;
}
function plEvalSnap() {
  const distC = Math.hypot(PL.x - PLV.x, PL.y - PLV.y);
  PL.centerOk = distC <= 14;
  if (PL.centerOk) { PL.x = PLV.x; PL.y = PLV.y; }
  const c = plCorrectRot();
  if (Math.abs(plNorm(PL.rot - c)) <= 3) { PL.rot = plNorm(c); PL.rotState = 'ok'; }
  else if (Math.abs(plNorm(PL.rot - (c + 180))) <= 3) { PL.rot = plNorm(c + 180); PL.rotState = 'flip'; }
  else PL.rotState = null;
}
function plSvgPoint(e) {
  const svg = $('placeSvg'), m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}
function plWireDrag() {
  const svg = $('placeSvg');
  svg.addEventListener('pointerdown', (e) => {
    if (!PL.answering) return;
    const inPro = e.target.closest && e.target.closest('#placeProtractor');
    if (!inPro) return;
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    const p = plSvgPoint(e);
    const isRot = !!(e.target.closest && e.target.closest('.pl-rot'));
    PL.drag = { type: isRot ? 'rot' : 'move', sx: p.x, sy: p.y, cx: PL.x, cy: PL.y, rot: PL.rot,
                a0: Math.atan2(-(p.y - PL.y), p.x - PL.x) * 180 / Math.PI };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!PL.drag) return;
    const p = plSvgPoint(e), d = PL.drag;
    if (d.type === 'move') {
      PL.x = Math.min(760, Math.max(40, d.cx + (p.x - d.sx)));
      PL.y = Math.min(530, Math.max(30, d.cy + (p.y - d.sy)));
    } else {
      const a1 = Math.atan2(-(p.y - PL.y), p.x - PL.x) * 180 / Math.PI;
      PL.rot = plNorm(d.rot + plNorm(a1 - d.a0));
    }
    plEvalSnap(); plApplyTransform(); plUpdateStatus();
  });
  const end = () => { PL.drag = null; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}
function drawPlaceAngle(cur) {
  if (cur === undefined) cur = PL.target;
  const g = $('placeAngle'), NS = 'http://www.w3.org/2000/svg';
  g.innerHTML = '';
  const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); g.appendChild(e); return e; };
  const endDeg = PL.baseDeg + PL.side * cur;
  const b = plPt(PL.baseDeg, 300), e2 = plPt(endDeg, 300);
  mk('path', { d: `M ${PLV.x} ${PLV.y} L ${b.x} ${b.y} A 300 300 0 0 ${PL.side > 0 ? 0 : 1} ${e2.x} ${e2.y} Z`, fill: 'rgba(22,139,104,.12)', stroke: 'none' });
  const ab = plPt(PL.baseDeg, 105), ae = plPt(endDeg, 105);
  mk('path', { d: `M ${ab.x} ${ab.y} A 105 105 0 0 ${PL.side > 0 ? 0 : 1} ${ae.x} ${ae.y}`, fill: 'none', stroke: '#168b68', 'stroke-width': 6, 'stroke-linecap': 'round' });
  mk('line', { x1: PLV.x, y1: PLV.y, x2: b.x, y2: b.y, stroke: '#18243a', 'stroke-width': 5, 'stroke-linecap': 'round' });
  mk('line', { x1: PLV.x, y1: PLV.y, x2: e2.x, y2: e2.y, stroke: '#168b68', 'stroke-width': 6, 'stroke-linecap': 'round', id: 'placeSecondRay' });
  mk('circle', { cx: PLV.x, cy: PLV.y, r: 8, fill: '#17233b', stroke: '#fff', 'stroke-width': 3 });
  const np = plPt(endDeg, 332);
  const img = $('placeNavian');
  img.setAttribute('x', np.x - 40); img.setAttribute('y', np.y - 40);
  const url = MONSTER_BASE + currentNavian.path + '/' + currentNavian.file;
  if (img.getAttribute('href') !== url) img.setAttribute('href', url);
  img.classList.remove('caught');
  const ring = $('placeRing');
  ring.setAttribute('cx', np.x); ring.setAttribute('cy', np.y); ring.setAttribute('opacity', 0);
}
function spawnPlace() {
  randomNav();
  const lo = Math.max(1, Math.ceil(20 / step)), hi = Math.floor(160 / step);
  PL.target = step * (lo + Math.floor(Math.random() * (hi - lo + 1)));
  PL.baseDeg = -15 + Math.floor(Math.random() * 211);         // -15..195
  const endPlus = PL.baseDeg + PL.target, endMinus = PL.baseDeg - PL.target;
  const okPlus = endPlus <= 220, okMinus = endMinus >= -40;
  PL.side = okPlus && okMinus ? (Math.random() < .5 ? 1 : -1) : okPlus ? 1 : -1;
  drawPlaceAngle(0);
  // 分度器は、頂点から離れた位置・ずれた角度から始める
  const off = (20 + Math.random() * 140) * Math.PI / 180, dist = 150 + Math.random() * 60;
  PL.x = Math.min(600, Math.max(200, PLV.x + Math.cos(off) * dist));
  PL.y = Math.min(380, Math.max(190, PLV.y - Math.sin(off) * dist * .8));
  const rotOff = (30 + Math.random() * 45) * (Math.random() < .5 ? 1 : -1);
  PL.rot = plNorm(plCorrectRot() + rotOff);
  PL.centerOk = false; PL.rotState = null; PL.wasAligned = false; PL.answering = false;
  plEvalSnap(); plApplyTransform();
  $('placeStatus').textContent = 'ナビアンが止まるまで見ていよう'; $('placeStatus').className = 'place-status';
  $('placeInput').value = ''; $('placeInput').className = 'degree-input';
  $('placeLabel').textContent = '分度器を当てよう'; $('placeLabel').className = 'protractor-label';
  $('placeNext').style.display = 'none';
  // 他モードと同じく、角度が「開く」アニメーションで出題する
  cancelAnimationFrame(anim);
  const t0 = performance.now(), dur = 1000;
  function tick(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 2);
    drawPlaceAngle(PL.target * e);
    if (p < 1) anim = requestAnimationFrame(tick);
    else { anim = null; drawPlaceAngle(PL.target); PL.answering = true; plUpdateStatus(); }
  }
  anim = requestAnimationFrame(tick);
}
function startPlace() {
  clearInterval(timerId); timerId = null; cancelAnimationFrame(anim); anim = null; locked = false;
  $('start').classList.add('hidden'); $('result').classList.add('hidden'); $('book').classList.add('hidden');
  $('app').classList.remove('hidden'); $('normalGame').classList.add('hidden'); $('protractorGame').classList.add('hidden');
  $('placeGame').classList.remove('hidden');
  $('brandHint').textContent = '分度器を動かして、中心と0°を合わせよう';
  $('stepLabel').textContent = step === 1 ? '1°刻み' : step + '°';
  renderStats();
  buildPlaceProtractor();
  requestAnimationFrame(spawnPlace);
}
function answerPlace() {
  if (!PL.answering) return;
  const input = $('placeInput'), value = Number(input.value);
  if (!Number.isInteger(value) || value < 0 || value > 180) { $('placeLabel').textContent = '0から180の数字を入れてね'; return; }
  PL.answering = false;
  stats.attempts++;
  const ok = Math.abs(value - PL.target) <= (step === 1 ? 1 : 0);
  const aligned = PL.centerOk && PL.rotState === 'ok';
  if (ok) {
    stats.correct++; recordNavianGet(currentNavian.id); playSound('correct');
    input.classList.add('protractor-correct');
    $('placeNavian').classList.add('caught'); $('placeRing').setAttribute('opacity', 1);
    $('placeLabel').textContent = 'ぴったり！ ' + PL.target + '°'; $('placeLabel').className = 'protractor-label hit';
  } else {
    playSound('wrong'); stats.weak[PL.target] = (stats.weak[PL.target] || 0) + 1;
    input.classList.add('protractor-wrong');
    $('placeLabel').textContent = aligned ? '正解は ' + PL.target + '°。目盛をもう一度確認しよう' : '正解は ' + PL.target + '°。当て方（中心・0°の線）も確認しよう';
    $('placeLabel').className = 'protractor-label miss';
  }
  saveStats(); renderStats();
  $('placeNext').style.display = 'inline-flex';
}
$('placeSubmit').onclick = () => { playSound('decide'); answerPlace(); };
$('placeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') answerPlace(); });
$('placeNext').onclick = () => { playSound('click'); spawnPlace(); };
