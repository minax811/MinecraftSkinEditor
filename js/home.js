// green button — start from the default skin
document.querySelector('.fresh').addEventListener('click', () => {
  sessionStorage.setItem('skin', JSON.stringify({ mode: 'default' }));
  location.href = 'editor.html';
});

// grey box — open the file picker
const picker = document.getElementById('picker');

document.querySelector('.upload').addEventListener('click', () => picker.click());

picker.addEventListener('change', () => {
  if (picker.files[0]) handleFile(picker.files[0]);
});

async function handleFile(file) {
  try {
    if (file.type !== 'image/png') throw new Error('PNG files only.');

    const url = await fileToDataURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();

    if (img.width !== 64 || img.height !== 64)
      throw new Error(`Skins must be 64×64. That one is ${img.width}×${img.height}.`);

    sessionStorage.setItem('skin', JSON.stringify({ mode: 'upload', data: url }));
    location.href = 'editor.html';

  } catch (err) {
    alert(err.message);
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
