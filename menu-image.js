const menuImageInput = document.getElementById('menuImageInput');
const clearMenuImageBtn = document.getElementById('clearMenuImageBtn');
const menuImagePreview = document.getElementById('menuImagePreview');
const menuImageEl = document.getElementById('menuImage');
const menuImagePlaceholder = document.getElementById('menuImagePlaceholder');
const menuImageStatus = document.getElementById('menuImageStatus');
const menuImagePickLabel = document.querySelector('label[for="menuImageInput"]');

let menuImageBusy = false;
let menuImageCandidates = [];
let menuImageCandidateIndex = 0;

function setMenuImage(src) {
  if (!menuImageEl || !menuImagePreview || !menuImagePlaceholder) return;

  const nextSrc = src || '';
  if (!nextSrc) {
    menuImageCandidates = [];
    menuImageCandidateIndex = 0;
    menuImageEl.hidden = true;
    menuImageEl.removeAttribute('src');
    menuImagePlaceholder.hidden = false;
    menuImagePreview.classList.add('is-empty');
    return;
  }

  menuImageCandidates = buildImageCandidates(nextSrc);
  menuImageCandidateIndex = 0;
  menuImagePlaceholder.hidden = true;
  menuImageEl.hidden = false;
  menuImagePreview.classList.remove('is-empty');
  loadCurrentMenuImageCandidate();
}

function buildImageCandidates(src) {
  const candidates = [src];
  const fileId = extractDriveFileId(src);
  if (fileId) {
    candidates.push(`https://drive.google.com/uc?export=view&id=${fileId}`);
    candidates.push(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`);
    candidates.push(`https://lh3.googleusercontent.com/d/${fileId}=w1600`);
  }
  return [...new Set(candidates.filter(Boolean))];
}

function extractDriveFileId(src) {
  const value = String(src || '');
  const queryMatch = value.match(/[?&]id=([^&]+)/);
  if (queryMatch) return queryMatch[1];

  const pathMatch = value.match(/\/d\/([^/]+)/);
  if (pathMatch) return pathMatch[1];

  return '';
}

function loadCurrentMenuImageCandidate() {
  if (!menuImageEl || menuImageCandidateIndex >= menuImageCandidates.length) {
    handleMenuImageLoadFailure();
    return;
  }
  menuImageEl.src = menuImageCandidates[menuImageCandidateIndex];
}

function handleMenuImageLoadSuccess() {
  setStatus('공용 메뉴 이미지가 표시되고 있습니다.');
}

function handleMenuImageLoadError() {
  menuImageCandidateIndex += 1;
  if (menuImageCandidateIndex < menuImageCandidates.length) {
    loadCurrentMenuImageCandidate();
    return;
  }
  handleMenuImageLoadFailure();
}

function handleMenuImageLoadFailure() {
  if (!menuImageEl || !menuImagePreview || !menuImagePlaceholder) return;
  menuImageEl.hidden = true;
  menuImageEl.removeAttribute('src');
  menuImagePlaceholder.hidden = false;
  menuImagePreview.classList.add('is-empty');
  setStatus('메뉴 이미지는 저장됐지만 화면에 표시할 수 없습니다. Drive 공개 링크 형식을 다시 확인해주세요.', true);
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
    const src = data.imageUrl || data.imageDataUrl || data.menuImage || '';
    setMenuImage(src);
    if (!src) {
      setStatus('아직 등록된 메뉴 이미지가 없습니다.');
    }
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
    alert('메뉴 이미지 업로드 실패: ' + (error.message || error));
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
    alert('메뉴 이미지 삭제 실패: ' + (error.message || error));
    setStatus('메뉴 이미지 삭제에 실패했습니다.', true);
  } finally {
    setBusy(false, menuImageStatus?.textContent || '');
  }
}

menuImageEl?.addEventListener('load', handleMenuImageLoadSuccess);
menuImageEl?.addEventListener('error', handleMenuImageLoadError);
menuImageInput?.addEventListener('change', handleMenuImageChange);
clearMenuImageBtn?.addEventListener('click', clearMenuImage);
fetchSharedMenuImage();
