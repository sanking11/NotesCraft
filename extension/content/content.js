/**
 * NotesCraft Extension — Content Script
 * Detects login forms, provides autofill, and offers to save credentials
 */

let ncBanner = null;
let ncShadow = null;

// Find login forms on the page
function findLoginForms() {
  const pwInputs = document.querySelectorAll('input[type="password"]:not([data-nc-detected])');
  if (!pwInputs.length) return;

  pwInputs.forEach(pwInput => {
    pwInput.dataset.ncDetected = 'true';

    // Look for nearby email/username input
    const form = pwInput.closest('form');
    let userInput = null;

    if (form) {
      userInput = form.querySelector('input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"], input[type="text"][name*="login"], input[type="text"][autocomplete*="user"], input[type="text"][autocomplete*="email"]');
    }

    if (!userInput) {
      // Search nearby siblings/parent
      const parent = pwInput.parentElement?.parentElement || pwInput.parentElement;
      if (parent) {
        userInput = parent.querySelector('input[type="email"], input[type="text"]');
      }
    }

    // Ask background for matching credentials
    chrome.runtime.sendMessage({ type: 'getCredentialsForUrl', url: window.location.href }, (resp) => {
      if (!resp || !resp.ok || !resp.credentials.length) return;
      showAutofillBanner(resp.credentials, userInput, pwInput);
    });

    // Watch for form submit to offer saving
    if (form) {
      form.addEventListener('submit', () => {
        const user = userInput?.value || '';
        const pass = pwInput.value || '';
        if (user && pass) {
          offerSaveCredential(user, pass);
        }
      }, { once: true });
    }
  });
}

// Show autofill banner using Shadow DOM (to avoid CSS conflicts)
function showAutofillBanner(creds, userInput, pwInput) {
  if (ncBanner) return; // Already showing

  ncBanner = document.createElement('div');
  ncBanner.id = 'nc-autofill-host';
  ncShadow = ncBanner.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .nc-banner {
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 2147483647;
      background: #12141c;
      border: 1px solid rgba(124, 58, 237, 0.3);
      border-radius: 12px;
      padding: 12px 14px;
      font-family: -apple-system, 'Segoe UI', sans-serif;
      font-size: 12px;
      color: #e2e8f0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(124,58,237,0.1);
      max-width: 280px;
      animation: nc-slide 0.3s ease-out;
    }
    @keyframes nc-slide { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .nc-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .nc-title span { font-weight: 700; font-size: 11px; color: #7c3aed; letter-spacing: 0.5px; }
    .nc-close {
      background: none; border: none; color: #64748b; font-size: 14px; cursor: pointer; padding: 0 2px;
    }
    .nc-cred {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; border-radius: 8px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(124,58,237,0.12);
      cursor: pointer; margin-bottom: 4px;
      transition: all 0.2s;
    }
    .nc-cred:hover {
      background: rgba(124,58,237,0.08);
      border-color: rgba(124,58,237,0.3);
    }
    .nc-cred-icon {
      width: 24px; height: 24px; border-radius: 6px;
      background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.08));
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: #7c3aed;
    }
    .nc-cred-name { font-size: 12px; font-weight: 600; }
    .nc-cred-user { font-size: 10px; color: #64748b; }
  `;

  const banner = document.createElement('div');
  banner.className = 'nc-banner';

  const title = document.createElement('div');
  title.className = 'nc-title';
  title.innerHTML = '<span>NotesCraft Autofill</span>';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'nc-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', removeBanner);
  title.appendChild(closeBtn);
  banner.appendChild(title);

  creds.forEach(c => {
    const row = document.createElement('div');
    row.className = 'nc-cred';
    row.innerHTML = `
      <div class="nc-cred-icon">${(c.siteName || '?')[0].toUpperCase()}</div>
      <div>
        <div class="nc-cred-name">${escHtml(c.siteName || 'Unknown')}</div>
        <div class="nc-cred-user">${escHtml(c.username || '')}</div>
      </div>
    `;
    row.addEventListener('click', () => {
      if (userInput) fillInput(userInput, c.username || '');
      fillInput(pwInput, c.password || '');
      removeBanner();
    });
    banner.appendChild(row);
  });

  ncShadow.appendChild(style);
  ncShadow.appendChild(banner);
  document.body.appendChild(ncBanner);

  // Auto-dismiss after 10 seconds
  setTimeout(removeBanner, 10000);
}

function removeBanner() {
  if (ncBanner) { ncBanner.remove(); ncBanner = null; ncShadow = null; }
}

// Fill an input field (triggers React/framework change events)
function fillInput(input, value) {
  const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  nativeSet.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// Offer to save a credential after form submission
function offerSaveCredential(username, password) {
  const host = document.createElement('div');
  host.id = 'nc-save-host';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .nc-save {
      position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
      background: #12141c; border: 1px solid rgba(124,58,237,0.3);
      border-radius: 12px; padding: 14px 16px;
      font-family: -apple-system, 'Segoe UI', sans-serif;
      font-size: 12px; color: #e2e8f0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(124,58,237,0.1);
      max-width: 300px;
      animation: nc-slide 0.3s ease-out;
    }
    @keyframes nc-slide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .nc-save-title { font-weight: 700; color: #7c3aed; margin-bottom: 6px; font-size: 11px; letter-spacing: 0.5px; }
    .nc-save-text { color: #94a3b8; margin-bottom: 10px; font-size: 11px; }
    .nc-save-btns { display: flex; gap: 8px; }
    .nc-save-btn {
      padding: 7px 14px; border-radius: 8px; font-size: 11px; font-weight: 600;
      cursor: pointer; font-family: inherit; border: none; transition: all 0.2s;
    }
    .nc-save-yes { background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; }
    .nc-save-no { background: rgba(255,255,255,0.06); color: #64748b; border: 1px solid rgba(255,255,255,0.1); }
  `;

  const el = document.createElement('div');
  el.className = 'nc-save';
  const hostname = window.location.hostname.replace('www.', '');
  el.innerHTML = `
    <div class="nc-save-title">NotesCraft — Save Password?</div>
    <div class="nc-save-text">Save credential for <strong>${escHtml(hostname)}</strong> (${escHtml(username)})?</div>
    <div class="nc-save-btns">
      <button class="nc-save-btn nc-save-yes">Save</button>
      <button class="nc-save-btn nc-save-no">Dismiss</button>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(el);
  document.body.appendChild(host);

  el.querySelector('.nc-save-yes').addEventListener('click', async () => {
    const resp = await chrome.runtime.sendMessage({ type: 'getCredentials' });
    if (resp.ok) {
      const creds = resp.credentials || [];
      creds.push({
        id: 'pm_' + crypto.randomUUID(),
        siteName: hostname.charAt(0).toUpperCase() + hostname.slice(1),
        siteUrl: window.location.origin,
        username,
        password,
        notes: '',
        totpSecret: '',
        folder: '',
        starred: false,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      });
      await chrome.runtime.sendMessage({ type: 'saveCredentials', credentials: creds });
    }
    host.remove();
  });

  el.querySelector('.nc-save-no').addEventListener('click', () => host.remove());

  // Auto-dismiss after 15 seconds
  setTimeout(() => host.remove(), 15000);
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// Run on page load and on dynamic page changes
findLoginForms();

// Observe DOM changes for SPAs
const observer = new MutationObserver(() => {
  findLoginForms();
});
observer.observe(document.body, { childList: true, subtree: true });
