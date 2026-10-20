import { serverEnv } from '@/env/server';
import { logOperationalEvent } from '@/lib/observability';
import { hexSha1, toArrayBuffer } from './crypto.server';

export type ParsedWechatPush = {
  format: 'json' | 'xml';
  event?: string;
  openid?: string;
  outTradeNo?: string;
  platformOrderId?: string;
  env?: number;
  raw: string;
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readXmlText(inner: string): string {
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1] : decodeXmlEntities(inner.trim());
}

function parseXmlField(raw: string, key: string): string | undefined {
  const escapedKey = escapeRegExp(key);
  const match = raw.match(
    new RegExp(`<${escapedKey}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedKey}>`)
  );
  return match ? readXmlText(match[1]) : undefined;
}

function parseXmlSection(raw: string, section: string): string | undefined {
  const escaped = escapeRegExp(section);
  const match = raw.match(
    new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`)
  );
  return match?.[1];
}

function parseXmlFields(raw: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const key of [
    'Event',
    'OpenId',
    'OutTradeNo',
    'Env',
    'MchOrderNo',
    'Encrypt',
  ]) {
    const value = parseXmlField(raw, key);
    if (value !== undefined) fields[key] = value;
  }
  return fields;
}

function getNestedXmlField(
  raw: string,
  section: string,
  key: string
): string | undefined {
  const inner = parseXmlSection(raw, section);
  if (!inner) return undefined;
  return parseXmlField(inner, key);
}

function findNestedString(
  value: unknown,
  path: readonly string[]
): string | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function parseWechatPush(
  raw: string,
  contentType: string | null
): ParsedWechatPush {
  const trimmed = raw.trim();
  if (contentType?.includes('json') || trimmed.startsWith('{')) {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid WeChat JSON push.');
    }
    const encrypted = payload.Encrypt;
    if (typeof encrypted === 'string' && encrypted) {
      throw new Error('WECHAT_PUSH_ENCRYPTED');
    }
    const platformOrderId =
      findNestedString(payload, ['WeChatPayInfo', 'MchOrderNo']) ??
      findNestedString(payload, ['wechatPayInfo', 'mchOrderNo']) ??
      findNestedString(payload, ['MchOrderNo']) ??
      findNestedString(payload, ['mchOrderNo']);
    const outTradeNo =
      (typeof payload.OutTradeNo === 'string'
        ? payload.OutTradeNo
        : undefined) ??
      findNestedString(payload, ['WeChatPayInfo', 'OutTradeNo']) ??
      findNestedString(payload, ['wechatPayInfo', 'outTradeNo']) ??
      findNestedString(payload, ['outTradeNo']);
    return {
      format: 'json',
      event:
        (typeof payload.Event === 'string' ? payload.Event : undefined) ??
        findNestedString(payload, ['event']),
      openid:
        (typeof payload.OpenId === 'string' ? payload.OpenId : undefined) ??
        (typeof payload.openid === 'string' ? payload.openid : undefined) ??
        findNestedString(payload, ['OpenId']),
      outTradeNo,
      platformOrderId,
      env:
        typeof payload.Env === 'number'
          ? payload.Env
          : typeof payload.Env === 'string'
            ? Number(payload.Env)
            : undefined,
      raw,
    };
  }
  const fields = parseXmlFields(trimmed);
  if (fields.Encrypt) {
    throw new Error('WECHAT_PUSH_ENCRYPTED');
  }
  const outTradeNo =
    fields.OutTradeNo ??
    fields['WeChatPayInfo.OutTradeNo'] ??
    getNestedXmlField(trimmed, 'WeChatPayInfo', 'OutTradeNo');
  const platformOrderId =
    fields['WeChatPayInfo.MchOrderNo'] ??
    getNestedXmlField(trimmed, 'WeChatPayInfo', 'MchOrderNo') ??
    fields.MchOrderNo;
  return {
    format: 'xml',
    event: fields.Event,
    openid: fields.OpenId,
    outTradeNo,
    platformOrderId,
    env: fields.Env === undefined ? undefined : Number(fields.Env),
    raw,
  };
}

export async function verifyWechatUrlSignature(
  signature: string | null,
  timestamp: string | null,
  nonce: string | null
): Promise<boolean> {
  const token = serverEnv.WECHAT_MESSAGE_PUSH_TOKEN;
  if (!token || !signature || !timestamp || !nonce) return false;
  const expected = await hexSha1([token, timestamp, nonce].sort().join(''));
  return constantTimeEqual(expected, signature);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function decodeEncodingAesKey(value: string): Uint8Array {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9+/]{43}=?$/.test(normalized)) {
    throw new Error('Invalid WeChat EncodingAESKey.');
  }
  const binary = atob(`${normalized}=`.slice(0, 44));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/**
 * Decrypts WeChat safe-mode pushes. The official AES-CBC framing is:
 * random(16) + msg_len(4, network order) + msg + appid.
 */
export async function decryptWechatPush(encrypted: string): Promise<string> {
  const aesKey = serverEnv.WECHAT_MESSAGE_PUSH_ENCODING_AES_KEY;
  const appid = serverEnv.WECHAT_MINIPROGRAM_APPID;
  if (!aesKey || !appid) {
    throw new Error('WeChat safe-mode push is not configured.');
  }
  const keyBytes = decodeEncodingAesKey(aesKey);
  if (keyBytes.length !== 32) {
    throw new Error('Invalid WeChat AES key length.');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );
  const cipher = Uint8Array.from(atob(encrypted), (character) =>
    character.charCodeAt(0)
  );
  const plain = new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: toArrayBuffer(keyBytes.slice(0, 16)),
      },
      key,
      toArrayBuffer(cipher)
    )
  );
  const pad = plain[plain.length - 1] ?? 0;
  if (pad < 1 || pad > 32 || pad > plain.length) {
    throw new Error('Invalid WeChat push padding.');
  }
  const content = plain.slice(16, plain.length - pad);
  const messageLength =
    ((content[0] << 24) |
      (content[1] << 16) |
      (content[2] << 8) |
      content[3]) >>>
    0;
  if (messageLength <= 0 || messageLength > content.length - 4) {
    throw new Error('Invalid WeChat push message length.');
  }
  const message = new TextDecoder().decode(content.slice(4, 4 + messageLength));
  const receivedAppId = new TextDecoder().decode(
    content.slice(4 + messageLength)
  );
  if (receivedAppId !== appid) {
    throw new Error('WeChat push appid mismatch.');
  }
  return message;
}

export async function parseAndDecryptWechatPush(
  raw: string,
  contentType: string | null,
  encryptType: string | null
): Promise<ParsedWechatPush> {
  try {
    return parseWechatPush(raw, contentType);
  } catch (error) {
    if (
      encryptType !== 'aes' ||
      !(error instanceof Error) ||
      error.message !== 'WECHAT_PUSH_ENCRYPTED'
    ) {
      throw error;
    }
    const trimmed = raw.trim();
    const encrypted = trimmed.startsWith('{')
      ? (JSON.parse(trimmed) as { Encrypt?: string }).Encrypt
      : parseXmlFields(trimmed).Encrypt;
    if (!encrypted) throw new Error('Encrypted payload is missing.');
    const decrypted = await decryptWechatPush(encrypted);
    return parseWechatPush(decrypted, 'application/xml');
  }
}

export function logWechatPushParseFailure(error: unknown): void {
  logOperationalEvent.warn('wechat message push parse failed', error);
}
