import { logOperationalEvent } from '@/lib/observability';

export type MiniProgramErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INSUFFICIENT_CREDITS'
  | 'REFERENCE_REQUIRED'
  | 'REFERENCE_FORBIDDEN'
  | 'REFERENCE_UNAVAILABLE'
  | 'MODERATION_REJECTED'
  | 'MODERATION_UNAVAILABLE'
  | 'MODERATION_REVIEW_REQUIRED'
  | 'QUOTE_EXPIRED'
  | 'JOB_RUNNING'
  | 'PAYMENT_UNAVAILABLE'
  | 'PAYMENT_PENDING'
  | 'CONFIGURATION_ERROR'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<MiniProgramErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INSUFFICIENT_CREDITS: 402,
  REFERENCE_REQUIRED: 400,
  REFERENCE_FORBIDDEN: 400,
  REFERENCE_UNAVAILABLE: 400,
  MODERATION_REJECTED: 422,
  MODERATION_UNAVAILABLE: 503,
  MODERATION_REVIEW_REQUIRED: 202,
  QUOTE_EXPIRED: 409,
  JOB_RUNNING: 409,
  PAYMENT_UNAVAILABLE: 503,
  PAYMENT_PENDING: 202,
  CONFIGURATION_ERROR: 503,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

const DEFAULT_MESSAGE: Record<MiniProgramErrorCode, string> = {
  BAD_REQUEST: '请求参数有误',
  UNAUTHORIZED: '登录已失效，请重新登录',
  FORBIDDEN: '没有访问权限',
  NOT_FOUND: '内容不存在',
  CONFLICT: '请求发生冲突，请重试',
  INSUFFICIENT_CREDITS: '创作额度不足',
  REFERENCE_REQUIRED: '当前模板需要上传一张参考图',
  REFERENCE_FORBIDDEN: '当前模板不支持参考图',
  REFERENCE_UNAVAILABLE: '参考图不可用，请重新上传',
  MODERATION_REJECTED: '内容未通过安全审核',
  MODERATION_UNAVAILABLE: '内容审核服务暂不可用，请稍后重试',
  MODERATION_REVIEW_REQUIRED: '内容需要人工复核，本次额度已退回',
  QUOTE_EXPIRED: '报价已过期，请重新获取',
  JOB_RUNNING: '作品仍在生成中，暂时不能删除',
  PAYMENT_UNAVAILABLE: '支付功能暂不可用',
  PAYMENT_PENDING: '支付结果确认中',
  CONFIGURATION_ERROR: '服务配置不完整',
  UPSTREAM_ERROR: '上游服务暂不可用，请稍后重试',
  INTERNAL_ERROR: '服务暂时不可用，请稍后重试',
};

export class MiniProgramApiError extends Error {
  constructor(
    readonly code: MiniProgramErrorCode,
    message?: string,
    readonly status = STATUS_BY_CODE[code]
  ) {
    super(message ?? DEFAULT_MESSAGE[code]);
    this.name = 'MiniProgramApiError';
  }
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof MiniProgramApiError) {
    return jsonResponse(
      { code: error.code, message: error.message },
      { status: error.status }
    );
  }
  if (error instanceof SyntaxError) {
    return jsonResponse(
      { code: 'BAD_REQUEST', message: DEFAULT_MESSAGE.BAD_REQUEST },
      { status: 400 }
    );
  }
  logOperationalEvent.error('miniprogram request failed', error);
  return jsonResponse(
    { code: 'INTERNAL_ERROR', message: DEFAULT_MESSAGE.INTERNAL_ERROR },
    { status: 500 }
  );
}

export async function readJsonObject(
  request: Request,
  maxBytes = 64 * 1024
): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > maxBytes) {
    throw new MiniProgramApiError('BAD_REQUEST', '请求体过大', 413);
  }
  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new MiniProgramApiError('BAD_REQUEST', '请求体过大', 413);
  }
  let value: unknown;
  try {
    value = raw ? JSON.parse(raw) : {};
  } catch {
    throw new MiniProgramApiError('BAD_REQUEST', 'JSON 格式无效');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MiniProgramApiError('BAD_REQUEST', '请求体必须是 JSON 对象');
  }
  return value as Record<string, unknown>;
}
