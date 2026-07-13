const raw = sessionStorage.getItem('skin');

if (!raw) {
  location.href = 'index.html';
} else {
  const choice = JSON.parse(raw);
  console.log('editor got:', choice);
}