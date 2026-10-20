import { createFileRoute } from '@tanstack/react-router';
import {
  loginWithWechatCode,
  requireMiniProgramSession,
} from '@/lib/miniprogram/auth.server';
import {
  createGeneration,
  deleteGeneration,
  getCapabilities,
  getGeneration,
  getOutputDownloadUrl,
  getPolicy,
  listGenerations,
  listTemplates,
  quoteDraft,
} from '@/lib/miniprogram/image-jobs.server';
import {
  deleteReferenceImage,
  uploadReferenceImage,
} from '@/lib/miniprogram/uploads.server';
import {
  getWalletSummary,
  listWalletLedger,
} from '@/lib/miniprogram/wallet.server';
import {
  createVirtualPayOrder,
  deliverFromNotify,
  listVirtualPayOrders,
  queryAndDeliverOrder,
  syncRefundFromNotify,
} from '@/lib/miniprogram/virtualpay.server';
import {
  logWechatPushParseFailure,
  parseAndDecryptWechatPush,
  verifyWechatUrlSignature,
} from '@/lib/miniprogram/wechat-message.server';
import {
  MiniProgramApiError,
  errorResponse,
  jsonResponse,
  readJsonObject,
} from '@/lib/miniprogram/responses.server';

function getPath(request: Request): string {
  return new URL(request.url).pathname.replace(/^\/api\/miniprogram\/?/, '');
}

function getHeader(request: Request, name: string): string | null {
  return request.headers.get(name);
}

async function handleUpload(request: Request): Promise<Response> {
  const session = await requireMiniProgramSession(request);
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    throw new MiniProgramApiError(
      'BAD_REQUEST',
      '参考图必须使用 multipart/form-data 上传'
    );
  }
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 11 * 1024 * 1024) {
    throw new MiniProgramApiError('BAD_REQUEST', '参考图不能超过 10MB', 413);
  }
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new MiniProgramApiError('BAD_REQUEST', '缺少参考图文件');
  }
  return jsonResponse(await uploadReferenceImage(session.userId, file));
}

async function handlePaymentNotify(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const signature = url.searchParams.get('signature');
  const timestamp = url.searchParams.get('timestamp');
  const nonce = url.searchParams.get('nonce');
  const signatureValid = await verifyWechatUrlSignature(
    signature,
    timestamp,
    nonce
  );
  if (!signatureValid) {
    return new Response('Invalid signature', { status: 403 });
  }

  const echostr = url.searchParams.get('echostr');
  if (request.method === 'GET' && echostr !== null) {
    return new Response(echostr, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const raw = await request.text();
  const contentType = request.headers.get('content-type');
  let format: 'json' | 'xml' = 'xml';
  try {
    const push = await parseAndDecryptWechatPush(
      raw,
      contentType,
      url.searchParams.get('encrypt_type')
    );
    format = push.format;
    if (
      push.event !== 'xpay_goods_deliver_notify' &&
      push.event !== 'xpay_refund_notify'
    ) {
      return push.format === 'json'
        ? jsonResponse({ ErrCode: 0, ErrMsg: 'ignored' })
        : new Response(
            '<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[ignored]]></ErrMsg></xml>',
            { headers: { 'Content-Type': 'application/xml' } }
          );
    }
    if (!push.outTradeNo || !push.openid) {
      throw new Error('Missing payment notification fields.');
    }
    const result =
      push.event === 'xpay_refund_notify'
        ? await syncRefundFromNotify(
            push.outTradeNo,
            push.openid,
            raw,
            push.platformOrderId
          )
        : await deliverFromNotify(
            push.outTradeNo,
            push.openid,
            raw,
            push.platformOrderId
          );
    const ok = result.ok;
    if (format === 'json') {
      return jsonResponse(
        { ErrCode: ok ? 0 : 1, ErrMsg: ok ? 'success' : 'failed' },
        { status: ok ? 200 : 500 }
      );
    }
    return new Response(
      `<xml><ErrCode>${ok ? 0 : 1}</ErrCode><ErrMsg><![CDATA[${ok ? 'success' : 'failed'}]]></ErrMsg></xml>`,
      {
        status: ok ? 200 : 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  } catch (error) {
    logWechatPushParseFailure(error);
    return new Response(
      '<xml><ErrCode>1</ErrCode><ErrMsg><![CDATA[failed]]></ErrMsg></xml>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const path = getPath(request);
  const method = request.method.toUpperCase();

  if (path === 'templates' && method === 'GET') {
    const url = new URL(request.url);
    return jsonResponse(
      await listTemplates({
        category: url.searchParams.get('category') ?? undefined,
        q: url.searchParams.get('q') ?? undefined,
      })
    );
  }
  if (path === 'capabilities' && method === 'GET') {
    return jsonResponse(getCapabilities());
  }
  if (path === 'policy' && method === 'GET') {
    return jsonResponse(getPolicy());
  }
  if (path === 'auth/login' && method === 'POST') {
    const body = await readJsonObject(request);
    const code = typeof body.code === 'string' ? body.code : '';
    return jsonResponse(await loginWithWechatCode(code));
  }
  if (path === 'pay/notify') {
    return handlePaymentNotify(request);
  }
  if (path === 'upload' && method === 'POST') {
    return handleUpload(request);
  }

  const session = await requireMiniProgramSession(request);

  if (path === 'quote' && method === 'POST') {
    return jsonResponse(
      await quoteDraft(session.userId, await readJsonObject(request))
    );
  }
  if (path === 'upload/delete' && method === 'POST') {
    const body = await readJsonObject(request);
    return jsonResponse(
      await deleteReferenceImage(session.userId, body.assetId)
    );
  }
  if (path === 'generations' && method === 'POST') {
    return jsonResponse(
      await createGeneration(
        session.userId,
        await readJsonObject(request),
        getHeader(request, 'idempotency-key')
      ),
      { status: 201 }
    );
  }
  if (path === 'generations' && method === 'GET') {
    return jsonResponse(await listGenerations(session.userId));
  }
  const generationMatch = path.match(/^generations\/([A-Za-z0-9_-]+)$/);
  if (generationMatch && method === 'GET') {
    return jsonResponse(
      await getGeneration(session.userId, generationMatch[1])
    );
  }
  if (generationMatch && method === 'DELETE') {
    return jsonResponse(
      await deleteGeneration(session.userId, generationMatch[1])
    );
  }
  const outputMatch = path.match(/^outputs\/([A-Za-z0-9_-]+)\/download$/);
  if (outputMatch && method === 'GET') {
    return jsonResponse(
      await getOutputDownloadUrl(session.userId, outputMatch[1])
    );
  }
  if (path === 'wallet' && method === 'GET') {
    return jsonResponse(await getWalletSummary(session.userId));
  }
  if (path === 'wallet/ledger' && method === 'GET') {
    return jsonResponse(await listWalletLedger(session.userId));
  }
  if (path === 'pay/order' && method === 'POST') {
    return jsonResponse(
      await createVirtualPayOrder(session.userId, await readJsonObject(request))
    );
  }
  if (path === 'pay/query' && method === 'POST') {
    const body = await readJsonObject(request);
    if (typeof body.outTradeNo !== 'string') {
      throw new MiniProgramApiError('BAD_REQUEST', '缺少订单号');
    }
    return jsonResponse(
      await queryAndDeliverOrder(session.userId, body.outTradeNo)
    );
  }
  if (path === 'pay/orders' && method === 'GET') {
    return jsonResponse(await listVirtualPayOrders(session.userId));
  }
  throw new MiniProgramApiError('NOT_FOUND');
}

export const Route = createFileRoute('/api/miniprogram/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleRequest(request).catch(errorResponse),
      POST: ({ request }) => handleRequest(request).catch(errorResponse),
      DELETE: ({ request }) => handleRequest(request).catch(errorResponse),
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, Authorization, Idempotency-Key',
          },
        }),
    },
  },
});
