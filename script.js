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

function showScreen(id) {
  qsa('.screen').forEach(s => s.classList.remove('active'));
  qs('#' + id).classList.add('active');

  // En la pantalla inicial bloqueamos por completo el scroll.
  // En las demás pantallas vuelve a funcionar normalmente.
  document.body.classList.toggle('invite-active', id === 'screen-invite');
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

// Movimiento del botón "No" basado en el proyecto original.
// La diferencia es que las coordenadas se limitan al viewport que existía
// cuando se abrió la página, para que jamás genere barras de desplazamiento.
const initialViewport = {
  width: window.visualViewport?.width || window.innerWidth,
  height: window.visualViewport?.height || window.innerHeight
};

function visibleViewportSize() {
  return {
    width: Math.min(initialViewport.width, window.visualViewport?.width || window.innerWidth),
    height: Math.min(initialViewport.height, window.visualViewport?.height || window.innerHeight)
  };
}

function placeNoBesideYes() {
  const yesRect = yesBtn.getBoundingClientRect();
  const noRect = noBtn.getBoundingClientRect();
  const { width: vw, height: vh } = visibleViewportSize();
  const margin = 24;

  let left = yesRect.right + 18;
  let top = yesRect.top;

  // Si no cabe a la derecha, lo ponemos a la izquierda del Sí.
  if (left + noRect.width > vw - margin) {
    left = yesRect.left - noRect.width - 18;
  }

  left = Math.max(margin, Math.min(left, vw - noRect.width - margin));
  top = Math.max(margin, Math.min(top, vh - noRect.height - margin));

  noBtn.style.left = `${left}px`;
  noBtn.style.top = `${top}px`;
}

function moveNoButton() {
  if (stoneOverlay.classList.contains('show')) return;
  if (!qs('#screen-invite').classList.contains('active')) return;

  const { width, height } = noBtn.getBoundingClientRect();
  const { width: vw, height: vh } = visibleViewportSize();
  const margin = 28;

  const maxX = Math.max(margin, vw - width - margin);
  const maxY = Math.max(margin, vh - height - margin);

  const x = margin + Math.random() * Math.max(0, maxX - margin);
  const y = margin + Math.random() * Math.max(0, maxY - margin);

  noBtn.style.left = `${Math.floor(x)}px`;
  noBtn.style.top = `${Math.floor(y)}px`;
}

function handleNoMouseOver() {
  if (stoneOverlay.classList.contains('show')) return;

  noAttempts++;
  moveNoButton();

  if (noAttempts === 5 && !stoneWarningShown) {
    stoneWarningShown = true;
    noBtn.removeEventListener('mouseover', handleNoMouseOver);
    stoneOverlay.classList.add('show');
    stoneOverlay.setAttribute('aria-hidden', 'false');
  }
}

noBtn.addEventListener('mouseover', handleNoMouseOver);

// Estado inicial: ambos botones aparecen en su posición normal.
// El botón "No" solo se mueve cuando el mouse se acerca.
document.body.classList.add('invite-active');
requestAnimationFrame(placeNoBesideYes);

stoneClose.addEventListener('click', () => {
  stoneOverlay.classList.remove('show');
  stoneOverlay.setAttribute('aria-hidden', 'true');

  // Después del aviso, sigue escapando con exactamente la misma lógica.
  noBtn.addEventListener('mouseover', handleNoMouseOver);
});

yesBtn.addEventListener('click', () => {
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
  const to = 'jose.daza@elfec.bo';
  const subject = encodeURIComponent('Confirmación');
  const body = encodeURIComponent(`Sí. ${prettyDate(selectedDate)}, ${selectedTime}. ${selectedPlan}.`);
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
});

configureThisWeek();
buildTimes();
