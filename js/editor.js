const SIZE = 64;

// the real skin — a 64×64 canvas that lives only in memory
const skin = document.createElement('canvas');
skin.width = skin.height = SIZE;
const sctx = skin.getContext('2d');

// the visible one, so we can actually see what we're doing
const preview = document.getElementById('preview');
const pctx = preview.getContext('2d');
preview.width = preview.height = SIZE * 6;      // 6× zoom 


// figuring out what the homepage sent 
const raw = sessionStorage.getItem('skin');
if (!raw) location.href = 'index.html';

const choice = JSON.parse(raw);


// loads the skin
const src = choice.mode === 'upload' ? choice.data : 'assets/default.png';

const img = new Image();
img.onerror = () => console.error('could not load', img.src);
img.onload = () => {
  sctx.drawImage(img, 0, 0);
  show();
  texture.needsUpdate = true;      // tell the GPU the canvas changed
};
img.src = src;


// draw the skin onto the visible canvas, zoomed
function show() {
  pctx.imageSmoothingEnabled = false;             // no blurring
  pctx.clearRect(0, 0, preview.width, preview.height);
  pctx.drawImage(skin, 0, 0, preview.width, preview.height);
} 


// ══════════════════════════════════════════════════════════
//  3D
// ══════════════════════════════════════════════════════════

// the skin canvas, but as something the GPU can wear
const texture = new THREE.CanvasTexture(skin);
texture.magFilter = THREE.NearestFilter;   // no blurring
texture.minFilter = THREE.NearestFilter;


// ── the UV mapping: tell each face which rectangle it wears
function skinBox(w, h, d, u, v) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv  = geo.attributes.uv;

  // face order: +X, -X, +Y, -Y, +Z, -Z
  const rects = [
    [u + d + w,     v + d, d, h],   // +X  left side of the body
    [u,             v + d, d, h],   // -X  right side
    [u + d,         v,     w, d],   // +Y  top
    [u + d + w,     v,     w, d],   // -Y  bottom
    [u + d,         v + d, w, h],   // +Z  front
    [u + 2 * d + w, v + d, w, h],   // -Z  back
  ];


  rects.forEach(([x, y, rw, rh], face) => {
    let u0 = x / SIZE,  u1 = (x + rw) / SIZE;
    let v0 = 1 - y / SIZE,  v1 = 1 - (y + rh) / SIZE;   // textures count Y upward

    if (face === 3) { [u0, u1] = [u1, u0]; [v0, v1] = [v1, v0]; }  // bottom is rotated 180°

    const i = face * 4;
    uv.setXY(i,     u0, v0);
    uv.setXY(i + 1, u1, v0);
    uv.setXY(i + 2, u0, v1);
    uv.setXY(i + 3, u1, v1);
  });

  uv.needsUpdate = true;
  return geo;
}


// ── the body: 1 unit = 1 pixel ────────────────────────────
const PARTS = [
  //  w   h   d    x    y    sheet position
  [   8,  8,  8,   0,  28,   0, 0  ],   // head
  [   8, 12,  4,   0,  18,  16, 16 ],   // body
  [   4, 12,  4,  -6,  18,  40, 16 ],   // right arm
  [   4, 12,  4,   6,  18,  32, 48 ],   // left arm
  [   4, 12,  4,  -2,   6,   0, 16 ],   // right leg
  [   4, 12,  4,   2,   6,  16, 48 ],   // left leg
];

const scene    = new THREE.Scene();
const player   = new THREE.Group();
const material = new THREE.MeshBasicMaterial({ map: texture });

PARTS.forEach(([w, h, d, x, y, u, v]) => {
  const mesh = new THREE.Mesh(skinBox(w, h, d, u, v), material);
  mesh.position.set(x, y, 0);
  player.add(mesh);
});

scene.add(player);


// ── camera and renderer ───────────────────────────────────
const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true });
renderer.setSize(500, 500);
renderer.setClearColor(0x2b2f3a);

// ── camera ────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);

// where the camera sits, described as angles + distance
const target = new THREE.Vector3(0, 17, 0);   // the point it looks at (chest height)
let yaw = 0.5, pitch = 1.4, dist = 60;

function placeCamera() {
  camera.position.set(
    target.x + dist * Math.sin(pitch) * Math.sin(yaw),
    target.y + dist * Math.cos(pitch),
    target.z + dist * Math.sin(pitch) * Math.cos(yaw)
  );
  camera.lookAt(target);
}
placeCamera();

// ── mouse drag to orbit ───────────────────────────────────
let dragging = false, last = null;

view.addEventListener('pointerdown', e => {
  if (e.shiftKey) {                          // shift = paint mode
    painting = true;
    lastPixel = null;
    paintAt(e, e.button === 2);              // right button erases
    return;
  }
  dragging = true;                           // otherwise orbit
  last = { x: e.clientX, y: e.clientY };
});

view.addEventListener('pointermove', e => {
  if (painting) { paintAt(e, e.buttons === 2); return; }
  if (!dragging) return;
  yaw   -= (e.clientX - last.x) * 0.01;
  pitch  = Math.max(0.1, Math.min(3.0, pitch - (e.clientY - last.y) * 0.01));
  last = { x: e.clientX, y: e.clientY };
  placeCamera();
});

addEventListener('pointerup', () => { dragging = false; painting = false; });

view.addEventListener('contextmenu', e => e.preventDefault());

// ── zoom ──────────────────
view.addEventListener('wheel', e => {
  e.preventDefault();
  dist = Math.max(25, Math.min(120, dist + e.deltaY * 0.05));
  placeCamera();
}, { passive: false });


// ── render loop ────────────────
function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}
render();

// ══════════════════════════════════════════════════════════
//  PAINTING
// ══════════════════════════════════════════════════════════

const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
let painting = false;
let lastPixel = null;
let color = '#ff0000';      // ← add this


function paintAt(e, erase = false) {
  const r = view.getBoundingClientRect();
  pointer.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  pointer.y = -((e.clientY - r.top)  / r.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(player.children);
  if (!hits.length) return;

  const uv = hits[0].uv;
  const x = Math.floor(uv.x * SIZE);
  const y = Math.floor((1 - uv.y) * SIZE);


  if (lastPixel && lastPixel.x === x && lastPixel.y === y) return;
  lastPixel = { x, y };

  if (erase) {
    sctx.clearRect(x, y, 1, 1);        // back to transparent
  } else {
    sctx.fillStyle = color;
    sctx.fillRect(x, y, 1, 1);
  }

  texture.needsUpdate = true;
  show();
}

// ── colour picker ─────────────────────────────────────────
const colorInput = document.getElementById('color');
colorInput.addEventListener('input', e => { color = e.target.value; });

// ── quick swatches ────────────────────────────────────────
const PALETTE = [
  '#000000', '#ffffff', '#ff0000', '#00a000',
  '#0060ff', '#ffd000', '#d88015', '#d8ab7d',
];

const swatches = document.getElementById('swatches');
PALETTE.forEach(c => {
  const sw = document.createElement('div');
  sw.className = 'sw';
  sw.style.background = c;
  sw.addEventListener('click', () => {
    color = c;
    colorInput.value = c;        // keep the picker in sync
  });
  swatches.appendChild(sw);
});