import { serverEnv } from '@/env/server';

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`video-private-media:${serverEnv.BETTER_AUTH_SECRET}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toBase64Url(
    await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  );
}

export async function createPrivateVideoProviderUrl(storageKey: string) {
  const expiresAt = Date.now() + 10 * 60_000;
  const purpose = 'kie-provider';
  const token = await sign(`${expiresAt}.${purpose}.${storageKey}`);
  const base = serverEnv.VITE_BASE_URL.replace(/\/$/, '');
  return `${base}/api/storage/file?key=${encodeURIComponent(storageKey)}&privateExpires=${expiresAt}&privatePurpose=${purpose}&privateToken=${encodeURIComponent(token)}`;
}

export async function verifyPrivateVideoProviderUrl(
  storageKey: string,
  expiresAt: string | null,
  purpose: string | null,
  token: string | null
) {
  if (
    !expiresAt ||
    !purpose ||
    !token ||
    purpose !== 'kie-provider' ||
    !/^\d{13}$/.test(expiresAt)
  ) {
    return false;
  }
  const expiry = Number(expiresAt);
  if (!Number.isSafeInteger(expiry) || expiry < Date.now()) return false;
  try {
    const expected = fromBase64Url(
      await sign(`${expiry}.${purpose}.${storageKey}`)
    );
    const actual = fromBase64Url(token);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) {
      difference |= actual[index] ^ expected[index];
    }
    return difference === 0;
  } catch {
    return false;
  }
}
