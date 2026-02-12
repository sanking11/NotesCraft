/**
 * NotesCraft — Sync Adapters
 * GunSyncAdapter: P2P cross-device sync via Gun.js (no server required)
 * LocalSyncAdapter: offline fallback using window.storage (localStorage polyfill)
 */

/* ═══════════════════════════════════════════
   LOCAL SYNC ADAPTER (offline / no Gun relay)
   ═══════════════════════════════════════════ */
export class LocalSyncAdapter {
  async get(key) {
    try {
      const r = await window.storage.get(key);
      return r ? r.value : null;
    } catch {
      return null;
    }
  }

  async set(key, value) {
    try {
      await window.storage.set(key, value);
      return true;
    } catch {
      return false;
    }
  }

  async delete(key) {
    try {
      await window.storage.delete(key);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix = '') {
    try {
      const r = await window.storage.list(prefix);
      return r.keys || [];
    } catch {
      return [];
    }
  }

  subscribe() { /* no-op for local */ }
  unsubscribe() { /* no-op for local */ }
}

/* ═══════════════════════════════════════════
   GUN SYNC ADAPTER (P2P cross-device sync)
   ═══════════════════════════════════════════ */
export class GunSyncAdapter {
  constructor(gunInstance) {
    this.gun = gunInstance;
    this.db = gunInstance.get('notescraft');
    this._listeners = [];
  }

  get(key) {
    return new Promise((resolve) => {
      let resolved = false;
      this.db.get(key).once((data) => {
        if (resolved) return;
        resolved = true;
        if (data === undefined || data === null) return resolve(null);
        // Gun nodes include a _ metadata property — extract value
        if (typeof data === 'object' && data._ !== undefined) {
          resolve(data.value !== undefined ? data.value : null);
        } else {
          resolve(data);
        }
      });
      // Timeout fallback — Gun.once can hang if key never existed
      setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 3000);
    });
  }

  set(key, value) {
    return new Promise((resolve) => {
      let resolved = false;
      this.db.get(key).put({ value, _ts: Date.now() }, (ack) => {
        if (resolved) return;
        resolved = true;
        resolve(!ack.err);
      });
      setTimeout(() => { if (!resolved) { resolved = true; resolve(true); } }, 3000);
    });
  }

  delete(key) {
    return new Promise((resolve) => {
      let resolved = false;
      this.db.get(key).put(null, () => {
        if (resolved) return;
        resolved = true;
        resolve(true);
      });
      setTimeout(() => { if (!resolved) { resolved = true; resolve(true); } }, 3000);
    });
  }

  async list(prefix = '') {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('nc_' + prefix)) {
        keys.push(k.replace('nc_', ''));
      }
    }
    return keys;
  }

  subscribe(key, callback) {
    const listener = this.db.get(key).on((data) => {
      if (data && data.value !== undefined) {
        callback(data.value);
      }
    });
    this._listeners.push({ key, listener });
  }

  unsubscribe() {
    this._listeners.forEach(({ key }) => {
      this.db.get(key).off();
    });
    this._listeners = [];
  }
}

/* ═══════════════════════════════════════════
   DEFAULT PUBLIC GUN RELAY PEERS
   These enable cross-device sync out of the box.
   Override with VITE_GUN_PEERS env var if needed.
   ═══════════════════════════════════════════ */
const DEFAULT_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.wallie.io/gun',
];

/* ═══════════════════════════════════════════
   FACTORY — pick the right adapter
   ═══════════════════════════════════════════ */
export async function createSyncAdapter() {
  const customPeers = import.meta.env.VITE_GUN_PEERS;

  try {
    const Gun = (await import('gun')).default;

    const peers = customPeers
      ? customPeers.split(',').map(p => p.trim())
      : DEFAULT_PEERS;

    const gun = Gun({ peers });
    return new GunSyncAdapter(gun);
  } catch (e) {
    console.warn('Gun.js not available, falling back to local storage:', e.message);
    return new LocalSyncAdapter();
  }
}
