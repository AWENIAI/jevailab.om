import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth/auth';
import { getDb } from '@/db';
import { account, user } from '@/db/auth.schema';
import { miniprogramAccounts } from '@/db/miniprogram.schema';
import { serverEnv } from '@/env/server';
import { logOperationalEvent } from '@/lib/observability';
import { encryptValue, hexSha256 } from './crypto.server';
import { MiniProgramApiError } from './responses.server';

const PROVIDER_ID = 'wechat-miniprogram';
const SESSION_COOKIE = 'better-auth.session_token';

type Code2SessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

type MiniProgramSession = {
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
};

function requireWechatConfig() {
  const appid = serverEnv.WECHAT_MINIPROGRAM_APPID;
  const secret = serverEnv.WECHAT_MINIPROGRAM_SECRET;
  if (!appid || !secret) {
    throw new MiniProgramApiError('CONFIGURATION_ERROR', '微信登录尚未配置');
  }
  return { appid, secret };
}

async function code2Session(
  code: string
): Promise<
  Required<Pick<Code2SessionResponse, 'openid' | 'session_key'>> &
    Pick<Code2SessionResponse, 'unionid'>
> {
  const { appid, secret } = requireWechatConfig();
  const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');
  const response = await fetch(url);
  const payload = (await response.json()) as Code2SessionResponse;
  if (
    !response.ok ||
    payload.errcode ||
    !payload.openid ||
    !payload.session_key
  ) {
    logOperationalEvent.warn('wechat code2session failed', {
      status: response.status,
      errcode: payload.errcode,
    });
    throw new MiniProgramApiError(
      'UNAUTHORIZED',
      '微信登录凭证无效，请重新登录'
    );
  }
  return {
    openid: payload.openid,
    session_key: payload.session_key,
    unionid: payload.unionid,
  };
}

async function createSyntheticEmail(openid: string): Promise<string> {
  const digest = await hexSha256(`wechat-miniprogram:${openid}`);
  return `wx_${digest.slice(0, 32)}@miniprogram.jevailab.local`;
}

async function getOrCreateUser(openid: string): Promise<string> {
  const db = getDb();
  const [existingAccount] = await db
    .select({ userId: account.userId })
    .from(account)
    .where(
      and(eq(account.providerId, PROVIDER_ID), eq(account.accountId, openid))
    )
    .limit(1);
  if (existingAccount) return existingAccount.userId;

  const [existingMapping] = await db
    .select({ userId: miniprogramAccounts.userId })
    .from(miniprogramAccounts)
    .where(eq(miniprogramAccounts.openid, openid))
    .limit(1);
  if (existingMapping) return existingMapping.userId;

  const ctx = await auth.$context;
  const email = await createSyntheticEmail(openid);
  const userId = crypto.randomUUID();
  try {
    await ctx.internalAdapter.createUser({
      id: userId,
      name: '微信用户',
      email,
      emailVerified: true,
    });
    await ctx.internalAdapter.createAccount({
      accountId: openid,
      providerId: PROVIDER_ID,
      userId,
    });
  } catch (error) {
    const [racedAccount] = await db
      .select({ userId: account.userId })
      .from(account)
      .where(
        and(eq(account.providerId, PROVIDER_ID), eq(account.accountId, openid))
      )
      .limit(1);
    if (racedAccount) return racedAccount.userId;
    throw error;
  }
  return userId;
}

async function saveSessionKey(
  userId: string,
  openid: string,
  unionid: string | undefined,
  sessionKey: string
): Promise<void> {
  const encrypted = await encryptValue(
    sessionKey,
    serverEnv.BETTER_AUTH_SECRET
  );
  const now = new Date();
  await getDb()
    .insert(miniprogramAccounts)
    .values({
      userId,
      openid,
      unionid: unionid ?? null,
      encryptedSessionKey: encrypted.ciphertext,
      sessionKeyIv: encrypted.iv,
      sessionKeyUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: miniprogramAccounts.userId,
      set: {
        openid,
        unionid: unionid ?? null,
        encryptedSessionKey: encrypted.ciphertext,
        sessionKeyIv: encrypted.iv,
        sessionKeyUpdatedAt: now,
        updatedAt: now,
      },
    });
}

export async function loginWithWechatCode(code: string) {
  if (!code.trim()) {
    throw new MiniProgramApiError('BAD_REQUEST', '缺少微信登录 code');
  }
  const sessionData = await code2Session(code);
  const userId = await getOrCreateUser(sessionData.openid);
  await saveSessionKey(
    userId,
    sessionData.openid,
    sessionData.unionid,
    sessionData.session_key
  );
  const ctx = await auth.$context;
  const createdSession = await ctx.internalAdapter.createSession(userId);
  const [profile] = await getDb()
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return {
    accessToken: createdSession.token,
    user: {
      id: userId,
      name: profile?.name ?? '微信用户',
      avatarUrl: profile?.image ?? '',
      plan: 'free',
    },
  };
}

export async function getMiniProgramSession(
  request: Request
): Promise<MiniProgramSession | null> {
  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const cookieToken = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const token = bearerToken ?? cookieToken;
  if (!token) return null;

  const ctx = await auth.$context;
  const result = await ctx.internalAdapter.findSession(token);
  if (!result) return null;
  if (result.session.expiresAt.getTime() <= Date.now()) return null;
  if (result.user.banned) {
    throw new MiniProgramApiError('FORBIDDEN', '账号已被限制使用');
  }

  return {
    userId: result.user.id,
    user: {
      id: result.user.id,
      name: result.user.name,
      avatarUrl: result.user.image ?? '',
    },
  };
}

export async function requireMiniProgramSession(
  request: Request
): Promise<MiniProgramSession> {
  const session = await getMiniProgramSession(request);
  if (!session) {
    throw new MiniProgramApiError('UNAUTHORIZED');
  }
  return session;
}

export async function getWechatSessionKey(userId: string): Promise<string> {
  const [mapping] = await getDb()
    .select({
      ciphertext: miniprogramAccounts.encryptedSessionKey,
      iv: miniprogramAccounts.sessionKeyIv,
    })
    .from(miniprogramAccounts)
    .where(eq(miniprogramAccounts.userId, userId))
    .limit(1);
  if (!mapping?.ciphertext || !mapping.iv) {
    throw new MiniProgramApiError('UNAUTHORIZED', '登录状态已过期，请重新登录');
  }
  const { decryptValue } = await import('./crypto.server');
  return decryptValue(
    { ciphertext: mapping.ciphertext, iv: mapping.iv },
    serverEnv.BETTER_AUTH_SECRET
  );
}

export async function getWechatOpenId(userId: string): Promise<string> {
  const [mapping] = await getDb()
    .select({ openid: miniprogramAccounts.openid })
    .from(miniprogramAccounts)
    .where(eq(miniprogramAccounts.userId, userId))
    .limit(1);
  if (!mapping?.openid) {
    throw new MiniProgramApiError('UNAUTHORIZED');
  }
  return mapping.openid;
}
