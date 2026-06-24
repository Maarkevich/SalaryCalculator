// ==========================================
// 1. КОНФИГУРАЦИЯ И СОСТОЯНИЕ
// ==========================================
const DEFAULT_ROLES = [
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
  roles: [],
  installPrompt: null,
  history: JSON.parse(localStorage.getItem('zp_history')) || [],
  theme: localStorage.getItem('zp_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  editingRoleId: null   // id должности, которую редактируют (или null — новый)
};

// Загрузка должностей из localStorage или установка по умолчанию
function loadRoles() {
  const stored = localStorage.getItem('zp_roles');
  if (stored) {
    try {
      state.roles = JSON.parse(stored);
      if (!Array.isArray(state.roles) || state.roles.length === 0) throw new Error('empty');
    } catch (e) {
      state.roles = [...DEFAULT_ROLES];
    }
  } else {
    state.roles = [...DEFAULT_ROLES];
  }
  saveRoles();
}

function saveRoles() {
  localStorage.setItem('zp_roles', JSON.stringify(state.roles));
}

loadRoles();

const els = {
  roleSelect: document.getElementById('role-select'),
  manageRolesBtn: document.getElementById('manage-roles-btn'),
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
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  rolesDialog: document.getElementById('roles-dialog'),
  rolesList: document.getElementById('roles-list'),
  newRoleName: document.getElementById('new-role-name'),
  newRoleOklad: document.getElementById('new-role-oklad'),
  addRoleBtn: document.getElementById('add-role-btn'),
  cancelEditBtn: document.getElementById('cancel-edit-btn')
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

els.themeToggle.addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('zp_theme')) applyTheme(e.matches ? 'dark' : 'light');
});
applyTheme(state.theme);

// ==========================================
// 3. ИНИЦИАЛИЗАЦИЯ И РАСЧЁТ
// ==========================================
function renderRoleSelect() {
  const currentId = els.roleSelect.value;
  els.roleSelect.innerHTML = state.roles.map(r =>
    `<option value="${r.id}">${r.name} (${r.oklad.toLocaleString('ru-RU')} ₽)</option>`
  ).join('');
  // Восстановить выбранную должность, если она ещё существует
  if (state.roles.some(r => r.id === currentId)) {
    els.roleSelect.value = currentId;
  }
  updateResult();
}

function updateResult() {
  const role = state.roles.find(r => r.id === els.roleSelect.value);
  if (!role) {
    els.resultValue.textContent = '—';
    return;
  }

  const kRaw = els.ktuInput.value.trim();
  const hRaw = els.hoursInput.value.trim();

  if (kRaw === '' || hRaw === '') {
    els.resultValue.textContent = role.oklad.toLocaleString('ru-RU');
    els.resultValue.style.background = '';
    els.resultValue.style.webkitBackgroundClip = '';
    return;
  }

  let k = parseFloat(kRaw);
  let h = parseFloat(hRaw);
  if (isNaN(k) || k < 0) k = 0;
  if (isNaN(h) || h < 0) h = 0;

  if (k === 0 || h === 0) {
    els.resultValue.textContent = 'иди работай, поднимай КТУ';
    els.resultValue.style.background = 'var(--danger)';
    els.resultValue.style.webkitBackgroundClip = 'text';
    return;
  }

  els.resultValue.style.background = '';
  els.resultValue.style.webkitBackgroundClip = '';

  const salary = (role.oklad * k / 165) * h;
  els.resultValue.textContent = Math.floor(salary).toLocaleString('ru-RU');
}

els.roleSelect.addEventListener('change', () => {
  els.ktuInput.value = '';
  els.hoursInput.value = '';
  updateResult();
});

els.ktuInput.addEventListener('input', updateResult);
els.hoursInput.addEventListener('input', updateResult);
els.clearBtn.addEventListener('click', () => {
  els.ktuInput.value = '';
  els.hoursInput.value = '';
  updateResult();
});

// ==========================================
// 4. УПРАВЛЕНИЕ ДОЛЖНОСТЯМИ
// ==========================================
function openRolesDialog() {
  renderRolesList();
  resetRoleForm();
  els.rolesDialog.showModal();
}

function closeRolesDialog() {
  els.rolesDialog.close();
}

function renderRolesList() {
  if (state.roles.length === 0) {
    els.rolesList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">Нет должностей</p>';
    return;
  }
  els.rolesList.innerHTML = state.roles.map(role => `
    <div class="role-item">
      <span class="role-info">${role.name} — <strong>${role.oklad.toLocaleString('ru-RU')} ₽</strong></span>
      <div class="role-actions">
        <button class="btn small icon-btn edit-role-btn" data-id="${role.id}" title="Редактировать">✏️</button>
        <button class="btn small icon-btn delete-role-btn" data-id="${role.id}" title="Удалить">🗑️</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.edit-role-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const role = state.roles.find(r => r.id === id);
      if (role) {
        els.newRoleName.value = role.name;
        els.newRoleOklad.value = role.oklad;
        state.editingRoleId = id;
        els.addRoleBtn.textContent = 'Сохранить';
        els.cancelEditBtn.classList.remove('hidden');
      }
    });
  });

  document.querySelectorAll('.delete-role-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (state.roles.length <= 1) {
        alert('Нельзя удалить последнюю должность.');
        return;
      }
      const role = state.roles.find(r => r.id === id);
      if (role && confirm(`Удалить должность «${role.name}»?`)) {
        state.roles = state.roles.filter(r => r.id !== id);
        saveRoles();
        renderRoleSelect();
        renderRolesList();
        // Сброс формы, если редактировали удалённую
        if (state.editingRoleId === id) {
          resetRoleForm();
        }
      }
    });
  });
}

function resetRoleForm() {
  els.newRoleName.value = '';
  els.newRoleOklad.value = '';
  state.editingRoleId = null;
  els.addRoleBtn.textContent = 'Добавить';
  els.cancelEditBtn.classList.add('hidden');
}

els.manageRolesBtn.addEventListener('click', openRolesDialog);
els.rolesDialog.querySelector('#close-roles-dialog').addEventListener('click', closeRolesDialog);
els.rolesDialog.addEventListener('click', (e) => {
  if (e.target === els.rolesDialog) closeRolesDialog();
});

els.addRoleBtn.addEventListener('click', () => {
  const name = els.newRoleName.value.trim();
  const okladRaw = els.newRoleOklad.value.trim();
  if (!name || !okladRaw) {
    alert('Введите название и оклад.');
    return;
  }
  const oklad = parseFloat(okladRaw);
  if (isNaN(oklad) || oklad <= 0) {
    alert('Оклад должен быть положительным числом.');
    return;
  }

  if (state.editingRoleId) {
    // Редактирование существующей
    const role = state.roles.find(r => r.id === state.editingRoleId);
    if (role) {
      role.name = name;
      role.oklad = oklad;
    }
  } else {
    // Добавление новой
    const newRole = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'role_' + Date.now() + Math.random(),
      name,
      oklad
    };
    state.roles.push(newRole);
  }

  saveRoles();
  renderRoleSelect();
  renderRolesList();
  resetRoleForm();
});

els.cancelEditBtn.addEventListener('click', resetRoleForm);

// ==========================================
// 5. СОХРАНЕНИЕ И ИСТОРИЯ
// ==========================================
function getMonthYear() {
  const months = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  const d = new Date();
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}г`;
}

els.saveBtn.addEventListener('click', () => {
  const role = state.roles.find(r => r.id === els.roleSelect.value);
  if (!role) return;
  const k = els.ktuInput.value.trim() || '1';
  const h = els.hoursInput.value.trim() || '0';
  
  if (k === '' || h === '') return;
  let kVal = parseFloat(k);
  let hVal = parseFloat(h);
  if (kVal <= 0 || hVal <= 0) {
    alert('Сохранить можно только корректный расчёт.');
    return;
  }

  const salary = Math.floor((role.oklad * kVal / 165) * hVal);
  state.history.unshift({ date: getMonthYear(), hours: hVal, ktu: kVal, salary });
  localStorage.setItem('zp_history', JSON.stringify(state.history));
  
  els.saveBtn.textContent = '✅ Сохранено!';
  setTimeout(() => els.saveBtn.textContent = '💾 Сохранить расчёт', 1500);
});

els.historyBtn.addEventListener('click', () => {
  renderHistory();
  els.historyDialog.showModal();
});
els.closeDialog.addEventListener('click', () => els.historyDialog.close());
els.historyDialog.addEventListener('click', e => { if (e.target === els.historyDialog) els.historyDialog.close(); });

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
      <span style="font-weight:600;color:var(--primary)">${item.salary.toLocaleString('ru-RU')} ₽</span>
      <button class="btn small dismiss delete-btn" data-idx="${idx}">✕</button>
    </div>
  `).join('');

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
// 6. БАННЕР УСТАНОВКИ
// ==========================================
function showInstallBanner() {
  if (localStorage.getItem('zp_install_dismissed')) return;
  els.installBanner.classList.remove('hidden');
}
function hideInstallBanner() {
  els.installBanner.classList.add('hidden');
  localStorage.setItem('zp_install_dismissed', 'true');
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.installPrompt = e;
  els.installText.textContent = '📲 Установить приложение на главный экран';
  els.installAction.textContent = 'Установить';
  els.installAction.onclick = async () => { state.installPrompt.prompt(); hideInstallBanner(); state.installPrompt = null; };
  showInstallBanner();
});

if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
  if (!navigator.standalone) {
    els.installText.textContent = '🍏 Нажмите «Поделиться» → «На экран «Домой»';
    els.installAction.textContent = '✓ Я установил';
    els.installAction.onclick = () => { localStorage.setItem('zp_installed', 'true'); hideInstallBanner(); };
    showInstallBanner();
  }
}
if (navigator.standalone || localStorage.getItem('zp_installed')) hideInstallBanner();
els.installDismiss.addEventListener('click', hideInstallBanner);

// ==========================================
// 7. ЗАПУСК
// ==========================================
renderRoleSelect();