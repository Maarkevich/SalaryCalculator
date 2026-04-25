// ==========================================
// 1. КОНФИГУРАЦИЯ И СОСТОЯНИЕ
// ==========================================
const roles = [
  { id: 'raznorab',   name: 'Разнорабочий',      oklad: 33850 },
  { id: 'pressovsh',  name: 'Прессовщик',         oklad: 33850 },
  { id: 'upakovsh',   name: 'Упаковщик',          oklad: 33850 },
  { id: 'dispetcher', name: 'Диспетчер',          oklad: 34500 },
  { id: 'nach_smen',  name: 'Начальник смены',    oklad: 37500 },
  { id: 'voditel',    name: 'Водители',           oklad: 34500 },
  { id: 'melnik',     name: 'Мельник',            oklad: 33850 },
  { id: 'avtoklav',   name: 'Автоклавщик',        oklad: 33850 },
];

const state = {
  installPrompt: null,
  history: JSON.parse(localStorage.getItem('zp_history')) || [],
  theme: localStorage.getItem('zp_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
};

// DOM элементы
const els = {
  roleSelect: document.getElementById('role-select'),
  ktuInput: document.getElementById('ktu-input'),
  hoursInput: document.getElementById('hours-input'),
  resultValue: document.getElementById('result-value'),
  resultContainer: document.getElementById('result-container'),
  saveBtn: document.getElementById('save-btn'),
  historyBtn: document.getElementById('history-btn'),
  clearBtn: document.getElementById('clear-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  installBanner: document.getElementById('install-banner'),
  installText: document.getElementById('install-text'),
  installAction: document.getElementById('install-action'),
  installDismiss: document.getElementById('install-dismiss'),
  historyDialog: document.getElementById('history-dialog'),
  historyList: document.getElementById('history-list'),
  closeDialog: document.getElementById('close-dialog'),
  clearHistoryBtn: document.getElementById('clear-history-btn')
};

// ==========================================
// 2. ТЕМА ОФОРМЛЕНИЯ
// ==========================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  localStorage.setItem('zp_theme', theme);
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#16213e' : '#4facfe';
}

els.themeToggle.addEventListener('click', () => {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
});

// Автоопределение системной темы
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('zp_theme')) applyTheme(e.matches ? 'dark' : 'light');
});

applyTheme(state.theme);

// ==========================================
// 3. ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА
// ==========================================
function initRoles() {
  els.roleSelect.innerHTML = roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  updateResult();
}

// Обработка смены должности
els.roleSelect.addEventListener('change', () => {
  els.ktuInput.value = '';
  els.hoursInput.value = '';
  updateResult();
});

// ==========================================
// 4. ЛОГИКА РАСЧЁТА
// ==========================================
function updateResult() {
  const role = roles.find(r => r.id === els.roleSelect.value);
  const kRaw = els.ktuInput.value.trim();
  const hRaw = els.hoursInput.value.trim();

  // Пустые поля → показываем оклад
  if (kRaw === '' || hRaw === '') {
    els.resultValue.textContent = role.oklad.toLocaleString('ru-RU');
    els.resultContainer.classList.remove('pulse');
    return;
  }

  let k = parseFloat(kRaw);
  let h = parseFloat(hRaw);

  // Отрицательные значения → 0
  if (isNaN(k) || k < 0) k = 0;
  if (isNaN(h) || h < 0) h = 0;

  // Если 0 → сообщение
  if (k === 0 || h === 0) {
    els.resultValue.textContent = 'иди работай, поднимай КТУ';
    els.resultValue.style.background = 'var(--danger)';
    els.resultValue.style.webkitBackgroundClip = 'text';
    els.resultContainer.classList.add('pulse');
    return;
  }

  // Сброс стиля текста при валидных данных
  els.resultValue.style.background = '';
  els.resultValue.style.webkitBackgroundClip = '';
  els.resultContainer.classList.remove('pulse');

  // Формула: (Оклад × КТУ ÷ 165) × Часы
  const salary = (role.oklad * k / 165) * h;
  // Без округлений, заменяем точку на запятую для рус. формата
  els.resultValue.textContent = String(salary).replace('.', ',');
}

// Слушатели ввода
els.ktuInput.addEventListener('input', updateResult);
els.hoursInput.addEventListener('input', updateResult);

// Очистка полей
els.clearBtn.addEventListener('click', () => {
  els.ktuInput.value = '';
  els.hoursInput.value = '';
  updateResult();
});

// ==========================================
// 5. СОХРАНЕНИЕ И ИСТОРИЯ
// ==========================================
function getMonthYear() {
  const months = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  const d = new Date();
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}г`;
}

els.saveBtn.addEventListener('click', () => {
  const role = roles.find(r => r.id === els.roleSelect.value);
  const k = els.ktuInput.value.trim() || '1';
  const h = els.hoursInput.value.trim() || '0';
  
  if (k === '' || h === '') return;

  let kVal = parseFloat(k);
  let hVal = parseFloat(h);
  if (kVal <= 0 || hVal <= 0) {
    alert('Сохранить можно только корректный расчёт.');
    return;
  }

  const salary = (role.oklad * kVal / 165) * hVal;

  const entry = {
    date: getMonthYear(),
    hours: hVal,
    ktu: kVal,
    salary: salary
  };

  state.history.unshift(entry); // Добавляем в начало
  localStorage.setItem('zp_history', JSON.stringify(state.history));
  
  // Визуальный фидбек
  els.saveBtn.textContent = '✅ Сохранено!';
  setTimeout(() => els.saveBtn.textContent = '💾 Сохранить расчёт', 1500);
});

// Открытие истории
els.historyBtn.addEventListener('click', () => {
  renderHistory();
  els.historyDialog.showModal();
});

els.closeDialog.addEventListener('click', () => els.historyDialog.close());
els.historyDialog.addEventListener('click', e => {
  if (e.target === els.historyDialog) els.historyDialog.close();
});

function renderHistory() {
  if (state.history.length === 0) {
    els.historyList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">Расчётов пока нет</p>';
    return;
  }

  els.historyList.innerHTML = state.history.map((item, idx) => `
    <div class="history-item">
      <span class="date">${item.date}</span>
      <span>${item.hours} ч</span>
      <span>${item.ktu}</span>
      <span style="font-weight:600;color:var(--primary)">${String(item.salary).replace('.','/')} ₽</span>
      <button class="btn small dismiss delete-btn" data-idx="${idx}">✕</button>
    </div>
  `).join('');

  // Привязка удаления
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!confirm('Удалить эту запись?')) return;
      state.history.splice(e.target.dataset.idx, 1);
      localStorage.setItem('zp_history', JSON.stringify(state.history));
      renderHistory();
    });
  });
}

els.clearHistoryBtn.addEventListener('click', () => {
  if (!confirm('Удалить всю историю? Это действие нельзя отменить.')) return;
  state.history = [];
  localStorage.removeItem('zp_history');
  renderHistory();
});

// ==========================================
// 6. УМНЫЙ БАННЕР УСТАНОВКИ
// ==========================================
function showInstallBanner() {
  if (localStorage.getItem('zp_install_dismissed')) return;
  els.installBanner.classList.remove('hidden');
}

function hideInstallBanner() {
  els.installBanner.classList.add('hidden');
  localStorage.setItem('zp_install_dismissed', 'true');
}

// Android: ловим событие beforeinstallprompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.installPrompt = e;
  els.installText.textContent = '📲 Установить приложение на главный экран';
  els.installAction.textContent = 'Установить';
  els.installAction.onclick = async () => {
    state.installPrompt.prompt();
    hideInstallBanner();
    state.installPrompt = null;
  };
  showInstallBanner();
});

// iOS: детектим Safari и показываем инструкцию
if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
  if (!navigator.standalone) {
    els.installText.textContent = '🍏 Нажмите «Поделиться» → «На экран «Домой»';
    els.installAction.textContent = '✓ Я установил';
    els.installAction.onclick = () => {
      localStorage.setItem('zp_installed', 'true');
      hideInstallBanner();
    };
    showInstallBanner();
  }
}

// Уже установлено (для всех платформ после первого закрытия)
if (navigator.standalone || localStorage.getItem('zp_installed')) {
  hideInstallBanner();
}

els.installDismiss.addEventListener('click', hideInstallBanner);

// ==========================================
// 7. ЗАПУСК
// ==========================================
initRoles();