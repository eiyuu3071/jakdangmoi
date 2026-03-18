const menuImageInput = document.getElementById('menuImageInput');
const clearMenuImageBtn = document.getElementById('clearMenuImageBtn');
const menuImagePreview = document.getElementById('menuImagePreview');
const menuImageEl = document.getElementById('menuImage');
const menuImagePlaceholder = document.getElementById('menuImagePlaceholder');
const menuImageStatus = document.getElementById('menuImageStatus');
const menuImagePickLabel = document.querySelector('label[for="menuImageInput"]');

let menuImageBusy = false;

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

function setStatus(message, isError = false) {
  if (!menuImageStatus) return;
  menuImageStatus.textContent = message || '';
  menuImageStatus.classList.toggle('is-error', Boolean(isError));
}

function setBusy(isBusy, message = '') {
  menuImageBusy = isBusy;
  if (menuImagePickLabel) {
    menuImagePickLabel.classList.toggle('is-busy', isBusy);
  }
  if (clearMenuImageBtn) {
    clearMenuImageBtn.disabled = isBusy;
  }
  if (menuImageInput) {
    menuImageInput.disabled = isBusy;
  }
  setStatus(message, false);
}

async function fetchSharedMenuImage() {
  try {
    setBusy(true, '메뉴 이미지를 불러오는 중입니다...');
    const data = await api('getMenuImage');
    setMenuImage(data.imageUrl || data.imageDataUrl || '');
    setStatus(data.imageUrl || data.imageDataUrl ? '공용 메뉴 이미지가 표시되고 있습니다.' : '아직 등록된 메뉴 이미지가 없습니다.');
  } catch (error) {
    console.error(error);
    setStatus('메뉴 이미지를 불러오지 못했습니다.', true);
  } finally {
    setBusy(false, menuImageStatus?.textContent || '');
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 처리하지 못했습니다.'));
    image.src = src;
  });
}

async function compressImage(file) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const maxWidth = 1600;
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.82);
}

async function handleMenuImageChange(event) {
  const file = event.target.files?.[0];
  if (!file || menuImageBusy) return;

  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 선택할 수 있습니다.');
    menuImageInput.value = '';
    return;
  }

  try {
    setBusy(true, '이미지를 업로드하는 중입니다...');
    const imageDataUrl = await compressImage(file);
    const data = await api('setMenuImage', { imageDataUrl, fileName: file.name });
    setMenuImage(data.imageUrl || data.imageDataUrl || imageDataUrl);
    setStatus('공용 메뉴 이미지가 업데이트되었습니다.');
  } catch (error) {
    console.error(error);
    alert(메뉴 이미지 업로드 실패: );
    setStatus('메뉴 이미지 업로드에 실패했습니다.', true);
  } finally {
    menuImageInput.value = '';
    setBusy(false, menuImageStatus?.textContent || '');
  }
}

async function clearMenuImage() {
  if (menuImageBusy) return;
  if (!confirm('현재 등록된 메뉴 이미지를 삭제할까요?')) return;

  try {
    setBusy(true, '메뉴 이미지를 삭제하는 중입니다...');
    await api('clearMenuImage');
    setMenuImage('');
    setStatus('공용 메뉴 이미지가 삭제되었습니다.');
  } catch (error) {
    console.error(error);
    alert(메뉴 이미지 삭제 실패: );
    setStatus('메뉴 이미지 삭제에 실패했습니다.', true);
  } finally {
    setBusy(false, menuImageStatus?.textContent || '');
  }
}

menuImageInput?.addEventListener('change', handleMenuImageChange);
clearMenuImageBtn?.addEventListener('click', clearMenuImage);
fetchSharedMenuImage();

