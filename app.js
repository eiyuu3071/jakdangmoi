const defaultMembers = [
  { name: '해신', color: '#a7f3d0' },
  { name: '형배', color: '#fde68a' },
  { name: '명환', color: '#bfdbfe' },
  { name: '선호', color: '#fbcfe8' },
  { name: '영웅', color: '#ddd6fe' },
];


const STORAGE_KEY = 'team-schedule-events-v1';
const MEMBERS_KEY = 'team-schedule-members-v1';
const holidayMap = new Map((window.HOLIDAYS_KO || []).map(h => [h.date, h.name]));

const defaultEvents = [
  { member: '해신', type: '휴가', start: '2026-03-03', end: '2026-03-07' },
  { member: '형배', type: '출장', start: '2026-02-26', end: '2026-04-15', note: '미주 파트너 미팅' },
  { member: '명환', type: '출장', start: '2026-03-18', end: '2026-03-20', note: '고객사 방문' },
  { member: '선호', type: '휴가', start: '2026-04-10', end: '2026-04-14' },
  { member: '영웅', type: '출장', start: '2026-04-25', end: '2026-05-12', note: '장기 프로젝트' },
];

let members = loadMembers();
let events = loadEvents();
pruneExpiredEvents();

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

let baseDate = startOfMonth(new Date());
let selectedMembers = new Set(members.map(m => m.name));

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

function render() {
  pruneExpiredEvents();
  calendarEl.innerHTML = '';
  legendEl.innerHTML = '';
  memberFiltersEl.innerHTML = '';
  memberSelectEl.innerHTML = '';

  renderLegend();
  renderMemberFilters();
  renderMemberDeleteOptions();
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

    const dayOfWeek = day.getDay(); // 0 Sun ... 6 Sat
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
  return visibleEvents().filter(ev => inRange(day, ev.start, ev.end));
}

function visibleEvents() {
  return events.filter(ev => selectedMembers.has(ev.member));
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(str) {
  const d = parseDate(str);
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

function daysInclusive(startStr, endStr) {
  const start = startOfDay(parseDate(startStr));
  const end = startOfDay(parseDate(endStr));
  const diff = (end - start) / (1000 * 60 * 60 * 24);
  return diff + 1;
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
  const day = first.getDay(); // 0 Sun, 1 Mon
  const offset = (day + 6) % 7; // Monday start
  return addDays(first, -offset);
}

eventForm.addEventListener('submit', (e) => {
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

  selected.forEach(name => {
    events.push({
      id: makeId(),
      member: name,
      type: typeInput.value,
      start: startInput.value,
      end: endInput.value,
      note: noteInput.value.trim(),
    });
  });

  saveEvents();
  eventForm.reset();
  closeEventModal();
  render();
});

memberForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = memberNameInput.value.trim();
  if (!name) return;
  if (members.some(m => m.name === name)) {
    alert('이미 존재하는 이름입니다.');
    return;
  }
  const color = nextMemberColor();
  members.push({ name, color });
  selectedMembers.add(name);
  saveMembers();
  memberForm.reset();
  closeMemberModal();
  render();
});

memberDeleteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const names = (memberDeleteList.dataset.selectedNames || '').split(',').filter(Boolean);
  if (names.length === 0) return;
  names.forEach(name => deleteMember(name));
  closeMemberDeleteModal();
});

function updateMemberDeleteSelection() {
  const names = [...memberDeleteList.querySelectorAll('.select-item')]
    .filter(item => item.querySelector('input').checked)
    .map(item => item.dataset.name);
  memberDeleteList.dataset.selectedNames = names.join(',');
}

eventDeleteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const ids = (eventDeleteList.dataset.selectedIds || '').split(',').filter(Boolean);
  if (ids.length === 0) return;
  ids.forEach(id => deleteEvent(id));
  closeEventDeleteModal();
});

function updateDeleteSelection() {
  const ids = [...eventDeleteList.querySelectorAll('.select-item')]
    .filter(item => item.querySelector('input').checked)
    .map(item => item.dataset.id);
  eventDeleteList.dataset.selectedIds = ids.join(',');
}

function deleteEvent(id) {
  events = events.filter(ev => ev.id !== id);
  saveEvents();
  render();
}

function pruneExpiredEvents() {
  const today = startOfDay(new Date());
  const before = events.length;
  events = events.filter(ev => {
    const end = endOfDay(parseDate(ev.end));
    return end >= today;
  });
  if (events.length !== before) {
    saveEvents();
  }
}

function deleteMember(name) {
  const hasEvents = events.some(ev => ev.member === name);
  if (hasEvents) {
    const ok = confirm('이 인원의 일정도 함께 삭제됩니다. 진행할까요?');
    if (!ok) return;
  }
  members = members.filter(m => m.name !== name);
  events = events.filter(ev => ev.member !== name);
  selectedMembers.delete(name);
  saveMembers();
  saveEvents();
  render();
}

function loadEvents() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultEvents.map(e => ({ ...e, id: makeId() }));
  try {
    const parsed = JSON.parse(raw);
    return parsed.map(e => ({ ...e, id: e.id || makeId() }));
  } catch {
    return defaultEvents.map(e => ({ ...e, id: makeId() }));
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function loadMembers() {
  const raw = localStorage.getItem(MEMBERS_KEY);
  if (!raw) return [...defaultMembers];
  try {
    const parsed = JSON.parse(raw);
    return parsed.length ? parsed : [...defaultMembers];
  } catch {
    return [...defaultMembers];
  }
}

function saveMembers() {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

function nextMemberColor() {
  const palette = ['#a7f3d0', '#fde68a', '#bfdbfe', '#fbcfe8', '#ddd6fe', '#fecaca', '#bae6fd', '#fde2e4', '#bbf7d0', '#fef3c7'];
  const used = new Set(members.map(m => m.color));
  const available = palette.find(c => !used.has(c));
  return available || palette[Math.floor(Math.random() * palette.length)];
}

function makeId() {
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

modalCloseBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

function openMemberModal() {
  memberModalEl.classList.remove('hidden');
  memberNameInput.focus();
}

function closeMemberModal() {
  memberModalEl.classList.add('hidden');
}

openMemberModalBtn.addEventListener('click', openMemberModal);
memberModalCloseBtn.addEventListener('click', closeMemberModal);
memberModalBackdrop.addEventListener('click', closeMemberModal);

function openMemberDeleteModal() {
  renderMemberDeleteOptions();
  memberDeleteModalEl.classList.remove('hidden');
}

function closeMemberDeleteModal() {
  memberDeleteModalEl.classList.add('hidden');
}

openMemberDeleteModalBtn.addEventListener('click', openMemberDeleteModal);
memberDeleteCloseBtn.addEventListener('click', closeMemberDeleteModal);
memberDeleteBackdrop.addEventListener('click', closeMemberDeleteModal);

function openEventModal() {
  eventModalEl.classList.remove('hidden');
}

function closeEventModal() {
  eventModalEl.classList.add('hidden');
}

openEventModalBtn.addEventListener('click', openEventModal);
eventModalCloseBtn.addEventListener('click', closeEventModal);
eventModalBackdrop.addEventListener('click', closeEventModal);

function openEventDeleteModal() {
  renderEventDeleteOptions();
  eventDeleteModalEl.classList.remove('hidden');
}

function closeEventDeleteModal() {
  eventDeleteModalEl.classList.add('hidden');
}

openEventDeleteModalBtn.addEventListener('click', openEventDeleteModal);
eventDeleteCloseBtn.addEventListener('click', closeEventDeleteModal);
eventDeleteBackdrop.addEventListener('click', closeEventDeleteModal);

render();
