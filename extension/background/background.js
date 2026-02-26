/**
 * NotesCraft Extension — Background Service Worker
 * Manages session state, credential lookups, and relay between popup/content scripts
 */

importScripts('../shared/crypto.js', '../shared/storage-ext.js');

// Session state
let session = null; // { email, cryptoKey, credentials }

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'login': {
          const { email, password, twoFACode } = msg;
          const em = email.toLowerCase();
          const user = await ExtStorage.getUser(em);
          if (!user) return sendResponse({ ok: false, error: 'No account found' });
          if (!user.salt) return sendResponse({ ok: false, error: 'Please login via NotesCraft web app first' });

          const key = await NCCrypto.deriveKey(password, user.salt);
          const pwHash = await NCCrypto.hashPassword(password, user.salt);
          if (pwHash !== user.pwHash) return sendResponse({ ok: false, error: 'Wrong password' });

          if (user.twoFactorEnabled) {
            if (!twoFACode) return sendResponse({ ok: false, need2FA: true });
            const valid = await NCCrypto.verifyTOTP(user.twoFactorSecret, twoFACode);
            if (!valid) return sendResponse({ ok: false, error: 'Invalid 2FA code' });
          }

          const credentials = await ExtStorage.getPasswords(em, key);
          session = { email: em, cryptoKey: key, credentials };

          // Save session key for persistence
          const keyB64 = await NCCrypto.exportKey(key);
          await chrome.storage.session.set({ nc_session: { email: em, key: keyB64 } });

          sendResponse({ ok: true, credentials });
          break;
        }

        case 'logout': {
          session = null;
          await chrome.storage.session.remove('nc_session');
          sendResponse({ ok: true });
          break;
        }

        case 'getSession': {
          if (session) {
            sendResponse({ ok: true, email: session.email, credentials: session.credentials });
          } else {
            // Try restore from session storage
            const data = await chrome.storage.session.get('nc_session');
            if (data.nc_session) {
              try {
                const key = await NCCrypto.importKey(data.nc_session.key);
                const credentials = await ExtStorage.getPasswords(data.nc_session.email, key);
                session = { email: data.nc_session.email, cryptoKey: key, credentials };
                sendResponse({ ok: true, email: session.email, credentials: session.credentials });
              } catch {
                sendResponse({ ok: false });
              }
            } else {
              sendResponse({ ok: false });
            }
          }
          break;
        }

        case 'getCredentials': {
          if (!session) return sendResponse({ ok: false });
          // Refresh from storage
          session.credentials = await ExtStorage.getPasswords(session.email, session.cryptoKey);
          sendResponse({ ok: true, credentials: session.credentials });
          break;
        }

        case 'saveCredentials': {
          if (!session) return sendResponse({ ok: false });
          session.credentials = msg.credentials;
          await ExtStorage.setPasswords(session.email, session.cryptoKey, msg.credentials);
          sendResponse({ ok: true });
          break;
        }

        case 'getCredentialsForUrl': {
          if (!session) return sendResponse({ ok: false, credentials: [] });
          const url = msg.url.toLowerCase();
          let hostname = '';
          try { hostname = new URL(url).hostname; } catch { }
          const matching = (session.credentials || []).filter(c => {
            if (!c.siteUrl) return false;
            try {
              const credHost = new URL(c.siteUrl).hostname;
              return hostname === credHost || hostname.endsWith('.' + credHost);
            } catch {
              return c.siteUrl.toLowerCase().includes(hostname);
            }
          });
          sendResponse({ ok: true, credentials: matching });
          break;
        }

        case 'generateTOTP': {
          const code = await NCCrypto.generateTOTP(msg.secret);
          const remaining = NCCrypto.getTOTPRemaining();
          sendResponse({ ok: true, code, remaining });
          break;
        }

        case 'generatePassword': {
          const pw = NCCrypto.generatePassword(msg.length || 20, msg.upper !== false, msg.lower !== false, msg.digits !== false, msg.symbols !== false);
          sendResponse({ ok: true, password: pw });
          break;
        }

        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true; // Keep message channel open for async response
});
