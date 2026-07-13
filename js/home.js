// ── elements ──────────────────────────────────────────────
const picker  = document.getElementById('picker');
const drop    = document.querySelector('.dropzone');
const errorEl = document.getElementById('error');


// ── green button: start from the default skin ─────────────
document.querySelector('.fresh').addEventListener('click', () => {
  sessionStorage.setItem('skin', JSON.stringify({ mode: 'default' }));
  location.href = 'editor.html';
});


// ── grey box: click to open the file picker ───────────────
document.querySelector('.upload').addEventListener('click', () => picker.click());

picker.addEventListener('change', () => {
  if (picker.files[0]) handleFile(picker.files[0]);
  picker.value = '';                 // lets the same file be picked twice
});


// ── grey box: drag and drop ───────────────────────────────
drop.addEventListener('dragover', e => {
  e.preventDefault();                // keeps the browser from opening the image
  drop.classList.add('dragging');
});

drop.addEventListener('dragleave', () => {
  drop.classList.remove('dragging');
});

drop.addEventListener('drop', e => {
  e.preventDefault();
  drop.classList.remove('dragging');

  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);        // same validation as the picker
});


// ── the one place a file gets checked ─────────────────────
async function handleFile(file) {
  errorEl.textContent = '';          // clear any previous complaint

  try {
    if (file.type !== 'image/png') throw new Error('PNG files only.');

    const url = await fileToDataURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();              // throws if it isn't really a PNG

    if (img.width !== 64 || img.height !== 64)
      throw new Error(`Skins must be 64×64. That one is ${img.width}×${img.height}.`);

    sessionStorage.setItem('skin', JSON.stringify({ mode: 'upload', data: url }));
    location.href = 'editor.html';

  } catch (err) {
    errorEl.textContent = err.message;
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}