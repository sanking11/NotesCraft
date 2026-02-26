/**
 * NotesCraft — E2E Encryption Module
 * Uses Web Crypto API: PBKDF2 key derivation + AES-256-GCM encryption
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

/** Safe Uint8Array → base64 (handles large buffers without stack overflow) */
function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  const CHUNK = 8192;
  for (let i = 0; i < arr.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, Math.min(i + CHUNK, arr.length)));
  }
  return btoa(bin);
}

/** Generate a random salt (16 bytes, returned as hex) */
export function generateSalt() {
  const buf = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Convert hex string to Uint8Array */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/** Import password as a CryptoKey for PBKDF2 */
async function importPassword(password) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
}

/** Derive an AES-256-GCM key from password + salt using PBKDF2 */
export async function deriveKey(password, saltHex) {
  const baseKey = await importPassword(password);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/** Export CryptoKey → base64 string (for session persistence) */
export async function exportKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bytesToBase64(raw);
}

/** Import base64 string → CryptoKey */
export async function importKey(b64) {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

/** Hash password with PBKDF2 for auth verification (returns hex string) */
export async function hashPassword(password, saltHex) {
  const baseKey = await importPassword(password);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex + 'auth'),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Hash email → hex string (for anonymous storage keys) */
export async function hashEmail(email) {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Encrypt plaintext string → { iv, ciphertext } (both base64) */
export async function encrypt(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(cipherBuf),
  };
}

/* ═══════════ TOTP / 2FA ═══════════ */

/** Base32 decode (RFC 4648) — internal helper */
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
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return output.slice(0, index);
}

/** Generate a 20-byte random TOTP secret, returned as base32 string */
export function generateTOTPSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '', bits = 0, value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) result += alphabet[(value << (5 - bits)) & 0x1f];
  return result;
}

/** Verify a 6-digit TOTP code (RFC 6238). window=1 checks ±30s for clock drift */
export async function verifyTOTP(secretBase32, code, window = 1) {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 30000);
  const key = await crypto.subtle.importKey(
    'raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  for (let i = -window; i <= window; i++) {
    const time = counter + i;
    const timeBytes = new Uint8Array(8);
    let t = time;
    for (let j = 7; j >= 0; j--) {
      timeBytes[j] = t & 0xff;
      t = Math.floor(t / 256);
    }
    const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, timeBytes));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24) |
                   ((hmac[offset + 1] & 0xff) << 16) |
                   ((hmac[offset + 2] & 0xff) << 8) |
                   (hmac[offset + 3] & 0xff);
    const otp = (binary % 1000000).toString().padStart(6, '0');
    if (otp === code.toString().padStart(6, '0')) return true;
  }
  return false;
}

/** Generate the current 6-digit TOTP code for a given secret (RFC 6238) */
export async function generateTOTP(secretBase32) {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 30000);
  const key = await crypto.subtle.importKey(
    'raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const timeBytes = new Uint8Array(8);
  let t = counter;
  for (let j = 7; j >= 0; j--) {
    timeBytes[j] = t & 0xff;
    t = Math.floor(t / 256);
  }
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, timeBytes));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}

/** Get seconds remaining in current TOTP 30-second period */
export function getTOTPRemaining() {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

/** Generate 8 random recovery codes in XXXXX-XXXXX format */
export function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    codes.push(hex.slice(0, 5).toUpperCase() + '-' + hex.slice(5).toUpperCase());
  }
  return codes;
}

/** Decrypt { iv, ciphertext } → plaintext string */
export async function decrypt(key, encryptedData) {
  const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes
  );
  return new TextDecoder().decode(plainBuf);
}
