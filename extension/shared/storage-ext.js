/**
 * NotesCraft Extension — Storage Adapter
 * Uses chrome.storage.local instead of window.storage / relay server
 * Falls back to relay server for sync with the web app
 */

const RELAY_URL = 'https://relay.notescraft.app';

const ExtStorage = {
  // Local chrome storage (for caching)
  async getLocal(key) {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  },

  async setLocal(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  async deleteLocal(key) {
    await chrome.storage.local.remove(key);
  },

  // Relay server (for sync with web app)
  async getRemote(key) {
    try {
      const res = await fetch(`${RELAY_URL}/get/${encodeURIComponent(key)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.value || null;
    } catch { return null; }
  },

  async setRemote(key, value) {
    try {
      await fetch(`${RELAY_URL}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
    } catch (e) { console.error('Sync failed:', e); }
  },

  // High-level: get with remote fallback
  async get(key) {
    // Try local cache first
    let val = await this.getLocal(key);
    if (val) return val;
    // Fallback to relay
    val = await this.getRemote(key);
    if (val) await this.setLocal(key, val); // Cache locally
    return val;
  },

  async set(key, value) {
    await this.setLocal(key, value);
    await this.setRemote(key, value);
  },

  // Encrypted storage helpers (same pattern as EncryptedStorage class)
  _hashCache: {},

  async _hkey(prefix, email) {
    if (!this._hashCache[email]) this._hashCache[email] = await NCCrypto.hashEmail(email);
    return prefix + this._hashCache[email];
  },

  async getUser(email) {
    const hkey = await this._hkey('user:', email);
    let raw = await this.get(hkey);
    if (!raw) {
      // Try legacy key
      raw = await this.get('user:' + email);
    }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  async getPasswords(email, cryptoKey) {
    const hkey = await this._hkey('passwords:', email);
    const raw = await this.get(hkey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (parsed.iv && parsed.ciphertext) {
        const plaintext = await NCCrypto.decrypt(cryptoKey, parsed);
        return JSON.parse(plaintext);
      }
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch { return []; }
  },

  async setPasswords(email, cryptoKey, passwords) {
    const hkey = await this._hkey('passwords:', email);
    const enc = await NCCrypto.encrypt(cryptoKey, JSON.stringify(passwords));
    await this.set(hkey, JSON.stringify(enc));
  }
};
