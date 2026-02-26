/**
 * NotesCraft — Encrypted Storage Layer
 * Wraps sync adapter + crypto to provide transparent encrypt/decrypt for all data
 * Storage keys use SHA-256 hashed emails for privacy
 */
import { encrypt, decrypt, hashEmail } from './crypto.js';

export class EncryptedStorage {
  constructor(syncAdapter, cryptoKey) {
    this.adapter = syncAdapter;
    this.key = cryptoKey;
    this._hashCache = {};
  }

  /* ─── Key hashing ─── */
  async _hkey(prefix, email) {
    if (!this._hashCache[email]) this._hashCache[email] = await hashEmail(email);
    return prefix + this._hashCache[email];
  }

  /** Get hashed email (for external use, e.g. delete account) */
  async getEmailHash(email) {
    if (!this._hashCache[email]) this._hashCache[email] = await hashEmail(email);
    return this._hashCache[email];
  }

  /* ─── Internal: get with legacy migration ─── */
  async _getWithMigration(prefix, email) {
    const hkey = await this._hkey(prefix, email);
    let raw = await this.adapter.get(hkey);
    if (raw) return { raw, key: hkey };
    // Try legacy plaintext key
    const legacyKey = prefix + email;
    raw = await this.adapter.get(legacyKey);
    if (raw) {
      // Migrate to hashed key
      await this.adapter.set(hkey, raw);
      await this.adapter.delete(legacyKey);
      return { raw, key: hkey };
    }
    return { raw: null, key: hkey };
  }

  /* ─── User record (stored unencrypted — only contains hash + salt) ─── */
  async getUser(email) {
    const { raw } = await this._getWithMigration('user:', email);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  async setUser(email, userData) {
    const hkey = await this._hkey('user:', email);
    return this.adapter.set(hkey, JSON.stringify(userData));
  }

  /* ─── Notes (encrypted) ─── */
  async getNotes(email) {
    const { raw } = await this._getWithMigration('notes:', email);
    if (!raw) return null;
    return this._decryptJSON(raw);
  }

  async setNotes(email, notes) {
    const hkey = await this._hkey('notes:', email);
    const enc = await encrypt(this.key, JSON.stringify(notes));
    return this.adapter.set(hkey, JSON.stringify(enc));
  }

  /* ─── Preferences (encrypted) ─── */
  async getPrefs(email) {
    const { raw } = await this._getWithMigration('prefs:', email);
    if (!raw) return null;
    return this._decryptJSON(raw);
  }

  async setPrefs(email, prefs) {
    const hkey = await this._hkey('prefs:', email);
    const enc = await encrypt(this.key, JSON.stringify(prefs));
    return this.adapter.set(hkey, JSON.stringify(enc));
  }

  /* ─── Calendar (encrypted) ─── */
  async getCalendar(email) {
    const { raw } = await this._getWithMigration('calendar:', email);
    if (!raw) return null;
    return this._decryptJSON(raw);
  }

  async setCalendar(email, events) {
    const hkey = await this._hkey('calendar:', email);
    const enc = await encrypt(this.key, JSON.stringify(events));
    return this.adapter.set(hkey, JSON.stringify(enc));
  }

  /* ─── Passwords / Vault (encrypted) ─── */
  async getPasswords(email) {
    const { raw } = await this._getWithMigration('passwords:', email);
    if (!raw) return null;
    return this._decryptJSON(raw);
  }

  async setPasswords(email, passwords) {
    const hkey = await this._hkey('passwords:', email);
    const enc = await encrypt(this.key, JSON.stringify(passwords));
    return this.adapter.set(hkey, JSON.stringify(enc));
  }

  /* ─── 2FA data (encrypted) ─── */
  async getTwoFA(email) {
    const { raw } = await this._getWithMigration('twofa:', email);
    if (!raw) return null;
    return this._decryptJSON(raw);
  }

  async setTwoFA(email, twofaData) {
    const hkey = await this._hkey('twofa:', email);
    const enc = await encrypt(this.key, JSON.stringify(twofaData));
    return this.adapter.set(hkey, JSON.stringify(enc));
  }

  /* ─── Real-time sync subscription ─── */
  async subscribe(email, onNotesChange, onCalendarChange, onPrefsChange, onPasswordsChange) {
    const nk = await this._hkey('notes:', email);
    const ck = await this._hkey('calendar:', email);
    const pk = await this._hkey('prefs:', email);
    const pwk = await this._hkey('passwords:', email);
    this.adapter.subscribe(nk, async (rawValue) => {
      try {
        const data = await this._decryptJSON(rawValue);
        if (data) onNotesChange(data);
      } catch {}
    });
    if (onCalendarChange) {
      this.adapter.subscribe(ck, async (rawValue) => {
        try {
          const data = await this._decryptJSON(rawValue);
          if (data) onCalendarChange(data);
        } catch {}
      });
    }
    if (onPrefsChange) {
      this.adapter.subscribe(pk, async (rawValue) => {
        try {
          const data = await this._decryptJSON(rawValue);
          if (data) onPrefsChange(data);
        } catch {}
      });
    }
    if (onPasswordsChange) {
      this.adapter.subscribe(pwk, async (rawValue) => {
        try {
          const data = await this._decryptJSON(rawValue);
          if (data) onPasswordsChange(data);
        } catch {}
      });
    }
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
