const encoder = new TextEncoder();

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

export function hexHmacSha256(key: string, value: string): Promise<string> {
  return importKey(key).then(async (cryptoKey) =>
    bytesToHex(
      new Uint8Array(
        await crypto.subtle.sign(
          'HMAC',
          cryptoKey,
          toArrayBuffer(encoder.encode(value))
        )
      )
    )
  );
}

export function hexSha1(value: string): Promise<string> {
  return crypto.subtle
    .digest('SHA-1', toArrayBuffer(encoder.encode(value)))
    .then((digest) => bytesToHex(new Uint8Array(digest)));
}

export function hexSha256(value: string): Promise<string> {
  return crypto.subtle
    .digest('SHA-256', toArrayBuffer(encoder.encode(value)))
    .then((digest) => bytesToHex(new Uint8Array(digest)));
}

async function importKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(key)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(secret)),
    'HKDF',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toArrayBuffer(encoder.encode('miniprogram-session-key-v1')),
      info: toArrayBuffer(encoder.encode('aes-256-gcm')),
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export type EncryptedValue = {
  ciphertext: string;
  iv: string;
};

export async function encryptValue(
  plaintext: string,
  secret: string
): Promise<EncryptedValue> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(secret);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoder.encode(plaintext))
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptValue(
  value: EncryptedValue,
  secret: string
): Promise<string> {
  const key = await deriveAesKey(secret);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(base64ToBytes(value.iv)),
    },
    key,
    toArrayBuffer(base64ToBytes(value.ciphertext))
  );
  return new TextDecoder().decode(decrypted);
}

export function randomToken(bytes = 32): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)));
}
