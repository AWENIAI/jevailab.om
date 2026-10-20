import { serverEnv } from '@/env/server';

const encoder = new TextEncoder();

type PrivatePurpose = 'miniprogram-user' | 'fal-image-provider';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`image-private-media:${serverEnv.BETTER_AUTH_SECRET}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toBase64Url(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
  );
}

async function createUrl(
  storageKey: string,
  purpose: PrivatePurpose,
  ttlMs: number
): Promise<string> {
  const expiresAt = Date.now() + ttlMs;
  const token = await sign(`${expiresAt}.${purpose}.${storageKey}`);
  const base = serverEnv.VITE_BASE_URL.replace(/\/$/, '');
  return `${base}/api/storage/file?key=${encodeURIComponent(storageKey)}&privateExpires=${expiresAt}&privatePurpose=${purpose}&privateToken=${encodeURIComponent(token)}`;
}

export function createPrivateMiniProgramUserUrl(
  storageKey: string
): Promise<string> {
  return createUrl(storageKey, 'miniprogram-user', 15 * 60_000);
}

export function createPrivateFalImageProviderUrl(
  storageKey: string
): Promise<string> {
  return createUrl(storageKey, 'fal-image-provider', 15 * 60_000);
}

export async function verifyPrivateImageUrl(
  storageKey: string,
  expiresAt: string | null,
  purpose: string | null,
  token: string | null
): Promise<PrivatePurpose | null> {
  if (
    !expiresAt ||
    !purpose ||
    !token ||
    !/^\d{13}$/.test(expiresAt) ||
    (purpose !== 'miniprogram-user' && purpose !== 'fal-image-provider')
  ) {
    return null;
  }
  const expiry = Number(expiresAt);
  if (!Number.isSafeInteger(expiry) || expiry < Date.now()) return null;
  try {
    const expected = fromBase64Url(
      await sign(`${expiry}.${purpose}.${storageKey}`)
    );
    const actual = fromBase64Url(token);
    if (actual.length !== expected.length) return null;
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) {
      difference |= actual[index] ^ expected[index];
    }
    return difference === 0 ? (purpose as PrivatePurpose) : null;
  } catch {
    return null;
  }
}
