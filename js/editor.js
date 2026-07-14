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
img.onload  = () => { sctx.drawImage(img, 0, 0); show(); };
img.src = src;


// draw the skin onto the visible canvas, zoomed
function show() {
  pctx.imageSmoothingEnabled = false;             // no blurring
  pctx.clearRect(0, 0, preview.width, preview.height);
  pctx.drawImage(skin, 0, 0, preview.width, preview.height);
} 