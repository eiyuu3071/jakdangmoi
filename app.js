const API_URL = 'https://script.google.com/macros/s/AKfycbzu8Ozqi7RPJ9l51Gv-XG6C9HVK8UiWZalZjC-6-kgUr51On7ToJNRkrC9tUTYlspneUA/exec';
const API_TOKEN = 'jakdangmoi-2026';

const holidayMap = new Map((window.HOLIDAYS_KO || []).map(h => [h.date, h.name]));
const CACHE_KEY = 'jakdangmoi-cache-v1';

let members = [];
let events = [];
let selectedMembers = new Set();
let baseDate = startOfMonth(new Date());

const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const weekdayNames = ['월','화','수','목','금','토','일'];

const calendarEl = document.getElementById('calendar');
const legendEl = document.getElementById('legend');
const memberFiltersEl = document.getElementById('memberFilters');
const memberSelectEl = document.getElementById('memberSelect');
const eventForm = document.getElementById('eventForm');
const typeInput = document.getElementById('typeInput');
const startInput = document.getElementById('startInput');
const endInput = document.getElementById('endInput');
const noteInput = document.getElementById('noteInput');
const memberForm = document.getElementById('memberForm');
const memberNameInput = document.getElementById('memberNameInput');
const modalEl = document.getElementById('modal');
const modalTitleEl = document.getElementById('modalTitle');
const modalBodyEl = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalClose');
const modalBackdrop = document.getElementById('modalBackdrop');
const openMemberModalBtn = document.getElementById('openMemberModal');
const memberModalEl = document.getElementById('memberModal');
const memberModalCloseBtn = document.getElementById('memberModalClose');
const memberModalBackdrop = document.getElementById('memberModalBackdrop');
const openMemberDeleteModalBtn = document.getElementById('openMemberDeleteModal');
const memberDeleteModalEl = document.getElementById('memberDeleteModal');
const memberDeleteCloseBtn = document.getElementById('memberDeleteClose');
const memberDeleteBackdrop = document.getElementById('memberDeleteBackdrop');
const memberDeleteForm = document.getElementById('memberDeleteForm');
const memberDeleteList = document.getElementById('memberDeleteList');
const openEventModalBtn = document.getElementById('openEventModal');
const eventModalEl = document.getElementById('eventModal');
const eventModalCloseBtn = document.getElementById('eventModalClose');
const eventModalBackdrop = document.getElementById('eventModalBackdrop');
const openEventDeleteModalBtn = document.getElementById('openEventDeleteModal');
const eventDeleteModalEl = document.getElementById('eventDeleteModal');
const eventDeleteCloseBtn = document.getElementById('eventDeleteClose');
const eventDeleteBackdrop = document.getElementById('eventDeleteBackdrop');
const eventDeleteForm = document.getElementById('eventDeleteForm');
const eventDeleteList = document.getElementById('eventDeleteList');
let loadingEl = document.getElementById('loadingOverlay');

let pendingOps = 0;

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');

prevBtn.addEventListener('click', () => {
  baseDate = addMonths(baseDate, -1);
  render();
});

nextBtn.addEventListener('click', () => {
  baseDate = addMonths(baseDate, 1);
  render();
});

todayBtn.addEventListener('click', () => {
  baseDate = startOfMonth(new Date());
  render();
});

async function api(action, payload = {}) {
  if (API_URL.includes('PASTE_')) {
    alert('API_URL을 먼저 설정해주세요.');
    throw new Error('API_URL not set');
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ token: API_TOKEN, action, payload }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || 'API error');
  }
  return data;
}

async function refreshData() {
  try {
    const data = await api('get');
    members = data.members || [];
    events = data.events || [];
    selectedMembers = new Set(members.map(m => m.name));
    saveCache();
  } catch (err) {
    console.error(err);
    alert('데이터를 불러오지 못했습니다. API 설정을 확인해주세요.');
  }
}

function render() {
  calendarEl.innerHTML = '';
  legendEl.innerHTML = '';
  memberFiltersEl.innerHTML = '';
  memberSelectEl.innerHTML = '';

  renderLegend();
  renderMemberFilters();
  renderMonths();
}

function renderLegend() {
  members.forEach(m => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span class="dot" style="background:${m.color}"></span>${m.name}`;
    legendEl.appendChild(chip);
  });
}

function renderMemberFilters() {
  members.forEach(m => {
    const label = document.createElement('label');
    label.className = 'pill';
    label.innerHTML = `<input type="checkbox" ${selectedMembers.has(m.name) ? 'checked' : ''} /> ${m.name}`;
    label.style.borderColor = m.color;
    label.style.background = '#ffffff';
    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedMembers.add(m.name);
      else selectedMembers.delete(m.name);
      render();
    });
    memberFiltersEl.appendChild(label);
  });

  members.forEach(m => {
    const label = document.createElement('label');
    label.className = 'pill';
    label.innerHTML = `<input type="checkbox" /> ${m.name}`;
    label.style.borderColor = m.color;
    label.style.background = '#ffffff';
    memberSelectEl.appendChild(label);
  });
}

function renderMemberDeleteOptions() {
  memberDeleteList.innerHTML = '';
  memberDeleteList.dataset.selectedNames = '';
  members.forEach(m => {
    const item = document.createElement('div');
    item.className = 'select-item';
    item.dataset.name = m.name;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;

    const color = document.createElement('span');
    color.className = 'select-color';
    color.style.background = m.color;

    const text = document.createElement('div');
    text.className = 'select-text';
    text.textContent = m.name;

    item.appendChild(checkbox);
    item.appendChild(color);
    item.appendChild(text);

    item.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
      }
      item.classList.toggle('selected', checkbox.checked);
      updateMemberDeleteSelection();
    });
    checkbox.addEventListener('change', () => {
      item.classList.toggle('selected', checkbox.checked);
      updateMemberDeleteSelection();
    });

    memberDeleteList.appendChild(item);
  });

  updateMemberDeleteSelection();
}

function renderEventDeleteOptions() {
  eventDeleteList.innerHTML = '';
  eventDeleteList.dataset.selectedIds = '';
  const sorted = events
    .slice()
    .sort((a, b) => parseDate(a.start) - parseDate(b.start));

  sorted.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'select-item';
    item.dataset.id = ev.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;

    const color = document.createElement('span');
    color.className = 'select-color';
    const member = members.find(m => m.name === ev.member);
    color.style.background = member?.color || '#e5e7eb';

    const text = document.createElement('div');
    text.className = 'select-text';
    const note = ev.note ? ` · ${ev.note}` : '';
    text.textContent = `${ev.member} · ${ev.type} · ${formatDate(ev.start)}~${formatDate(ev.end)}${note}`;

    item.appendChild(checkbox);
    item.appendChild(color);
    item.appendChild(text);

    item.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
      }
      item.classList.toggle('selected', checkbox.checked);
      updateDeleteSelection();
    });
    checkbox.addEventListener('change', () => {
      item.classList.toggle('selected', checkbox.checked);
      updateDeleteSelection();
    });

    eventDeleteList.appendChild(item);
  });

  updateDeleteSelection();
}

function renderMonths() {
  const monthDate = addMonths(baseDate, 0);
  calendarEl.appendChild(renderMonth(monthDate));
}

function renderMonth(monthDate) {
  const monthEl = document.createElement('section');
  monthEl.className = 'month';

  const title = document.createElement('h3');
  title.textContent = `${monthDate.getFullYear()}년 ${monthNames[monthDate.getMonth()]}`;
  monthEl.appendChild(title);

  const weekdays = document.createElement('div');
  weekdays.className = 'weekdays';
  weekdayNames.forEach(w => {
    const cell = document.createElement('div');
    cell.textContent = w;
    weekdays.appendChild(cell);
  });
  monthEl.appendChild(weekdays);

  const grid = document.createElement('div');
  grid.className = 'grid';

  const start = startOfCalendar(monthDate);
  const days = 42;
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const cell = document.createElement('div');
    cell.className = 'day';
    cell.dataset.date = formatDateISO(day);

    if (day.getMonth() !== monthDate.getMonth()) {
      cell.classList.add('muted');
    }

    if (isSameDay(day, new Date())) {
      cell.style.border = '1px solid #111827';
    }

    const dateEl = document.createElement('div');
    dateEl.className = 'date';
    dateEl.textContent = day.getDate();

    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0) dateEl.classList.add('sun');
    if (dayOfWeek === 6) dateEl.classList.add('sat');

    const iso = formatDateISO(day);
    const holidayName = holidayMap.get(iso);
    if (holidayName) {
      dateEl.classList.add('holiday');
    }

    const header = document.createElement('div');
    header.className = 'day-header';
    if (holidayName) {
      const holidayEl = document.createElement('div');
      holidayEl.className = 'holiday-label';
      holidayEl.textContent = holidayName;
      header.appendChild(holidayEl);
    } else {
      const spacer = document.createElement('div');
      header.appendChild(spacer);
    }
    header.appendChild(dateEl);

    const eventsEl = document.createElement('div');
    eventsEl.className = 'events';

    const dayEvents = eventsForDay(day);
    dayEvents.forEach(ev => {
      const eventEl = document.createElement('div');
      eventEl.className = 'event';
      const member = members.find(m => m.name === ev.member);
      eventEl.style.background = member?.color || '#e5e7eb';
      eventEl.textContent = ev.member;
      eventsEl.appendChild(eventEl);
    });

    cell.appendChild(header);
    cell.appendChild(eventsEl);
    grid.appendChild(cell);

    cell.addEventListener('click', () => {
      openModalForDate(day);
    });
  }

  monthEl.appendChild(grid);
  return monthEl;
}

function eventsForDay(day) {
  return events.filter(ev => selectedMembers.has(ev.member) && inRange(day, ev.start, ev.end));
}

function normalizeDateStr(input) {
  if (input === null || input === undefined) return '';
  let s = String(input).trim();
  if (s.includes('T')) s = s.split('T')[0];
  return s;
}

function parseDate(input) {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  const s = normalizeDateStr(input);
  if (!s) return new Date(NaN);

  const m = s.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date(NaN) : d;
}

function formatDate(str) {
  const d = parseDate(str);
  if (isNaN(d.getTime())) return String(str);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function inRange(day, startStr, endStr) {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  return day >= startOfDay(start) && day <= endOfDay(end);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function addDays(date, count) {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfCalendar(monthDate) {
  const first = startOfMonth(monthDate);
  const day = first.getDay();
  const offset = (day + 6) % 7;
  return addDays(first, -offset);
}

async function handleAddEvent(e) {
  e.preventDefault();
  const selected = [...memberSelectEl.querySelectorAll('input[type="checkbox"]')]
    .filter(i => i.checked)
    .map(i => i.parentElement.textContent.trim());

  if (selected.length === 0) {
    alert('대상 인원을 1명 이상 선택하세요.');
    return;
  }

  if (!startInput.value || !endInput.value) {
    alert('시작일과 종료일을 입력하세요.');
    return;
  }

  if (startInput.value > endInput.value) {
    alert('종료일은 시작일 이후여야 합니다.');
    return;
  }

  const newEvents = selected.map(name => ({
    id: makeId(),
    member: name,
    type: typeInput.value,
    start: startInput.value,
    end: endInput.value,
    note: noteInput.value.trim(),
  }));

  const prevEvents = events.slice();
  events = events.concat(newEvents);
  render();

  try {
    eventForm.reset();
    closeEventModal();
    beginOp();
    await api('addEvent', { events: newEvents });
    await refreshData();
    render();
  } catch (err) {
    events = prevEvents;
    render();
    alert('일정 추가에 실패했습니다.');
  } finally {
    endOp();
  }
}

async function handleAddMember(e) {
  e.preventDefault();
  const name = memberNameInput.value.trim();
  if (!name) return;
  if (members.some(m => m.name === name)) {
    alert('이미 존재하는 이름입니다.');
    return;
  }
  const color = nextMemberColor();

  const prevMembers = members.slice();
  members = members.concat([{ name, color }]);
  selectedMembers.add(name);
  render();

  try {
    memberForm.reset();
    closeMemberModal();
    beginOp();
    await api('addMember', { name, color });
    await refreshData();
    render();
  } catch (err) {
    members = prevMembers;
    selectedMembers = new Set(members.map(m => m.name));
    render();
    alert('인원 추가에 실패했습니다.');
  } finally {
    endOp();
  }
}

async function handleDeleteMembers(e) {
  e.preventDefault();
  const names = (memberDeleteList.dataset.selectedNames || '').split(',').filter(Boolean);
  if (names.length === 0) return;
  const ok = confirm('선택한 인원의 일정도 함께 삭제됩니다. 진행할까요?');
  if (!ok) return;

  const prevMembers = members.slice();
  const prevEvents = events.slice();
  members = members.filter(m => !names.includes(m.name));
  events = events.filter(ev => !names.includes(ev.member));
  selectedMembers = new Set(members.map(m => m.name));
  render();

  try {
    closeMemberDeleteModal();
    beginOp();
    await api('deleteMember', { names });
    await refreshData();
    render();
  } catch (err) {
    members = prevMembers;
    events = prevEvents;
    selectedMembers = new Set(members.map(m => m.name));
    render();
    alert('인원 삭제에 실패했습니다.');
  } finally {
    endOp();
  }
}

async function handleDeleteEvents(e) {
  e.preventDefault();
  const ids = (eventDeleteList.dataset.selectedIds || '').split(',').filter(Boolean);
  if (ids.length === 0) return;

  const prevEvents = events.slice();
  events = events.filter(ev => !ids.includes(ev.id));
  render();

  try {
    closeEventDeleteModal();
    beginOp();
    await api('deleteEvent', { ids });
    await refreshData();
    render();
  } catch (err) {
    events = prevEvents;
    render();
    alert('일정 삭제에 실패했습니다.');
  } finally {
    endOp();
  }
}

function updateDeleteSelection() {
  const ids = [...eventDeleteList.querySelectorAll('.select-item')]
    .filter(item => item.querySelector('input').checked)
    .map(item => item.dataset.id);
  eventDeleteList.dataset.selectedIds = ids.join(',');
}

function updateMemberDeleteSelection() {
  const names = [...memberDeleteList.querySelectorAll('.select-item')]
    .filter(item => item.querySelector('input').checked)
    .map(item => item.dataset.name);
  memberDeleteList.dataset.selectedNames = names.join(',');
}

function makeId() {
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nextMemberColor() {
  const palette = ['#a7f3d0', '#fde68a', '#bfdbfe', '#fbcfe8', '#ddd6fe', '#fecaca', '#bae6fd', '#fde2e4', '#bbf7d0', '#fef3c7'];
  const used = new Set(members.map(m => m.color));
  const available = palette.find(c => !used.has(c));
  return available || palette[Math.floor(Math.random() * palette.length)];
}

function openModalForDate(day) {
  const dateText = formatDateISO(day);
  const dayEvents = eventsForDay(day);
  modalTitleEl.textContent = `${dateText} 일정`;
  modalBodyEl.innerHTML = '';

  if (dayEvents.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = '등록된 일정이 없습니다.';
    modalBodyEl.appendChild(empty);
  } else {
    dayEvents.forEach(ev => {
      const item = document.createElement('div');
      item.className = 'modal-item';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = `${ev.member} · ${ev.type}`;
      const sub = document.createElement('div');
      sub.className = 'sub';
      sub.textContent = `${formatDate(ev.start)} ~ ${formatDate(ev.end)}${ev.note ? ` · ${ev.note}` : ''}`;
      item.appendChild(title);
      item.appendChild(sub);
      modalBodyEl.appendChild(item);
    });
  }

  modalEl.classList.remove('hidden');
}

function closeModal() {
  modalEl.classList.add('hidden');
}

function openMemberModal() {
  memberModalEl.classList.remove('hidden');
  memberNameInput.focus();
}

function closeMemberModal() {
  memberModalEl.classList.add('hidden');
}

function openMemberDeleteModal() {
  renderMemberDeleteOptions();
  memberDeleteModalEl.classList.remove('hidden');
}

function closeMemberDeleteModal() {
  memberDeleteModalEl.classList.add('hidden');
}

function openEventModal() {
  eventModalEl.classList.remove('hidden');
}

function closeEventModal() {
  eventModalEl.classList.add('hidden');
}

function openEventDeleteModal() {
  renderEventDeleteOptions();
  eventDeleteModalEl.classList.remove('hidden');
}

function closeEventDeleteModal() {
  eventDeleteModalEl.classList.add('hidden');
}

modalCloseBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);
openMemberModalBtn.addEventListener('click', openMemberModal);
memberModalCloseBtn.addEventListener('click', closeMemberModal);
memberModalBackdrop.addEventListener('click', closeMemberModal);
openMemberDeleteModalBtn.addEventListener('click', openMemberDeleteModal);
memberDeleteCloseBtn.addEventListener('click', closeMemberDeleteModal);
memberDeleteBackdrop.addEventListener('click', closeMemberDeleteModal);
openEventModalBtn.addEventListener('click', openEventModal);
eventModalCloseBtn.addEventListener('click', closeEventModal);
eventModalBackdrop.addEventListener('click', closeEventModal);
openEventDeleteModalBtn.addEventListener('click', openEventDeleteModal);
eventDeleteCloseBtn.addEventListener('click', closeEventDeleteModal);
eventDeleteBackdrop.addEventListener('click', closeEventDeleteModal);

memberForm.addEventListener('submit', handleAddMember);
eventForm.addEventListener('submit', handleAddEvent);
memberDeleteForm.addEventListener('submit', handleDeleteMembers);
eventDeleteForm.addEventListener('submit', handleDeleteEvents);

document.addEventListener('DOMContentLoaded', async () => {
  const cached = loadCache();
  if (cached) {
    members = cached.members;
    events = cached.events;
    selectedMembers = new Set(members.map(m => m.name));
    render();
  }
  await refreshData();
  render();
});

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.members) || !Array.isArray(parsed.events)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ members, events, ts: Date.now() }));
  } catch {}
}

function showLoading(on) {
  if (!loadingEl) {
    const el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.className = 'loading hidden';
    el.innerHTML = '<div class="loading-card"><div class="spinner"></div><div>동기화 중…</div></div>';
    document.body.appendChild(el);
    loadingEl = el;
  }
  loadingEl.classList.toggle('hidden', !on);
}

function beginOp() {
  pendingOps += 1;
  showLoading(true);
}

function endOp() {
  pendingOps = Math.max(0, pendingOps - 1);
  if (pendingOps === 0) showLoading(false);
}

