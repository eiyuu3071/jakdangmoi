const MENU_IMAGE_KEY = 'jakdangmoi-menu-image-v1';

const menuImageInput = document.getElementById('menuImageInput');
const clearMenuImageBtn = document.getElementById('clearMenuImageBtn');
const menuImagePreview = document.getElementById('menuImagePreview');
const menuImageEl = document.getElementById('menuImage');
const menuImagePlaceholder = document.getElementById('menuImagePlaceholder');

function setMenuImage(src) {
  if (!menuImageEl || !menuImagePreview || !menuImagePlaceholder) return;

  if (!src) {
    menuImageEl.hidden = true;
    menuImageEl.removeAttribute('src');
    menuImagePlaceholder.hidden = false;
    menuImagePreview.classList.add('is-empty');
    return;
  }

  menuImageEl.src = src;
  menuImageEl.hidden = false;
  menuImagePlaceholder.hidden = true;
  menuImagePreview.classList.remove('is-empty');
}

function loadMenuImage() {
  try {
    return localStorage.getItem(MENU_IMAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveMenuImage(src) {
  try {
    localStorage.setItem(MENU_IMAGE_KEY, src);
  } catch {
    alert('이미지를 저장하지 못했습니다. 용량이 너무 큰 파일일 수 있습니다.');
  }
}

function clearMenuImage() {
  setMenuImage('');
  try {
    localStorage.removeItem(MENU_IMAGE_KEY);
  } catch {}
}

function handleMenuImageChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 선택할 수 있습니다.');
    menuImageInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const imageDataUrl = typeof reader.result === 'string' ? reader.result : '';
    if (!imageDataUrl) return;

    setMenuImage(imageDataUrl);
    saveMenuImage(imageDataUrl);
    menuImageInput.value = '';
  };
  reader.readAsDataURL(file);
}

menuImageInput?.addEventListener('change', handleMenuImageChange);
clearMenuImageBtn?.addEventListener('click', clearMenuImage);
setMenuImage(loadMenuImage());
