import { serverEnv } from '@/env/server';

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): ArrayBuffer {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`seeapi-review:${serverEnv.BETTER_AUTH_SECRET}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toBase64Url(
    await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  );
}

/** Creates a short-lived, read-only URL used solely by SeeAPI to fetch one private image. */
export async function createSeeApiReviewUrl(
  storageKey: string
): Promise<string> {
  const expiresAt = Date.now() + 10 * 60_000;
  const payload = `${expiresAt}.${storageKey}`;
  const token = await sign(payload);
  const base = serverEnv.VITE_BASE_URL.replace(/\/$/, '');
  return `${base}/api/storage/file?key=${encodeURIComponent(storageKey)}&reviewExpires=${expiresAt}&reviewToken=${encodeURIComponent(token)}`;
}

export async function verifySeeApiReviewUrl(
  storageKey: string,
  expiresAt: string | null,
  token: string | null
): Promise<boolean> {
  if (!expiresAt || !token || !/^\d{13}$/.test(expiresAt)) return false;
  const expiresAtNumber = Number(expiresAt);
  if (!Number.isSafeInteger(expiresAtNumber) || expiresAtNumber < Date.now())
    return false;
  try {
    const expected = await sign(`${expiresAtNumber}.${storageKey}`);
    const actualBytes = new Uint8Array(fromBase64Url(token));
    const expectedBytes = new Uint8Array(fromBase64Url(expected));
    if (actualBytes.length !== expectedBytes.length) return false;
    let difference = 0;
    for (let index = 0; index < actualBytes.length; index += 1) {
      difference |= actualBytes[index] ^ expectedBytes[index];
    }
    return difference === 0;
  } catch {
    return false;
  }
}
