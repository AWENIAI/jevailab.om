import type { VideoFeatureFlags } from './contracts';

const MAX_WEBHOOK_SKEW_SECONDS = 300;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function createKieWebhookSignature({
  secret,
  taskId,
  timestampSeconds,
}: {
  secret: string;
  taskId: string;
  timestampSeconds: number;
}) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${taskId}.${timestampSeconds}`)
  );
  return bytesToBase64(new Uint8Array(digest));
}

export async function verifyKieWebhookSignature({
  secret,
  taskId,
  timestampSeconds,
  signature,
  nowMs = Date.now(),
}: {
  secret: string;
  taskId: string;
  timestampSeconds: string;
  signature: string;
  nowMs?: number;
}) {
  const timestamp = Number(timestampSeconds);
  if (!secret || !taskId || !Number.isInteger(timestamp) || !signature) {
    return false;
  }
  if (
    Math.abs(Math.floor(nowMs / 1000) - timestamp) > MAX_WEBHOOK_SKEW_SECONDS
  ) {
    return false;
  }
  const expected = await createKieWebhookSignature({
    secret,
    taskId,
    timestampSeconds: timestamp,
  });
  const expectedBytes = base64ToBytes(expected);
  const receivedBytes = base64ToBytes(signature);
  return Boolean(
    expectedBytes &&
      receivedBytes &&
      timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export function assertVideoFeatureEnabled(flags: VideoFeatureFlags) {
  if (!flags.enabled) {
    throw new Error('Video creation is temporarily unavailable.');
  }
  if (!flags.providerSendEnabled || !flags.liveTestEnabled) {
    throw new Error('Video creation is in safe review mode.');
  }
}
