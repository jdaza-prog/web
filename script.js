const qs = (s) => document.querySelector(s);
const qsa = (s) => [...document.querySelectorAll(s)];

const yesBtn = qs('#yes-btn');
const noBtn = qs('#no-btn');
const stoneOverlay = qs('#stone-overlay');
const stoneClose = qs('#stone-close');
const dateInput = qs('#date-input');
const timeSelect = qs('#time-select');
const setDateBtn = qs('#set-date-btn');
const finishPlanBtn = qs('#finish-plan-btn');
const summary = qs('#summary');
const acceptBtn = qs('#accept-btn');

let noAttempts = 0;
let selectedPlan = '';
let selectedDate = '';
let selectedTime = '';
let stoneWarningShown = false;
let autoMoveTimer = null;
let autoMoveStartTimer = null;

function showScreen(id) {
  qsa('.screen').forEach(s => s.classList.remove('active'));
  qs('#' + id).classList.add('active');

  const inviteActive = id === 'screen-invite';
  document.body.classList.toggle('invite-active', inviteActive);

  if (inviteActive) {
    startAutoNoMovement();
  } else {
    stopAutoNoMovement();
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function viewportSize() {
  const vv = window.visualViewport;
  return {
    width: vv ? vv.width : document.documentElement.clientWidth,
    height: vv ? vv.height : document.documentElement.clientHeight,
    offsetLeft: vv ? vv.offsetLeft : 0,
    offsetTop: vv ? vv.offsetTop : 0
  };
}

function placeNoBesideYes() {
  const yesRect = yesBtn.getBoundingClientRect();
  const noRect = noBtn.getBoundingClientRect();
  const vp = viewportSize();
  const margin = 16;

  let left = yesRect.right + 12;
  let top = yesRect.top;

  if (left + noRect.width > vp.offsetLeft + vp.width - margin) {
    left = yesRect.left - noRect.width - 12;
  }

  const minLeft = vp.offsetLeft + margin;
  const maxLeft = vp.offsetLeft + vp.width - noRect.width - margin;
  const minTop = vp.offsetTop + margin;
  const maxTop = vp.offsetTop + vp.height - noRect.height - margin;

  noBtn.style.left = `${Math.max(minLeft, Math.min(left, maxLeft))}px`;
  noBtn.style.top = `${Math.max(minTop, Math.min(top, maxTop))}px`;
}

function moveNoButton() {
  if (stoneOverlay.classList.contains('show')) return;
  if (!qs('#screen-invite').classList.contains('active')) return;

  const rect = noBtn.getBoundingClientRect();
  const vp = viewportSize();
  const margin = 18;

  const minX = vp.offsetLeft + margin;
  const maxX = vp.offsetLeft + vp.width - rect.width - margin;
  const minY = vp.offsetTop + margin;
  const maxY = vp.offsetTop + vp.height - rect.height - margin;

  if (maxX <= minX || maxY <= minY) return;

  // Busca una nueva posición suficientemente distinta de la actual,
  // pero siempre dentro de la zona visible del celular.
  let x = minX;
  let y = minY;
  const minDistance = Math.min(120, Math.max(70, vp.width * 0.22));

  for (let i = 0; i < 12; i++) {
    const candidateX = minX + Math.random() * (maxX - minX);
    const candidateY = minY + Math.random() * (maxY - minY);
    const distance = Math.hypot(candidateX - rect.left, candidateY - rect.top);
    x = candidateX;
    y = candidateY;
    if (distance >= minDistance) break;
  }

  noBtn.style.left = `${Math.round(x)}px`;
  noBtn.style.top = `${Math.round(y)}px`;
}

function registerNoAttempt(event) {
  if (event) event.preventDefault();
  if (stoneOverlay.classList.contains('show')) return;
  if (!qs('#screen-invite').classList.contains('active')) return;

  noAttempts++;
  moveNoButton();

  if (noAttempts === 5 && !stoneWarningShown) {
    stoneWarningShown = true;
    stopAutoNoMovement();
    stoneOverlay.classList.add('show');
    stoneOverlay.setAttribute('aria-hidden', 'false');
  }
}

function stopAutoNoMovement() {
  if (autoMoveStartTimer) {
    clearTimeout(autoMoveStartTimer);
    autoMoveStartTimer = null;
  }
  if (autoMoveTimer) {
    clearInterval(autoMoveTimer);
    autoMoveTimer = null;
  }
}

function startAutoNoMovement() {
  stopAutoNoMovement();

  // En celular queda quieto un momento para que se vea la pregunta.
  // Después empieza a escapar por sí solo.
  autoMoveStartTimer = setTimeout(() => {
    moveNoButton();
    autoMoveTimer = setInterval(moveNoButton, 1350);
  }, 2000);
}

// En PC conserva el efecto por mouse; en celular, tocar "No" cuenta como intento
// y lo hace escapar inmediatamente. Los movimientos automáticos NO cuentan.
noBtn.addEventListener('mouseover', (event) => {
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    registerNoAttempt(event);
  }
});
noBtn.addEventListener('pointerdown', (event) => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    registerNoAttempt(event);
  }
});

// Estado inicial: No aparece al lado de Sí y permanece quieto durante 2 segundos.
document.body.classList.add('invite-active');
requestAnimationFrame(() => {
  placeNoBesideYes();
  startAutoNoMovement();
});

window.addEventListener('resize', () => {
  if (qs('#screen-invite').classList.contains('active')) placeNoBesideYes();
});
window.visualViewport?.addEventListener('resize', () => {
  if (qs('#screen-invite').classList.contains('active')) placeNoBesideYes();
});

stoneClose.addEventListener('click', () => {
  stoneOverlay.classList.remove('show');
  stoneOverlay.setAttribute('aria-hidden', 'true');
  startAutoNoMovement();
});

yesBtn.addEventListener('click', () => {
  stopAutoNoMovement();
  noBtn.style.display = 'none';
  showScreen('screen-surprise');
});

qsa('.next-btn').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.next));
});

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function configureThisWeek() {
  const now = new Date();
  now.setHours(0,0,0,0);

  // Domingo de la semana actual. Si hoy es domingo, solo permite hoy.
  const daysUntilSunday = (7 - now.getDay()) % 7;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);

  dateInput.min = formatLocalDate(now);
  dateInput.max = formatLocalDate(sunday);
  dateInput.value = '';
}

function buildTimes() {
  for (let hour = 17; hour <= 22; hour++) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      timeSelect.appendChild(option);
    }
  }
  const last = document.createElement('option');
  last.value = '23:00';
  last.textContent = '23:00';
  timeSelect.appendChild(last);
}

function validateWhen() {
  setDateBtn.disabled = !(dateInput.value && timeSelect.value);
}

dateInput.addEventListener('change', validateWhen);
timeSelect.addEventListener('change', validateWhen);

setDateBtn.addEventListener('click', () => {
  selectedDate = dateInput.value;
  selectedTime = timeSelect.value;
  showScreen('screen-plan');
});

qsa('.plan-option').forEach(btn => {
  btn.addEventListener('click', () => {
    qsa('.plan-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedPlan = btn.dataset.plan;
    finishPlanBtn.disabled = false;
  });
});

function prettyDate(iso) {
  const [y,m,d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(dt);
}

finishPlanBtn.addEventListener('click', () => {
  const dayText = prettyDate(selectedDate);
  summary.textContent = `Entonces queda: ${dayText}, ${selectedTime}. ${selectedPlan}. Yo me encargo del resto.`;
  showScreen('screen-final');
});

acceptBtn.addEventListener('click', () => {
  const phone = '59171736156';
  const message = encodeURIComponent(`Sí. ${prettyDate(selectedDate)}, ${selectedTime}. ${selectedPlan}.`);
  window.location.href = `https://wa.me/${phone}?text=${message}`;
});

configureThisWeek();
buildTimes();
