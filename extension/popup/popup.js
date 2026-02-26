/**
 * NotesCraft Extension — Popup Script
 * Login, vault browsing, password generation
 */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Views
const views = { login: $('#login-view'), vault: $('#vault-view'), form: $('#form-view'), gen: $('#gen-view') };
let currentView = 'login';
let credentials = [];
let editingId = null;
let totpInterval = null;

function showView(name) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[name].classList.remove('hidden');
  currentView = name;
}

// ═══════ LOGIN ═══════
$('#login-btn').addEventListener('click', doLogin);
$('#login-email').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('#login-pw').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('#login-2fa').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const email = $('#login-email').value.trim();
  const pw = $('#login-pw').value;
  const code = $('#login-2fa').value.trim();
  const errEl = $('#login-err');
  const btn = $('#login-btn');

  if (!email || !pw) { errEl.textContent = 'Email & password required'; return; }
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Authenticating...';

  const resp = await chrome.runtime.sendMessage({ type: 'login', email, password: pw, twoFACode: code || undefined });

  if (resp.need2FA) {
    $('#login-2fa-wrap').classList.remove('hidden');
    $('#login-2fa').focus();
    btn.disabled = false;
    btn.textContent = 'Verify';
    return;
  }

  if (!resp.ok) {
    errEl.textContent = resp.error || 'Login failed';
    btn.disabled = false;
    btn.textContent = 'Login';
    return;
  }

  credentials = resp.credentials || [];
  $('#vault-email').textContent = email;
  renderVault();
  showView('vault');
  startTotpTimer();
  btn.disabled = false;
  btn.textContent = 'Login';
}

// ═══════ VAULT ═══════
$('#vault-search').addEventListener('input', renderVault);
$('#add-btn').addEventListener('click', () => { editingId = null; clearForm(); $('#form-title').textContent = 'Add Credential'; showView('form'); });
$('#gen-btn').addEventListener('click', () => { generatePw(); showView('gen'); });
$('#logout-btn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'logout' });
  credentials = [];
  stopTotpTimer();
  showView('login');
  $('#login-pw').value = '';
  $('#login-2fa').value = '';
  $('#login-2fa-wrap').classList.add('hidden');
});

function renderVault() {
  const q = ($('#vault-search').value || '').toLowerCase();
  const list = $('#vault-list');
  const filtered = credentials.filter(c => {
    if (!q) return true;
    return (c.siteName || '').toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q) || (c.siteUrl || '').toLowerCase().includes(q);
  }).sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || (a.siteName || '').localeCompare(b.siteName || ''));

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-msg">${credentials.length ? `No results for "${q}"` : 'No credentials yet. Click + to add.'}</div>`;
    return;
  }

  list.innerHTML = filtered.map(c => {
    const initial = (c.siteName || '?')[0].toUpperCase();
    const masked = '•'.repeat(Math.min((c.password || '').length, 16));
    return `
      <div class="cred-card${c.starred ? ' starred' : ''}" data-id="${c.id}">
        <div class="cred-top">
          <div class="cred-info">
            <div class="cred-icon">${initial}</div>
            <div>
              <div class="cred-name">${esc(c.siteName || 'Untitled')}${c.starred ? ' <span style="color:#7c3aed">★</span>' : ''}</div>
              <div class="cred-user">${esc(c.username || '')}</div>
            </div>
          </div>
          ${c.folder ? `<span class="cred-folder">${esc(c.folder)}</span>` : ''}
        </div>
        <div class="cred-pw-row">
          <span class="cred-pw" data-pw="${esc(c.password || '')}" data-hidden="true">${masked}</span>
          <button class="btn-sm pw-toggle" data-id="${c.id}" title="Toggle">👁</button>
          <button class="btn-sm pw-copy" data-pw="${esc(c.password || '')}" title="Copy Password">Copy</button>
        </div>
        ${c.totpSecret ? `<div class="cred-totp"><span class="totp-code" data-totp-id="${c.id}">------</span><span class="totp-timer" data-totp-timer="${c.id}">30</span><button class="btn-sm totp-copy" data-totp-id="${c.id}">Copy</button></div>` : ''}
        <div class="cred-actions">
          <button class="btn-sm user-copy" data-user="${esc(c.username || '')}">Copy User</button>
          <button class="btn-sm cred-edit" data-id="${c.id}">Edit</button>
          <button class="btn-sm cred-del" data-id="${c.id}" style="color:#ef4444">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Event listeners
  list.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.cred-card');
      const pwEl = card.querySelector('.cred-pw');
      const hidden = pwEl.dataset.hidden === 'true';
      pwEl.textContent = hidden ? pwEl.dataset.pw : '•'.repeat(Math.min(pwEl.dataset.pw.length, 16));
      pwEl.dataset.hidden = hidden ? 'false' : 'true';
      btn.textContent = hidden ? '🙈' : '👁';
    });
  });

  list.querySelectorAll('.pw-copy').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn.dataset.pw, btn));
  });

  list.querySelectorAll('.user-copy').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn.dataset.user, btn));
  });

  list.querySelectorAll('.totp-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const codeEl = document.querySelector(`.totp-code[data-totp-id="${btn.dataset.totpId}"]`);
      if (codeEl) copyText(codeEl.textContent, btn);
    });
  });

  list.querySelectorAll('.cred-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = credentials.find(cr => cr.id === btn.dataset.id);
      if (!c) return;
      editingId = c.id;
      $('#f-site').value = c.siteName || '';
      $('#f-url').value = c.siteUrl || '';
      $('#f-user').value = c.username || '';
      $('#f-pw').value = c.password || '';
      $('#f-totp').value = c.totpSecret || '';
      $('#f-folder').value = c.folder || '';
      $('#f-notes').value = c.notes || '';
      $('#f-starred').checked = c.starred || false;
      $('#form-title').textContent = 'Edit Credential';
      showView('form');
    });
  });

  list.querySelectorAll('.cred-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.confirm) {
        credentials = credentials.filter(c => c.id !== btn.dataset.id);
        await chrome.runtime.sendMessage({ type: 'saveCredentials', credentials });
        renderVault();
      } else {
        btn.dataset.confirm = 'true';
        btn.textContent = 'Confirm?';
        setTimeout(() => { btn.textContent = 'Delete'; delete btn.dataset.confirm; }, 3000);
      }
    });
  });

  // Update TOTP codes immediately
  updateTotpCodes();
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function copyText(text, btn) {
  navigator.clipboard.writeText(text);
  const orig = btn.textContent;
  btn.textContent = '✓';
  btn.classList.add('copied-toast');
  setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied-toast'); }, 1500);
}

// ═══════ TOTP ═══════
function startTotpTimer() {
  stopTotpTimer();
  totpInterval = setInterval(updateTotpCodes, 1000);
}

function stopTotpTimer() {
  if (totpInterval) { clearInterval(totpInterval); totpInterval = null; }
}

async function updateTotpCodes() {
  const credsWithTotp = credentials.filter(c => c.totpSecret);
  for (const c of credsWithTotp) {
    const resp = await chrome.runtime.sendMessage({ type: 'generateTOTP', secret: c.totpSecret });
    if (resp.ok) {
      const codeEl = document.querySelector(`.totp-code[data-totp-id="${c.id}"]`);
      const timerEl = document.querySelector(`.totp-timer[data-totp-timer="${c.id}"]`);
      if (codeEl) codeEl.textContent = resp.code;
      if (timerEl) timerEl.textContent = resp.remaining + 's';
    }
  }
}

// ═══════ ADD/EDIT FORM ═══════
$('#form-cancel').addEventListener('click', () => { showView('vault'); });
$('#f-gen-pw').addEventListener('click', async () => {
  const resp = await chrome.runtime.sendMessage({ type: 'generatePassword', length: 20 });
  if (resp.ok) { $('#f-pw').value = resp.password; $('#f-pw').type = 'text'; }
});

$('#f-save').addEventListener('click', async () => {
  const site = $('#f-site').value.trim();
  const pw = $('#f-pw').value;
  if (!site || !pw) return;

  const cred = {
    id: editingId || 'pm_' + crypto.randomUUID(),
    siteName: site,
    siteUrl: $('#f-url').value.trim(),
    username: $('#f-user').value.trim(),
    password: pw,
    notes: $('#f-notes').value.trim(),
    totpSecret: $('#f-totp').value.trim(),
    folder: $('#f-folder').value.trim(),
    starred: $('#f-starred').checked,
    created: editingId ? (credentials.find(c => c.id === editingId)?.created || new Date().toISOString()) : new Date().toISOString(),
    modified: new Date().toISOString()
  };

  if (editingId) {
    credentials = credentials.map(c => c.id === editingId ? cred : c);
  } else {
    credentials.push(cred);
  }

  await chrome.runtime.sendMessage({ type: 'saveCredentials', credentials });
  editingId = null;
  renderVault();
  showView('vault');
});

function clearForm() {
  $('#f-site').value = '';
  $('#f-url').value = '';
  $('#f-user').value = '';
  $('#f-pw').value = '';
  $('#f-pw').type = 'password';
  $('#f-totp').value = '';
  $('#f-folder').value = '';
  $('#f-notes').value = '';
  $('#f-starred').checked = false;
}

// ═══════ GENERATOR ═══════
$('#gen-back').addEventListener('click', () => showView('vault'));
$('#gen-copy').addEventListener('click', () => copyText($('#gen-pw-display').textContent, $('#gen-copy')));
$('#gen-regen').addEventListener('click', generatePw);
$('#gen-len').addEventListener('input', () => { $('#gen-len-val').textContent = $('#gen-len').value; generatePw(); });
$$('#gen-upper, #gen-lower, #gen-digits, #gen-symbols').forEach(el => el.addEventListener('change', generatePw));

async function generatePw() {
  const resp = await chrome.runtime.sendMessage({
    type: 'generatePassword',
    length: parseInt($('#gen-len').value),
    upper: $('#gen-upper').checked,
    lower: $('#gen-lower').checked,
    digits: $('#gen-digits').checked,
    symbols: $('#gen-symbols').checked
  });
  if (resp.ok) $('#gen-pw-display').textContent = resp.password;
}

// ═══════ INIT ═══════
(async () => {
  const resp = await chrome.runtime.sendMessage({ type: 'getSession' });
  if (resp.ok) {
    credentials = resp.credentials || [];
    $('#vault-email').textContent = resp.email;
    renderVault();
    showView('vault');
    startTotpTimer();
  }
})();
