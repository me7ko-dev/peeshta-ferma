// Пееща ферма — осем животинчета, осем ноти (до мажор).
// Докосваш → животинчето танцува и пее. ● записва, ▶ повтаря записа в цикъл, ★ пеят сами „Блещукай, звездице“.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ANIMALS = [
  // от ниско към високо
  { id: 'elephant', name: 'Слончо',   note: 'До',  semi: 0,  color: '#ff6b6b', h: 1.45 },
  { id: 'cow',      name: 'Кравичка', note: 'Ре',  semi: 2,  color: '#ffa94d', h: 1.3 },
  { id: 'pig',      name: 'Прасенце', note: 'Ми',  semi: 4,  color: '#ffd43b', h: 1.05 },
  { id: 'dog',      name: 'Кученце',  note: 'Фа',  semi: 5,  color: '#8ce99a', h: 1.1 },
  { id: 'lion',     name: 'Лъвче',    note: 'Сол', semi: 7,  color: '#38d9a9', h: 1.2 },
  { id: 'cat',      name: 'Коте',     note: 'Ла',  semi: 9,  color: '#4dabf7', h: 1.0 },
  { id: 'bunny',    name: 'Зайче',    note: 'Си',  semi: 11, color: '#9775fa', h: 1.05 },
  { id: 'chick',    name: 'Пиленце',  note: 'До',  semi: 12, color: '#f783ac', h: 0.8 },
];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const KEYS2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];

// „Блещукай, звездице“: [индекс, продължителност в удари]
const TWINKLE = [
  [0,1],[0,1],[4,1],[4,1],[5,1],[5,1],[4,2], [3,1],[3,1],[2,1],[2,1],[1,1],[1,1],[0,2],
  [4,1],[4,1],[3,1],[3,1],[2,1],[2,1],[1,2], [4,1],[4,1],[3,1],[3,1],[2,1],[2,1],[1,2],
  [0,1],[0,1],[4,1],[4,1],[5,1],[5,1],[4,2], [3,1],[3,1],[2,1],[2,1],[1,1],[1,1],[0,2],
];
const BEAT = 0.42;

const $ = id => document.getElementById(id);
const now = () => performance.now() / 1000;

// ---------- звук ----------

let audio = null;
function ensureAudio() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    const master = audio.createGain();
    master.gain.value = 0.5;
    const comp = audio.createDynamicsCompressor();
    master.connect(comp).connect(audio.destination);
    audio.master = master;
  }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

function sing(a) {
  const ac = ensureAudio();
  const t = ac.currentTime;
  const f = 261.63 * Math.pow(2, a.semi / 12);
  const out = ac.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.9, t + 0.012);
  out.gain.exponentialRampToValueAtTime(0.35, t + 0.18);
  out.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  out.connect(lp).connect(ac.master);

  // тяло: триъгълник + октава синус, с малко „подскачане“ на височината — звучи като гласче
  for (const [type, mul, vol] of [['triangle', 1, 0.7], ['sine', 2, 0.25], ['sine', 3, 0.06]]) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f * mul * 0.94, t);
    o.frequency.exponentialRampToValueAtTime(f * mul, t + 0.06);
    const vib = ac.createOscillator();
    const vg = ac.createGain();
    vib.frequency.value = 5.5;
    vg.gain.value = f * mul * 0.006;
    vib.connect(vg).connect(o.frequency);
    g.gain.value = vol;
    o.connect(g).connect(out);
    o.start(t); vib.start(t);
    o.stop(t + 1); vib.stop(t + 1);
  }
}

// ---------- сцена ----------

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);
document.body.style.background = 'linear-gradient(#6cc4ff 0%, #b8e6ff 55%, #e9f8ff 100%)';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcdeeff, 26, 60);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
const target = new THREE.Vector3(0, 0.7, 0);

scene.add(new THREE.HemisphereLight(0xdff3ff, 0x6fbf4a, 1.6));
const sun = new THREE.DirectionalLight(0xfff4de, 2.4);
sun.position.set(-6, 12, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 });
sun.shadow.radius = 4;
scene.add(sun);

const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });

// остров
const island = new THREE.Group();
const grass = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 0.6, 64), mat(0x86d85c));
grass.position.y = -0.3;
grass.receiveShadow = true;
const dirt = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 7.5, 2.2, 64), mat(0xb9885a));
dirt.position.y = -1.7;
island.add(grass, dirt);
scene.add(island);

function tree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 8), mat(0x9b6b43));
  trunk.position.y = 0.4;
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), mat(0x4caf50));
  top.position.y = 1.2;
  top.scale.y = 1.2;
  for (const m of [trunk, top]) { m.castShadow = true; g.add(m); }
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
}
[[-7.2, -4.5, 1.3], [-5.6, -6.4, 1], [6.8, -5.1, 1.2], [5.2, -6.8, .9], [0.3, -7.6, 1.1], [-8.1, -1.2, .8], [8.3, -1.6, .85]]
  .forEach(p => tree(...p));

const flowerColors = [0xffffff, 0xfff176, 0xff8fab, 0xb197fc];
for (let i = 0; i < 70; i++) {
  const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 6;
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), mat(flowerColors[i % 4]));
  f.position.set(Math.cos(a) * r, 0.06, Math.sin(a) * r);
  scene.add(f);
}

const clouds = [];
for (let i = 0; i < 6; i++) {
  const c = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.8 + Math.random() * .6, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: .25 }));
    s.position.set(k * 0.9 - 1.4, Math.random() * .4, Math.random() * .5);
    c.add(s);
  }
  c.position.set(-24 + i * 9, 6 + Math.random() * 4, -16 - Math.random() * 8);
  c.userData.speed = 0.3 + Math.random() * 0.4;
  scene.add(c);
  clouds.push(c);
}

// ---------- животни ----------

const loader = new GLTFLoader();
const hitMeshes = [];
const animals = ANIMALS.map((a, i) => {
  const root = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.78, 40),
    new THREE.MeshStandardMaterial({ color: a.color, roughness: .6, emissive: a.color, emissiveIntensity: 0 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.012;
  pad.receiveShadow = true;
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.2, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.y = 1.1;
  const body = new THREE.Group();
  root.add(pad, hit, body);
  scene.add(root);
  const an = { ...a, i, root, pad, body, jump: 1, glow: 0, mixer: null, actions: {}, busy: null };
  pad.userData.animal = hit.userData.animal = an;
  hitMeshes.push(pad, hit);
  return an;
});

async function loadAnimal(an) {
  const gltf = await loader.loadAsync(`models/animal-${an.id}.glb`);
  const model = gltf.scene;
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = an.h / size.y;
  model.scale.setScalar(k);
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  an.body.add(model);

  an.mixer = new THREE.AnimationMixer(model);
  for (const clip of gltf.animations) an.actions[clip.name] = an.mixer.clipAction(clip);
  an.actions.idle?.play();
  an.mixer.time = Math.random() * 2;
  an.mixer.addEventListener('finished', e => {
    if (e.action !== an.busy) return;
    an.busy = null;
    e.action.fadeOut(0.25);
    an.actions.idle?.reset().fadeIn(0.25).play();
  });
}

function layout() {
  const w = innerWidth, h = innerHeight;
  const aspect = w / h;
  renderer.setSize(w, h);
  camera.aspect = aspect;

  const portrait = aspect < 1;
  animals.forEach((an, i) => {
    let x, z;
    if (portrait) {
      const row = i < 4 ? 0 : 1;
      x = ((i % 4) - 1.5) * 1.85;
      z = row ? 1.3 : -1.3;
    } else {
      x = (i - 3.5) * 1.8;
      z = 0.05 * x * x - 0.8;
    }
    an.root.position.set(x, 0, z);
  });

  const halfW = portrait ? 4.1 : 8.6;
  const dir = new THREE.Vector3(0, portrait ? 0.62 : 0.45, 1).normalize();
  camera.fov = portrait ? 46 : 36;
  const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
  const dist = Math.max(halfW / Math.tan(hfov / 2), 10);
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.lookAt(target);
  camera.updateProjectionMatrix();

  for (const an of animals) {
    an.root.rotation.y = Math.atan2(camera.position.x - an.root.position.x, camera.position.z - an.root.position.z) * 0.8;
  }
}

// ---------- ноти, които хвърчат ----------

const noteTex = {};
function noteTexture(color, glyph) {
  const key = color + glyph;
  if (noteTex[key]) return noteTex[key];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = '900 104px Nunito, "Segoe UI Symbol", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = '#ffffff';
  g.strokeText(glyph, 64, 70);
  g.fillStyle = color;
  g.fillText(glyph, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (noteTex[key] = t);
}

const flying = [];
function spawnNote(an) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTexture(an.color, Math.random() < .5 ? '♪' : '♫'), transparent: true, depthWrite: false }));
  s.position.copy(an.root.position).add(new THREE.Vector3((Math.random() - .5) * .6, an.h + .4, 0));
  s.scale.setScalar(0.6);
  s.userData = { born: now(), vx: (Math.random() - .5) * .8 };
  scene.add(s);
  flying.push(s);
}

// ---------- игра ----------

const rec = { on: false, start: 0, events: [], len: 0 };
const loop = { on: false, start: 0, last: 0 };
const queue = []; // {at, i} за песничката
let songOn = false;

function play(i, byHand) {
  const an = animals[i];
  sing(an);
  an.jump = 0;
  an.glow = 1;
  spawnNote(an);

  const moves = ['dance', 'gesture-positive'];
  const act = an.actions[moves[Math.random() < .6 ? 0 : 1]];
  if (act) {
    if (an.busy && an.busy !== act) an.busy.fadeOut(0.1);
    an.actions.idle?.fadeOut(0.1);
    act.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.1).play();
    act.clampWhenFinished = false;
    act.timeScale = 1.3;
    an.busy = act;
  }

  if (byHand) {
    $('hint').classList.add('gone');
    if (rec.on) rec.events.push({ t: now() - rec.start, i });
  }
}

const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', e => {
  ensureAudio();
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(hitMeshes, false)[0];
  if (hit) play(hit.object.userData.animal.i, true);
});

addEventListener('keydown', e => {
  if (e.repeat) return;
  const i = Math.max(KEYS.indexOf(e.key), KEYS2.indexOf(e.key.toLowerCase()));
  if (i >= 0) play(i, true);
  if (e.key === ' ') { e.preventDefault(); $('song').click(); }
});

function setLoop(on) {
  loop.on = on;
  loop.start = now();
  loop.last = 0;
  $('loop').classList.toggle('on', on);
  $('loop').innerHTML = on
    ? '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>';
}

function stopSong() {
  songOn = false;
  queue.length = 0;
  $('song').textContent = '★';
}

$('rec').onclick = () => {
  ensureAudio();
  if (!rec.on) {
    setLoop(false);
    stopSong();
    Object.assign(rec, { on: true, start: now(), events: [] });
    $('rec').classList.add('on');
    return;
  }
  rec.on = false;
  $('rec').classList.remove('on');
  if (!rec.events.length) return;
  // цикълът започва от първата нота, за да няма празно време в началото
  const first = rec.events[0].t;
  rec.events.forEach(ev => { ev.t -= first; });
  rec.len = Math.max(now() - rec.start - first, rec.events.at(-1).t + 0.3);
  $('loop').disabled = $('clear').disabled = false;
  setLoop(true);
};

$('loop').onclick = () => { ensureAudio(); stopSong(); setLoop(!loop.on); };

$('clear').onclick = () => {
  setLoop(false);
  rec.events = [];
  $('loop').disabled = $('clear').disabled = true;
};

$('song').onclick = () => {
  ensureAudio();
  if (songOn) return stopSong();
  setLoop(false);
  songOn = true;
  $('song').textContent = '■';
  let at = now() + 0.2;
  for (const [i, d] of TWINKLE) { queue.push({ at, i }); at += d * BEAT; }
  queue.push({ at, i: -1 });
  $('hint').classList.add('gone');
};

// ---------- цикъл ----------

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = now();

  while (queue.length && queue[0].at <= t) {
    const { i } = queue.shift();
    if (i < 0) stopSong(); else play(i, false);
  }

  if (loop.on && rec.len > 0) {
    const phase = (t - loop.start) % rec.len;
    for (const ev of rec.events) {
      const crossed = loop.last <= phase ? ev.t > loop.last && ev.t <= phase : ev.t > loop.last || ev.t <= phase;
      if (crossed || (ev.t === 0 && t - loop.start < dt * 1.5 && loop.last === 0)) play(ev.i, false);
    }
    loop.last = phase;
  }

  for (const an of animals) {
    an.mixer?.update(dt);
    an.jump = Math.min(1, an.jump + dt / 0.38);
    const j = an.jump < 1 ? 4 * an.jump * (1 - an.jump) : 0;
    an.body.position.y = j * 0.45;
    const squash = an.jump < 0.12 ? 1 - (0.12 - an.jump) * 1.6 : 1;
    an.body.scale.set(2 - squash, squash, 2 - squash);
    an.glow = Math.max(0, an.glow - dt * 2.2);
    an.pad.material.emissiveIntensity = an.glow * 0.9;
    an.pad.scale.setScalar(1 + an.glow * 0.18);
  }

  for (let k = flying.length - 1; k >= 0; k--) {
    const s = flying[k];
    const age = t - s.userData.born;
    s.position.y += dt * 1.4;
    s.position.x += dt * s.userData.vx + Math.sin(age * 6) * dt * .4;
    s.material.opacity = Math.max(0, 1 - age / 1.3);
    s.scale.setScalar(0.6 + age * 0.25);
    if (age > 1.3) { scene.remove(s); s.material.dispose(); flying.splice(k, 1); }
  }

  for (const c of clouds) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 30) c.position.x = -30;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

layout();
addEventListener('resize', layout);
Promise.all(animals.map(loadAnimal))
  .then(() => $('loading').classList.add('gone'))
  .catch(err => { $('loading').textContent = 'Опа, животинчетата се загубиха. Презареди.'; console.error(err); });
tick();
