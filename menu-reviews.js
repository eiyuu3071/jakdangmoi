const reviewDateInput = document.getElementById('reviewDateInput');
const reviewAverageText = document.getElementById('reviewAverageText');
const reviewAverageStars = document.getElementById('reviewAverageStars');
const reviewCountText = document.getElementById('reviewCountText');
const reviewSelectedDateText = document.getElementById('reviewSelectedDateText');
const reviewList = document.getElementById('reviewList');
const reviewEmptyState = document.getElementById('reviewEmptyState');
const reviewStatus = document.getElementById('reviewStatus');
const reviewForm = document.getElementById('reviewForm');
const reviewNicknameInput = document.getElementById('reviewNicknameInput');
const reviewContentInput = document.getElementById('reviewContentInput');
const reviewRatingInput = document.getElementById('reviewRatingInput');
const reviewSubmitBtn = document.getElementById('reviewSubmitBtn');
const reviewStarButtons = [...document.querySelectorAll('.review-star-btn')];

let reviewBusy = false;
let currentReviewDate = getTodayIso();

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function setReviewStatus(message, isError = false) {
  if (!reviewStatus) return;
  reviewStatus.textContent = message || '';
  reviewStatus.classList.toggle('is-error', Boolean(isError));
}

function setReviewBusy(isBusy, message = '') {
  reviewBusy = isBusy;
  if (reviewSubmitBtn) {
    reviewSubmitBtn.disabled = isBusy;
    reviewSubmitBtn.classList.toggle('review-submit-busy', isBusy);
  }
  if (reviewDateInput) {
    reviewDateInput.disabled = isBusy;
  }
  setReviewStatus(message, false);
}

function formatReviewDateLabel(dateStr) {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 리뷰`;
}

function renderReviewStars(score) {
  const rounded = Math.round(Number(score) || 0);
  return '★★★★★'.slice(0, rounded) + '☆☆☆☆☆'.slice(0, 5 - rounded);
}

function applySelectedRating(rating) {
  const value = Math.min(5, Math.max(1, Number(rating) || 5));
  reviewRatingInput.value = String(value);
  reviewStarButtons.forEach((button) => {
    const buttonRating = Number(button.dataset.rating || 0);
    button.classList.toggle('is-active', buttonRating <= value);
    button.textContent = buttonRating <= value ? '★' : '☆';
  });
}

function renderReviewSummary(data) {
  const average = Number(data.averageRating || 0);
  const count = Number(data.reviewCount || 0);
  reviewAverageText.textContent = count ? average.toFixed(1) : '0.0';
  reviewAverageStars.textContent = count ? renderReviewStars(average) : '☆☆☆☆☆';
  reviewCountText.textContent = `${count}개`;
  reviewSelectedDateText.textContent = formatReviewDateLabel(currentReviewDate);
}

function renderReviewList(reviews) {
  reviewList.innerHTML = '';
  const hasReviews = Array.isArray(reviews) && reviews.length > 0;
  reviewEmptyState.hidden = hasReviews;

  if (!hasReviews) return;

  reviews.forEach((review) => {
    const item = document.createElement('article');
    item.className = 'review-card';

    const head = document.createElement('div');
    head.className = 'review-card-head';

    const authorWrap = document.createElement('div');
    const author = document.createElement('div');
    author.className = 'review-author';
    author.textContent = review.nickname || '익명';
    const created = document.createElement('div');
    created.className = 'review-created';
    created.textContent = formatReviewCreatedAt(review.createdAt || review.date || currentReviewDate);
    authorWrap.appendChild(author);
    authorWrap.appendChild(created);

    const rating = document.createElement('div');
    rating.className = 'review-rating';
    rating.textContent = renderReviewStars(review.rating || 0);

    const body = document.createElement('div');
    body.className = 'review-body';
    body.textContent = review.content || '';

    head.appendChild(authorWrap);
    head.appendChild(rating);
    item.appendChild(head);
    item.appendChild(body);
    reviewList.appendChild(item);
  });
}

function formatReviewCreatedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(0, 16);
  }
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function refreshReviews(dateStr = currentReviewDate) {
  currentReviewDate = dateStr || getTodayIso();
  if (reviewDateInput) reviewDateInput.value = currentReviewDate;

  try {
    setReviewBusy(true, '리뷰를 불러오는 중입니다...');
    const data = await api('getReviews', { date: currentReviewDate });
    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    renderReviewSummary(data);
    renderReviewList(reviews);
    setReviewStatus(reviews.length ? '공용 리뷰가 표시되고 있습니다.' : '아직 등록된 리뷰가 없습니다.', false);
  } catch (error) {
    console.error(error);
    renderReviewSummary({ averageRating: 0, reviewCount: 0 });
    renderReviewList([]);
    setReviewStatus('리뷰를 불러오지 못했습니다. Apps Script에 리뷰 기능 코드를 추가했는지 확인해주세요.', true);
  } finally {
    setReviewBusy(false, reviewStatus?.textContent || '');
  }
}

async function handleReviewSubmit(event) {
  event.preventDefault();
  if (reviewBusy) return;

  const nickname = reviewNicknameInput.value.trim();
  const content = reviewContentInput.value.trim();
  const rating = Number(reviewRatingInput.value || 0);

  if (!nickname) {
    alert('닉네임을 입력해주세요.');
    reviewNicknameInput.focus();
    return;
  }

  if (!content) {
    alert('리뷰 내용을 입력해주세요.');
    reviewContentInput.focus();
    return;
  }

  if (rating < 1 || rating > 5) {
    alert('별점을 선택해주세요.');
    return;
  }

  try {
    setReviewBusy(true, '리뷰를 등록하는 중입니다...');
    await api('addReview', {
      review: {
        date: currentReviewDate,
        nickname,
        rating,
        content
      }
    });
    reviewContentInput.value = '';
    applySelectedRating(5);
    await refreshReviews(currentReviewDate);
    setReviewStatus('리뷰가 등록되었습니다.', false);
  } catch (error) {
    console.error(error);
    alert('리뷰 등록 실패: ' + (error.message || error));
    setReviewStatus('리뷰 등록에 실패했습니다.', true);
  } finally {
    setReviewBusy(false, reviewStatus?.textContent || '');
  }
}

reviewStarButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applySelectedRating(Number(button.dataset.rating || 5));
  });
});

reviewDateInput?.addEventListener('change', () => {
  refreshReviews(reviewDateInput.value || getTodayIso());
});
reviewForm?.addEventListener('submit', handleReviewSubmit);

applySelectedRating(Number(reviewRatingInput?.value || 5));
refreshReviews(currentReviewDate);
