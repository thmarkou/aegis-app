/**
 * AES-256-CBC; key material = SHA256(UTF-8 passphrase) (32 bytes).
 * Wire format: ENC:<base64url( IV_16 || ciphertext )> — compact for APRS (~72 char budget).
 */
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';

export const APRS_ENC_PREFIX = 'ENC:' as const;

/** Conservative max for the `>` text in APRS status (fits one AX.25/APRS UI frame). */
export const APRS_STATUS_MESSAGE_MAX_LEN = 72;

function base64ToBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBase64(url: string): string {
  let b64 = url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (b64.length % 4)) % 4;
  return b64 + '='.repeat(pad);
}

function keyWordArray(secretKey: string): CryptoJS.lib.WordArray {
  return CryptoJS.SHA256(secretKey);
}

/** Encrypted payload length including ENC: prefix (ASCII). */
export function encryptedPacketCharLength(plainText: string, secretKey: string): number {
  return encryptAprsPayloadForLength(plainText, secretKey).length;
}

function encryptAprsPayloadForLength(plainText: string, secretKey: string): string {
  const key = keyWordArray(secretKey);
  const iv = CryptoJS.lib.WordArray.random(128 / 8);
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const combined = iv.concat(encrypted.ciphertext);
  const b64 = CryptoJS.enc.Base64.stringify(combined);
  return `${APRS_ENC_PREFIX}${base64ToBase64Url(b64)}`;
}

/**
 * Returns `ENC:` + base64url(iv|ciphertext).
 * Throws if result exceeds APRS_STATUS_MESSAGE_MAX_LEN.
 */
export function encryptAprsPayload(plainText: string, secretKey: string): string {
  const trimmed = plainText.trim();
  if (!trimmed) throw new Error('Message is empty');
  if (!secretKey.trim()) throw new Error('Encryption key is empty');
  const out = encryptAprsPayloadForLength(trimmed, secretKey);
  if (out.length > APRS_STATUS_MESSAGE_MAX_LEN) {
    throw new Error(
      `Encrypted message too long for APRS (${out.length} chars, max ${APRS_STATUS_MESSAGE_MAX_LEN}). Shorten the text.`
    );
  }
  return out;
}

/** Max UTF-8 plaintext chars that fit in a single encrypted APRS status line (approximate). */
export function maxPlaintextCharsForAprs(secretKey: string): number {
  if (!secretKey.trim()) return 0;
  let low = 0;
  let high = 200;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const test = 'A'.repeat(mid);
    try {
      const len = encryptAprsPayloadForLength(test, secretKey).length;
      if (len <= APRS_STATUS_MESSAGE_MAX_LEN) low = mid;
      else high = mid - 1;
    } catch {
      high = mid - 1;
    }
  }
  return low;
}

function wordArrayToUint8(wa: CryptoJS.lib.WordArray): Uint8Array {
  const len = wa.sigBytes;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = (wa.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return out;
}

export function decryptAprsPayloadWithKey(
  encodedWithoutPrefix: string,
  secretKey: string
): string | null {
  const raw = secretKey.trim();
  if (!raw || !encodedWithoutPrefix.trim()) return null;
  try {
    const key = keyWordArray(raw);
    const wa = CryptoJS.enc.Base64.parse(base64UrlToBase64(encodedWithoutPrefix.trim()));
    if (wa.sigBytes < 32) return null;
    const all = wordArrayToUint8(wa);
    const iv = CryptoJS.enc.Hex.parse(Buffer.from(all.slice(0, 16)).toString('hex'));
    const ct = CryptoJS.enc.Hex.parse(Buffer.from(all.slice(16)).toString('hex'));
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ct } as CryptoJS.lib.CipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const utf8 = decrypted.toString(CryptoJS.enc.Utf8);
    return utf8 || null;
  } catch {
    return null;
  }
}

export type DecryptDisplayResult =
  | { kind: 'plain'; text: string }
  | { kind: 'decrypted'; group: 'Family' | 'Rescuers'; text: string }
  | { kind: 'mismatch' };

export function decodeIncomingAprsMessageBody(
  body: string,
  familyKey: string | null,
  rescuersKey: string | null
): DecryptDisplayResult {
  const t = body.trim();
  if (!t.startsWith(APRS_ENC_PREFIX)) {
    return { kind: 'plain', text: t };
  }
  const payload = t.slice(APRS_ENC_PREFIX.length).trim();
  if (!payload) {
    return { kind: 'plain', text: t };
  }
  const fk = familyKey?.trim() ?? '';
  const rk = rescuersKey?.trim() ?? '';
  if (fk) {
    const d = decryptAprsPayloadWithKey(payload, fk);
    if (d != null) return { kind: 'decrypted', group: 'Family', text: d };
  }
  if (rk) {
    const d = decryptAprsPayloadWithKey(payload, rk);
    if (d != null) return { kind: 'decrypted', group: 'Rescuers', text: d };
  }
  return { kind: 'mismatch' };
}
