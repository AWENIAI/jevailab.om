# AI 视频创作运行手册

本手册描述如何把已实现的安全闭环切换到受限 staging。不要把任何真实 Key、私有素材 URL 或许可证文件提交到 Git。

## 1. 数据库与模板

先将包括 `0007_video_creator.sql` 与 `0008_video_creator_kie_callback_audit.sql` 在内的全部迁移应用到目标 D1：

```powershell
pnpm db:migrate:remote
```

模板必须由管理员导入私有对象存储，并在 `video_templates` 中记录：私有 `storage_key`、固定整秒 `duration_seconds`（4–15）、可信 `aspect_ratio`、服务端 Seedance 提示词、版本、授权证据位置和到期时间。未核验前保持：

```text
enabled = 0
authorization_status = PENDING_VERIFICATION
```

核验完成后才可改为：

```text
enabled = 1
authorization_status = approved
```

首期最多启用 1–3 个拥有商业使用授权的模板；不要导入用户任意上传的视频作为模板。

## 2. 视频积分

`video_credit_accounts` 与现有图片/注册赠送积分隔离。仅 `paid_available_units` 可用于 AI 视频；`promo_available_units` 不会被视频任务使用。

付款系统接入时，必须以支付订单号作为幂等 `event_key`，写入一条 `TOPUP` ledger 后才增加 `paid_available_units`。请先在 staging 验证重复支付 webhook 只能入账一次；不要直接让注册赠送积分可用于视频。

最小单位为 `10 units = 1` 前台显示的视频积分。生成时会将支付余额冻结到 `held_units`，成功转存后 capture，供应商明确失败时 release。

## 3. 环境变量

将下列名称放入部署平台的 secrets / variables 管理界面，不要放入源码或浏览器变量：

```dotenv
KIE_API_KEY=
KIE_WEBHOOK_HMAC_KEY=
KIE_API_BASE_URL=https://api.kie.ai

VIDEO_REPLACEMENT_ENABLED=false
VIDEO_REPLACEMENT_PROVIDER_SEND_ENABLED=false
KIE_LIVE_TEST_ENABLED=false
VIDEO_REPLACEMENT_ALLOW_PROMO_CREDITS=false

VIDEO_REPLACEMENT_MAX_ACTIVE_PER_USER=1
VIDEO_REPLACEMENT_MAX_JOBS_PER_USER_DAY=3
VIDEO_REPLACEMENT_MAX_JOBS_PER_USER_WEEK=10
VIDEO_REPLACEMENT_PROVIDER_MAX_INFLIGHT=3
VIDEO_REPLACEMENT_HOURLY_BUDGET_USD=3
VIDEO_REPLACEMENT_DAILY_BUDGET_USD=10
VIDEO_REPLACEMENT_PER_USER_DAILY_BUDGET_USD=1.5
VIDEO_REPLACEMENT_QUOTE_TTL_SECONDS=300
```

三个开关必须同时为 `true` 才会允许出站调用；任何一个保持 `false` 都会拒绝创建付费任务。先在 staging 逐步开启，生产环境保持关闭直到小额实测与法务审核通过。

## 4. 回调与网络

在 Kie 配置的回调地址为：

```text
https://你的正式域名/api/webhooks/kie
```

仅使用 HTTPS。回调会先验证 `X-Webhook-Timestamp` 与 `X-Webhook-Signature`，然后写入 inbox，并保存供应商 `code`、终态 `state` 与失败信息用于审计。定时任务每两分钟先处理 inbox，再对已知且仍在 `SUBMITTED` / `PROCESSING` 的供应商任务查询 `recordInfo`，防止回调遗漏；查询不会创建新任务。结算只相信 `recordInfo`，任何验签失败、转存失败或供应商状态不确定都会进入人工复核，不会自动重发或重复扣费。

## 5. 发布前检查

```powershell
pnpm test
pnpm typecheck
pnpm build
```

还需要人工完成：模板商业许可审核、隐私政策与 AI 合成声明、Kie IP 白名单/额度限制、内容审核阈值、退款与客服流程、输出保留和删除期限、真实小额生成记录。

## 6. 回滚

发生异常时先把三个视频生成开关设为 `false`，停止新增出站任务；不要删除账本、job 或 webhook inbox。已冻结但未结算的任务应按 Kie `recordInfo` 查询结果进行 capture、release 或人工复核。数据库迁移为新增表，不会修改现有图片与支付表。
