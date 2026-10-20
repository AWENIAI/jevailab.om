import { env } from 'cloudflare:workers';
import { serverEnv } from '@/env/server';
import { logOperationalEvent } from '@/lib/observability';

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let memoryToken: CachedToken | null = null;

function getCache(): KVNamespace | undefined {
  return (env as unknown as { CACHE?: KVNamespace }).CACHE;
}

function getWechatCredentials() {
  const appid = serverEnv.WECHAT_MINIPROGRAM_APPID;
  const secret = serverEnv.WECHAT_MINIPROGRAM_SECRET;
  if (!appid || !secret) return null;
  return { appid, secret };
}

/**
 * Uses WeChat's stable_token endpoint and caches for the documented lifetime
 * minus five minutes. Normal refreshes must never force-refresh the token.
 */
export async function getWechatAccessToken(options?: {
  forceRefresh?: boolean;
}): Promise<string> {
  const credentials = getWechatCredentials();
  if (!credentials) {
    throw new Error('WeChat Mini Program credentials are not configured.');
  }
  const cacheKey = `miniprogram:wechat-access-token:${credentials.appid}`;
  const now = Date.now();

  if (!options?.forceRefresh) {
    if (memoryToken && memoryToken.expiresAt > now) {
      return memoryToken.accessToken;
    }
    const cache = getCache();
    if (cache) {
      const cached = await cache.get<CachedToken>(cacheKey, 'json');
      if (cached && cached.expiresAt > now) {
        memoryToken = cached;
        return cached.accessToken;
      }
    }
  }

  const response = await fetch(
    'https://api.weixin.qq.com/cgi-bin/stable_token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credential',
        appid: credentials.appid,
        secret: credentials.secret,
        force_refresh: false,
      }),
    }
  );
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    errcode?: number;
    errmsg?: string;
  };
  if (!response.ok || !payload.access_token) {
    logOperationalEvent.warn('wechat access token request failed', {
      status: response.status,
      errcode: payload.errcode,
    });
    throw new Error('Unable to obtain WeChat access token.');
  }
  const ttlSeconds = Math.max(
    60,
    Math.min(payload.expires_in ?? 7200, 7200) - 300
  );
  const cached: CachedToken = {
    accessToken: payload.access_token,
    expiresAt: now + ttlSeconds * 1000,
  };
  memoryToken = cached;
  const cache = getCache();
  if (cache) {
    await cache.put(cacheKey, JSON.stringify(cached), {
      expirationTtl: ttlSeconds,
    });
  }
  return cached.accessToken;
}

export function clearWechatAccessTokenCache(): void {
  memoryToken = null;
}
