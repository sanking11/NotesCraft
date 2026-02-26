/**
 * NotesCraft Extension — Crypto Module
 * Same algorithms as src/crypto.js, adapted for extension context (no ES module exports)
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  const CHUNK = 8192;
  for (let i = 0; i < arr.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, Math.min(i + CHUNK, arr.length)));
  }
  return btoa(bin);
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function importPassword(password) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
}

function base32Decode(encoded) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = encoded.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0, value = 0, index = 0;
  const output = new Uint8Array(Math.floor(cleaned.length * 5 / 8));
  for (const char of cleaned) {
    const v = alphabet.indexOf(char);
    if (v === -1) continue;
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) { output[index++] = (value >>> (bits - 8)) & 0xff; bits -= 8; }
  }
  return output.slice(0, index);
}

const NCCrypto = {
  async deriveKey(password, saltHex) {
    const baseKey = await importPassword(password);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      baseKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
  },

  async exportKey(key) {
    const raw = await crypto.subtle.exportKey('raw', key);
    return bytesToBase64(raw);
  },

  async importKey(b64) {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  },

  async hashPassword(password, saltHex) {
    const baseKey = await importPassword(password);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: hexToBytes(saltHex + 'auth'), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      baseKey, 256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async hashEmail(email) {
    const data = new TextEncoder().encode(email.toLowerCase().trim());
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async encrypt(key, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return { iv: bytesToBase64(iv), ciphertext: bytesToBase64(cipherBuf) };
  },

  async decrypt(key, encryptedData) {
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
    return new TextDecoder().decode(plainBuf);
  },

  async verifyTOTP(secretBase32, code, window = 1) {
    const secret = base32Decode(secretBase32);
    const counter = Math.floor(Date.now() / 30000);
    const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    for (let i = -window; i <= window; i++) {
      const time = counter + i;
      const timeBytes = new Uint8Array(8);
      let t = time;
      for (let j = 7; j >= 0; j--) { timeBytes[j] = t & 0xff; t = Math.floor(t / 256); }
      const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, timeBytes));
      const offset = hmac[hmac.length - 1] & 0x0f;
      const binary = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
      const otp = (binary % 1000000).toString().padStart(6, '0');
      if (otp === code.toString().padStart(6, '0')) return true;
    }
    return false;
  },

  async generateTOTP(secretBase32) {
    const secret = base32Decode(secretBase32);
    const counter = Math.floor(Date.now() / 30000);
    const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const timeBytes = new Uint8Array(8);
    let t = counter;
    for (let j = 7; j >= 0; j--) { timeBytes[j] = t & 0xff; t = Math.floor(t / 256); }
    const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, timeBytes));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
    return (binary % 1000000).toString().padStart(6, '0');
  },

  getTOTPRemaining() {
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  },

  generatePassword(length = 20, upper = true, lower = true, digits = true, symbols = true) {
    let chars = '';
    if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (digits) chars += '0123456789';
    if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const arr = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(arr, b => chars[b % chars.length]).join('');
  }
};
