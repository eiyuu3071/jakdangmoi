// 리뷰 비밀번호/삭제 기능 포함 Apps Script 복붙용 코드
const SHEET_REVIEWS = 'reviews';

if (action === 'getReviews') {
  const result = getReviews(payload.date);
  return json({ ok: true, reviews: result.reviews, averageRating: result.averageRating, reviewCount: result.reviewCount });
}

if (action === 'addReview') {
  addReview(payload.review || {});
  const result = getReviews((payload.review || {}).date || '');
  return json({ ok: true, reviews: result.reviews, averageRating: result.averageRating, reviewCount: result.reviewCount });
}

if (action === 'deleteReview') {
  deleteReview(payload.id, payload.password);
  const result = getReviews(payload.date || '');
  return json({ ok: true, reviews: result.reviews, averageRating: result.averageRating, reviewCount: result.reviewCount });
}

function getReviews(dateStr) {
  const sheet = getSheet(SHEET_REVIEWS);
  ensureReviewSheetHeader(sheet);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return { reviews: [], averageRating: 0, reviewCount: 0 };
  }

  const targetDate = formatDateCell(dateStr);
  const rows = values.slice(1)
    .map((row, index) => normalizeReviewRow(row, index + 2))
    .filter(review => review.date === targetDate)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const total = rows.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const count = rows.length;

  return {
    reviews: rows.map(({ password, rowNumber, ...review }) => review),
    averageRating: count ? total / count : 0,
    reviewCount: count
  };
}

function addReview(review) {
  const date = formatDateCell(review.date || '');
  const nickname = String(review.nickname || '').trim();
  const rating = Number(review.rating || 0);
  const content = String(review.content || '').trim();
  const password = String(review.password || '').trim();

  if (!date) throw new Error('date is required');
  if (!nickname) throw new Error('nickname is required');
  if (!content) throw new Error('content is required');
  if (!/^\d{4}$/.test(password)) throw new Error('password must be 4 digits');
  if (rating < 1 || rating > 5) throw new Error('rating must be between 1 and 5');

  const sheet = getSheet(SHEET_REVIEWS);
  ensureReviewSheetHeader(sheet);
  sheet.appendRow([makeReviewId(), date, nickname, rating, content, password, new Date()]);
}

function deleteReview(reviewId, password) {
  const id = String(reviewId || '').trim();
  const pin = String(password || '').trim();
  if (!id) throw new Error('review id is required');
  if (!/^\d{4}$/.test(pin)) throw new Error('password must be 4 digits');

  const sheet = getSheet(SHEET_REVIEWS);
  ensureReviewSheetHeader(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) throw new Error('review not found');

  for (let i = 1; i < values.length; i++) {
    const review = normalizeReviewRow(values[i], i + 1);
    if (review.id !== id) continue;
    if (String(review.password || '') !== pin) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }
    sheet.deleteRow(i + 1);
    return;
  }

  throw new Error('review not found');
}

function ensureReviewSheetHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'date', 'nickname', 'rating', 'content', 'password', 'createdAt']);
    return;
  }

  const header = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  if (String(header[0] || '') === 'id') return;

  const values = sheet.getDataRange().getValues();
  const legacyRows = values.slice(1).map((row) => [
    makeReviewId(),
    formatDateCell(row[0]),
    String(row[1] || '익명'),
    Number(row[2] || 0),
    String(row[3] || ''),
    '',
    row[4] || ''
  ]);

  sheet.clear();
  sheet.getRange(1, 1, 1, 7).setValues([['id', 'date', 'nickname', 'rating', 'content', 'password', 'createdAt']]);
  if (legacyRows.length) {
    sheet.getRange(2, 1, legacyRows.length, 7).setValues(legacyRows);
  }
}

function normalizeReviewRow(row, rowNumber) {
  if (String(row[0] || '').trim() && String(row[0]) !== 'date') {
    return {
      id: String(row[0] || ''),
      date: formatDateCell(row[1]),
      nickname: String(row[2] || '익명'),
      rating: Number(row[3] || 0),
      content: String(row[4] || ''),
      password: String(row[5] || ''),
      createdAt: formatDateTimeCell(row[6]),
      rowNumber
    };
  }

  return {
    id: `legacy-${rowNumber}`,
    date: formatDateCell(row[0]),
    nickname: String(row[1] || '익명'),
    rating: Number(row[2] || 0),
    content: String(row[3] || ''),
    password: '',
    createdAt: formatDateTimeCell(row[4]),
    rowNumber
  };
}

function makeReviewId() {
  return 'rv_' + new Date().getTime() + '_' + Math.random().toString(36).slice(2, 8);
}

function formatDateTimeCell(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(v);
}
