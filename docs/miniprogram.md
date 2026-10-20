# WeChat Mini Program

The mini program is a separate native client in the sibling workspace
`小程序/` under `01-本地项目`. It calls the Worker through
`/api/miniprogram/*`; do not point it at TanStack server functions.

## 1. Deploy the backend

Apply the D1 migrations (the mini program tables are in
`0010_absurd_thunderbolt.sql`) and deploy the Worker:

```powershell
pnpm db:migrate:remote
pnpm deploy
```

Configure these Worker secrets:

```text
WECHAT_MINIPROGRAM_APPID
WECHAT_MINIPROGRAM_SECRET
WECHAT_VIRTUAL_PAY_OFFER_ID
WECHAT_VIRTUAL_PAY_APP_KEY
WECHAT_VIRTUAL_PAY_ENV=0
WECHAT_MESSAGE_PUSH_TOKEN
WECHAT_MESSAGE_PUSH_ENCODING_AES_KEY
FAL_KEY
SEEAPI_API_KEY
WAFFO_MERCHANT_ID
WAFFO_PRIVATE_KEY
```

`WAFFO_*` is required for prompt moderation and `SEEAPI_API_KEY` for
reference/generated-image moderation. Both providers are fail-closed: do not
enable real generation until both are working.

## 2. WeChat MP configuration

1. Complete the mini program filing and choose a category containing
   **工具** (for example, 工具 - 图片/音视频处理).
2. Add `https://jevailab.com` to the request, uploadFile, and downloadFile
   legal-domain lists. The domain must have ICP filing.
3. Configure message push:
   - URL: `https://jevailab.com/api/miniprogram/pay/notify`
   - Token: same as `WECHAT_MESSAGE_PUSH_TOKEN`
   - EncodingAESKey: same as `WECHAT_MESSAGE_PUSH_ENCODING_AES_KEY`
   - Encryption mode: safe mode
   - Subscribe to both `xpay_goods_deliver_notify` and
     `xpay_refund_notify`. The route verifies the URL signature and
     safe-mode payload before processing either event.
4. Create and publish the virtual-payment goods exactly as follows:

| Product ID | Credits | Price |
| --- | ---: | ---: |
| `quota_60` | 60 | ¥9.90 |
| `quota_200` | 200 | ¥29.90 |
| `quota_600` | 600 | ¥79.90 |

The price in the WeChat console must equal the server-side `priceFen`.
Delivery is rejected when `order_fee` or `paid_fee` differs.

## 3. Client configuration

Set the real AppID in `project.config.json`. Keep the client in mock mode
until the backend secrets and legal domains are ready:

```js
const { setConfig } = require('./utils/config');

setConfig({
  mode: 'api',
  apiBaseUrl: 'https://jevailab.com',
  assetBaseUrl: 'https://jevailab.com',
});
```

Never put AppSecret, `FAL_KEY`, moderation keys, or the virtual-payment AppKey
in the mini program.

## 4. State and money invariants

- A quote is valid for five minutes and can create one job.
- A job holds credits before dispatch and settles exactly once.
- A failed or rejected job releases the hold; a partial result charges only
  the approved delivered images.
- A repeated idempotency key returns the original job without another hold.
- A repeated payment notification credits the wallet once.
- `wx.requestVirtualPayment` success is not proof of delivery. The server
  always calls `query_order` before granting credits.
- Refund events are status-only. `xpay_refund_notify` is verified, looked up
  through `query_order`, and recorded as `REFUNDED` (query status `5` or `8`)
  or `REFUND_FAILED` (status `7`). Refund handling never subtracts credits
  automatically, because the user may already have consumed them and a
  negative wallet balance would corrupt subsequent jobs.
- If a refund is completed after delivery and the remaining credits are
  disputed, suspend further manual grants for that order and reconcile the
  ledger with support. Do not reuse the original `pay:<outTradeNo>` event key.

## 5. Incident checks

Inspect jobs with `status = 'reconciling'` or
`error_code = 'PROVIDER_SEND_UNKNOWN'`. A stale `SENDING` outbox is moved to
`UNKNOWN` rather than resubmitted, because fal may already have accepted the
request. Resolve these jobs by checking the provider dashboard and the
`internal_request_snapshot` before any manual credit adjustment.

Orders in `AMOUNT_MISMATCH` must not be delivered. Compare the WeChat
`order_fee`, `paid_fee`, and the local `price_fen`, then contact the user or
support channel instead of manually granting credits.
