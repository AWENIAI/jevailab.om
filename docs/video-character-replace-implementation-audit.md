# 视频人物创作实施审计

审计日期：2026-10-17  
需求来源：`产品方案/VIDEO_CHARACTER_REPLACEMENT_CODEX_PRD_V1.md`

## 可复用模块

- **鉴权**：`src/middlewares/auth-middleware.ts` 的 `authApiMiddleware` 已同时要求登录和邮箱验证，适合所有会产生费用的接口。
- **数据库**：Cloudflare D1 + Drizzle，现有 `image-creator.schema.ts` 已有素材、报价、任务、账本的数据建模先例；视频模块将保持独立表和独立积分账户，不改变图片或支付账本。
- **私有存储**：`src/storage/provider/r2.ts` 以用户 ID 划分对象路径，`/api/storage/file` 已验证用户归属；视频新增资产和输出也使用此存储能力。
- **内容审核**：现有 `getRuntimeModerationProvider()` 可审核上传图片。视频目标人像会在写入可用资产状态前走同一审核边界。
- **运行配置**：`src/env/server.ts` 使用 server-only Zod 环境变量；Kie 密钥只扩展此处，绝不使用 `VITE_` 前缀。
- **页面基础**：`Bulin47VideoCreator` 已提供响应式视频创作界面和模板预览；将替换其浏览器端假报价/假生成逻辑。

## 必须新增的模块

- `video-creator` 领域：受控模型/模板、整数积分报价、授权素材校验、功能开关、风险限制、Kie 请求序列化、Webhook HMAC、结果 URL 审核。
- 视频专用 D1 表：模板、资产、价格版本、报价、任务、积分账户和账本、出站队列、Webhook 收件箱、预算预留、结果输出。
- 服务端 API：能力/模板、上传、报价、创建任务、查询/删除作品；所有金额、模板、URL 和模型均在服务端二次验证。
- Kie 路由：签名验证后仅进入收件箱；状态以服务端 `recordInfo` 复查为准。
- 调度器：显式地领取出站队列；当任一真实开关关闭时拒绝创建付费任务，绝不发送供应商请求或冻结积分。

## 已识别的约束与实施决定

1. 当前站点没有通用“付费积分”流水和后台队列。为避免把注册送的任何额度用于上游付费调用，使用独立 `video_credit_accounts`，默认余额为零，且没有注册赠送逻辑。
2. 现有存储代理只认识 `user_files`。视频路由会直接查询视频资产/输出的用户归属并保持 `Cache-Control: private, no-store`；提供方获得的是短时、受控的同源访问 URL，不接受用户提交的 URL。
3. 当前公开演示视频未附带可验证商用许可。本次只保留为不可生成的展示素材；可提交生成的模板默认 `enabled=false`，必须由运营写入授权证据、私有存储键和版本后才启用。
4. Cloudflare Worker 没有常驻后台线程。本次使用持久化 outbox + 可重入 server-side dispatcher，供 Cron/受控管理触发；绝不在浏览器重试或在网络超时后自动重发 createTask。
5. 没有提供 Kie 密钥、HMAC 密钥、合法模板和实际充值记录，因此本次不能执行 P4 真实调用，也不能宣布已达到公开上线 DoD。

## 迁移与回滚

迁移只增加新表和索引，不改写旧表。回滚方式是在关闭
`VIDEO_REPLACEMENT_ENABLED` 与 `VIDEO_REPLACEMENT_PROVIDER_SEND_ENABLED` 后，保留历史表用于退款/审计；若必须物理回滚，只能在确认没有未结算冻结和已导出审计数据后，再执行对应的 `DROP TABLE` 脚本。
