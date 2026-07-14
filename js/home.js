// ── elements ──────────────────────────────────────────────
const picker  = document.getElementById('picker');
const drop    = document.querySelector('.dropzone');
const errorEl = document.getElementById('error');


// green button starts with a default skin
document.querySelector('.fresh').addEventListener('click', () => {
  sessionStorage.setItem('skin', JSON.stringify({ mode: 'default' }));
  location.href = 'editor.html';
});


// grey box : cloick to open
document.querySelector('.upload').addEventListener('click', () => picker.click());

picker.addEventListener('change', () => {
  if (picker.files[0]) handleFile(picker.files[0]);
  picker.value = '';                 // lets the same file be picked twice
});


// grey box: drag and drop option
drop.addEventListener('dragover', e => {
  e.preventDefault();                // preventing the browser from opening the image
  drop.classList.add('dragging');
});

drop.addEventListener('dragleave', () => {
  drop.classList.remove('dragging');
});

drop.addEventListener('drop', e => {
  e.preventDefault();
  drop.classList.remove('dragging');

  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);     
});


// Validation checker area fr
async function handleFile(file) {
  errorEl.textContent = '';          // clear any previous complaint

  try {
    if (file.type !== 'image/png') throw new Error('PNG files only.');

    const url = await fileToDataURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();              // throws if it isn't really a PNG

    if (img.width !== 64 || img.height !== 64)
      throw new Error(`Skins must be 64×64. That one is ${img.width}×${img.height}.`);        // If skin isnt 64 x64 pixels

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