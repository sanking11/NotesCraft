/**
 * NotesCraft — Sync Adapters
 * HttpSyncAdapter: HTTP-based cross-device sync via relay server
 * LocalSyncAdapter: offline fallback using window.storage (localStorage polyfill)
 */

/* ═══════════════════════════════════════════
   LOCAL SYNC ADAPTER (offline / no relay)
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
   HTTP SYNC ADAPTER (cross-device sync)
   ═══════════════════════════════════════════ */
export class HttpSyncAdapter {
  constructor(relayUrl) {
    this.relayUrl = relayUrl.replace(/\/+$/, '');
    this._polls = [];
    this._cache = {};
  }

  async get(key) {
    try {
      const res = await fetch(`${this.relayUrl}/api/get?key=${encodeURIComponent(key)}&_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.value || null;
    } catch (e) {
      /* silent */
      return null;
    }
  }

  async set(key, value) {
    try {
      const res = await fetch(`${this.relayUrl}/api/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.ok) this._cache[key] = value;
      return data.ok;
    } catch (e) {
      /* silent */
      return false;
    }
  }

  async delete(key) {
    try {
      const res = await fetch(`${this.relayUrl}/api/delete?key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      /* silent */
      return false;
    }
  }

  async list(prefix = '') {
    return [];
  }

  subscribe(key, callback) {
    this.get(key).then(v => { if (this._cache[key] === undefined) this._cache[key] = v; });
    const id = setInterval(async () => {
      try {
        const val = await this.get(key);
        if (val !== null && val !== this._cache[key]) {
          this._cache[key] = val;
          callback(val);
        }
      } catch {}
    }, 5000);
    this._polls.push(id);
  }

  unsubscribe() {
    this._polls.forEach(id => clearInterval(id));
    this._polls = [];
    this._cache = {};
  }
}

/* ═══════════════════════════════════════════
   OFFLINE-FIRST ADAPTER (local + remote)
   ═══════════════════════════════════════════ */
export class OfflineFirstAdapter {
  constructor(relayUrl) {
    this.local = new LocalSyncAdapter();
    this.remote = new HttpSyncAdapter(relayUrl);
    this._queue = [];
    this._online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this._onStatusChange = null;

    this._onOnline = () => { this._online = true; this._notify(); this.flushQueue(); };
    this._onOffline = () => { this._online = false; this._notify(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._onOnline);
      window.addEventListener('offline', this._onOffline);
    }
    this._loadQueue();
  }

  _notify() { if (this._onStatusChange) this._onStatusChange(this._online, this._queue.length); }
  _saveQueue() { try { localStorage.setItem('nc_sync_queue', JSON.stringify(this._queue)); } catch {} }
  _loadQueue() { try { const q = localStorage.getItem('nc_sync_queue'); if (q) this._queue = JSON.parse(q); } catch {} }

  async get(key) {
    if (this._online) {
      try {
        const val = await this.remote.get(key);
        if (val !== null) {
          await this.local.set(key, val);
          return val;
        }
      } catch {}
    }
    return this.local.get(key);
  }

  async set(key, value) {
    await this.local.set(key, value);
    if (this._online) {
      try {
        const ok = await this.remote.set(key, value);
        if (ok) return true;
      } catch {}
    }
    this._queue = this._queue.filter(q => q.key !== key);
    this._queue.push({ key, value, timestamp: Date.now() });
    this._saveQueue();
    this._notify();
    return true;
  }

  async delete(key) {
    await this.local.delete(key);
    if (this._online) {
      try { await this.remote.delete(key); } catch {}
    }
    return true;
  }

  async list(prefix) { return this.local.list(prefix); }

  subscribe(key, callback) {
    this.remote.subscribe(key, (val) => {
      this.local.set(key, val);
      callback(val);
    });
  }

  unsubscribe() { this.remote.unsubscribe(); }

  async flushQueue() {
    if (!this._online || this._queue.length === 0) return;
    const queue = [...this._queue];
    this._queue = [];
    this._saveQueue();
    for (const item of queue) {
      try {
        const ok = await this.remote.set(item.key, item.value);
        if (!ok) this._queue.push(item);
      } catch {
        this._queue.push(item);
      }
    }
    this._saveQueue();
    this._notify();
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._onOnline);
      window.removeEventListener('offline', this._onOffline);
    }
    this.remote.unsubscribe();
  }
}

/* ═══════════════════════════════════════════
   RELAY URL
   ═══════════════════════════════════════════ */
const RELAY_URL = 'https://relay.notescraft.app';

/* ═══════════════════════════════════════════
   FACTORY — always offline-first
   ═══════════════════════════════════════════ */
export async function createSyncAdapter() {
  const url = import.meta.env.VITE_RELAY_URL || RELAY_URL;
  const adapter = new OfflineFirstAdapter(url);

  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) await adapter.flushQueue();
  } catch {}

  return adapter;
}
