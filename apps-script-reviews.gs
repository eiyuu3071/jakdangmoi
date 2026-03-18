// 리뷰 기능 추가용 Apps Script 코드
// 기존 상수 영역에 아래 한 줄 추가
const SHEET_REVIEWS = 'reviews';

// doPost(e) 안에 아래 분기 2개 추가
if (action === 'getReviews') {
  const result = getReviews(payload.date);
  return json({ ok: true, reviews: result.reviews, averageRating: result.averageRating, reviewCount: result.reviewCount });
}

if (action === 'addReview') {
  addReview(payload.review || {});
  const result = getReviews(payload.review?.date || '');
  return json({ ok: true, reviews: result.reviews, averageRating: result.averageRating, reviewCount: result.reviewCount });
}

// 아래 함수들을 기존 코드 아래쪽에 추가
function getReviews(dateStr) {
  const sheet = getSheet(SHEET_REVIEWS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['date', 'nickname', 'rating', 'content', 'createdAt']);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return { reviews: [], averageRating: 0, reviewCount: 0 };
  }

  const rows = values.slice(1)
    .filter(r => String(r[0] || '') === String(dateStr || ''))
    .map(r => ({
      date: String(r[0] || ''),
      nickname: String(r[1] || '익명'),
      rating: Number(r[2] || 0),
      content: String(r[3] || ''),
      createdAt: formatDateTimeCell(r[4])
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const total = rows.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const count = rows.length;

  return {
    reviews: rows,
    averageRating: count ? total / count : 0,
    reviewCount: count
  };
}

function addReview(review) {
  const date = String(review.date || '').trim();
  const nickname = String(review.nickname || '').trim();
  const rating = Number(review.rating || 0);
  const content = String(review.content || '').trim();

  if (!date) throw new Error('date is required');
  if (!nickname) throw new Error('nickname is required');
  if (!content) throw new Error('content is required');
  if (rating < 1 || rating > 5) throw new Error('rating must be between 1 and 5');

  const sheet = getSheet(SHEET_REVIEWS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['date', 'nickname', 'rating', 'content', 'createdAt']);
  }

  sheet.appendRow([
    date,
    nickname,
    rating,
    content,
    new Date()
  ]);
}

function formatDateTimeCell(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(v);
}
