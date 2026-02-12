/**
 * NotesCraft — Encrypted Storage Layer
 * Wraps sync adapter + crypto to provide transparent encrypt/decrypt for all data
 */
import { encrypt, decrypt } from './crypto.js';

export class EncryptedStorage {
  constructor(syncAdapter, cryptoKey) {
    this.adapter = syncAdapter;
    this.key = cryptoKey;
  }

  /* ─── User record (stored unencrypted — only contains hash + salt) ─── */
  async getUser(email) {
    const raw = await this.adapter.get('user:' + email);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  async setUser(email, userData) {
    return this.adapter.set('user:' + email, JSON.stringify(userData));
  }

  /* ─── Notes (encrypted) ─── */
  async getNotes(email) {
    const raw = await this.adapter.get('notes:' + email);
    if (!raw) return null;
    return this._decryptJSON(raw);
  }

  async setNotes(email, notes) {
    const enc = await encrypt(this.key, JSON.stringify(notes));
    return this.adapter.set('notes:' + email, JSON.stringify(enc));
  }

  /* ─── Preferences (encrypted) ─── */
  async getPrefs(email) {
    const raw = await this.adapter.get('prefs:' + email);
    if (!raw) return null;
    return this._decryptJSON(raw);
  }

  async setPrefs(email, prefs) {
    const enc = await encrypt(this.key, JSON.stringify(prefs));
    return this.adapter.set('prefs:' + email, JSON.stringify(enc));
  }

  /* ─── Calendar (encrypted) ─── */
  async getCalendar(email) {
    const raw = await this.adapter.get('calendar:' + email);
    if (!raw) return null;
    return this._decryptJSON(raw);
  }

  async setCalendar(email, events) {
    const enc = await encrypt(this.key, JSON.stringify(events));
    return this.adapter.set('calendar:' + email, JSON.stringify(enc));
  }

  /* ─── Real-time sync subscription ─── */
  subscribe(email, onNotesChange) {
    this.adapter.subscribe('notes:' + email, async (rawValue) => {
      try {
        const data = await this._decryptJSON(rawValue);
        if (data) onNotesChange(data);
      } catch {
        /* ignore decrypt failures from stale data */
      }
    });
  }

  unsubscribe() {
    this.adapter.unsubscribe();
  }

  /* ─── Internal: decrypt or migrate plaintext ─── */
  async _decryptJSON(raw) {
    try {
      const parsed = JSON.parse(raw);

      // Already encrypted (has iv + ciphertext fields)
      if (parsed.iv && parsed.ciphertext) {
        const plaintext = await decrypt(this.key, parsed);
        return JSON.parse(plaintext);
      }

      // Plaintext data (legacy / migration) — return as-is, it will be
      // re-encrypted on next save
      if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) {
        return parsed;
      }

      return null;
    } catch {
      return null;
    }
  }
}
