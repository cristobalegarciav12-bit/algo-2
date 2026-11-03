import * as THREE from 'three';

const $ = id => document.getElementById(id);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const rand = (a,b)=>a+Math.random()*(b-a);

/* ================= AUDIO PROCEDURAL ================= */
let AC=null;
function ac(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); } if(AC.state==='suspended')AC.resume(); return AC; }
function noiseBuf(dur){ const c=ac(), b=c.createBuffer(1,c.sampleRate*dur,c.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; return b; }
function playShot(kind,quiet=false,loud=false){
  try{
    const c=ac(), t=c.currentTime;
    const src=c.createBufferSource(); src.buffer=noiseBuf(0.3);
    const f=c.createBiquadFilter(); f.type='lowpass';
    const g=c.createGain();
    let vol=0.5, freq=900, dur=0.22;
    if(kind==='rifle'){ freq=900; vol=0.5; dur=0.22; }
    if(kind==='smg'){ freq=1400; vol=0.35; dur=0.12; }
    if(kind==='pistol'){ freq=1700; vol=0.3; dur=0.1; }
    if(kind==='sniper'){ freq=500; vol=0.8; dur=0.5; }
    if(kind==='shotgun'){ freq=350; vol=0.9; dur=0.4; }
    if(kind==='loud'){ freq=650; vol=0.7; dur=0.35; }
    if(kind==='enemy'){ freq=700; vol=0.18; dur=0.2; }
    if(quiet){ vol*=0.35; freq*=0.6; }
    if(loud){ vol*=1.2; }
    f.frequency.value=freq; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.01,t+dur);
    src.connect(f); f.connect(g); g.connect(c.destination); src.start(t); src.stop(t+0.35);
    if(kind!=='enemy'){
      const o=c.createOscillator(); o.type='square';
      o.frequency.setValueAtTime(kind==='sniper'||kind==='shotgun'?110:180,t); o.frequency.exponentialRampToValueAtTime(40,t+0.1);
      const g2=c.createGain(); g2.gain.setValueAtTime(quiet?0.08:0.22,t); g2.gain.exponentialRampToValueAtTime(0.01,t+0.12);
      o.connect(g2); g2.connect(c.destination); o.start(t); o.stop(t+0.13);
    }
  }catch(e){}
}
function playClick(freq=2000,dur=0.05,vol=0.15){ try{ const c=ac(),t=c.currentTime,o=c.createOscillator(),g=c.createGain(); o.type='square'; o.frequency.value=freq; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.01,t+dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur);}catch(e){} }
function playReload(){ playClick(600,0.07); setTimeout(()=>playClick(900,0.07),150); setTimeout(()=>playClick(1300,0.09),400); }
function playHit(kill){ playClick(kill?700:1200,0.06,0.25); if(kill) setTimeout(()=>playClick(500,0.1,0.25),80); }
function playHurt(){ try{ const c=ac(),t=c.currentTime,o=c.createOscillator(),g=c.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(200,t); o.frequency.exponentialRampToValueAtTime(60,t+0.25); g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.01,t+0.3); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+0.3);}catch(e){} }
function playStep(run){ playClick(run?300:220,0.04,0.05); }
function playExplosion(){ try{ const c=ac(),t=c.currentTime,s=c.createBufferSource(); s.buffer=noiseBuf(0.8); const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(3000,t); f.frequency.exponentialRampToValueAtTime(80,t+0.7); const g=c.createGain(); g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.01,t+0.8); s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);}catch(e){} }
function playEmpty(){ playClick(2500,0.04,0.12); }
function kindByFam(fam){
  if(fam==='rifle'||fam==='lmg'||fam==='dmr') return 'rifle';
  if(fam==='smg'||fam==='mpistol'||fam==='pistol') return fam==='pistol'?'pistol':'smg';
  if(fam==='shotgun') return 'shotgun';
  if(fam==='bigpistol'||fam==='revolver') return 'loud';
  return 'sniper';
}

/* ================= BASE DE 12 ARMAS ================= */
// fam: rifle smg shotgun lmg pistol bigpistol revolver mpistol bolt dmr
const WEAPONS_DB=[
  // PRIMARIAS (5)
  {id:'ak47', name:'AK-47', cat:'prim', fam:'rifle', mag:30, res:150, auto:true, rpm:600, dmg:34, mul:2.0, sh:0.030, sa:0.006, rel:2.1, kick:0.030, range:120, wood:true},
  {id:'m4a1', name:'M4A1', cat:'prim', fam:'rifle', mag:30, res:180, auto:true, rpm:750, dmg:30, mul:2.0, sh:0.026, sa:0.005, rel:1.9, kick:0.023, range:110},
  {id:'mp5', name:'MP5', cat:'prim', fam:'smg', mag:32, res:192, auto:true, rpm:800, dmg:23, mul:1.8, sh:0.034, sa:0.011, rel:1.7, kick:0.019, range:70},
  {id:'m870', name:'M870 Express', cat:'prim', fam:'shotgun', mag:7, res:42, auto:false, rpm:75, dmg:12, mul:1.6, sh:0.058, sa:0.028, rel:2.8, kick:0.09, range:35, pel:9},
  {id:'m249', name:'M249 SAW', cat:'prim', fam:'lmg', mag:100, res:250, auto:true, rpm:650, dmg:27, mul:1.8, sh:0.038, sa:0.018, rel:4.5, kick:0.025, range:110},
  // SECUNDARIAS (4)
  {id:'glock17', name:'Glock-17', cat:'sec', fam:'pistol', mag:17, res:102, auto:false, rpm:450, dmg:21, mul:1.8, sh:0.030, sa:0.013, rel:1.4, kick:0.021, range:55},
  {id:'deagle', name:'Desert Eagle', cat:'sec', fam:'bigpistol', mag:7, res:49, auto:false, rpm:180, dmg:58, mul:2.0, sh:0.044, sa:0.019, rel:1.9, kick:0.072, range:80, accent:0x9aa0a8},
  {id:'m1911', name:'M1911', cat:'sec', fam:'pistol', mag:8, res:72, auto:false, rpm:350, dmg:36, mul:1.8, sh:0.034, sa:0.015, rel:1.6, kick:0.036, range:60, accent:0x5a3a22},
  {id:'magnum', name:'S&W Magnum', cat:'sec', fam:'revolver', mag:6, res:54, auto:false, rpm:160, dmg:75, mul:2.2, sh:0.038, sa:0.014, rel:2.6, kick:0.082, range:90, accent:0x6b4423},
  // FRANCOTIRADORES (3)
  {id:'awp', name:'AWP', cat:'snip', fam:'bolt', mag:5, res:30, auto:false, rpm:45, dmg:160, mul:2.5, sh:0.09, sa:0.0004, rel:3.0, kick:0.095, range:320, accent:0x3a4a3a},
  {id:'mk14', name:'MK-14 DMR', cat:'snip', fam:'dmr', mag:10, res:70, auto:false, rpm:220, dmg:75, mul:2.0, sh:0.040, sa:0.007, rel:2.2, kick:0.046, range:210},
  {id:'barret', name:'Barrett M82', cat:'snip', fam:'bolt', mag:10, res:40, auto:false, rpm:30, dmg:240, mul:2.5, sh:0.10, sa:0.0004, rel:3.8, kick:0.125, range:420, big:true},
];

/* ================= ACCESORIOS (todos con efecto real) ================= */
// mul: precisión al apuntar • hip: penaliza disparar sin apuntar • ads: velocidad de apuntado
const SIGHTS=[
  {id:'iron',   n:'Hierro',        fov:55, mul:1.00, ads:1.00, hip:1.00},
  {id:'reddot', n:'Punto rojo',    fov:55, mul:0.86, ads:1.06, hip:1.02},
  {id:'holo',   n:'Holográfica',   fov:50, mul:0.74, ads:1.12, hip:1.04},
  {id:'prism',  n:'Prisma x1.5',   fov:44, mul:0.62, ads:1.22, hip:1.12, glow:0x7dff9a},
  {id:'acog',   n:'ACOG x2',       fov:34, mul:0.52, ads:1.38, hip:1.35, glow:0x9fd4ff},
  {id:'x4',     n:'Mira x4',       fov:24, mul:0.40, ads:1.65, hip:1.90},
  {id:'x8',     n:'Mira x8',       fov:12, mul:0.28, ads:2.30, hip:2.80},
  {id:'thermal',n:'Térmica',       fov:30, mul:0.48, ads:1.55, hip:1.55, thermal:true},
];
const MUZZLES=[
  {id:'none',  n:'Ninguno',          kick:1.00, range:1.00, flash:1.0, noise:0,   choke:0},
  {id:'sup',   n:'Supresor',         kick:0.85, range:0.90, flash:0.25,noise:-3,  choke:0},
  {id:'heavysup',n:'Supresor pesado',kick:0.78, range:0.84, flash:0.10,noise:-6,  choke:0},
  {id:'comp',  n:'Compensador',      kick:0.70, range:1.00, flash:1.0, noise:0,   choke:0},
  {id:'brake', n:'Freno de boca',    kick:0.55, range:1.06, flash:1.8, noise:+3,  choke:0},
  {id:'flash', n:'Apagallamas',      kick:0.90, range:1.00, flash:0.0, noise:0,   choke:0},
  {id:'choke', n:'Choke',            kick:0.95, range:0.96, flash:0.9, noise:0,   choke:0.45},
  {id:'long',  n:'Cañón largo',      kick:1.15, range:1.28, flash:1.35,noise:+1,  choke:0},
];
// kick: retroceso • hip: dispersión • mag: cargador • ads: apuntado • rel: recarga • rec: recuperación del retroceso
const TACS=[
  {id:'none',    n:'Ninguno'},
  {id:'grip',    n:'Empuñadura vertical', kick:0.80, hip:0.86, ads:1.05},
  {id:'angled',  n:'Empuñadura angular',  kick:0.86, hip:0.74, ads:1.10},
  {id:'bipod',   n:'Bípode',               kick:0.70, hip:0.96, bipod:true},
  {id:'laser',   n:'Láser',                kick:1.00, hip:0.95, ads:1.04, laser:true},
  {id:'light',   n:'Linterna táctica',     kick:1.00, hip:1.00, ads:1.04, light:true},
  {id:'extmag',  n:'Cargador ampliado',    kick:1.00, hip:1.00, mag:1.5, rel:1.12},
  {id:'stock',   n:'Culata plegable',      kick:0.92, hip:0.92, ads:1.35},
  {id:'cheek',   n:'Mentonera',            kick:0.88, hip:0.96, ads:1.18, rec:1.35},
  {id:'brace',   n:'Corrector de culata',  kick:0.62, hip:1.00, ads:1.02, rec:1.75},
  {id:'barrel',  n:'Cañón reforzado',      kick:0.74, hip:0.98, ads:1.06, rec:1.15, range:1.12},
  {id:'shell',   n:'Portacargas rápido',   kick:1.02, hip:1.00, ads:1.08, rel:0.72},
];
const findById=(arr,id)=>arr.find(x=>x.id===id)||arr[0];

function buildRuntimeWeapon(def, att){
  const s=findById(SIGHTS,att.sight), m=findById(MUZZLES,att.muzzle), t=findById(TACS,att.tac);
  const magSize=Math.round(def.mag*(t.mag||1));
  const isSniper=(def.fam==='bolt'||def.fam==='dmr');
  const fovAds=(s.id==='iron'&&isSniper)?60:s.fov;
  return {
    defId:def.id, name:def.name, fam:def.fam, cat:def.cat,
    auto:def.auto, rpm:def.rpm, damage:def.dmg, headMul:def.mul, pellets:def.pel||1,
    magSize, inMag:magSize, reserve:def.res,
    spreadHip:def.sh*(t.hip||1)*s.hip,
    spreadAds:def.sa*s.mul,
    reloadT:def.rel*(t.rel||1),
    kick:def.kick*m.kick*(t.kick||1),
    recover:(t.rec||1)*(m.id==='brake'?1.3:m.id==='comp'?1.15:1),
    range:Math.round(def.range*m.range*(t.range||1)),
    choke:m.choke||0,
    fovAds, adsMul:(s.ads||1)*(t.ads||1),
    noise:m.noise||0, flashMul:m.flash,
    laser:!!t.laser, light:!!t.light, bipod:!!t.bipod, thermal:!!s.thermal, sightGlow:s.glow||null,
    sightId:s.id, muzzleId:m.id, tacId:t.id, vis:def,
    sound:kindByFam(def.fam),
  };
}

/* ================= ESTADO ================= */
let scene, camera, renderer, clock, mapGroup;
let playing=false, dead=false, paused=false;
let kills=0, score=0, wave=0, elapsed=0;
let enemies=[], particles=[], tracers=[], barrels=[], colliders=[], obstacleMeshes=[];
let enemyMeshes=[];
let toSpawn=0, spawnTimer=0, waveBreak=0;
let WEAPONS=[], curW=0, reloading=0, lastShot=0, triggerHeld=false, adsK=0;
let chGap=10, chBloom=0, chCool=0, swayRoll=0, swayYaw=0, lastYaw=Math.PI, lastPitch=0, recoilPend=0;
let gunRig, gunGroups=[], muzzleLight, muzzleSprite, scopeDiv, flashLight, laserLine;
const loadout={ prim:'ak47', sec:'glock17', snip:'awp', map:'downtown',
  attach:{ prim:{sight:'iron',muzzle:'none',tac:'none'}, sec:{sight:'iron',muzzle:'none',tac:'none'}, snip:{sight:'x4',muzzle:'none',tac:'none'} },
  ctrl:{mode:'lock', sens:1, invert:false} };
const MAP_NAMES={downtown:'Distrito Centro', port:'Puerto Industrial', oldtown:'Plaza Antigua'};

const player={ pos:new THREE.Vector3(0,1.7,18), vel:new THREE.Vector3(), yaw:Math.PI, pitch:0,
  hp:100, maxHp:100, lastDamage:-99, grounded:true, crouch:false, ads:false, sprint:false,
  baseH:1.7, crouchH:1.05, eyeH:1.7, radius:0.45, speedWalk:5.2, speedSprint:7.5, speedCrouch:2.6,
  bob:0, shake:0 };
const keys={};
const joy={active:false, id:null, x:0, y:0};
let lookTouch={id:null, lx:0, ly:0};

/* ================= TEXTURAS ================= */
let MAXANISO=8;
function canvasTex(sz,fn,repX=1,repY=1){
  const c=document.createElement('canvas'); c.width=c.height=sz; fn(c.getContext('2d'),sz);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(repX,repY);
  t.anisotropy=MAXANISO; t.colorSpace=THREE.SRGBColorSpace;
  t.generateMipmaps=true; t.minFilter=THREE.LinearMipmapLinearFilter; t.magFilter=THREE.LinearFilter;
  return t;
}
/* textura de relieve (bump) a partir de la misma textura base */
function bumpFrom(tex,strength=1,repX,repY){
  const t=tex.clone(); t.colorSpace=THREE.NoColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping;
  if(repX!==undefined) t.repeat.set(repX,repY!==undefined?repY:repX);
  t.anisotropy=MAXANISO; t.needsUpdate=true;
  return t;
}
function buildingTex(base,win){
  return canvasTex(256,(g,s)=>{
    // fachada con cemento, ventanas con marco, alféizar y suciedad
    g.fillStyle=base; g.fillRect(0,0,s,s);
    for(let i=0;i<2600;i++){ const v=Math.random()<0.5?0:255;
      g.fillStyle=`rgba(${v},${v},${v},0.035)`; g.fillRect(Math.random()*s,Math.random()*s,3,3); }
    g.fillStyle='rgba(0,0,0,0.14)';
    for(let y=0;y<8;y++) g.fillRect(0,y*32,s,2);
    for(let y=0;y<8;y++) for(let x=0;x<6;x++){
      const px=10+x*41, py=9+y*32, w=30, h=19;
      g.fillStyle='rgba(0,0,0,0.35)'; g.fillRect(px-2,py-2,w+4,h+4);           // marco
      const lit=Math.random()<(win||0.22);
      g.fillStyle=lit?`rgb(${245-Math.random()*40|0},${225-Math.random()*50|0},${150|0})`:'#16202c';
      g.fillRect(px,py,w,h);
      g.fillStyle='rgba(255,255,255,0.14)'; g.fillRect(px,py,w,3);            // reflejo
      g.fillStyle='rgba(255,255,255,0.06)'; g.fillRect(px+w/2-1,py,2,h);       // parteluces
      if(!lit){ g.fillStyle='rgba(120,160,200,0.10)'; g.fillRect(px,py,w,h*0.5); }
      g.fillStyle='rgba(0,0,0,0.25)'; g.fillRect(px-3,py+h,w+6,3);              // alféizar
    }
    // suciedad vertical
    for(let i=0;i<14;i++){ g.fillStyle=`rgba(20,18,16,${0.03+Math.random()*0.05})`;
      const x0=Math.random()*s; g.fillRect(x0,0,2+Math.random()*7,s); }
  });
}
function shopFrontTex(sign,base='#3b3f46'){
  return canvasTex(256,(g,s)=>{
    g.fillStyle=base; g.fillRect(0,0,s,s);
    for(let i=0;i<1200;i++){ g.fillStyle=`rgba(255,255,255,${Math.random()*0.03})`; g.fillRect(Math.random()*s,Math.random()*s,3,3); }
    g.fillStyle='#11161d'; g.fillRect(12,40,232,150);                      // escaparate
    g.fillStyle='rgba(255,255,255,0.10)'; g.fillRect(12,40,232,40);
    g.fillStyle='rgba(255,220,140,0.22)'; g.fillRect(12,150,232,40);
    g.fillStyle='#0c1015'; g.fillRect(6,26,244,14);                          // toldo/base
    g.fillStyle=sign; g.fillRect(60,4,136,22);                                // rótulo
    g.fillStyle='rgba(0,0,0,0.5)'; g.fillRect(60,4,136,3);
  });
}
function brickTex(base='#8a4a3a',mortar='#b9ad9c'){
  return canvasTex(256,(g,s)=>{
    g.fillStyle=mortar; g.fillRect(0,0,s,s);
    const bh=15,bw=34;
    for(let y=0;y<s;y+=bh){
      const off=((y/bh)%2)*bw/2;
      for(let x=-bw;x<s;x+=bw){
        const v=Math.random()<0.12?0.82:1;
        const r=parseInt(base.slice(1,3),16)*v|0, gg=parseInt(base.slice(3,5),16)*v|0, b=parseInt(base.slice(5,7),16)*v|0;
        g.fillStyle=`rgb(${r},${gg},${b})`;
        g.fillRect(x+off+1.5,y+1.5,bw-3,bh-3);
        g.fillStyle='rgba(0,0,0,0.10)'; g.fillRect(x+off+1.5,y+bh-4,bw-3,2.5);
      }
    }
    for(let i=0;i<1800;i++){ g.fillStyle=`rgba(0,0,0,${Math.random()*0.06})`; g.fillRect(Math.random()*s,Math.random()*s,2,2); }
  });
}
function plateTex(base='#7d838c'){
  return canvasTex(128,(g,s)=>{
    g.fillStyle=base; g.fillRect(0,0,s,s);
    for(let i=0;i<600;i++){ g.fillStyle=`rgba(255,255,255,${Math.random()*0.06})`; g.fillRect(Math.random()*s,Math.random()*s,6,1); }
    g.strokeStyle='rgba(0,0,0,0.25)'; g.lineWidth=1;
    for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(0,i*s/4); g.lineTo(s,i*s/4); g.stroke(); }
    for(let i=0;i<4;i++) for(let j=0;j<4;j++){
      g.fillStyle='rgba(0,0,0,0.35)'; g.beginPath(); g.arc(i*s/4+3,j*s/4+3,1.8,0,7); g.fill();
      g.fillStyle='rgba(255,255,255,0.20)'; g.beginPath(); g.arc(i*s/4+3.6,j*s/4+2.6,0.9,0,7); g.fill();
    }
  },1,1);
}
function woodTex(base='#6b4423'){
  return canvasTex(128,(g,s)=>{
    g.fillStyle=base; g.fillRect(0,0,s,s);
    for(let i=0;i<70;i++){ g.strokeStyle=`rgba(0,0,0,${0.05+Math.random()*0.12})`; g.lineWidth=Math.random()*2;
      g.beginPath(); g.moveTo(0,Math.random()*s); g.bezierCurveTo(s*0.3,Math.random()*s,s*0.7,Math.random()*s,s,Math.random()*s); g.stroke(); }
    g.fillStyle='rgba(0,0,0,0.35)'; for(let x=0;x<s;x+=32) g.fillRect(x,0,2,s);
  });
}
function dirtTex(){
  return canvasTex(256,(g,s)=>{
    g.fillStyle='#6d5c45'; g.fillRect(0,0,s,s);
    for(let i=0;i<2600;i++){ g.fillStyle=`rgba(${60+Math.random()*70|0},${50+Math.random()*55|0},${35+Math.random()*45|0},0.5)`; g.fillRect(Math.random()*s,Math.random()*s,3,2); }
    for(let i=0;i<40;i++){ g.fillStyle='rgba(40,34,24,0.35)'; g.beginPath(); g.ellipse(Math.random()*s,Math.random()*s,10+Math.random()*26,6+Math.random()*14,Math.random()*3,0,7); g.fill(); }
  },26,26);
}
function grassTex(){
  return canvasTex(256,(g,s)=>{
    g.fillStyle='#4a6b33'; g.fillRect(0,0,s,s);
    for(let i=0;i<4000;i++){ g.fillStyle=`rgba(${40+Math.random()*60|0},${80+Math.random()*70|0},${30+Math.random()*40|0},0.55)`; g.fillRect(Math.random()*s,Math.random()*s,2,3); }
  },22,22);
}
function noiseBump(t,scale=1){
  return t;
}
function groundConcrete(){ return canvasTex(256,(g,s)=>{ g.fillStyle='#8a8a86'; g.fillRect(0,0,s,s);
  for(let i=0;i<1800;i++){ g.fillStyle=`rgba(${90+Math.random()*40|0},${90+Math.random()*40|0},${85+Math.random()*35|0},0.6)`; g.fillRect(Math.random()*s,Math.random()*s,2,2); }
  g.strokeStyle='rgba(0,0,0,0.2)'; for(let i=0;i<=2;i++){ g.beginPath();g.moveTo(i*128,0);g.lineTo(i*128,s);g.stroke(); g.beginPath();g.moveTo(0,i*128);g.lineTo(s,i*128);g.stroke(); } },30,30); }
function groundAsphalt(){ return canvasTex(256,(g,s)=>{
  g.fillStyle='#3f4145'; g.fillRect(0,0,s,s);
  for(let i=0;i<3200;i++){ g.fillStyle=`rgba(${50+Math.random()*40|0},${52+Math.random()*40|0},${55+Math.random()*40|0},0.7)`; g.fillRect(Math.random()*s,Math.random()*s,2,2); }
  // parches de reasfaltado
  for(let i=0;i<6;i++){ g.fillStyle=`rgba(${30+Math.random()*20|0},${32+Math.random()*20|0},${36+Math.random()*20|0},0.55)`;
    g.beginPath(); g.ellipse(Math.random()*s,Math.random()*s,18+Math.random()*40,14+Math.random()*28,Math.random()*3,0,7); g.fill(); }
  // grietas
  for(let i=0;i<10;i++){ g.strokeStyle='rgba(18,18,20,0.75)'; g.lineWidth=0.6+Math.random()*1.4;
    g.beginPath(); let x=Math.random()*s,y=Math.random()*s; g.moveTo(x,y);
    for(let k=0;k<7;k++){ x+=(Math.random()-0.5)*46; y+=(Math.random()-0.5)*46; g.lineTo(x,y); } g.stroke(); }
  // tapa de registro
  g.fillStyle='rgba(20,20,22,0.9)'; g.beginPath(); g.arc(s*0.5,s*0.5,17,0,7); g.fill();
  g.strokeStyle='rgba(140,140,145,0.35)'; g.lineWidth=1.5; g.beginPath(); g.arc(s*0.5,s*0.5,15,0,7); g.stroke();
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; g.beginPath(); g.moveTo(s*0.5+Math.cos(a)*5,s*0.5+Math.sin(a)*5); g.lineTo(s*0.5+Math.cos(a)*14,s*0.5+Math.sin(a)*14); g.stroke(); }
},24,24); }
function groundCobble(){ return canvasTex(256,(g,s)=>{
  g.fillStyle='#6b6255'; g.fillRect(0,0,s,s);
  for(let y=0;y<8;y++) for(let x=0;x<8;x++){
    const ox=(y%2)*16, px=x*32+ox-16, py=y*32;
    const v=Math.random();
    g.fillStyle=`rgb(${100+v*45|0},${92+v*40|0},${78+v*34|0})`;
    g.beginPath(); g.roundRect? g.roundRect(px+2,py+2,28,28,5) : g.rect(px+2,py+2,28,28); g.fill();
    g.fillStyle='rgba(255,255,255,0.10)'; g.fillRect(px+3,py+3,26,5);
    g.fillStyle='rgba(0,0,0,0.22)'; g.fillRect(px+3,py+24,26,5);
  }
  // brillo de humedad
  for(let i=0;i<8;i++){ g.fillStyle='rgba(40,44,50,0.25)'; g.beginPath(); g.ellipse(Math.random()*s,Math.random()*s,20+Math.random()*30,10+Math.random()*18,0,0,7); g.fill(); }
},28,28); }
function roadStripeTex(){ return canvasTex(128,(g,s)=>{ g.fillStyle='#33353a'; g.fillRect(0,0,s,s);
  g.fillStyle='#e8c33a'; g.fillRect(s/2-4,10,8,40); g.fillStyle='#ddd'; g.fillRect(4,0,4,s); g.fillRect(s-8,0,4,s); },1,10); }
function containerTex(base){ return canvasTex(256,(g,s)=>{ g.fillStyle=base; g.fillRect(0,0,s,s);
  g.fillStyle='rgba(0,0,0,0.25)'; for(let x=0;x<s;x+=16) g.fillRect(x,0,5,s);
  g.fillStyle='rgba(255,255,255,0.12)'; for(let x=8;x<s;x+=16) g.fillRect(x,0,3,s); },2,1); }
function awningTex(c1,c2){ return canvasTex(128,(g,s)=>{ for(let x=0;x<8;x++){ g.fillStyle=x%2?c1:c2; g.fillRect(x*16,0,16,s); } },2,1); }

/* ================= CONSTRUCCIÓN MAPA ================= */
function addBox(x,y,z,w,h,d,color,opts={}){
  const mat=opts.mat||new THREE.MeshStandardMaterial({color, roughness:opts.rough??0.85, metalness:opts.metal??0.05});
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true;
  if(opts.ry) m.rotation.y=opts.ry;
  mapGroup.add(m);
  const box=new THREE.Box3().setFromObject(m);
  colliders.push(box); obstacleMeshes.push(m);
  return m;
}
function visual(geo,mat,x,y,z,ry=0){
  const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.rotation.y=ry;
  m.castShadow=true; m.receiveShadow=true; mapGroup.add(m); return m;
}
function clearMap(){
  if(mapGroup) scene.remove(mapGroup);
  mapGroup=new THREE.Group(); scene.add(mapGroup);
  colliders=[]; obstacleMeshes=[]; barrels=[];
}
function baseSky(skyColor,fogNear,fogFar,sunColor,sunInt,sunPos){
  scene.fog=new THREE.Fog(skyColor,fogNear,fogFar);
  // cielo con degradado vertical real (no color plano)
  const skyGeo=new THREE.SphereGeometry(400,32,20);
  const skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{
      top:{value:new THREE.Color(skyColor).multiplyScalar(0.72)},
      mid:{value:new THREE.Color(skyColor)},
      bot:{value:new THREE.Color(skyColor).lerp(new THREE.Color(0xffffff),0.28)},
      sunDir:{value:new THREE.Vector3(...sunPos).normalize()},
      sunCol:{value:new THREE.Color(sunColor)},
    },
    vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:`
      uniform vec3 top,mid,bot,sunDir,sunCol; varying vec3 vP;
      void main(){
        vec3 d=normalize(vP);
        float h=clamp(d.y*0.5+0.5,0.0,1.0);
        vec3 c=mix(bot,mid,smoothstep(0.42,0.56,h));
        c=mix(c,top,smoothstep(0.56,0.95,h));
        // resplandor alrededor del sol
        float s=max(dot(d,normalize(sunDir)),0.0);
        c+=sunCol*pow(s,220.0)*1.6;
        c+=sunCol*pow(s,9.0)*0.22;
        gl_FragColor=vec4(c,1.0);
      }`
  });
  mapGroup.add(new THREE.Mesh(skyGeo,skyMat));
  // nubes volumétricas inexpensive (sprites apilados)
  addClouds(sunColor);
  mapGroup.add(new THREE.HemisphereLight(0xcfe5ff,0x3a4a35,1.05));
  const amb=new THREE.AmbientLight(0xffffff,0.18); mapGroup.add(amb);
  const sun=new THREE.DirectionalLight(sunColor,sunInt);
  sun.position.set(...sunPos); sun.castShadow=true;
  sun.shadow.mapSize.set(4096,4096);
  Object.assign(sun.shadow.camera,{left:-58,right:58,top:58,bottom:-58,far:170,near:1});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.02;
  sun.shadow.radius=2.2;
  mapGroup.add(sun);
  // relleno frío desde el lado opuesto para que nada quede totalmente negro
  const fill=new THREE.DirectionalLight(0x9fc0e8,0.28); fill.position.set(-sunPos[0],25,-sunPos[2]); mapGroup.add(fill);
}
function addClouds(sunColor){
  const c=document.createElement('canvas'); c.width=c.height=128;
  const g=c.getContext('2d');
  for(let i=0;i<26;i++){
    const x=20+Math.random()*88, y=20+Math.random()*88, r=10+Math.random()*26;
    const gr=g.createRadialGradient(x,y,0,x,y,r);
    gr.addColorStop(0,'rgba(255,255,255,0.85)'); gr.addColorStop(0.55,'rgba(250,250,255,0.4)'); gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,7); g.fill();
  }
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  for(let i=0;i<16;i++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:0.34+Math.random()*0.3,depthWrite:false,fog:false}));
    const a=Math.random()*Math.PI*2, rr=140+Math.random()*180;
    s.position.set(Math.cos(a)*rr,55+Math.random()*90,Math.sin(a)*rr);
    const sc=60+Math.random()*90; s.scale.set(sc,sc*0.45,1);
    s.material.rotation=Math.random()*Math.PI;
    mapGroup.add(s);
  }
}
/* sombra de contacto: oscurece el suelo bajo los objetos y da peso a la escena */
let contactTex=null;
function contactShadow(x,z,r=1.2,opacity=0.45){
  if(!contactTex){
    const c=document.createElement('canvas'); c.width=c.height=128;
    const g=c.getContext('2d');
    const gr=g.createRadialGradient(64,64,2,64,64,62);
    gr.addColorStop(0,'rgba(0,0,0,0.85)'); gr.addColorStop(0.5,'rgba(0,0,0,0.4)'); gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr; g.fillRect(0,0,128,128);
    contactTex=new THREE.CanvasTexture(c);
  }
  const m=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),new THREE.MeshBasicMaterial({map:contactTex,transparent:true,opacity,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.set(x,0.02,z); m.renderOrder=1;
  mapGroup.add(m); return m;
}
function groundPlane(tex){
  const g=new THREE.Mesh(new THREE.PlaneGeometry(120,120), new THREE.MeshStandardMaterial({
    map:tex, roughness:0.95, metalness:0.02,
    bumpMap:bumpFrom(tex,1), bumpScale:0.035,
    envMapIntensity:0.35
  }));
  g.rotation.x=-Math.PI/2; g.receiveShadow=true; mapGroup.add(g);
}
function perimeterWalls(color){
  addBox(0,2,-30,64,4,1.5,color); addBox(0,2,30,64,4,1.5,color);
  addBox(-32,2,0,1.5,4,62,color); addBox(32,2,0,1.5,4,62,color);
}
function spawnBarrel(x,z){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1.2,14), new THREE.MeshStandardMaterial({color:0xc23b22,roughness:0.6}));
  body.position.y=0.6; body.castShadow=true; g.add(body);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.52,0.12,14), new THREE.MeshStandardMaterial({color:0xeeeeee}));
  band.position.y=0.6; g.add(band);
  g.position.set(x,0,z); mapGroup.add(g);
  const b={mesh:g,hp:40,pos:new THREE.Vector3(x,0.6,z),dead:false};
  g.userData.barrel=b; barrels.push(b);
  b.box=new THREE.Box3().setFromObject(g); colliders.push(b.box); obstacleMeshes.push(body);
  body.userData.barrel=b;
}
function lampPost(x,z,warm=0xffe0a0){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.16,6.4,10), new THREE.MeshStandardMaterial({color:0x2a2d33,roughness:0.6,metalness:0.4}));
  pole.position.set(x,3.2,z); pole.castShadow=true; mapGroup.add(pole);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.32,0.4,10), new THREE.MeshStandardMaterial({color:0x22252a,roughness:0.7}));
  base.position.set(x,0.2,z); base.castShadow=true; mapGroup.add(base);
  const arm=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.06,6,10,Math.PI/2), new THREE.MeshStandardMaterial({color:0x2a2d33,metalness:0.4,roughness:0.6}));
  arm.position.set(x,6.3,z); arm.rotation.y=rand(0,6.28); mapGroup.add(arm);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.2,0.42), new THREE.MeshStandardMaterial({color:0x33383f,roughness:0.5,metalness:0.5}));
  head.position.set(x,6.6,z); head.castShadow=true; mapGroup.add(head);
  const bulb=new THREE.Mesh(new THREE.BoxGeometry(0.58,0.06,0.34), new THREE.MeshStandardMaterial({color:0xfff4d0,emissive:warm,emissiveIntensity:2.2}));
  bulb.position.set(x,6.48,z); mapGroup.add(bulb);
  const lamp=new THREE.PointLight(warm,26,30,2); lamp.position.set(x,6.2,z); mapGroup.add(lamp);
  contactShadow(x,z,0.4,0.35);
}
function addCar(x,z,ry,color){
  const paint=new THREE.MeshStandardMaterial({color,roughness:0.22,metalness:0.55,envMapIntensity:1.6});
  addBox(x,0.62,z,4.2,0.86,1.86,color,{ry,mat:paint});
  const glass=new THREE.MeshStandardMaterial({color:0x14202b,roughness:0.06,metalness:0.85,envMapIntensity:2.2,transparent:true,opacity:0.92});
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.72,1.7), glass);
  cabin.position.set(x,1.38,z); cabin.rotation.y=ry; cabin.castShadow=true; mapGroup.add(cabin);
  // techo metálico
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.1,1.6),new THREE.MeshStandardMaterial({color,roughness:0.3,metalness:0.6}));
  roof.position.set(x,1.76,z); roof.rotation.y=ry; roof.castShadow=true; mapGroup.add(roof);
  obstacleMeshes.push(cabin);
  const wg=new THREE.CylinderGeometry(0.36,0.36,0.28,14), wm=new THREE.MeshStandardMaterial({color:0x141414,roughness:0.95});
  const rimG=new THREE.CylinderGeometry(0.19,0.19,0.3,10), rimM=new THREE.MeshStandardMaterial({color:0x9aa0a8,metalness:0.9,roughness:0.3});
  for(const [dx,dz] of [[-1.35,0.92],[1.35,0.92],[-1.35,-0.92],[1.35,-0.92]]){
    const wx=x+dx*Math.cos(ry), wz=z-dx*Math.sin(ry)+dz*Math.cos(ry);
    const wmesh=new THREE.Mesh(wg,wm); wmesh.rotation.x=Math.PI/2; wmesh.rotation.y=ry; wmesh.position.set(wx,0.36,wz); wmesh.castShadow=true; mapGroup.add(wmesh);
    const rim=new THREE.Mesh(rimG,rimM); rim.rotation.x=Math.PI/2; rim.rotation.y=ry; rim.position.set(wx,0.36,wz); mapGroup.add(rim);
  }
  // faros, pilotos y matrícula
  for(const dz of [-0.62,0.62]){
    const hl=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.2,0.38), new THREE.MeshStandardMaterial({color:0xfff6d8,emissive:0xfff0bb,emissiveIntensity:0.55,roughness:0.2}));
    hl.position.set(x+2.12*Math.cos(ry)+dz*Math.sin(ry),0.72,z-2.12*Math.sin(ry)+dz*Math.cos(ry)); hl.rotation.y=ry; mapGroup.add(hl);
    const tl=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.16,0.32), new THREE.MeshStandardMaterial({color:0x8a1a1a,emissive:0x550000,emissiveIntensity:0.4}));
    tl.position.set(x-2.12*Math.cos(ry)+dz*Math.sin(ry),0.75,z+2.12*Math.sin(ry)+dz*Math.cos(ry)); tl.rotation.y=ry; mapGroup.add(tl);
  }
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.14),new THREE.MeshStandardMaterial({color:0xe8e8e8,roughness:0.6}));
  plate.position.set(x+2.14*Math.cos(ry),0.5,z-2.14*Math.sin(ry)); plate.rotation.y=ry-Math.PI/2; mapGroup.add(plate);
  // retrovisores y limpiaparabrisas
  for(const dz of [-0.95,0.95]){
    const mir=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.1,0.06),new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:0.5}));
    mir.position.set(x+0.5*Math.cos(ry)+dz*Math.sin(ry),1.42,z-0.5*Math.sin(ry)+dz*Math.cos(ry)); mir.rotation.y=ry; mapGroup.add(mir);
  }
  contactShadow(x,z,1.5,0.5);
}
function addContainer(x,z,ry,colorName,y=1.3){
  const tex=containerTex(colorName);
  return addBox(x,y,z,6,2.6,2.4,0xffffff,{ry,mat:new THREE.MeshStandardMaterial({map:tex,roughness:0.7,metalness:0.3})});
}
function facadeRing(textures){
  const spots=[[-45,-20,20,14],[ -15,-42,18,18],[15,-42,22,14],[45,-22,18,20],[-45,15,16,12],[45,18,20,16],[-20,42,24,15],[12,42,18,12]];
  spots.forEach(([x,z,w,h],i)=>{
    const t=textures[i%textures.length];
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,10), new THREE.MeshStandardMaterial({map:t,roughness:0.9}));
    m.position.set(x,h/2,z); mapGroup.add(m);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(w+1,0.6,11), new THREE.MeshStandardMaterial({color:0x2a2d33}));
    roof.position.set(x,h+0.3,z); mapGroup.add(roof);
    // detalles de azotea: pretiles y cornisas
    const ledges=[...Array(Math.max(3,Math.round(w/5)))];
    for(let k=1;k<ledges.length;k++){ const l=new THREE.Mesh(new THREE.BoxGeometry(w,0.3,10.4),new THREE.MeshStandardMaterial({color:0x51565e})); l.position.set(x,k*h/ledges.length,z); mapGroup.add(l); }
    // detalle: aire acondicionado en la azotea
    addRooftopAC(x,z,w,h);
    // salidas de ventilación
    for(let k=0;k<3;k++) visual(new THREE.CylinderGeometry(0.25,0.25,1.1,8),new THREE.MeshStandardMaterial({color:0x555b63}),x+rand(-w/2+2,w/2-2),h+0.9,z+rand(-3,3));
  });
}
function addRooftopAC(x,z,w,h){
  for(let k=0;k<3;k++){
    const ax=x+rand(-w/2+2,w/2-2), az=z+rand(-3,3);
    const unit=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.9,1.1),new THREE.MeshStandardMaterial({map:plateTex('#9aa2ac'),roughness:0.7,metalness:0.4}));
    unit.position.set(ax,h+0.75,az); unit.castShadow=true; mapGroup.add(unit);
    const fan=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.05,6,14),new THREE.MeshStandardMaterial({color:0x3a3f46,metalness:0.6}));
    fan.position.set(ax,h+1.22,az); fan.rotation.x=Math.PI/2; mapGroup.add(fan);
  }
}
/* ---------- PROPS DETALLADOS ---------- */
function addCone(x,z){
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.06,0.5),new THREE.MeshStandardMaterial({color:0xd8531f})); base.position.y=0.03; g.add(base);
  const body=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.7,12),new THREE.MeshStandardMaterial({color:0xff6a22})); body.position.y=0.4; body.castShadow=true; g.add(body);
  const stripe=new THREE.Mesh(new THREE.CylinderGeometry(0.145,0.175,0.12,12),new THREE.MeshStandardMaterial({color:0xf2f2f2})); stripe.position.y=0.42; g.add(stripe);
  g.position.set(x,0,z); mapGroup.add(g); obstacleMeshes.push(body);
}
function addJerseyBarrier(x,z,ry=0){
  const g=new THREE.Group();
  const shape=new THREE.Shape(); shape.moveTo(-0.28,0); shape.lineTo(0.28,0); shape.lineTo(0.2,0.35); shape.lineTo(0.14,1.0); shape.lineTo(-0.14,1.0); shape.lineTo(-0.2,0.35); shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:2.6,bevelEnabled:false});
  const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x9a9a92,roughness:0.9}));
  m.rotation.y=ry; m.castShadow=true; m.receiveShadow=true; g.add(m);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.22,0.6),new THREE.MeshStandardMaterial({color:0xd8531f}));
  stripe.position.y=0.7; stripe.rotation.y=ry; g.add(stripe);
  g.position.set(x,0,z); mapGroup.add(g);
  const box=new THREE.Box3().setFromObject(m); colliders.push(box); obstacleMeshes.push(m);
}
function addSandbags(x,z,ry=0,n=3){
  const g=new THREE.Group();
  for(let row=0;row<2;row++) for(let i=0;i<n-row;i++){
    const bag=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.28,0.5),new THREE.MeshStandardMaterial({map:plateTex('#9c8b62'),roughness:1}));
    bag.position.set((i-row*0.5)*0.9,0.15+row*0.28,0); bag.rotation.y=(Math.random()-0.5)*0.2; bag.castShadow=true; g.add(bag);
  }
  g.position.set(x,0,z); g.rotation.y=ry; mapGroup.add(g);
  const box=new THREE.Box3().setFromObject(g); colliders.push(box);
}
function addDumpster(x,z,ry=0){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.1,1.1),new THREE.MeshStandardMaterial({map:plateTex('#3a6b4a'),roughness:0.8,metalness:0.3}));
  body.position.y=0.55; body.castShadow=true; g.add(body);
  const lid=new THREE.Mesh(new THREE.BoxGeometry(1.95,0.12,1.15),new THREE.MeshStandardMaterial({color:0x2c5540,roughness:0.7}));
  lid.position.set(0,1.14,0); lid.rotation.x=0.06; g.add(lid);
  for(const dx of [-0.7,0.7]){ const w=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.12,10),new THREE.MeshStandardMaterial({color:0x111111})); w.rotation.z=Math.PI/2; w.position.set(dx,0.12,0); g.add(w); }
  g.position.set(x,0,z); g.rotation.y=ry; mapGroup.add(g);
  const box=new THREE.Box3().setFromObject(body); colliders.push(box); obstacleMeshes.push(body);
}
function addTrafficSign(x,z,ry,kind='stop'){
  const g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.6,8),new THREE.MeshStandardMaterial({color:0x9aa0a8,metalness:0.6,roughness:0.4}));
  pole.position.y=1.3; g.add(pole);
  let face;
  if(kind==='stop'){ face=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.04,8),new THREE.MeshStandardMaterial({color:0xc23b22,roughness:0.6})); }
  else face=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),new THREE.MeshStandardMaterial({color:0x2a6ab8,roughness:0.6,side:THREE.DoubleSide}));
  face.rotation.set(Math.PI/2,0,ry); face.position.set(0,2.3,0.02); g.add(face);
  g.position.set(x,0,z); mapGroup.add(g);
}
function addParkBench(x,z,ry=0){
  const g=new THREE.Group();
  for(let i=0;i<4;i++){ const s=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.07,0.13),new THREE.MeshStandardMaterial({color:0x6b4423,roughness:0.7})); s.position.set(0,0.45,-0.2+i*0.15); g.add(s); }
  for(let i=0;i<3;i++){ const s=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.13,0.06),new THREE.MeshStandardMaterial({color:0x6b4423,roughness:0.7})); s.position.set(0,0.6+i*0.18,-0.32); g.add(s); }
  for(const dx of [-0.8,0.8]){ const l=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.45,0.5),new THREE.MeshStandardMaterial({color:0x2a2d33,metalness:0.5})); l.position.set(dx,0.22,0); g.add(l); }
  g.position.set(x,0,z); g.rotation.y=ry; mapGroup.add(g);
  const box=new THREE.Box3().setFromObject(g); colliders.push(box);
}
function addTrashCan(x,z){ const m=addBox(x,0.45,z,0.5,0.9,0.5,0x3a5a3a,{rough:0.7,metal:0.4}); }
function addPalletStack(x,z,ry=0){
  const g=new THREE.Group();
  for(let i=0;i<4;i++){
    const p=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.12,0.8),new THREE.MeshStandardMaterial({map:woodTex(),roughness:0.9}));
    p.position.y=0.07+i*0.14; p.rotation.y=ry+(Math.random()-0.5)*0.05; p.castShadow=true; g.add(p);
    const crate=new THREE.Mesh(new THREE.BoxGeometry(1,0.7,0.7),new THREE.MeshStandardMaterial({map:plateTex('#8a6a3a'),roughness:0.85}));
    crate.position.set(0,0.5+i*0.95,0); crate.rotation.y=ry; crate.castShadow=true; g.add(crate);
  }
  g.position.set(x,0,z); mapGroup.add(g); const box=new THREE.Box3().setFromObject(g); colliders.push(box);
}
function addStreetVendor(x,z,ry=0){
  const g=new THREE.Group();
  const cart=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.9,0.8),new THREE.MeshStandardMaterial({map:plateTex('#7a5a3a'),roughness:0.8,metalness:0.2}));
  cart.position.y=0.5; cart.castShadow=true; g.add(cart);
  const umb=new THREE.Mesh(new THREE.ConeGeometry(1.5,0.5,8),awning('#c23b22','#eee'));
  umb.position.y=2.2; g.add(umb);
  for(const dx of [-0.7,0.7]){ const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,2,6),new THREE.MeshStandardMaterial({color:0x888}));
    pole.position.set(dx,1,0); g.add(pole); }
  for(let i=0;i<5;i++){ const f=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,6),new THREE.MeshStandardMaterial({color:[0xd84a3a,0xe8b83a,0x6ab84a][i%3],roughness:0.6})); f.position.set(rand(-0.5,0.5),1.05,0.2); g.add(f); }
  g.position.set(x,0,z); g.rotation.y=ry; mapGroup.add(g); const box=new THREE.Box3().setFromObject(cart); colliders.push(box);
}
function addFireEscape(x,z,ry=0){
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0x3a3f46,roughness:0.7,metalness:0.5});
  for(let lv=0;lv<3;lv++){
    const plat=new THREE.Mesh(new THREE.BoxGeometry(3,0.08,1.2),mat); plat.position.set(0,3+lv*3.2,0); g.add(plat);
    for(let r=0;r<5;r++){ const bar=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.9,0.05),mat); bar.position.set(-1.4+r*0.7,3.5+lv*3.2,-0.55); g.add(bar); }
    const rail=new THREE.Mesh(new THREE.BoxGeometry(3,0.06,0.06),mat); rail.position.set(0,4+lv*3.2,-0.55); g.add(rail);
  }
  const lad=new THREE.Mesh(new THREE.BoxGeometry(0.7,9.4,0.06),mat); lad.position.set(1,4.9,0.6); lad.rotation.x=-0.15; g.add(lad);
  g.position.set(x,0,z); g.rotation.y=ry; mapGroup.add(g);
}
function addScaffold(x,z,ry=0){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0xb8862a,roughness:0.6,metalness:0.4});
  for(const dx of [-1.5,1.5]) for(const dz of [-1,1]){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,6,8),mat); pole.position.set(dx,3,dz); g.add(pole);
  }
  for(let lv=0;lv<3;lv++){ const plank=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.07,0.5),mat); plank.position.set(0,2+lv*1.8,0); g.add(plank); }
  g.position.set(x,0,z); g.rotation.y=ry; mapGroup.add(g); const box=new THREE.Box3().setFromObject(g); colliders.push(box);
}
function addPuddle(x,z,r=1.4){
  const m=new THREE.Mesh(new THREE.CircleGeometry(r,18),new THREE.MeshStandardMaterial({color:0x223040,roughness:0.05,metalness:0.7,transparent:true,opacity:0.7}));
  m.rotation.x=-Math.PI/2; m.position.set(x,0.03,z); m.scale.set(1,0.6+Math.random()*0.5,1); mapGroup.add(m);
}

function buildDowntown(){
  clearMap();
  baseSky(0x9fc3e8,30,140,0xfff2d9,1.7,[30,50,20]);
  groundPlane(groundAsphalt());
  // avenidas
  const roadM=new THREE.MeshStandardMaterial({map:roadStripeTex(),roughness:1});
  const r1=new THREE.Mesh(new THREE.PlaneGeometry(64,7),roadM); r1.rotation.x=-Math.PI/2; r1.position.set(0,0.02,0); r1.receiveShadow=true; mapGroup.add(r1);
  const r2=new THREE.Mesh(new THREE.PlaneGeometry(7,60),roadM.clone()); r2.rotation.x=-Math.PI/2; r2.rotation.z=Math.PI/2; r2.position.set(0,0.02,0); r2.receiveShadow=true; mapGroup.add(r2);
  // paso peatonal
  for(let i=0;i<6;i++){ const s=new THREE.Mesh(new THREE.PlaneGeometry(0.7,4), new THREE.MeshBasicMaterial({color:0xeeeeee})); s.rotation.x=-Math.PI/2; s.position.set(-4+i*1.6,0.03,6); mapGroup.add(s); }
  perimeterWalls(0x7a6a55);
  facadeRing([buildingTex('#5a6b7d'),buildingTex('#6b7d8a'),buildingTex('#4a5a6b'),buildingTex('#7d8a99')]);
  // autos cubriendo
  addCar(-8,3.5,0.1,0x8a1a1a); addCar(9,-3.5,-0.08,0x1a3a8a); addCar(-14,-12,1.57,0x3a3a3a); addCar(15,14,1.62,0xd8d8d8);
  // barricadas / sacos
  const C=0x8a7a5a;
  addBox(-5,0.6,10,3,1.2,1,C); addBox(5,0.6,-10,3,1.2,1,C);
  addBox(-18,1,6,2,2,6,0x5a5a5a); addBox(18,1,-6,2,2,6,0x5a5a5a);
  addBox(0,1.25,14,6,2.5,1.2,0x4a6b8a); addBox(0,1.25,-16,6,2.5,1.2,0x8a5a3a);
  addBox(-22,0.75,-2,2.5,1.5,2.5,0x6b7a4a); addBox(22,0.75,2,2.5,1.5,2.5,0x777066);
  for(const [x,z] of [[-14,4],[14,4],[-14,-4],[14,-4],[0,-20],[0,20]]) spawnBarrel(x,z);
  // semáforos con tres luces y visera
  for(const [x,z] of [[-5,5],[5,-5]]){
    visual(new THREE.CylinderGeometry(0.1,0.12,4.4,10), new THREE.MeshStandardMaterial({color:0x2a2d33,roughness:0.6,metalness:0.4}), x,2.2,z);
    visual(new THREE.BoxGeometry(0.34,0.28,0.34), new THREE.MeshStandardMaterial({color:0x2a2d33}), x,0.14,z);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.09,0.09),new THREE.MeshStandardMaterial({color:0x2a2d33}));
    arm.position.set(x,4.4,z); mapGroup.add(arm);
    const box=visual(new THREE.BoxGeometry(0.36,0.95,0.36), new THREE.MeshStandardMaterial({color:0x111318,roughness:0.5}), x,4.1,z);
    box.material.metalness=0.4;
    const cols=[0xff3333,0xffcc22,0x33ff55];
    cols.forEach((c,k)=>{ const l=new THREE.Mesh(new THREE.SphereGeometry(0.075,10,8),new THREE.MeshBasicMaterial({color:k===0?c:0x222222}));
      l.position.set(x,4.42-k*0.3,z+0.19); mapGroup.add(l); });
    // visera del semáforo
    const visor=new THREE.Mesh(new THREE.BoxGeometry(0.44,1.02,0.06),new THREE.MeshStandardMaterial({color:0x111318}));
    visor.position.set(x,4.1,z+0.2); mapGroup.add(visor);
  }
  // hidrantes
  for(const [x,z] of [[-3.4,5],[3.4,-5]]){
    const hyd=new THREE.Group();
    const b=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,0.6,10),new THREE.MeshStandardMaterial({color:0xc23b22,roughness:0.5,metalness:0.2})); b.position.y=0.3; b.castShadow=true; hyd.add(b);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8),new THREE.MeshStandardMaterial({color:0xc23b22})); cap.position.y=0.62; hyd.add(cap);
    for(const dx of [-0.2,0.2]){ const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.16,8),new THREE.MeshStandardMaterial({color:0x9aa0a8,metalness:0.7})); arm.rotation.z=Math.PI/2; arm.position.set(dx,0.42,0); hyd.add(arm); }
    hyd.position.set(x,0,z); mapGroup.add(hyd);
  }
  for(const [x,z] of [[-5,5],[5,-5]]){
    visual(new THREE.CylinderGeometry(0.1,0.1,4), new THREE.MeshStandardMaterial({color:0x222222}), x,2,z);
    const box=visual(new THREE.BoxGeometry(0.4,1,0.4), new THREE.MeshStandardMaterial({color:0x111111}), x,4.2,z);
    const lampM=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,8), new THREE.MeshBasicMaterial({color:0xff3333}));
    lampM.position.set(x,4.4,z+0.22); mapGroup.add(lampM);
  }
  for(const [x,z] of [[-28,-28],[28,-28],[-28,28],[28,28]]) lampPost(x,z);
  // ── detalles urbanos ──
  addStreetVendor(-6,9,0.3); addStreetVendor(11,-7,-0.4); addStreetVendor(-16,-18,1.2);
  addParkBench(-9,7,0); addParkBench(13,7,Math.PI); addParkBench(-9,-7,0);
  addTrashCan(-7,8.5); addTrashCan(12,6.5); addTrashCan(-18,4);
  addDumpster(-20,12,0.2); addDumpster(21,-13,-0.3);
  addPalletStack(-16,16,0.3); addPalletStack(17,19,-0.2);
  for(const [x,z] of [[-3.6,2.5],[3.6,-2.5],[-2.6,-9],[2.6,11]]) addCone(x,z);
  for(const [x,z,r] of [[-10,1.5,0],[10,-1.5,0],[-4,-14,Math.PI/2],[4,16,Math.PI/2]]) addJerseyBarrier(x,z,r);
  addSandbags(-12,10,0.2); addSandbags(13,-11,-0.2);
  addTrafficSign(-6.5,4.6,0,'stop'); addTrafficSign(6.5,-4.6,Math.PI,'info');
  addFireEscape(-30,-8,Math.PI/2); addFireEscape(30,10,-Math.PI/2); addFireEscape(-20,30,Math.PI);
  addScaffold(-28,16,0.4); addScaffold(26,-18,-0.3);
  addPuddle(-6,5,1.6); addPuddle(12,-6,1.3); addPuddle(2,-19,1.8); addPuddle(-19,9,1.2);
  // bordillos y cajas de correo
  for(const [x,z] of [[-24,20],[24,-20],[8,26],[-8,-26]]) addTrashCan(x,z);
  // rótulos luminosos de escaparate en las fachadas
  for(const [x,z,ry,col] of [[-38,-12,Math.PI/2,0xff8844],[38,4,-Math.PI/2,0x44ccff],[-12,34,0,0xffcc22]]){
    const sg=new THREE.Mesh(new THREE.PlaneGeometry(3.2,0.8),new THREE.MeshBasicMaterial({color:col}));
    sg.position.set(x,3.4,z); sg.rotation.y=ry; mapGroup.add(sg);
    const glow=new THREE.PointLight(col,6,12); glow.position.set(x,3.4,z); mapGroup.add(glow);
  }
}

function buildPort(){
  clearMap();
  baseSky(0xd8925a,25,120,0xffb36b,1.5,[45,18,10]);
  groundPlane(groundConcrete());
  perimeterWalls(0x5a4a3a);
  // bodegas al fondo (visuales)
  for(const [x,z,w] of [[-30,-38,24],[0,-40,30],[30,-38,24]]){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,9,12), new THREE.MeshStandardMaterial({map:containerTex('#7a6a4a'),roughness:0.8}));
    m.position.set(x,4.5,z); mapGroup.add(m);
  }
  // grúas siluetas
  for(const x of [-20,20]){
    visual(new THREE.BoxGeometry(1.5,22,1.5), new THREE.MeshStandardMaterial({color:0xb8541e}), x,11,-34);
    visual(new THREE.BoxGeometry(24,1.5,1.5), new THREE.MeshStandardMaterial({color:0xb8541e}), x,21,-28);
  }
  // contenedores como cobertura (algunos apilados)
  const cols=['#8a3a2a','#2a5a8a','#3a7a4a','#b8862a','#5a3a6a'];
  addContainer(-10,8,0,cols[0]); addContainer(10,8,0,cols[1]);
  addContainer(-10,-8,0,cols[2]); addContainer(10,-8,0,cols[3]);
  addContainer(-18,0,Math.PI/2,cols[4]); addContainer(18,0,Math.PI/2,cols[0]);
  addContainer(10,8,0,cols[2],3.9);
  addBox(0,1,0,8,2,1,0x6a6a6a); addBox(0,1.5,14,10,3,1,0x4a4a4a); addBox(0,1.5,-16,10,3,1,0x4a4a4a);
  addBox(-5,0.75,-20,5,1.5,4,0x7a5a3a); addBox(5,0.75,20,5,1.5,4,0x7a5a3a);
  // más contenedores y detalles portuarios
  addContainer(-26,-14,Math.PI/2,cols[1]); addContainer(26,16,Math.PI/2,cols[3]);
  addContainer(0,24,0,cols[4]); addContainer(-24,22,0,cols[0]); addContainer(24,-22,0,cols[2]);
  addContainer(-26,8,Math.PI/2,cols[2],3.9); addContainer(20,-8,0,cols[1],3.9);
  addPalletStack(-14,-16,0.4); addPalletStack(15,17,-0.5);
  addDumpster(-4,20,0); addDumpster(5,-21,0.2);
  for(const [x,z] of [[-6,6],[6,-6],[-16,10],[16,-10],[-2,-13],[2,13]]) addCone(x,z);
  for(const [x,z,r] of [[0,9,0],[0,-10,0],[-20,0,Math.PI/2],[20,0,Math.PI/2]]) addJerseyBarrier(x,z,r);
  addSandbags(-16,4,0.3); addSandbags(16,-4,-0.3);
  addPuddle(-8,-12,1.6); addPuddle(9,13,1.4); addPuddle(0,4,1.8);
  // detalle: grúa con cables y gancho
  for(const x of [-20,20]){
    const hook=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.07,6,12,Math.PI*1.5),new THREE.MeshStandardMaterial({color:0x6a6a6a,metalness:0.8,roughness:0.4}));
    hook.position.set(x+4,17,-28); mapGroup.add(hook);
    const cable=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,4,5),new THREE.MeshStandardMaterial({color:0x2a2d33}));
    cable.position.set(x+4,19,-28); mapGroup.add(cable);
  }
  // plumas / señales de puerto
  for(const [x,z] of [[-2,7],[2,-7]]){
    visual(new THREE.CylinderGeometry(0.08,0.08,4,8),new THREE.MeshStandardMaterial({color:0xdddddd,metalness:0.4}), x,2,z);
    const sg=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.03),new THREE.MeshStandardMaterial({color:0xddaa22,emissive:0x554400}));
    sg.position.set(x,3.6,z); mapGroup.add(sg);
  }
  for(const [x,z] of [[-14,4],[14,4],[-14,-4],[14,-4],[-24,12],[24,-12],[0,-22],[0,22]]) spawnBarrel(x,z);
  for(const [x,z] of [[-28,-28],[28,-28],[-28,28],[28,28]]) lampPost(x,z,0xffc080);
  addRooftopAC(0,-38,30,9);
}

function buildOldTown(){
  clearMap();
  baseSky(0xbcd3e8,30,140,0xfff5e0,1.55,[25,45,25]);
  groundPlane(groundCobble());
  perimeterWalls(0x9a8a6a);
  // iglesia al norte (fuera de la arena) con columnas, vitrales y campanas
  const churchM=new THREE.MeshStandardMaterial({map:brickTex('#d8cbaa','#c3b79f'),roughness:0.9});
  visual(new THREE.BoxGeometry(14,8,10), churchM, 0,4,-40);
  visual(new THREE.BoxGeometry(5,20,5), churchM, -4,10,-40);
  // arcos y columnas en la fachada
  for(const dx of [-5,5]) visual(new THREE.CylinderGeometry(0.7,0.8,8,10), new THREE.MeshStandardMaterial({color:0xcfc2a2,roughness:0.85}), dx,4,-34.6);
  for(const dx of [-3,0,3]){ const w=new THREE.Mesh(new THREE.CircleGeometry(0.7,16),new THREE.MeshBasicMaterial({color:[0xd84a6a,0x4a8ad8,0xe8c33a][(dx+3)/3]}));
    w.position.set(dx,4.6,-34.85); mapGroup.add(w);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.75,0.1,6,16),new THREE.MeshStandardMaterial({color:0xb8ab8c})); ring.position.set(dx,4.6,-34.8); mapGroup.add(ring); }
  // puerta de madera con herrajes
  const door=new THREE.Mesh(new THREE.BoxGeometry(2.6,4,0.2),new THREE.MeshStandardMaterial({map:woodTex('#5a3a22'),roughness:0.8}));
  door.position.set(0,2,-34.8); mapGroup.add(door);
  const arch=new THREE.Mesh(new THREE.TorusGeometry(1.3,0.22,8,18,Math.PI),new THREE.MeshStandardMaterial({color:0xc3b79f}));
  arch.position.set(0,4,-34.7); mapGroup.add(arch);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(4,4,4), new THREE.MeshStandardMaterial({color:0x8a3a2a}));
  roof.position.set(-4,22,-40); roof.rotation.y=Math.PI/4; mapGroup.add(roof);
  const clock=new THREE.Mesh(new THREE.CircleGeometry(1.2,20), new THREE.MeshBasicMaterial({color:0xf5f0dc}));
  clock.position.set(-4,16,-34.9); mapGroup.add(clock);
  const clockRing=new THREE.Mesh(new THREE.TorusGeometry(1.25,0.1,8,20),new THREE.MeshStandardMaterial({color:0x8a3a2a}));
  clockRing.position.set(-4,16,-34.85); mapGroup.add(clockRing);
  for(const a of [0.6,2.1]){ const h=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.9,0.04),new THREE.MeshBasicMaterial({color:0x222222}));
    h.position.set(-4+Math.cos(a)*0.55,16+Math.sin(a)*0.55,-34.8); h.rotation.z=a-Math.PI/2; mapGroup.add(h); }
  // casas con tejado alrededor: ventanas, balcones y buhardillas
  for(const [x,z,ry] of [[-42,-8,1.57],[42,-8,-1.57],[-42,12,1.57],[42,12,-1.57],[-18,42,0],[14,42,0]]){
    const wallC=[0xd8b98a,0xcbaa7d,0xe0cba0][Math.floor(Math.random()*3)];
    visual(new THREE.BoxGeometry(10,7,8), new THREE.MeshStandardMaterial({map:brickTex(wallC,'#b9ad9c'),roughness:0.9}), x,3.5,z,ry);
    const rf=new THREE.Mesh(new THREE.ConeGeometry(7.5,3,4), new THREE.MeshStandardMaterial({color:0x8a3a2a}));
    rf.position.set(x,8.5,z); rf.rotation.y=Math.PI/4+ry; mapGroup.add(rf);
    // ventanas y puerta en la fachada interior
    for(let r=0;r<2;r++) for(let c2=0;c2<3;c2++){
      const w=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.2,0.12),new THREE.MeshStandardMaterial({color:0x2a3038,roughness:0.3,metalness:0.4}));
      const ox=(c2-1)*2.8, oy=2.2+r*2.6;
      const dx2=Math.cos(ry)*(ox)+Math.sin(ry)*4.05, dz2=-Math.sin(ry)*(ox)+Math.cos(ry)*4.05;
      w.position.set(x+dx2,oy,z+dz2); w.rotation.y=ry; mapGroup.add(w);
      const fr=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.4,0.08),new THREE.MeshStandardMaterial({color:0xe8e2d0}));
      fr.position.copy(w.position); fr.rotation.y=ry; fr.position.addScaledVector(new THREE.Vector3(Math.sin(ry),0,Math.cos(ry)),-0.03); mapGroup.add(fr);
      if(r===1){ const bal=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.5),new THREE.MeshStandardMaterial({color:0x3a3f46,metalness:0.5}));
        bal.position.copy(w.position); bal.position.y-=0.7; bal.position.addScaledVector(new THREE.Vector3(Math.sin(ry),0,Math.cos(ry)),0.28); bal.rotation.y=ry; mapGroup.add(bal); }
    }
    const dr=new THREE.Mesh(new THREE.BoxGeometry(1.1,2.2,0.12),new THREE.MeshStandardMaterial({map:woodTex('#4a2f1a'),roughness:0.8}));
    const ddx=Math.sin(ry)*4.05, ddz=Math.cos(ry)*4.05;
    dr.position.set(x+ddx,1.1,z+ddz); dr.rotation.y=ry; mapGroup.add(dr);
    // buhardilla
    const dorm=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.4,1.6),new THREE.MeshStandardMaterial({color:wallC}));
    dorm.position.set(x+Math.sin(ry)*1.5,8.4,z+Math.cos(ry)*1.5); mapGroup.add(dorm);
  }
  // fuente central (cuatro muretes + agua + chorro)
  addBox(0,0.4,2.2,5,0.8,0.5,0x9a9a9a); addBox(0,0.4,-2.2,5,0.8,0.5,0x9a9a9a);
  addBox(2.2,0.4,0,0.5,0.8,4,0x9a9a9a); addBox(-2.2,0.4,0,0.5,0.8,4,0x9a9a9a);
  const water=new THREE.Mesh(new THREE.CircleGeometry(2,24), new THREE.MeshStandardMaterial({color:0x3a90c9,transparent:true,opacity:0.85,roughness:0.05,metalness:0.5,envMapIntensity:1.5}));
  water.rotation.x=-Math.PI/2; water.position.set(0,0.55,0); mapGroup.add(water);
  visual(new THREE.CylinderGeometry(0.4,0.5,2), new THREE.MeshStandardMaterial({color:0x9a9a9a,roughness:0.8}), 0,1,0);
  visual(new THREE.SphereGeometry(0.3,12,10), new THREE.MeshStandardMaterial({color:0xb8b8c0,metalness:0.7,roughness:0.3}), 0,2.2,0);
  const jet=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.09,1.1,8),new THREE.MeshStandardMaterial({color:0xaad8ff,transparent:true,opacity:0.6}));
  jet.position.set(0,2.9,0); mapGroup.add(jet);
  // puestos de mercado con toldo y puestos extra
  const awn1=awning('#b83a3a','#eeeeee'), awn2=awning('#3a6ab8','#eeeeee');
  marketStall(-12,10,awn1); marketStall(12,-10,awn2); marketStall(-12,-14,awn2); marketStall(12,14,awn1);
  addStreetVendor(-8,6,0.4); addStreetVendor(8,-6,-0.4);
  marketStall(-8,-2,awn2); marketStall(8,2,awn1);
  // muros de piedra / callejones con textura de ladrillo
  addBox(0,1.5,12,12,3,0.8,0xa89878,{mat:new THREE.MeshStandardMaterial({map:brickTex('#a89878','#8d8272'),roughness:0.95})});
  addBox(0,1.5,-14,12,3,0.8,0xa89878,{mat:new THREE.MeshStandardMaterial({map:brickTex('#a89878','#8d8272'),roughness:0.95})});
  addBox(-18,1.25,0,1.5,2.5,10,0xa89878); addBox(18,1.25,0,1.5,2.5,10,0xa89878);
  addBox(-6,0.6,18,4,1.2,2,0x8a7a5a); addBox(6,0.6,-18,4,1.2,2,0x8a7a5a);
  addJerseyBarrier(-4,16,0); addJerseyBarrier(4,-16,0);
  addSandbags(-10,14,0.2); addSandbags(10,-14,-0.2);
  addParkBench(-4,4,Math.PI/2); addParkBench(4,-4,-Math.PI/2); addParkBench(0,8,0);
  addTrashCan(-3,9); addTrashCan(3,-9);
  addPalletStack(-20,20,0.3); addPalletStack(21,-21,-0.4);
  addPuddle(-13,5,1.4); addPuddle(13,-5,1.5);
  // árboles con tronco, ramas y copas
  for(const [x,z] of [[-24,20],[24,20],[-24,-20],[24,-20],[-14,26],[14,-26]]){
    visual(new THREE.CylinderGeometry(0.25,0.4,3.4,10), new THREE.MeshStandardMaterial({map:woodTex('#5a3a22'),roughness:1}), x,1.7,z);
    for(const a of [0,2.1,4.2]) visual(new THREE.CylinderGeometry(0.08,0.12,1.6,6), new THREE.MeshStandardMaterial({color:0x5a3a22}), x+Math.cos(a)*0.5,3.1,z+Math.sin(a)*0.5,0).rotation.z=Math.cos(a)*0.5;
    visual(new THREE.SphereGeometry(1.9,12,10), new THREE.MeshStandardMaterial({color:0x3f7a2e,roughness:1}), x,4.6,z);
    visual(new THREE.SphereGeometry(1.3,10,8), new THREE.MeshStandardMaterial({color:0x4d8f38,roughness:1}), x+0.9,4.1,z+0.4);
    // alcorque de piedra
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.2,0.16,6,14),new THREE.MeshStandardMaterial({color:0x9a9a9a}));
    ring.rotation.x=Math.PI/2; ring.position.set(x,0.1,z); mapGroup.add(ring);
  }
  // maceteros con flores
  for(const [x,z] of [[-16,8],[16,-8],[-6,-18],[6,20]]){
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.45,0.7,10),new THREE.MeshStandardMaterial({map:brickTex('#a05a3a','#8a4a2a'),roughness:0.9}));
    pot.position.set(x,0.35,z); pot.castShadow=true; mapGroup.add(pot);
    for(let i=0;i<7;i++){ const fl=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),new THREE.MeshStandardMaterial({color:[0xe8556a,0xe8c33a,0xd8d8e8][i%3],roughness:0.7}));
      fl.position.set(x+rand(-0.35,0.35),0.8+Math.random()*0.3,z+rand(-0.35,0.35)); mapGroup.add(fl); }
    const box=new THREE.Box3().setFromObject(pot); colliders.push(box);
  }
  for(const [x,z] of [[-14,4],[14,4],[-14,-4],[14,-4]]) spawnBarrel(x,z);
  for(const [x,z] of [[-28,-28],[28,-28],[-28,28],[28,28]]) lampPost(x,z,0xffe8c0);
}
function awning(c1,c2){ return new THREE.MeshStandardMaterial({map:awningTex(c1,c2),roughness:0.9,side:THREE.DoubleSide}); }
function marketStall(x,z,awnMat){
  addBox(x,0.5,z,3,1,1.6,0x6b4a2a);
  const roof=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.4), awnMat);
  roof.position.set(x,2.4,z); roof.rotation.x=-0.25; roof.castShadow=true; mapGroup.add(roof);
  for(const [dx,dz] of [[-1.6,-1],[1.6,-1],[-1.6,1],[1.6,1]])
    visual(new THREE.CylinderGeometry(0.05,0.05,2.4), new THREE.MeshStandardMaterial({color:0x4a3520}), x+dx,1.2,z+dz);
}
function buildMap(name){
  if(name==='port') buildPort();
  else if(name==='oldtown') buildOldTown();
  else buildDowntown();
}

/* ================= ARMAS REALISTAS (modelado procedural) ================= */
const MAT = {
  metal: new THREE.MeshStandardMaterial({color:0x2a2e34,roughness:0.34,metalness:0.85,envMapIntensity:1.4}),
  poly: new THREE.MeshStandardMaterial({color:0x191b20,roughness:0.72,metalness:0.2,envMapIntensity:0.9}),
  steel: new THREE.MeshStandardMaterial({color:0xa8afb8,roughness:0.22,metalness:0.95,envMapIntensity:1.8}),
  wood: new THREE.MeshStandardMaterial({map:woodTex('#6b4423'),roughness:0.55,metalness:0.05}),
  tan: new THREE.MeshStandardMaterial({color:0x9a8a5a,roughness:0.7,metalness:0.1}),
  olive: new THREE.MeshStandardMaterial({color:0x4a5a3a,roughness:0.7,metalness:0.1}),
  glove: new THREE.MeshStandardMaterial({color:0x33302b,roughness:0.92,metalness:0.05}),
  red: new THREE.MeshBasicMaterial({color:0xff2222}),
  lens: new THREE.MeshStandardMaterial({color:0x0c1c2e,roughness:0.04,metalness:1,envMapIntensity:2.4}),
};
function part(parent,geo,mat,x,y,z,rx=0,rz=0){
  const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.rotation.x=rx; m.rotation.z=rz; parent.add(m); return m;
}
function sightMesh(g,id,isSniper){
  if(id==='iron'&&!isSniper){
    // alza y punto de mira con Derivatives of detail
    part(g,new THREE.BoxGeometry(0.022,0.05,0.022),MAT.metal,0,0.1,-0.32);
    part(g,new THREE.BoxGeometry(0.012,0.03,0.012),MAT.steel,0,0.128,-0.32);
    part(g,new THREE.BoxGeometry(0.055,0.042,0.02),MAT.metal,0,0.095,0.08);
    part(g,new THREE.BoxGeometry(0.05,0.012,0.026),MAT.metal,0,0.073,0.08);
    return;
  }
  if(id==='reddot'){
    part(g,new THREE.CylinderGeometry(0.035,0.035,0.09,14),MAT.metal,0,0.11,0.02,Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.032,0.032,0.004,14),MAT.lens,0,0.11,-0.026,Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.032,0.032,0.004,14),MAT.lens,0,0.11,0.066,Math.PI/2);
    part(g,new THREE.SphereGeometry(0.008,8,8),MAT.red,0,0.11,-0.028);
    part(g,new THREE.BoxGeometry(0.022,0.05,0.032),MAT.metal,0,0.07,0.02);
    part(g,new THREE.BoxGeometry(0.03,0.016,0.03),MAT.metal,0,0.135,0.02);
    return;
  }
  if(id==='holo'){
    part(g,new THREE.BoxGeometry(0.062,0.072,0.1),MAT.poly,0,0.115,0.02);
    part(g,new THREE.BoxGeometry(0.05,0.055,0.004),MAT.lens,0,0.118,-0.028);
    part(g,new THREE.SphereGeometry(0.007,8,8),MAT.red,0,0.12,0.02);
    part(g,new THREE.BoxGeometry(0.022,0.04,0.032),MAT.metal,0,0.06,0.02);
    return;
  }
  if(id==='prism'){
    part(g,new THREE.CylinderGeometry(0.036,0.036,0.13,14),MAT.metal,0,0.115,0.01,Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.03,0.03,0.004,14),MAT.lens,0,0.115,-0.054,Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.008,0.008,0.03,8),MAT.steel,0.036,0.115,0.01,0,Math.PI/2);
    part(g,new THREE.BoxGeometry(0.024,0.028,0.05),MAT.metal,0,0.08,0.03);
    return;
  }
  // acog / x4 / x8 / térmica / sniper: tubo con lentes, torretas y anillos
  const L=id==='x4'?0.24:id==='acog'?0.18:id==='x8'?0.32:id==='prismX'?0.2:0.26, R=id==='x8'?0.05:id==='x4'?0.045:0.038;
  part(g,new THREE.CylinderGeometry(R,R,L,16),MAT.metal,0,0.125,0,Math.PI/2);
  part(g,new THREE.CylinderGeometry(R*0.82,R*0.82,0.012,16),MAT.lens,0,0.125,-L/2,Math.PI/2);
  part(g,new THREE.CylinderGeometry(R*0.86,R*0.86,0.01,16),MAT.lens,0,0.125,L/2,Math.PI/2);
  // anillos de sujeción
  for(const dz of [-L*0.28,L*0.28]) part(g,new THREE.CylinderGeometry(R*1.12,R*1.12,0.026,16),MAT.poly,0,0.125,dz,Math.PI/2);
  // torretas de ajuste
  part(g,new THREE.CylinderGeometry(0.013,0.013,0.032,10),MAT.steel,0,0.155,0);
  part(g,new THREE.CylinderGeometry(0.013,0.013,0.032,10),MAT.steel,0.026,0.125,0,0,Math.PI/2);
  part(g,new THREE.CylinderGeometry(0.011,0.011,0.028,10),MAT.steel,0,-0.026,0);
  // montura al riel
  part(g,new THREE.BoxGeometry(0.026,0.032,0.062),MAT.metal,0,0.088,0.03);
  part(g,new THREE.BoxGeometry(0.026,0.032,0.062),MAT.metal,0,0.088,-0.05);
  // tapa del ocular
  part(g,new THREE.CylinderGeometry(R*1.05,R*1.05,0.018,14),MAT.poly,0,0.125,L/2+0.02,Math.PI/2);
}
function muzzleMesh(g,id,big=false){
  const s=big?1.5:1;
  if(id==='sup'||id==='heavysup'){
    const len=(id==='heavysup'?0.34:0.22)*s;
    part(g,new THREE.CylinderGeometry(0.032*s,0.032*s,len,14),MAT.metal,0,0.02,-0.72*s-len/2,Math.PI/2);
    for(let i=1;i<=3;i++) part(g,new THREE.CylinderGeometry(0.0345*s,0.0345*s,0.008,14),MAT.poly,0,0.02,-0.72*s-len*(i/4),Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.028*s,0.028*s,0.01,14),MAT.steel,0,0.02,-0.72*s-len-0.005,Math.PI/2);
  }
  else if(id==='comp'){ part(g,new THREE.BoxGeometry(0.05*s,0.05*s,0.09),MAT.steel,0,0.02,-0.72*s);
    for(const dx of [-0.016,0.016]) part(g,new THREE.BoxGeometry(0.008,0.056*s,0.03),MAT.metal,dx,0.02,-0.73*s); }
  else if(id==='flash'){ part(g,new THREE.CylinderGeometry(0.035*s,0.02*s,0.07,4),MAT.metal,0,0.02,-0.72*s,Math.PI/2); }
  else if(id==='brake'){
    part(g,new THREE.CylinderGeometry(0.04*s,0.04*s,0.1*s,12),MAT.steel,0,0.02,-0.73*s,Math.PI/2);
    for(let i=0;i<3;i++){ const a=i/3*Math.PI*2;
      part(g,new THREE.BoxGeometry(0.014,0.014,0.06*s),MAT.metal,Math.cos(a)*0.038*s,0.02+Math.sin(a)*0.038*s,-0.73*s); }
    part(g,new THREE.CylinderGeometry(0.045*s,0.045*s,0.012,12),MAT.poly,0,0.02,-0.78*s,Math.PI/2);
  }
  else if(id==='choke'){
    part(g,new THREE.CylinderGeometry(0.048*s,0.044*s,0.11*s,14),MAT.steel,0,0.02,-0.72*s,Math.PI/2);
    for(const dy of [-0.03,0,0.03]) part(g,new THREE.TorusGeometry(0.049*s,0.005,6,14),MAT.metal,0,0.02+dy,-0.72*s);
  }
  else if(id==='long'){
    part(g,new THREE.CylinderGeometry(0.022*s,0.02*s,0.2*s,14),MAT.steel,0,0.015,-0.8*s,Math.PI/2);
    for(let i=0;i<4;i++) part(g,new THREE.TorusGeometry(0.024*s,0.0035,6,12),MAT.metal,0,0.015,-0.74*s-i*0.045);
  }
  else part(g,new THREE.BoxGeometry(0.045*s,0.045*s,0.05),MAT.metal,0,0.02,-0.7*s);
}
function underMesh(g,id){
  if(id==='grip'){ part(g,new THREE.BoxGeometry(0.04,0.13,0.05),MAT.poly,0,-0.12,-0.22,0.15);
    part(g,new THREE.CylinderGeometry(0.016,0.016,0.06,8),MAT.metal,0,-0.06,-0.2,0.15); }
  else if(id==='angled'){ part(g,new THREE.BoxGeometry(0.038,0.11,0.05),MAT.poly,0.006,-0.11,-0.23,0.28,0.25);
    part(g,new THREE.CylinderGeometry(0.015,0.015,0.05,8),MAT.metal,0,-0.05,-0.2,0.2); }
  else if(id==='bipod'){
    part(g,new THREE.BoxGeometry(0.04,0.03,0.12),MAT.metal,0,-0.06,-0.3);
    part(g,new THREE.CylinderGeometry(0.008,0.008,0.2,6),MAT.steel,-0.05,-0.16,-0.3,0,0.35);
    part(g,new THREE.CylinderGeometry(0.008,0.008,0.2,6),MAT.steel,0.05,-0.16,-0.3,0,-0.35);
    for(const dx of [-0.076,0.076]) part(g,new THREE.SphereGeometry(0.014,8,6),MAT.poly,dx,-0.26,-0.34);
  }
  else if(id==='laser'){ part(g,new THREE.BoxGeometry(0.03,0.03,0.07),MAT.poly,0.045,-0.03,-0.3);
    part(g,new THREE.CylinderGeometry(0.008,0.008,0.012,8),MAT.red,0.045,-0.03,-0.34,Math.PI/2);
    part(g,new THREE.BoxGeometry(0.012,0.02,0.04),MAT.metal,0.045,-0.012,-0.28); }
  else if(id==='light'){ part(g,new THREE.CylinderGeometry(0.022,0.026,0.075,12),MAT.poly,0,-0.05,-0.31,Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.024,0.024,0.008,12),MAT.lens,0,-0.05,-0.35,Math.PI/2);
    part(g,new THREE.BoxGeometry(0.014,0.03,0.02),MAT.metal,0,-0.024,-0.28); }
  else if(id==='extmag'){ part(g,new THREE.BoxGeometry(0.062,0.19,0.085),MAT.poly,0,-0.145,-0.02,0.16);
    part(g,new THREE.BoxGeometry(0.07,0.016,0.095),MAT.poly,0,-0.245,-0.04,0.16); }
  else if(id==='stock'){ part(g,new THREE.BoxGeometry(0.03,0.05,0.16),MAT.metal,0.05,-0.01,0.3);
    part(g,new THREE.BoxGeometry(0.024,0.07,0.1),MAT.poly,0.05,-0.02,0.38); }
  else if(id==='cheek'){ part(g,new THREE.BoxGeometry(0.05,0.022,0.2),MAT.poly,0,0.055,0.32);
    part(g,new THREE.CylinderGeometry(0.012,0.012,0.05,8),MAT.steel,0.03,0.04,0.22,0,Math.PI/2); }
  else if(id==='brace'){ part(g,new THREE.BoxGeometry(0.055,0.05,0.12),MAT.steel,0,-0.055,0.38);
    part(g,new THREE.CylinderGeometry(0.016,0.016,0.09,10),MAT.steel,0,-0.03,0.4,Math.PI/2); }
  else if(id==='barrel'){ part(g,new THREE.CylinderGeometry(0.026,0.026,0.16,12),MAT.steel,0,0.015,-0.42,Math.PI/2);
    for(let i=0;i<3;i++) part(g,new THREE.TorusGeometry(0.028,0.004,6,12),MAT.metal,0,0.015,-0.38-i*0.05); }
  else if(id==='shell'){ part(g,new THREE.BoxGeometry(0.07,0.05,0.11),MAT.poly,0.04,-0.09,-0.02);
    part(g,new THREE.BoxGeometry(0.05,0.03,0.06),MAT.steel,0.04,-0.05,-0.02); }
}
function hands(g,withStock){
  // mano de apoyo en el guardamanos con dedos
  const support=new THREE.Group();
  part(support,new THREE.BoxGeometry(0.068,0.075,0.085),MAT.glove,0,-0.1,-0.24,0.15);
  for(let i=0;i<4;i++) part(support,new THREE.BoxGeometry(0.058,0.018,0.03),MAT.glove,0,-0.055,-0.265+i*0.016,0.15);
  part(support,new THREE.BoxGeometry(0.06,0.02,0.035),MAT.glove,0.03,-0.115,-0.2,0.6);
  part(support,new THREE.BoxGeometry(0.05,0.05,0.05),MAT.poly,0,-0.13,-0.205,0.15);
  g.add(support);
  // mano del gatillo con índice y pulgar
  const trig=new THREE.Group();
  part(trig,new THREE.BoxGeometry(0.07,0.085,0.095),MAT.glove,0,-0.135,0.15,0.28);
  part(trig,new THREE.BoxGeometry(0.02,0.055,0.02),MAT.glove,0.012,-0.085,0.105,0.28);
  part(trig,new THREE.BoxGeometry(0.022,0.03,0.045),MAT.glove,-0.028,-0.105,0.1,0.28);
  part(trig,new THREE.BoxGeometry(0.05,0.045,0.055),MAT.poly,0,-0.16,0.155,0.28);
  g.add(trig);
  if(withStock) part(g,new THREE.BoxGeometry(0.085,0.095,0.055),MAT.glove,0,-0.055,0.33,0.1);
}
function buildRealGun(w){
  const g=new THREE.Group();
  const fam=w.fam, v=w.vis, big=!!v.big;
  const acc=v.accent?new THREE.MeshStandardMaterial({color:v.accent,roughness:0.45,metalness:0.55,envMapIntensity:1.2}):MAT.poly;
  const woodM=v.wood?MAT.wood:(v.accent?acc:MAT.poly);
  const S=big?1.35:1;
  if(fam==='rifle'){
    part(g,new THREE.BoxGeometry(0.075*S,0.11*S,0.42*S),MAT.metal,0,0,0.05); // cajón de mecanismos
    part(g,new THREE.BoxGeometry(0.078*S,0.03*S,0.2*S),MAT.poly,0,0.045*S,0.06); // tapa del cajón
    part(g,new THREE.BoxGeometry(0.02*S,0.035*S,0.05*S),MAT.poly,0.042*S,0.02,0.14); // window de expulsión
    part(g,new THREE.BoxGeometry(0.02*S,0.035*S,0.05*S),MAT.poly,-0.042*S,0.02,0.14);
    part(g,new THREE.BoxGeometry(0.045*S,0.028*S,0.06*S),MAT.steel,0.055*S,0.01,0.02); // manija de carga
    part(g,new THREE.BoxGeometry(0.07*S,0.07*S,0.3*S),woodM,0,-0.005,-0.32); // guardamanos
    for(let i=0;i<6;i++) part(g,new THREE.BoxGeometry(0.076*S,0.008,0.02),MAT.metal,0,0.058*S,-0.16-i*0.055); // riel dentado
    for(let i=0;i<4;i++) part(g,new THREE.BoxGeometry(0.02,0.03,0.03),MAT.poly,0.038*S,-0.02,-0.22-i*0.07); // lateral del guardamanos
    part(g,new THREE.CylinderGeometry(0.02*S,0.02*S,0.22*S,12),MAT.steel,0,0.015,-0.6*S,Math.PI/2); // cañón
    part(g,new THREE.CylinderGeometry(0.023*S,0.023*S,0.05*S,12),MAT.metal,0,0.015,-0.68*S,Math.PI/2); // cámara de gas
    part(g,new THREE.BoxGeometry(0.012,0.045,0.03),MAT.metal,0,0.04,-0.58*S); // pestillo de gas
    part(g,new THREE.BoxGeometry(0.055*S,0.15*S,0.09),woodM,0,-0.12,0.02,0.3); // cargador curvo
    part(g,new THREE.BoxGeometry(0.06*S,0.02*S,0.095),MAT.poly,0,-0.045,0.055,0.3); // faldón del cargador
    part(g,new THREE.BoxGeometry(0.05*S,0.13*S,0.06),woodM,0,-0.11,0.2,0.35); // empuñadura
    part(g,new THREE.BoxGeometry(0.06*S,0.1*S,0.22*S),woodM,0,-0.01,0.36); // culata
    part(g,new THREE.BoxGeometry(0.05*S,0.03*S,0.1*S),woodM,0,0.055*S,0.4); // cheek rest
    part(g,new THREE.BoxGeometry(0.02,0.02,0.06),MAT.steel,0.045,0.03,0.05); // selector
    part(g,new THREE.BoxGeometry(0.03,0.02,0.1),MAT.metal,0,-0.065,-0.05); // gatillo+guardamonte
    part(g,new THREE.TorusGeometry(0.028,0.006,5,10,Math.PI),MAT.metal,0,-0.055,-0.055,0,Math.PI/2); // aro del guardamonte
    // tornillos y detalles
    for(const [dx,dy,dz] of [[0.039,0.02,-0.02],[-0.039,0.02,-0.02],[0.039,-0.03,0.1]]){
      const sc=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.006,6),MAT.steel);
      sc.rotation.z=Math.PI/2; sc.position.set(dx,dy,dz); g.add(sc); }
    // correa
    part(g,new THREE.BoxGeometry(0.012,0.03,0.02),MAT.steel,0.04,-0.04,0.3);
    hands(g,true);
  } else if(fam==='smg'||fam==='mpistol'){
    const compact=fam==='mpistol';
    part(g,new THREE.BoxGeometry(0.07,0.1,compact?0.3:0.4),MAT.metal,0,0,0.05);
    part(g,new THREE.BoxGeometry(0.018,0.04,0.05),MAT.poly,0.036,0.03,0.1);        // window de expulsión
    part(g,new THREE.BoxGeometry(0.04,0.024,0.05),MAT.steel,0,0.058,0.02);          // manija de carga
    part(g,new THREE.BoxGeometry(0.06,0.06,0.18),MAT.poly,0,-0.01,-0.25);
    part(g,new THREE.CylinderGeometry(0.018,0.018,0.16,12),MAT.steel,0,0.01,-0.42,Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.014,0.014,0.06,10),MAT.metal,0,0.01,-0.5,Math.PI/2);
    part(g,new THREE.BoxGeometry(0.05,compact?0.18:0.14,0.07),MAT.poly,0,-0.12,0.0,0.12); // cargador recto largo
    part(g,new THREE.BoxGeometry(0.054,0.016,0.075),MAT.poly,0,compact?-0.2:-0.185,0.0,0.12);
    part(g,new THREE.BoxGeometry(0.05,0.11,0.06),MAT.poly,0,-0.1,0.17,0.3);
    part(g,new THREE.BoxGeometry(0.03,0.02,0.09),MAT.metal,0,-0.055,-0.01);         // gatillo
    part(g,new THREE.TorusGeometry(0.026,0.006,5,10,Math.PI),MAT.metal,0,-0.05,-0.02,0,Math.PI/2);
    if(!compact){ part(g,new THREE.BoxGeometry(0.04,0.08,0.02),MAT.metal,0,0,0.3);
      part(g,new THREE.BoxGeometry(0.05,0.05,0.14),MAT.poly,0,-0.02,0.36);
      part(g,new THREE.BoxGeometry(0.055,0.09,0.05),MAT.poly,0,0.02,0.42);          // culata plegable
      part(g,new THREE.CylinderGeometry(0.014,0.014,0.06,8),MAT.poly,0.03,0.02,0.34); }
    for(let i=0;i<3;i++) part(g,new THREE.BoxGeometry(0.03,0.008,0.018),MAT.poly,0.03,-0.02,0.02-i*0.06);
    hands(g,!compact);
  } else if(fam==='shotgun'){
    part(g,new THREE.CylinderGeometry(0.035,0.035,0.5,14),MAT.metal,0,0.02,-0.25,Math.PI/2); // cañón
    part(g,new THREE.CylinderGeometry(0.028,0.028,0.4,12),MAT.steel,0,-0.045,-0.22,Math.PI/2); // tubo depósito
    part(g,new THREE.BoxGeometry(0.07,0.09,0.3),MAT.metal,0,0,0.1); // cajón
    part(g,new THREE.BoxGeometry(0.075,0.06,0.22),woodM,0,-0.04,-0.15); // corredera madera
    for(let i=0;i<5;i++) part(g,new THREE.BoxGeometry(0.008,0.05,0.02),MAT.poly,0.04,-0.04,-0.24+i*0.05);  // carril de cartuchos
    part(g,new THREE.BoxGeometry(0.06,0.1,0.2),woodM,0,-0.01,0.34); // culata
    part(g,new THREE.BoxGeometry(0.055,0.03,0.12),woodM,0,0.05,0.38); // cacha alta
    part(g,new THREE.BoxGeometry(0.05,0.02,0.09),MAT.poly,0,-0.1,0.02); // guardamonte
    part(g,new THREE.SphereGeometry(0.02,10,8),MAT.steel,0,0.06,-0.48); // punto de mira
    part(g,new THREE.CylinderGeometry(0.014,0.014,0.03,8),MAT.steel,0,0.045,0.2);
    hands(g,true);
  } else if(fam==='lmg'){
    part(g,new THREE.BoxGeometry(0.09,0.13,0.5),MAT.metal,0,0,0.05);
    part(g,new THREE.BoxGeometry(0.08,0.06,0.2),MAT.poly,0,0.09,0.0); // tapa cinta
    part(g,new THREE.BoxGeometry(0.05,0.05,0.04),MAT.poly,0,0.13,0.02);
    for(let i=0;i<8;i++) part(g,new THREE.BoxGeometry(0.03,0.012,0.012),MAT.steel,0,0.09,-0.06-i*0.018); // cinta
    part(g,new THREE.CylinderGeometry(0.022,0.022,0.35,12),MAT.steel,0,0.02,-0.5,Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.026,0.026,0.08,12),MAT.metal,0,0.02,-0.62,Math.PI/2);
    part(g,new THREE.BoxGeometry(0.09,0.05,0.16),MAT.poly,0,0.02,0.3); // culata plegable
    part(g,new THREE.CylinderGeometry(0.07,0.07,0.12,14),MAT.poly,0,-0.13,-0.05); // tambor
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; part(g,new THREE.CylinderGeometry(0.018,0.018,0.13,8),MAT.steel,Math.cos(a)*0.04,-0.13+Math.sin(a)*0.04,-0.05,0,0,Math.PI/2); }
    part(g,new THREE.BoxGeometry(0.05,0.11,0.06),MAT.poly,0,-0.11,0.2,0.3);
    part(g,new THREE.BoxGeometry(0.07,0.09,0.12),MAT.metal,0,-0.12,0.1); // pistolín
    part(g,new THREE.BoxGeometry(0.03,0.03,0.1),MAT.steel,0.05,0.06,0.06); // asa de carga
    hands(g,true);
  } else if(fam==='pistol'||fam==='bigpistol'){
    const B=fam==='bigpistol'?1.25:1;
    part(g,new THREE.BoxGeometry(0.05*B,0.06*B,0.24*B),MAT.metal,0,0.02,-0.05); // corredera
    for(let i=0;i<6;i++) part(g,new THREE.BoxGeometry(0.052*B,0.014,0.008),MAT.poly,0,0.045*B,-0.15+i*0.032); // seriación
    part(g,new THREE.BoxGeometry(0.045*B,0.05*B,0.22*B),acc,0,-0.03,-0.03); // armazón
    part(g,new THREE.BoxGeometry(0.048*B,0.12*B,0.07),acc,0,-0.1,0.06,0.25); // empuñadura
    for(let i=0;i<5;i++) part(g,new THREE.BoxGeometry(0.05*B,0.008,0.008),MAT.poly,0,-0.06-i*0.016,0.045+i*0.004,0.25); // estriado
    part(g,new THREE.CylinderGeometry(0.012*B,0.012*B,0.05,10),MAT.steel,0,0.055,-0.16); // cañón visible
    part(g,new THREE.BoxGeometry(0.015,0.02,0.015),MAT.metal,0,0.06,-0.02); // alza
    part(g,new THREE.BoxGeometry(0.008,0.014,0.012),MAT.red,0.009,0.062,-0.02); // punto rojo de la alza
    part(g,new THREE.BoxGeometry(0.02,0.015,0.05),MAT.metal,0,-0.05,-0.02); // gatillo
    part(g,new THREE.TorusGeometry(0.022,0.005,5,10,Math.PI),MAT.metal,0,-0.042,-0.028,0,Math.PI/2);
    part(g,new THREE.BoxGeometry(0.02,0.02,0.04),MAT.steel,0.03,0.005,0.0);   // martillo exterior
    part(g,new THREE.BoxGeometry(0.052*B,0.014,0.03),MAT.poly,0,0.045*B,0.02);  // riel superior
    part(g,new THREE.BoxGeometry(0.065*B,0.08*B,0.09),MAT.glove,0,-0.12,0.1,0.3); // mano
    part(g,new THREE.BoxGeometry(0.05*B,0.05*B,0.06),MAT.glove,0,-0.085,0.15,0.3); // dedos
  } else if(fam==='revolver'){
    part(g,new THREE.BoxGeometry(0.05,0.06,0.2),MAT.metal,0,0.02,0.0);
    part(g,new THREE.CylinderGeometry(0.045,0.045,0.09,14),MAT.steel,0,0.02,-0.06,Math.PI/2); // tambor
    part(g,new THREE.CylinderGeometry(0.016,0.016,0.05,10),MAT.poly,0,0.05,-0.06,Math.PI/2);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2;
      const ch=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011,0.04,8),MAT.poly);
      ch.position.set(Math.cos(a)*0.028,0.02+Math.sin(a)*0.028,-0.06); ch.rotation.z=a-Math.PI/2; g.add(ch); }
    part(g,new THREE.CylinderGeometry(0.018,0.018,0.22,12),MAT.metal,0,0.03,-0.22,Math.PI/2); // cañón
    part(g,new THREE.CylinderGeometry(0.02,0.02,0.04,10),MAT.poly,0,0.03,-0.11,Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.015,0.015,0.02,10),MAT.steel,0,0.052,-0.33,Math.PI/2); // bocacha
    part(g,new THREE.BoxGeometry(0.05,0.12,0.07),MAT.wood,0,-0.09,0.08,0.3); // cacha
    part(g,new THREE.BoxGeometry(0.03,0.03,0.1),MAT.wood,0,-0.06,0.2);       // empuñadura trasera
    part(g,new THREE.BoxGeometry(0.02,0.04,0.02),MAT.steel,0,0.05,0.06); // martillo
    part(g,new THREE.BoxGeometry(0.008,0.012,0.01),MAT.steel,0,0.075,0.06);
    part(g,new THREE.TorusGeometry(0.024,0.005,5,10,Math.PI),MAT.steel,0,-0.04,0.0,0,Math.PI/2);
    part(g,new THREE.BoxGeometry(0.065,0.08,0.09),MAT.glove,0,-0.11,0.1,0.3);
  } else { // bolt / dmr
    part(g,new THREE.BoxGeometry(0.07*S,0.1*S,0.4*S),MAT.metal,0,0,0.05);
    part(g,new THREE.BoxGeometry(0.074*S,0.028*S,0.18*S),MAT.poly,0,0.04*S,0.06);
    part(g,new THREE.BoxGeometry(0.065*S,0.07*S,0.35*S),acc,0,-0.005,-0.3); // guardamanos
    for(let i=0;i<5;i++) part(g,new THREE.BoxGeometry(0.02,0.03,0.03),MAT.poly,0.036*S,-0.02,-0.2-i*0.07);
    part(g,new THREE.CylinderGeometry(0.02*S,0.02*S,(fam==='dmr'?0.3:0.45)*S,14),MAT.steel,0,0.015,-0.62*S,Math.PI/2);
    part(g,new THREE.CylinderGeometry(0.026*S,0.026*S,0.07*S,12),MAT.metal,0,0.015,-0.74*S,Math.PI/2);
    part(g,new THREE.BoxGeometry(0.05*S,0.12*S,0.08),MAT.poly,0,-0.1,0.02,0.15); // cargador
    part(g,new THREE.BoxGeometry(0.05*S,0.12*S,0.06),MAT.poly,0,-0.1,0.2,0.3);
    part(g,new THREE.BoxGeometry(0.06*S,0.11*S,0.25*S),acc,0,-0.01,0.36); // culata
    part(g,new THREE.BoxGeometry(0.055*S,0.035*S,0.16*S),acc,0,0.055*S,0.34); // mentonera
    part(g,new THREE.CylinderGeometry(0.008,0.008,0.08,8),MAT.steel,0.05,0.03,0.08,0,Math.PI/2); // cerrojo
    part(g,new THREE.SphereGeometry(0.015,10,8),MAT.poly,0.09,0.03,0.08);
    part(g,new THREE.CylinderGeometry(0.01,0.01,0.02,8),MAT.red,0.1,0.042,0.08);
    part(g,new THREE.BoxGeometry(0.03,0.02,0.1),MAT.metal,0,-0.06,-0.02); // gatillo
    part(g,new THREE.TorusGeometry(0.028,0.006,5,10,Math.PI),MAT.metal,0,-0.052,-0.03,0,Math.PI/2);
    part(g,new THREE.BoxGeometry(0.024,0.05,0.05),MAT.poly,-0.04,0.01,0.14); // seguro de bolt
    part(g,new THREE.BoxGeometry(0.03,0.03,0.02),MAT.poly,0,0.055,0.44);     // cantonera
    hands(g,true);
  }
  sightMesh(g,w.sightId,(fam==='bolt'||fam==='dmr'));
  muzzleMesh(g,w.muzzleId,big);
  underMesh(g,w.tacId);
  if(w.laser){
    const lg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.045,-0.03,-0.34),new THREE.Vector3(0.045,-0.03,-30)]);
    const line=new THREE.Line(lg,new THREE.LineBasicMaterial({color:0xff2222,transparent:true,opacity:0.5}));
    g.add(line); g.userData.laser=line;
  }
  g.traverse(o=>{ if(o.isMesh){o.castShadow=false;o.receiveShadow=false;} });
  return g;
}
function buildGuns(){
  if(gunRig) camera.remove(gunRig);
  gunRig=new THREE.Group(); camera.add(gunRig); scene.add(camera);
  gunRig.position.set(0.28,-0.26,-0.55);
  gunGroups=[];
  WEAPONS.forEach((w,i)=>{
    const g=buildRealGun(w);
    g.visible=(i===curW); gunRig.add(g); gunGroups.push(g);
  });
  muzzleLight=new THREE.PointLight(0xffc266,0,9); muzzleLight.position.set(0.28,-0.2,-1.6); camera.add(muzzleLight);
  const cv=document.createElement('canvas'); cv.width=cv.height=64;
  const gg=cv.getContext('2d'); const gr=gg.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,'rgba(255,255,220,1)'); gr.addColorStop(0.4,'rgba(255,180,60,0.9)'); gr.addColorStop(1,'rgba(255,120,0,0)');
  gg.fillStyle=gr; gg.fillRect(0,0,64,64);
  muzzleSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));
  muzzleSprite.scale.set(0.001,0.001,1); muzzleSprite.position.set(0.28,-0.2,-1.8); camera.add(muzzleSprite);
  flashLight=new THREE.SpotLight(0xfff2cc,0,40,0.5,0.4); flashLight.position.set(0.2,-0.15,0); camera.add(flashLight);
  flashLight.target.position.set(0,0,-10); camera.add(flashLight.target);
  if(!scopeDiv){
    scopeDiv=document.createElement('div');
    scopeDiv.style.cssText='position:fixed;inset:0;display:none;z-index:11;pointer-events:none;background:radial-gradient(circle at center, transparent 26vh, rgba(0,0,0,0.99) 27vh);';
    scopeDiv.innerHTML='<div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#000"></div><div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#000"></div>';
    document.body.appendChild(scopeDiv);
  }
}

/* ================= ENEMIGOS ================= */
function makeEnemy(hpMul=1){
  const g=new THREE.Group();
  const uniform=new THREE.MeshStandardMaterial({color:[0x3a4a3a,0x4a3a3a,0x3a3a4a][Math.floor(Math.random()*3)],roughness:0.9});
  const skin=new THREE.MeshStandardMaterial({color:0xd9a877,roughness:0.8});
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.75,0.32),uniform); body.position.y=1.05; body.castShadow=true; g.add(body);
  const legs=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.7,0.28),new THREE.MeshStandardMaterial({color:0x2b2b2b})); legs.position.y=0.35; legs.castShadow=true; g.add(legs);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,12,10),skin); head.position.y=1.62; head.castShadow=true; g.add(head);
  const helm=new THREE.Mesh(new THREE.SphereGeometry(0.22,12,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x223322})); helm.position.y=1.64; g.add(helm);
  const gun=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.1,0.7),new THREE.MeshStandardMaterial({color:0x111111})); gun.position.set(0.25,1.15,-0.3); g.add(gun);
  const flash=new THREE.PointLight(0xffaa40,0,8); flash.position.set(0.25,1.15,-0.7); g.add(flash);
  const spots=[[-28,0],[28,0],[0,-26],[-20,-26],[20,-26]];
  const s=spots[Math.floor(Math.random()*spots.length)];
  g.position.set(s[0]+rand(-3,3),0,s[1]+rand(-2,2));
  scene.add(g);
  const e={mesh:g,body,head,gun,flash,hp:100*hpMul,maxHp:100*hpMul,speed:rand(2.2,3.4)+wave*0.12,
    shootT:rand(0.5,1.5),strafe:Math.random()>0.5?1:-1,strafeT:rand(1,3),hitT:0,dead:false,walkP:Math.random()*10};
  body.userData.enemy=e; body.userData.part='body';
  head.userData.enemy=e; head.userData.part='head';
  legs.userData.enemy=e; legs.userData.part='body';
  enemyMeshes.push(body,head,legs);
  enemies.push(e);
  return e;
}
function enemyDie(e,headshot){
  e.dead=true; kills++; const pts=headshot?150:100; score+=pts; playHit(true); chHit(true);
  feed(`${headshot?'🎯 HEADSHOT':'☠️'} Enemigo eliminado +${pts}`);
  $('hitmarker').classList.remove('show','kill'); void $('hitmarker').offsetWidth; $('hitmarker').classList.add('show','kill');
  blood(e.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)),26,0xaa1111);
  setTimeout(()=>{ scene.remove(e.mesh); enemies=enemies.filter(x=>x!==e); enemyMeshes=enemyMeshes.filter(m=>m.userData.enemy!==e); },1200);
  updateHUD();
}
function hasLOS(a,b){
  if(smokeBlocks(a,b)) return false;
  const dir=b.clone().sub(a); const dist=dir.length(); dir.normalize();
  const rc=new THREE.Raycaster(a,dir,0,dist);
  const hits=rc.intersectObjects(obstacleMeshes,false);
  return hits.length===0||hits[0].distance>=dist-0.3;
}
function smokeBlocks(a,b){
  if(!smokes.length) return false;
  const dir=b.clone().sub(a); const len=dir.length(); if(len<0.01) return false; dir.divideScalar(len);
  for(const s of smokes){
    const t=s.pos.clone().sub(a).dot(dir);
    if(t<0||t>len) continue;
    const closest=a.clone().addScaledVector(dir,t);
    if(closest.distanceTo(s.pos)<s.r*0.8) return true;
  }
  return false;
}

/* ================= PARTÍCULAS ================= */
function spawnP(pos,vel,color,size,life,grav=9){
  const m=new THREE.Mesh(new THREE.BoxGeometry(size,size,size),new THREE.MeshBasicMaterial({color}));
  m.position.copy(pos); scene.add(m); particles.push({m,v:vel.clone(),life,max:life,grav});
}
function blood(p,n,color){ for(let i=0;i<n;i++) spawnP(p,new THREE.Vector3(rand(-4,4),rand(1,6),rand(-4,4)),color,rand(0.03,0.09),rand(0.3,0.8)); }
function impactFX(p,n,color=0xcccccc){ for(let i=0;i<n;i++) spawnP(p,new THREE.Vector3(rand(-3,3),rand(1,5),rand(-3,3)),color,rand(0.02,0.06),rand(0.2,0.6)); }
function sparks(p){ for(let i=0;i<10;i++) spawnP(p,new THREE.Vector3(rand(-6,6),rand(0,6),rand(-6,6)),0xffdd55,0.03,rand(0.2,0.4),12); }
function smoke(p){ spawnP(p,new THREE.Vector3(rand(-0.3,0.3),rand(0.8,1.5),rand(-0.3,0.3)),0x888888,0.09,rand(0.5,0.9),-1); }
function shellEject(){
  const p=camera.localToWorld(new THREE.Vector3(0.32,-0.2,-0.6));
  spawnP(p,new THREE.Vector3(rand(1,2),rand(2,3),rand(-1,1)),0xd8a920,0.025,0.6,12);
}
function tracer(a,b,color=0xffe28a){
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color,transparent:true,opacity:0.95}));
  scene.add(line); tracers.push({line,life:0.07});
}
function explode(pos){
  playExplosion();
  player.shake=Math.min(1.2,player.shake+0.9);
  const flash=new THREE.PointLight(0xff8830,60,25); flash.position.copy(pos); scene.add(flash);
  setTimeout(()=>scene.remove(flash),250);
  for(let i=0;i<40;i++) spawnP(pos,new THREE.Vector3(rand(-10,10),rand(2,12),rand(-10,10)),[0xff6622,0xffaa33,0x555555][i%3],rand(0.06,0.16),rand(0.4,1));
  const d=player.pos.distanceTo(pos);
  if(d<9) damagePlayer(Math.round((9-d)*14),pos);
  for(const e of [...enemies]){ if(!e.dead){ const dd=e.mesh.position.distanceTo(pos); if(dd<8){ e.hp-=Math.round((8-dd)*28); e.hitT=0.15; blood(e.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)),10,0xaa1111); if(e.hp<=0) enemyDie(e,false); } } }
  for(const b of barrels){ if(!b.dead){ const dd=b.pos.distanceTo(pos); if(dd<6&&dd>0.1) b.hp-=100; } }
}

/* ================= ARROJADIZOS ================= */
const NADES=[
  {id:'frag',  n:'Fragmentación', icon:'💣', fuse:2.6, r:9.5, dmg:170, selfDmg:0.55, col:0x3f4a35, max:4, ammo:4},
  {id:'smoke', n:'Cortina de humo', icon:'🌫️', fuse:1.1, r:6.5, life:14, max:2, ammo:2},
  {id:'flash', n:'Apagallamas',    icon:'⚡', fuse:1.5, r:14, life:5, max:3, ammo:3},
  {id:'molly', n:'Molotov',        icon:'🔥', fuse:1.4, r:4.6, life:11, dps:34, max:2, ammo:2},
];
let nades=[], nadeLive=[], smokes=[], fires=[], nadeSel=0, nadeCool=0;
function initNades(){
  nades=NADES.map(d=>({...d,count:d.ammo}));
  nadeSel=0; buildNadeBar();
}
function buildNadeBar(){
  const bar=$('nade-bar'); if(!bar) return;
  bar.innerHTML=nades.map((d,i)=>`<span class="nade${i===nadeSel?' active':''}${d.count<=0?' empty':''}" data-n="${i}"><i>${d.icon}</i><b>${d.count}</b></span>`).join('');
}
function selectNade(i){
  if(i<0||i>=nades.length) return;
  nadeSel=i; buildNadeBar(); playClick(1500,0.04,0.1);
}
function throwNade(){
  if(!playing||paused||dead) return;
  const d=nades[nadeSel];
  if(!d) return;
  if(d.count<=0){ feed('⚠️ Sin '+d.n); playEmpty(); return; }
  if(nadeCool>0) return;
  d.count--; nadeCool=0.45; buildNadeBar(); playClick(700,0.05,0.12);
  const dir=camera.getWorldDirection(new THREE.Vector3());
  const g=new THREE.Group();
  if(d.id==='frag'){
    const b=new THREE.Mesh(new THREE.SphereGeometry(0.11,12,10),new THREE.MeshStandardMaterial({color:d.col,roughness:0.5,metalness:0.6}));
    b.castShadow=true; g.add(b);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(0.115,0.115,0.03,12),MAT.steel); band.position.y=0.02; g.add(band);
    const lever=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.07,0.02),MAT.steel); lever.position.set(0.06,0.09,0); g.add(lever);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.03,0.008,6,10),MAT.steel); ring.position.set(-0.05,0.11,0); ring.rotation.y=Math.PI/2; g.add(ring);
  } else if(d.id==='flash'){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.2,10),new THREE.MeshStandardMaterial({color:0x6a6a72,roughness:0.4,metalness:0.7}));
    g.add(b);
    for(let i=0;i<3;i++){ const k=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.01,0.02),MAT.poly); k.position.set(0,0.07,0); k.rotation.y=i*Math.PI*2/3; g.add(k); }
  } else {
    const b=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.05,0.19,10),new THREE.MeshStandardMaterial({color:d.id==='molly'?0x8a6a2a:0x7a8a9a,roughness:0.6,metalness:0.3}));
    g.add(b);
    const cloth=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.045,0.08,8),new THREE.MeshStandardMaterial({color:0xd8d0b0,roughness:1}));
    cloth.position.y=0.13; g.add(cloth);
  }
  g.position.copy(camera.position).add(dir.clone().multiplyScalar(0.5)).add(new THREE.Vector3(0,-0.12,0));
  scene.add(g);
  nadeLive.push({ type:d.id, def:d, mesh:g, vel:dir.clone().multiplyScalar(17).add(new THREE.Vector3(0,3.4,0)), fuse:d.fuse, bounced:0, spin:new THREE.Vector3(rand(-9,9),rand(-9,9),rand(-9,9)) });
}
function nadeBlast(type,pos,def){
  if(type==='frag'){
    playExplosion(); player.shake=Math.min(1.3,player.shake+1);
    const flash=new THREE.PointLight(0xffa040,90,30); flash.position.copy(pos); scene.add(flash);
    setTimeout(()=>scene.remove(flash),260);
    for(let i=0;i<46;i++) spawnP(pos,new THREE.Vector3(rand(-13,13),rand(1,14),rand(-13,13)),[0xff6622,0xffcc55,0x555555,0xdddddd][i%4],rand(0.05,0.18),rand(0.35,1.1));
    const r=def.r;
    const pd=player.pos.distanceTo(pos);
    if(pd<r) damagePlayer(Math.round((r-pd)*16*def.selfDmg),pos);
    for(const e of [...enemies]){
      if(e.dead) continue;
      const dd=e.mesh.position.distanceTo(pos);
      if(dd<r){ const blocked=!hasLOS(pos,e.mesh.position.clone().add(new THREE.Vector3(0,1.2,0))); // cobertura real
        const d2=Math.round((r-dd)*def.dmg/r*(blocked?0.35:1));
        if(d2>0){ e.hp-=d2; e.hitT=0.15; e.stun=Math.max(e.stun||0,0.5);
          blood(e.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)),10,0xaa1111);
          if(e.hp<=0) enemyDie(e,false); } }
    }
    for(const b of barrels){ if(!b.dead&&b.pos.distanceTo(pos)<r*0.8) b.hp-=200; }
  }
  else if(type==='flash'){
    playClick(3000,0.5,0.3); playExplosion();
    const pd=player.pos.distanceTo(pos);
    if(pd<def.r){ const f=1-pd/def.r; flashBang(clamp(f,0,1)); }
    for(const e of [...enemies]){ if(e.dead) continue; const dd=e.mesh.position.distanceTo(pos); if(dd<def.r){ e.blind=clamp(1.4+(def.r-dd)*0.35,1,5); } }
  }
  else if(type==='molly'){
    playExplosion();
    for(let i=0;i<30;i++) spawnP(pos,new THREE.Vector3(rand(-4,4),rand(2,7),rand(-4,4)),[0xff7722,0xffcc33,0x883300][i%3],rand(0.08,0.2),rand(0.5,1.3));
    fires.push({pos:pos.clone(),r:def.r,life:def.life,max:def.life,tick:0,dps:def.dps});
    const light=new THREE.PointLight(0xff7730,26,16); light.position.copy(pos).add(new THREE.Vector3(0,1,0)); scene.add(light);
    setTimeout(()=>scene.remove(light),600);
  }
  else if(type==='smoke'){
    const grp=new THREE.Group(); grp.position.copy(pos); scene.add(grp);
    const puffs=[];
    for(let i=0;i<26;i++){
      const m=new THREE.Mesh(new THREE.SphereGeometry(rand(0.7,1.5),10,8),new THREE.MeshStandardMaterial({color:0xd8d8dc,transparent:true,opacity:0.55,roughness:1,depthWrite:false}));
      m.position.set(rand(-2.4,2.4),rand(0.2,2.4),rand(-2.4,2.4)); m.castShadow=false; grp.add(m); puffs.push({m,ph:Math.random()*6,v:rand(0.05,0.2)});
    }
    smokes.push({grp,puffs,pos:pos.clone(),r:def.r,life:def.life,max:def.life});
  }
}
let flashT=0;
function flashBang(power){
  flashT=clamp(flashT+power*4.2,0,4.2);
  playHurt();
}
function updateNades(dt){
  if(nadeCool>0) nadeCool-=dt;
  for(let i=nadeLive.length-1;i>=0;i--){
    const n=nadeLive[i];
    n.fuse-=dt;
    n.vel.y-=20*dt;
    const p=n.mesh.position;
    p.addScaledVector(n.vel,dt);
    n.mesh.rotation.x+=n.spin.x*dt; n.mesh.rotation.y+=n.spin.y*dt; n.mesh.rotation.z+=n.spin.z*dt;
    let bounced=false;
    if(p.y<0.12){ p.y=0.12; n.vel.y=Math.abs(n.vel.y)*0.32; n.vel.x*=0.62; n.vel.z*=0.62; bounced=true; }
    for(const b of colliders){
      if(p.x>b.min.x&&p.x<b.max.x&&p.z>b.min.z&&p.z<b.max.z&&p.y<b.max.y&&p.y+0.1>b.min.y){
        const dxl=p.x-b.min.x, dxr=b.max.x-p.x, dzl=p.z-b.min.z, dzr=b.max.z-p.z;
        const m=Math.min(dxl,dxr,dzl,dzr);
        if(m===dxl) n.vel.x=-Math.abs(n.vel.x)*0.4; else if(m===dxr) n.vel.x=Math.abs(n.vel.x)*0.4;
        else if(m===dzl) n.vel.z=-Math.abs(n.vel.z)*0.4; else n.vel.z=Math.abs(n.vel.z)*0.4;
        bounced=true;
      }
    }
    // luz de aviso parpadeante
    if(n.fuse<1.2&&Math.sin(elapsed*40)>0){
      if(!n.glow){ n.glow=new THREE.PointLight(n.type==='molly'?0xff6622:0xff3333,3,4); n.mesh.add(n.glow); }
      n.glow.intensity=3;
    }
    if(n.fuse<=0){
      nadeBlast(n.type,p.clone(),n.def);
      scene.remove(n.mesh); nadeLive.splice(i,1);
    } else if(bounced&&n.bounced===0){ n.bounced=1; playClick(400,0.05,0.12); }
  }
  // humo
  for(let i=smokes.length-1;i>=0;i--){
    const s=smokes[i]; s.life-=dt;
    const k=clamp(s.life/s.max,0,1);
    for(const p of s.puffs){ p.m.position.y+=p.v*dt; p.m.position.x+=Math.sin(elapsed*0.8+p.ph)*0.25*dt; p.m.scale.setScalar(1+(1-k)*1.8); p.m.material.opacity=0.6*k; }
    if(s.life<=0){ scene.remove(s.grp); smokes.splice(i,1); }
  }
  // fuego
  for(let i=fires.length-1;i>=0;i--){
    const f=fires[i]; f.life-=dt; f.tick-=dt;
    if(f.tick<=0){
      f.tick=0.1;
      for(let k=0;k<2;k++) spawnP(f.pos.clone().add(new THREE.Vector3(rand(-f.r*0.7,f.r*0.7),rand(0,0.6),rand(-f.r*0.7,f.r*0.7))),new THREE.Vector3(rand(-0.4,0.4),rand(1.4,2.6),rand(-0.4,0.4)),[0xff7722,0xffdd55][k%2],rand(0.1,0.24),0.55,-1.5);
      for(const e of enemies){ if(e.dead) continue;
        const dd=e.mesh.position.distanceTo(f.pos);
        if(dd<f.r){ e.hp-=f.dps*0.1; e.hitT=0.12; if(e.hp<=0) enemyDie(e,false); } }
      if(player.pos.distanceTo(f.pos)<f.r*0.55&&Math.random()<0.5) damagePlayer(3,f.pos);
    }
    if(f.life<=0){ scene.remove(f); fires.splice(i,1); }
  }
  // apagallamas
  if(flashT>0){ flashT=Math.max(0,flashT-dt*0.85); $('flash-overlay').style.opacity=(flashT/4.2)*0.95; }
  else $('flash-overlay').style.opacity=0;
}


/* ================= DAÑO / HUD ================= */
function damagePlayer(n,from){
  if(dead||!playing) return;
  player.hp-=n; player.lastDamage=elapsed; playHurt(); player.shake=Math.min(1,player.shake+0.35);
  $('damage-vignette').style.opacity=0.9; setTimeout(()=>$('damage-vignette').style.opacity=0,180);
  if(player.hp<=0){ player.hp=0; gameOver(); }
  updateHUD();
}
function feed(t){ const d=document.createElement('div'); d.textContent=t; $('killfeed').prepend(d); while($('killfeed').children.length>5)$('killfeed').lastChild.remove(); setTimeout(()=>d.remove(),4500); }
function updateHUD(){
  const w=WEAPONS[curW]; if(!w) return;
  $('mag').textContent=w.inMag; $('reserve').textContent=w.reserve;
  $('weapon-name').textContent=w.name+(reloading>0?' — RECARGANDO':'');
  $('hp-fill').style.width=(player.hp/player.maxHp*100)+'%';
  $('hp-fill').style.background=player.hp>60?'linear-gradient(90deg,#2ecc71,#a9ff6a)':player.hp>30?'linear-gradient(90deg,#f39c12,#ffe27a)':'linear-gradient(90deg,#e74c3c,#ff8a8a)';
  $('hp-text').textContent=Math.ceil(player.hp);
  $('wave').textContent=Math.max(1,wave); $('kills').textContent=kills; $('score').textContent=score;
  $('enemies-left').textContent=enemies.filter(e=>!e.dead).length+toSpawn;
  document.querySelectorAll('.slot').forEach((s,i)=>{ s.classList.toggle('active',i===curW); if(WEAPONS[i]) s.textContent=(i+1)+' '+WEAPONS[i].name; });
  const mm=Math.floor(elapsed/60), ss=Math.floor(elapsed%60);
  $('timer').textContent=`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}
function showMsg(t,ms=2200){ $('message').textContent=t; clearTimeout(showMsg._t); if(ms) showMsg._t=setTimeout(()=>$('message').textContent='',ms); }

/* ============ MIRA DINÁMICA (se mueve con el personaje) ============ */
const CH={t:null,b:null,l:null,r:null,dot:null};
function cacheCrosshair(){
  const c=$('crosshair');
  CH.t=c.querySelector('.t'); CH.b=c.querySelector('.b'); CH.l=c.querySelector('.l.l'); CH.r=c.querySelector('.l.r'); CH.dot=c.querySelector('.dot');
}
function applyCrosshair(gap,ads){
  if(!CH.t) cacheCrosshair();
  const g=gap.toFixed(1), len=ads?7:12;
  CH.t.style.transform=`translate(-50%,-50%) translateY(${-(gap+len)}px)`; CH.t.style.height=len+'px';
  CH.b.style.transform=`translate(-50%,-50%) translateY(${gap+len}px)`; CH.b.style.height=len+'px';
  CH.l.style.transform=`translate(-50%,-50%) translateX(${-(gap+len)}px)`; CH.l.style.width=len+'px';
  CH.r.style.transform=`translate(-50%,-50%) translateX(${gap+len}px)`; CH.r.style.width=len+'px';
  CH.dot.style.opacity=ads?0.35:1;
}
function chHit(kill){
  $('crosshair').classList.add('hit'); chCool=kill?0.3:0.12;
  chBloom=Math.min(26,chBloom+(kill?14:7));
}

/* ================= DISPARO ================= */
const ray=new THREE.Raycaster();
function shoot(){
  const w=WEAPONS[curW]; if(!w) return;
  const now=performance.now()/1000, interval=60/w.rpm;
  if(now-lastShot<interval||reloading>0) return;
  if(w.inMag<=0){ playEmpty(); startReload(); return; }
  lastShot=now; w.inMag--;
  const crouchBonus=(w.bipod&&player.crouch&&player.grounded);
  const kickEff=w.kick*(crouchBonus?0.65:1)*(player.ads?0.5:1);
  playShot(w.sound,w.noise<=0,w.noise>0);
  muzzleLight.intensity=4*w.flashMul; muzzleSprite.scale.set(0.5*w.flashMul+0.001,0.5*w.flashMul+0.001,1);
  setTimeout(()=>{ muzzleLight.intensity=0; muzzleSprite.scale.set(0.001,0.001,1); },50);
  player.pitch+=kickEff; player.shake=Math.min(0.6,player.shake+kickEff*3);
  // el retroceso acumulado se recupera: accessorio "corrector" lo hace más rápido
  recoilPend+=kickEff; recoilPend=Math.min(recoilPend,0.34);
  chBloom=Math.min(34,chBloom+4+w.kick*260);
  gunRig.position.z+=0.09; gunRig.rotation.x-=kickEff*7; shellEject();
  if(Math.random()<0.35) smoke(camera.localToWorld(new THREE.Vector3(0.28,-0.15,-1.7)));
  let spread=(player.ads?w.spreadAds:w.spreadHip)*(player.sprint?2:1)*(player.grounded?1:1.8);
  if(crouchBonus) spread*=0.55;
  const muz=camera.localToWorld(new THREE.Vector3(0.28,-0.2,-1.6));
  const origin=camera.getWorldPosition(new THREE.Vector3());
  const n=w.pellets, tracersToDraw=Math.min(n,3);
  for(let p=0;p<n;p++){
    const dir=new THREE.Vector3(rand(-spread,spread),rand(-spread,spread),-1).normalize().applyQuaternion(camera.quaternion);
    ray.set(origin,dir); ray.far=w.range;
    const hits=ray.intersectObjects([...enemyMeshes,...obstacleMeshes],false);
    let end=origin.clone().add(dir.clone().multiplyScalar(w.range));
    if(hits.length){
      const h=hits[0]; end=h.point.clone();
      const ud=h.object.userData;
      if(ud.enemy&&!ud.enemy.dead){
        const e=ud.enemy, head=ud.part==='head';
        let dmg=w.damage*(head?w.headMul:1)*clamp(1-h.distance/w.range*0.5,0.4,1)/ (n>1?1:n);
        if(n>1){ // escopeta: el choke agrupa el patrón y aguanta más distancia
          dmg=w.damage*(head?1.5:1)*clamp(1-h.distance/w.range*0.7,0.2,1);
          dmg*=(1+(w.choke||0)*(1-clamp(h.distance/(w.range*0.75),0,1)));
        }
        e.hp-=dmg; e.hitT=0.15;
        blood(h.point,head?14:8,0xbb1515);
        $('hitmarker').classList.remove('show'); void $('hitmarker').offsetWidth; $('hitmarker').classList.add('show');
        chHit(false);
        playHit(false);
        if(e.hp<=0) enemyDie(e,head&&n===1);
      } else if(ud.barrel&&!ud.barrel.dead){
        ud.barrel.hp-=w.damage; sparks(h.point); impactFX(h.point,5);
        if(ud.barrel.hp<=0&&!ud.barrel.dead){ ud.barrel.dead=true; scene.remove(ud.barrel.mesh); explode(ud.barrel.pos.clone()); }
      } else { impactFX(h.point,7); sparks(h.point); }
    }
    if(p<tracersToDraw) tracer(muz,end);
  }
  if(w.sound==='sniper'||w.sound==='shotgun') player.shake+=0.4;
  // el ruido del disparo alerta a los enemigos cercanos (o los distrae si es silencioso)
  alertEnemies(w.noise);
  if(w.inMag===0) setTimeout(()=>{ if(WEAPONS[curW]===w&&w.inMag===0&&w.reserve>0) startReload(); },350);
  updateHUD();
}
function alertEnemies(noise){
  const r=22+(noise||0)*9;
  for(const e of enemies){
    if(e.dead) continue;
    const d=e.mesh.position.distanceTo(player.pos);
    if(d<r) e.shootT=Math.min(e.shootT,0.25+Math.random()*0.4);
  }
}
function startReload(){
  const w=WEAPONS[curW]; if(!w||reloading>0||w.inMag>=w.magSize||w.reserve<=0) return;
  reloading=w.reloadT; playReload(); updateHUD();
}
function switchW(i){
  if(i===curW||reloading>0||!WEAPONS[i]) return;
  if(WEAPONS[i].inMag<=0&&WEAPONS[i].reserve<=0){ feed('⚠️ Sin munición en esa arma'); return; }
  curW=i; gunGroups.forEach((g,k)=>g.visible=(k===curW));
  playClick(1000,0.05); updateHUD();
}

/* ================= COLISIÓN / MINIMAPA ================= */
function collide(pos){
  for(const b of colliders){
    const min=b.min,max=b.max;
    if(pos.x>min.x-player.radius&&pos.x<max.x+player.radius&&pos.z>min.z-player.radius&&pos.z<max.z+player.radius){
      const eyeY=pos.y, feetY=pos.y-player.eyeH;
      if(feetY<max.y-0.05&&eyeY>min.y+0.05){
        const dx1=(max.x+player.radius)-pos.x, dx2=pos.x-(min.x-player.radius);
        const dz1=(max.z+player.radius)-pos.z, dz2=pos.z-(min.z-player.radius);
        const m=Math.min(dx1,dx2,dz1,dz2);
        if(m===dx1)pos.x=max.x+player.radius; else if(m===dx2)pos.x=min.x-player.radius;
        else if(m===dz1)pos.z=max.z+player.radius; else pos.z=min.z-player.radius;
      }
    }
  }
  pos.x=clamp(pos.x,-31,31); pos.z=clamp(pos.z,-29,29);
}
function drawMini(){
  const c=$('minimap'), g=c.getContext('2d');
  g.clearRect(0,0,150,150); g.fillStyle='rgba(10,15,10,0.9)'; g.fillRect(0,0,150,150);
  g.strokeStyle='rgba(255,255,255,0.3)'; g.strokeRect(4,4,142,142);
  const px=x=>(x+32)/64*142+4, pz=z=>(z+30)/60*142+4;
  for(const b of barrels){ if(!b.dead){ g.fillStyle='#ff8c00'; g.fillRect(px(b.pos.x)-2,pz(b.pos.z)-2,4,4); } }
  for(const e of enemies){ if(!e.dead){ g.fillStyle='#ff3333'; g.beginPath(); g.arc(px(e.mesh.position.x),pz(e.mesh.position.z),3.5,0,7); g.fill(); } }
  const cx=px(player.pos.x), cz=pz(player.pos.z);
  g.save(); g.translate(cx,cz); g.rotate(-player.yaw+Math.PI);
  g.fillStyle='#4dff6a'; g.beginPath(); g.moveTo(0,-6); g.lineTo(-4,4); g.lineTo(4,4); g.closePath(); g.fill(); g.restore();
}

/* ================= OLEADAS / FLUJO ================= */
function nextWave(){
  wave++; toSpawn=2+wave*2; spawnTimer=0; waveBreak=0;
  nextWave.hpMul=1+(wave-1)*0.15;
  showMsg(`OLEADA ${wave} — ¡ENEMIGOS!`);
  feed(`🪖 Oleada ${wave}: ${toSpawn} enemigos`);
  updateHUD();
}
function gameOver(){
  dead=true; playing=false;
  if(document.exitPointerLock) document.exitPointerLock();
  $('touchUI').classList.add('hidden');
  $('gameover').classList.remove('hidden');
  $('go-stats').textContent=`${MAP_NAMES[loadout.map]} • Oleada ${wave} • ${kills} bajas • ${score} pts • ${$('timer').textContent}`;
}
function fullReset(){ location.reload(); }

function buildLoadout(){
  const get=id=>WEAPONS_DB.find(w=>w.id===id);
  WEAPONS=[ buildRuntimeWeapon(get(loadout.prim),loadout.attach.prim),
            buildRuntimeWeapon(get(loadout.sec),loadout.attach.sec),
            buildRuntimeWeapon(get(loadout.snip),loadout.attach.snip) ];
  curW=0; reloading=0;
}

/* ================= MENÚ: armería, mapas, armero, controles ================= */
function statLine(d){ return `${d.mag} • ${d.auto?'AUTO':'SEMI'} • ${d.dmg}${d.pel?'x'+d.pel:''} • ${d.rpm}rpm`; }
function buildArmory(){
  const groups={prim:$('primList'),sec:$('secList'),snip:$('snipList')};
  const slotOf={prim:'prim',sec:'sec',snip:'snip'};
  for(const cat of ['prim','sec','snip']){
    groups[cat].innerHTML='';
    WEAPONS_DB.filter(w=>w.cat===cat).forEach(d=>{
      const b=document.createElement('button');
      b.className='arm-btn'+(loadout[slotOf[cat]]===d.id?' active':'');
      b.innerHTML=`<b>${d.name}</b><small>${statLine(d)}</small>`;
      b.onclick=()=>{ loadout[slotOf[cat]]=d.id; buildArmory(); buildGunsmith(); updateLoadoutLine(); refreshSummary(); ac(); playClick(1200,0.05); };
      groups[cat].appendChild(b);
    });
  }
}
function updateLoadoutLine(){
  const get=id=>WEAPONS_DB.find(w=>w.id===id).name;
  $('loPrim').textContent=get(loadout.prim); $('loSec').textContent=get(loadout.sec); $('loSnip').textContent=get(loadout.snip);
}
function buildGunsmith(){
  const gs=$('gunsmith'); gs.innerHTML='';
  const slots=[['prim','PRIMARIA'],['sec','SECUNDARIA'],['snip','SNIPER']];
  const get=id=>WEAPONS_DB.find(w=>w.id===id).name;
  for(const [slot,label] of slots){
    const box=document.createElement('div'); box.className='gs-block';
    box.innerHTML=`<b>${label}: ${get(loadout[slot])}</b>`;
    const rows=[['sight','Mira',SIGHTS],['muzzle','Boca',MUZZLES],['tac','Táctico',TACS]];
    for(const [key,lab,opts] of rows){
      const row=document.createElement('div'); row.className='gs-row';
      row.innerHTML=`<span>${lab}</span>`;
      opts.forEach(o=>{
        const b=document.createElement('button');
        b.className='gs-opt'+(loadout.attach[slot][key]===o.id?' active':'');
        b.textContent=o.n; b.title=o.n;
        b.onclick=()=>{ loadout.attach[slot][key]=o.id; buildGunsmith(); ac(); playClick(1400,0.04); };
        row.appendChild(b);
      });
      box.appendChild(row);
    }
    gs.appendChild(box);
  }
}
const TABS=['play','maps','arsenal','armory','controls'];
let activeTab='play';
function attachName(slot,key,list){
  const id=loadout.attach[slot][key];
  const o=list.find(x=>x.id===id);
  return o?o.n:'—';
}
function refreshSummary(){
  const getName=id=>WEAPONS_DB.find(w=>w.id===id).name;
  $('sumMap').textContent=MAP_NAMES[loadout.map];
  $('sumWeapons').innerHTML=`<b>${getName(loadout.prim)}</b> • <b>${getName(loadout.sec)}</b> • <b>${getName(loadout.snip)}</b>`;
  $('sumAttach').innerHTML=`AK: ${attachName('prim','sight',SIGHTS)}, ${attachName('prim','muzzle',MUZZLES)}, ${attachName('prim','tac',TACS)}`;
  $('tabMapName').textContent=MAP_NAMES[loadout.map];
  $('tabArsName').textContent=`${getName(loadout.prim)} • ${getName(loadout.sec)} • ${getName(loadout.snip)}`;
}
function switchTab(name){
  if(!TABS.includes(name)) name='play';
  activeTab=name;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  TABS.forEach(t=>{ const p=$('tab-'+t); if(p) p.classList.toggle('active',t===name); });
  refreshSummary();
  try{ ac(); playClick(1300,0.05); }catch(_){}
}
function wireMenu(){
  document.querySelectorAll('.tab-btn').forEach(b=>{
    b.onclick=()=>switchTab(b.dataset.tab);
  });
  document.querySelectorAll('.map-card').forEach(c=>{
    c.onclick=()=>{ document.querySelectorAll('.map-card').forEach(x=>x.classList.remove('active')); c.classList.add('active'); loadout.map=c.dataset.map; refreshSummary(); ac(); playClick(1000,0.05); };
  });
  $('ctrlMode').onchange=e=>{ loadout.ctrl.mode=e.target.value; };
  $('sens').oninput=e=>{ loadout.ctrl.sens=parseFloat(e.target.value); $('sensVal').textContent=loadout.ctrl.sens.toFixed(1); };
  $('invertY').onchange=e=>{ loadout.ctrl.invert=e.target.checked; };
  buildArmory(); buildGunsmith(); updateLoadoutLine(); refreshSummary(); switchTab(activeTab);
}

/* ================= TÁCTIL ================= */
function setupTouch(){
  const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
  if(!isTouch) return;
  const joyEl=$('joy'), knob=$('knob');
  const jr=()=>{ const r=joyEl.getBoundingClientRect(); return {x:r.left+60,y:r.top+60}; };
  joyEl.addEventListener('touchstart',e=>{ e.preventDefault(); joy.active=true; joy.id=e.changedTouches[0].identifier; },{passive:false});
  addEventListener('touchmove',e=>{
    for(const t of e.changedTouches){
      if(joy.active&&t.identifier===joy.id){
        const c=jr(); let dx=(t.clientX-c.x)/50, dy=(t.clientY-c.y)/50;
        const l=Math.hypot(dx,dy); if(l>1){dx/=l;dy/=l;}
        joy.x=dx; joy.y=dy; knob.style.transform=`translate(${dx*36}px,${dy*36}px)`;
      } else if(t.identifier===lookTouch.id){
        const s=0.0042*loadout.ctrl.sens;
        player.yaw-=(t.clientX-lookTouch.lx)*s;
        player.pitch-=(t.clientY-lookTouch.ly)*s*(loadout.ctrl.invert?-1:1);
        player.pitch=clamp(player.pitch,-1.45,1.45);
        lookTouch.lx=t.clientX; lookTouch.ly=t.clientY;
      }
    }
  },{passive:true});
  addEventListener('touchend',e=>{
    for(const t of e.changedTouches){
      if(t.identifier===joy.id){ joy.active=false; joy.x=joy.y=0; knob.style.transform=''; }
      if(t.identifier===lookTouch.id) lookTouch.id=null;
    }
  });
  addEventListener('touchstart',e=>{
    if(!playing||paused||dead) return;
    for(const t of e.changedTouches){
      if(t.clientX>innerWidth*0.4&&t.target.tagName!=='BUTTON'&&lookTouch.id===null){
        lookTouch.id=t.identifier; lookTouch.lx=t.clientX; lookTouch.ly=t.clientY;
      }
    }
  },{passive:true});
  const hold=(el,down,up)=>{ el.addEventListener('touchstart',e=>{e.preventDefault();down();},{passive:false}); el.addEventListener('touchend',e=>{e.preventDefault();up&&up();},{passive:false}); };
  hold($('btnFire'),()=>triggerHeld=true,()=>triggerHeld=false);
  hold($('btnADS'),()=>{player.ads=!player.ads;});
  hold($('btnJump'),()=>{ if(player.grounded){player.vel.y=6;player.grounded=false;} });
  hold($('btnReload'),()=>startReload());
  if($('btnNade')) hold($('btnNade'),()=>throwNade());
}

/* ================= INIT / START ================= */
let composer=null, bloomPass=null, gradePass=null;
function makeEnvTexture(){
  const c=document.createElement('canvas'); c.width=256; c.height=128;
  const g=c.getContext('2d');
  const sky=g.createLinearGradient(0,0,0,128);
  sky.addColorStop(0,'#7fa8dd'); sky.addColorStop(0.45,'#cfe0f2'); sky.addColorStop(0.52,'#8d8b84'); sky.addColorStop(1,'#3a3733');
  g.fillStyle=sky; g.fillRect(0,0,256,128);
  const sun=g.createRadialGradient(190,34,2,190,34,44);
  sun.addColorStop(0,'rgba(255,252,235,1)'); sun.addColorStop(0.35,'rgba(255,238,190,.55)'); sun.addColorStop(1,'rgba(255,230,180,0)');
  g.fillStyle=sun; g.fillRect(140,0,110,90);
  const t=new THREE.CanvasTexture(c);
  t.mapping=THREE.EquirectangularReflectionMapping; t.colorSpace=THREE.SRGBColorSpace;
  const pm=new THREE.PMREMGenerator(renderer);
  const env=pm.fromEquirectangular(t).texture;
  pm.dispose(); t.dispose();
  return env;
}
const GRADE_SHADER={
  uniforms:{ tDiffuse:{value:null}, uTime:{value:0}, uVig:{value:1.0}, uGrain:{value:0.035}, uAberr:{value:0.0016} },
  vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:`
    uniform sampler2D tDiffuse; uniform float uTime,uVig,uGrain,uAberr; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    void main(){
      vec2 d=vUv-0.5;
      float r2=dot(d,d);
      // aberración cromática en los bordes
      vec2 off=d*uAberr*(0.4+r2*2.5);
      vec3 col;
      col.r=texture2D(tDiffuse,vUv+off).r;
      col.g=texture2D(tDiffuse,vUv).g;
      col.b=texture2D(tDiffuse,vUv-off).b;
      // contraste y saturación de "shooter" moderno
      col=(col-0.5)*1.075+0.5;
      float l=dot(col,vec3(0.2126,0.7152,0.0722));
      col=mix(vec3(l),col,1.12);
      // viñeta
      col*=1.0-uVig*smoothstep(0.18,0.85,r2)*0.55;
      // grano de película
      float g=hash(vUv*vec2(1920.0,1080.0)+uTime*60.0)-0.5;
      col+=g*uGrain;
      gl_FragColor=vec4(col,1.0);
    }`
};
async function initFX(){
  try{
    const [ec,rp,ub,sp,op]=await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/ShaderPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]);
    composer=new ec.EffectComposer(renderer);
    composer.addPass(new rp.RenderPass(scene,camera));
    bloomPass=new ub.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.38,0.72,0.82);
    composer.addPass(bloomPass);
    gradePass=new sp.ShaderPass(GRADE_SHADER);
    composer.addPass(gradePass);
    composer.addPass(new op.OutputPass());
    composer.setSize(innerWidth,innerHeight);
    composer.setPixelRatio(renderer.getPixelRatio());
  }catch(e){ console.warn('Post-procesado no disponible:',e.message); composer=null; }
}
function init(){
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.05,600);
  camera.rotation.order='YXZ';
  scene.add(camera);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',stencil:false});
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.06;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  $('game').appendChild(renderer.domElement);
  try{ scene.environment=makeEnvTexture(); }catch(e){}
  clock=new THREE.Clock();
  cacheCrosshair();
  wireMenu(); setupTouch(); initNades(); initFX();
  window.__game={get renderer(){return renderer;},get scene(){return scene;},get camera(){return camera;},
    get composer(){return composer;},get bloom(){return bloomPass;},get map(){return mapGroup;},
    get enemies(){return enemies;},get colliders(){return colliders;},get obstacles(){return obstacleMeshes;},
    get WEAPONS(){return WEAPONS;}, get player(){return player;}, get smokes(){return smokes;},
    get fires(){return fires;}, get nades(){return nades;}, get live(){return nadeLive;}};

  addEventListener('keydown',e=>{
    keys[e.code]=true;
    if(!playing&&!paused&&!dead){
      const digit=/^[1-5]$/.test(e.key)?parseInt(e.key,10)-1:['Digit1','Digit2','Digit3','Digit4','Digit5'].indexOf(e.code);
      if(digit>-1){ switchTab(TABS[digit]); return; }
    }
    if(!playing||paused||dead) return;
    if(e.code==='KeyR') startReload();
    if(e.code==='Digit1') switchW(0); if(e.code==='Digit2') switchW(1); if(e.code==='Digit3') switchW(2);
    const k=(e.code||'Key_'+String(e.key||'')).toString();
    const isD=n=>k==='Digit'+n||e.key===String(n);
    if(isD(4)) selectNade(0); if(isD(5)) selectNade(1);
    if(isD(6)) selectNade(2); if(isD(7)) selectNade(3);
    if(k==='KeyF'||(e.key||'').toLowerCase()==='f') selectNade(0);
    if(k==='KeyT'||(e.key||'').toLowerCase()==='t') selectNade(1);
    if(k==='KeyY'||(e.key||'').toLowerCase()==='y') selectNade(2);
    if(k==='KeyU'||(e.key||'').toLowerCase()==='u') selectNade(3);
    if(k==='KeyG'||k==='KeyX'||['g','x'].includes((e.key||'').toLowerCase())) throwNade();
    if(k==='KeyQ'||(e.key||'').toLowerCase()==='q') switchW((curW+1)%3);
    if(e.code==='Enter') triggerHeld=true;
    if(e.code==='Escape'&&loadout.ctrl.mode==='drag'){ paused=true; $('pause').classList.remove('hidden'); }
    if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup',e=>{ keys[e.code]=false; if(e.code==='Enter') triggerHeld=false; });
  addEventListener('mousedown',e=>{
    if(!playing||paused||dead) return;
    if(e.button===0) triggerHeld=true;
    if(e.button===2) player.ads=true;
  });
  addEventListener('mouseup',e=>{ if(e.button===0) triggerHeld=false; if(e.button===2) player.ads=false; });
  addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('mousemove',e=>{
    if(!playing||paused||dead) return;
    if(loadout.ctrl.mode==='lock'&&document.pointerLockElement!==renderer.domElement) return;
    const base=0.0021*loadout.ctrl.sens;
    const s=(player.ads&&WEAPONS[curW]?(WEAPONS[curW].fam==='bolt'?0.0004:0.0011):base);
    player.yaw-=e.movementX*s;
    player.pitch-=e.movementY*s*(loadout.ctrl.invert?-1:1);
    player.pitch=clamp(player.pitch,-1.45,1.45);
  });
  document.addEventListener('pointerlockchange',()=>{
    const locked=document.pointerLockElement===renderer.domElement;
    if(!locked&&playing&&!dead&&loadout.ctrl.mode==='lock'){ paused=true; $('pause').classList.remove('hidden'); }
  });
  addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
    if(composer){ composer.setSize(innerWidth,innerHeight); composer.setPixelRatio(renderer.getPixelRatio()); }
  });

  const startFromMenu=()=>{ ac(); if(document.activeElement) document.activeElement.blur(); startPlay(); };
  $('playBtn').onclick=startFromMenu;
  $('playBtn2').onclick=startFromMenu;
  $('resumeBtn').onclick=()=>{ paused=false; $('pause').classList.add('hidden'); if(loadout.ctrl.mode==='lock') renderer.domElement.requestPointerLock(); };
  $('restartBtn').onclick=()=>fullReset();
  $('restartBtn2').onclick=()=>fullReset();

  $('loading').textContent='Motor listo. 12 armas • 3 mapas • armería con accesorios + 4 arrojadizos.';
  animate();
}

function startPlay(){
  buildLoadout();
  buildMap(loadout.map);
  buildGuns();
  // reset estado
  enemies=[]; enemyMeshes=[]; particles=[]; tracers=[];
  kills=0; score=0; wave=0; elapsed=0; dead=false;
  player.pos.set(0,1.7,18); player.hp=100; player.yaw=Math.PI; player.pitch=0; player.eyeH=player.baseH;
  curW=0; reloading=0; triggerHeld=false;
  recoilPend=0; chBloom=0;
  initNades();
  gunGroups.forEach((g,k)=>g.visible=(k===0));
  $('menu').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('pause').classList.add('hidden'); $('gameover').classList.add('hidden');
  if(('ontouchstart' in window)||navigator.maxTouchPoints>0) $('touchUI').classList.remove('hidden');
  $('killfeed').innerHTML='';
  playing=true; paused=false;
  wave=0; nextWave();
  if(loadout.ctrl.mode==='lock') renderer.domElement.requestPointerLock();
  else showMsg(`${MAP_NAMES[loadout.map]} — clic para disparar`,2500);
  updateHUD();
}

/* ================= UPDATE ================= */
let stepT=0;
function update(dt){
  elapsed+=dt;
  const alive=enemies.filter(e=>!e.dead).length;
  if(toSpawn>0){
    spawnTimer-=dt;
    if(spawnTimer<=0&&alive<10){ makeEnemy(nextWave.hpMul||1); toSpawn--; spawnTimer=rand(0.6,1.6); }
  } else if(alive===0&&!dead){
    waveBreak+=dt;
    if(waveBreak>2.5) nextWave();
    else if(waveBreak<0.1){ showMsg(`¡OLEADA ${wave} SUPERADA! +250`); score+=250; }
  }

  const w=WEAPONS[curW];
  // giro con flechas (jugar sin mouse)
  const turn=1.9*dt*loadout.ctrl.sens;
  if(keys['ArrowLeft']) player.yaw+=turn;
  if(keys['ArrowRight']) player.yaw-=turn;
  if(keys['ArrowUp']) player.pitch=clamp(player.pitch+turn*0.7,-1.45,1.45);
  if(keys['ArrowDown']) player.pitch=clamp(player.pitch-turn*0.7,-1.45,1.45);
  // retroceso acumulado: vuelve solo a la mira (más rápido con corrector de culata)
  if(recoilPend>0){ const rec=Math.min(recoilPend,dt*(0.55+(w?(w.recover||1):1)*0.55)); player.pitch-=rec; recoilPend-=rec; }
  // sway del arma al girar la vista
  const dYaw=player.yaw-lastYaw, dPitch=player.pitch-lastPitch;
  lastYaw=player.yaw; lastPitch=player.pitch;
  swayRoll=clamp(-dYaw*2.6,-0.35,0.35)*(1-adsK*0.6);
  swayYaw=clamp(dYaw*1.6,-0.3,0.3)*(1-adsK*0.6)+clamp(-dPitch*0.6,-0.12,0.12);

  player.sprint=(keys['ShiftLeft']||keys['ShiftRight'])&&!player.ads&&!player.crouch&&(keys['KeyW']||keys['KeyA']||keys['KeyS']||keys['KeyD']);
  player.crouch=!!keys['KeyC']||!!keys['ControlLeft'];
  const targetH=player.crouch?player.crouchH:player.baseH;
  player.eyeH+=(targetH-player.eyeH)*Math.min(1,dt*10);
  const speed=player.crouch?player.speedCrouch:player.sprint?player.speedSprint:player.speedWalk;
  const f=new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
  const r=new THREE.Vector3(-f.z,0,f.x);
  const mv=new THREE.Vector3();
  if(keys['KeyW'])mv.add(f); if(keys['KeyS'])mv.sub(f); if(keys['KeyD'])mv.add(r); if(keys['KeyA'])mv.sub(r);
  if(joy.active&&(Math.abs(joy.x)>0.12||Math.abs(joy.y)>0.12)){ mv.addScaledVector(f,-joy.y); mv.addScaledVector(r,joy.x); }
  const moving=mv.lengthSq()>0.01;
  if(moving){ mv.normalize().multiplyScalar(speed*dt); player.pos.x+=mv.x; player.pos.z+=mv.z; player.bob+=dt*(player.sprint?11:7); stepT-=dt*(player.sprint?1.6:1); if(stepT<=0){stepT=0.42; playStep(player.sprint);} }
  if(!player.grounded) player.vel.y-=18*dt;
  if(keys['Space']&&player.grounded){ player.vel.y=6; player.grounded=false; }
  let feetY=player.pos.y-player.eyeH+player.vel.y*dt;
  if(feetY<=0){ feetY=0; player.vel.y=0; player.grounded=true; }
  player.pos.y=feetY+player.eyeH;
  collide(player.pos);

  player.shake=Math.max(0,player.shake-dt*3);
  const shx=(Math.random()-0.5)*player.shake*0.05, shy=(Math.random()-0.5)*player.shake*0.05;
  camera.position.set(player.pos.x+shx,player.pos.y+shy,player.pos.z);
  camera.rotation.set(player.pitch,player.yaw,0);

  // ADS / FOV / arma
  adsK+=(((player.ads&&!reloading)?1:0)-adsK)*Math.min(1,dt*10/(w.adsMul||1));
  const isSniper=(w.fam==='bolt'||w.fam==='dmr');
  const fovT=player.ads?w.fovAds:(player.sprint?82:75);
  camera.fov+=(fovT-camera.fov)*Math.min(1,dt*10); camera.updateProjectionMatrix();
  const hip=new THREE.Vector3(0.28,-0.26,-0.55), adsp=isSniper?new THREE.Vector3(0,-0.148,-0.4):new THREE.Vector3(0,-0.185,-0.45);
  gunRig.position.lerpVectors(hip,adsp,adsK);
  gunRig.position.z+=Math.sin(player.bob)*(moving?(player.ads?0.004:0.012):0);
  gunRig.position.y+=Math.abs(Math.cos(player.bob))*(moving?(player.ads?0.003:0.01):0);
  gunRig.position.z=THREE.MathUtils.lerp(gunRig.position.z,(adsK>0.5?adsp.z:hip.z),Math.min(1,dt*8));
  const scoped=(w.fovAds<=40&&player.ads&&adsK>0.7);
  gunGroups.forEach((g,i)=>{ g.visible=(i===curW)&&!scoped; });
  scopeDiv.style.display=scoped?'block':'none';
  scopeDiv.classList.toggle('thermal',!!w.thermal);
  $('crosshair').style.opacity=scoped?0:(player.ads&&!isSniper?0.3:1);
  // MIRA DINÁMICA: se abre al mover/correr/disparar y se cierra al apuntar
  const moveK=moving?(player.sprint?1.5:player.crouch?0.45:1):(player.ads?0.25:0.5);
  chBloom=Math.max(0,chBloom-dt*chBloom*(6+(w.recover||1)*4));
  const spreadPx=(player.ads?w.spreadAds:w.spreadHip)*2600;
  const targetGap=clamp(3+spreadPx+moveK*9+chBloom,3,90);
  chGap+=(targetGap-chGap)*Math.min(1,dt*14);
  applyCrosshair(chGap,player.ads&&!isSniper);
  if(chCool>0){ chCool-=dt; if(chCool<=0) $('crosshair').classList.remove('hit'); }
  // láser visible solo sin apuntar
  gunGroups.forEach((g,i)=>{ if(g.userData.laser) g.userData.laser.visible=(i===curW&&adsK<0.5); });
  if(flashLight) flashLight.intensity=(w.light?25:0);
  // culatazo visual del arma + sway al girar
  gunRig.rotation.z=THREE.MathUtils.lerp(gunRig.rotation.z,-swayRoll,Math.min(1,dt*8));
  gunRig.rotation.y=THREE.MathUtils.lerp(gunRig.rotation.y,swayYaw,Math.min(1,dt*8));

  if(reloading>0){
    reloading-=dt;
    gunRig.rotation.x=THREE.MathUtils.lerp(gunRig.rotation.x,-0.6,Math.min(1,dt*6));
    if(reloading<=0){ const need=w.magSize-w.inMag, take=Math.min(need,w.reserve); w.inMag+=take; w.reserve-=take; gunRig.rotation.x=0; updateHUD(); }
  } else gunRig.rotation.x+=(0-gunRig.rotation.x)*Math.min(1,dt*8);
  if(triggerHeld){
    if(w.auto) shoot();
    else { shoot(); triggerHeld=false; }
  }
  if(elapsed-player.lastDamage>5&&player.hp<player.maxHp){ player.hp=Math.min(player.maxHp,player.hp+14*dt); $('heal-flash').style.opacity=0.6; updateHUD(); }
  else $('heal-flash').style.opacity=0;

  for(const e of enemies){
    if(e.dead){ e.mesh.rotation.x=THREE.MathUtils.lerp(e.mesh.rotation.x,-Math.PI/2,Math.min(1,dt*5)); e.mesh.position.y-=dt*0.4; continue; }
    e.walkP+=dt*8; e.hitT=Math.max(0,e.hitT-dt);
    e.blind=Math.max(0,(e.blind||0)-dt);
    e.stun=Math.max(0,(e.stun||0)-dt);
    const toP=player.pos.clone().sub(e.mesh.position); toP.y=0;
    const dist=toP.length();
    const eyeE=e.mesh.position.clone().add(new THREE.Vector3(0,1.5,0));
    const eyeP=player.pos.clone().add(new THREE.Vector3(0,-0.2,0));
    // el ruido real del arma afecta a la detección: el supresor te delata menos
    const detectR=(45+((w&&w.noise)||0)*7)*(e.blind>0?0.25:1);
    const see=dist<detectR&&hasLOS(eyeE,eyeP);
    let dirV=new THREE.Vector3();
    if(see&&e.blind<=0){
      e.mesh.lookAt(player.pos.x,0,player.pos.z);
      if(dist>14) dirV.copy(toP.normalize());
      else { e.strafeT-=dt; if(e.strafeT<=0){e.strafe*=-1;e.strafeT=rand(1,2.5);} const side=new THREE.Vector3(-toP.z,0,toP.x).normalize().multiplyScalar(e.strafe*0.7); dirV.copy(side); if(dist<7)dirV.add(toP.normalize().multiplyScalar(-0.8)); }
      e.shootT-=dt*(e.stun>0?0.15:1);
      if(e.shootT<=0&&dist<38){
        e.shootT=rand(0.7,1.6);
        e.flash.intensity=3; setTimeout(()=>e.flash.intensity=0,60);
        playShot('enemy');
        const from=e.mesh.position.clone().add(new THREE.Vector3(0,1.25,0));
        // iluminarlos con la linterna los hace más imprecisos (se ven menos)
        const lit=(w&&w.light)?0.12:0;
        const accm=clamp(0.75-dist*0.012-(moving?0.15:0)-(player.crouch?0.1:0)-lit,0.06,0.7);
        if(Math.random()<accm){ tracer(from,player.pos.clone()); damagePlayer(Math.round(rand(6,13)+wave),from); }
        else tracer(from,player.pos.clone().add(new THREE.Vector3(rand(-2,2),rand(-1,1),rand(-2,2))));
      }
    } else { dirV.copy(toP.normalize()); if(e.blind>0) dirV.multiplyScalar(0.4); e.mesh.lookAt(player.pos.x,0,player.pos.z); }
    if(dirV.lengthSq()>0){
      dirV.normalize().multiplyScalar(e.speed*dt*(see&&dist<16?0.7:1));
      const np=e.mesh.position.clone().add(dirV);
      let blocked=false;
      for(const b of colliders){ if(np.x>b.min.x-0.4&&np.x<b.max.x+0.4&&np.z>b.min.z-0.4&&np.z<b.max.z+0.4&&0.5<b.max.y&&1.5>b.min.y){blocked=true;break;} }
      if(!blocked){ e.mesh.position.x=clamp(np.x,-31,31); e.mesh.position.z=clamp(np.z,-29,29); }
      e.mesh.position.y=Math.abs(Math.sin(e.walkP))*0.04;
    }
    e.body.material.emissive=e.body.material.emissive||new THREE.Color();
    e.body.material.emissive.setHex(e.hitT>0?0x661111:0x000000);
  }

  for(const b of barrels){ if(!b.dead&&b.hp<=0){ b.dead=true; scene.remove(b.mesh); explode(b.pos.clone()); } }

  updateNades(dt);

  for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.life-=dt; p.v.y-=p.grav*dt; p.m.position.addScaledVector(p.v,dt); p.m.rotation.x+=dt*5; p.m.rotation.y+=dt*4; const s=clamp(p.life/p.max,0,1); p.m.scale.setScalar(Math.max(0.01,s)); if(p.life<=0){scene.remove(p.m); particles.splice(i,1);} }
  for(let i=tracers.length-1;i>=0;i--){ const t=tracers[i]; t.life-=dt; t.line.material.opacity=Math.max(0,t.life/0.07); if(t.life<=0){scene.remove(t.line); tracers.splice(i,1);} }

  drawMini();
  if(Math.floor(elapsed*4)!==Math.floor((elapsed-dt)*4)) updateHUD();
}

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05);
  if(playing&&!paused&&!dead) update(dt);
  if(gradePass){ gradePass.uniforms.uTime.value=performance.now()*0.001; }
  if(composer) composer.render(dt); else renderer.render(scene,camera);
}

init();
