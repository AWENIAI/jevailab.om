# 视频人物替换（AI Video Character Replacement）详细开发文档

> **Codex 执行规范 / 可直接用于工程开发**  
> 文档版本：v1.0 · 2026-10-17  
> 适用：接入已有出海 AI 图片/视频生成网站，Kie.ai 作为视频生成服务商。  
> 优先级：**避免未经授权 API 消耗 > 资金/任务一致性 > 内容安全 > 可用性 > UI/SEO 扩展**。

---

## 0. 致 Codex：执行总指令（必须先读）

你是该项目的高级全栈/安全工程师，请基于 **当前仓库的真实代码** 开发本功能，不能只输出 PRD、伪代码或静态 UI。遵循：

1. **先检查仓库**：框架、路由、鉴权、数据库与 ORM、积分/支付、现有 AI 生成任务、对象存储、部署和监控。写一份 `docs/video-character-replace-implementation-audit.md`，列出现有可复用模块、新增模块、冲突与迁移方案。不能为了新功能重构/替换原站系统。
2. **先实现安全闸门，再接真 API**：用户登录校验、素材授权、文件归属校验、计价/预扣、限流和全站预算、管理总开关齐备以前，不允许把真实 Kie API Key 接到可公开调用的接口。
3. **不自动创建试用赠送积分**。若现有注册逻辑会赠送积分，必须确认新功能默认不能使用赠送积分；若现有账本不区分来源，就新增可控制的 `video_spendable` 钱包/额度映射或禁用视频免费生成，不能让免费注册无限转化为上游付费调用。
4. **先 mock 后 staging，再有限额实测**：没有合法的测试素材/密钥或上限未配置时只跑 mock；不要假装 mock 输出是真实 API 成功。真实生成测试必须显式开启 `KIE_LIVE_TEST_ENABLED`，受独立预算约束，并与生产分隔。
5. **默认不执行生产部署和数据库破坏性修改**；生产迁移采用可回滚、向后兼容的分步方式。若现有 CI/CD 有审批机制，遵守之。
6. **不得隐藏供应商错误、绕过内容安全、静默扣费、默认无限重试或持久化敏感图像于公开位置**。
7. 优先交付从上传→报价→积分冻结→异步生成→结果转存→结算/退款→私有作品库的真实闭环，以及自动化安全测试。
8. 如发现官方接口参数与本文件不一致，以当前 Kie 官方文档、Playground + 小额真实测试结果为准；**在验证前关闭对应模型，不能凭猜测继续收费/上线**。保留验证笔记。
9. 本文件中所有安全和财务限制是 **MUST**；性能、外观、SEO 为次一级。不要把 `TODO` 当成满足验收。完成后按第 18 章格式报告已实现/未实现/测试结果/需手工配置事项。

### 0.1 禁止出现的结果

- 浏览器里出现 `KIE_API_KEY`、存储密钥、后台管理员令牌，或前端可直接构造任意 Kie 请求。
- 用户伪造价格、任务、素材 ID、模板、分辨率、时长即可不扣积分生成。
- 新注册、刷新、并发双击、重复回调、重放请求可无限领取免费生成。
- 用户生成失败后自动无限重试，导致同一请求产生多个有成本的供应商任务。
- 有人构造任意 URL 使服务器去下载内网/元数据地址，或者让 Kie 使用其他用户的素材。
- API 调用成功但数据库没记录、积分发生错账而无人报警。
- HTTP 200 被误判为 Kie 任务已成功生成；未经验证的 Webhook 被当作到账依据。

---

## 1. 产品目标与交付边界

### 1.1 用户故事

登录用户从网站选一条已获授权的预置视频模板，上传其本人或已取得明确授权的单人照片，确认人像/视频使用权限，选择支持的模型及清晰度，查看按上游成本计算的网站积分，确认生成。网站通过后端异步请求 Kie.ai，等待任务完成，将结果转存到私有对象存储并允许该用户预览、下载和删除。失败释放冻结积分。

### 1.2 MVP / 必须交付

- 1–3 个**自有或拥有商用授权**的视频模板，后台由种子数据/配置脚本管理（首版不开发大型模板后台）。
- 一张目标人物照片 + 一条模板视频；不开放用户任意上传源视频（首版降低版权和成本风险）。
- 模型适配器：`wan/2-2-animate-replace`、`bytedance/seedance-2-mini`，分别独立校验与序列化请求。
- 视频 480p / 720p；Wan 580p 可作为可配置开关，默认不公开，除非 UI/测试全部验证。
- 仅登录用户、默认无免费生成、按成本计价、余额不足拒绝提交。
- 任务状态、结果私有保存、作品库、失败自动退款、问题任务人工处理。
- 账号/IP/设备维度风控、请求去重、全站预算熔断、供应商 Key 配额/IP 白名单、HMAC Webhook 校验。
- HTTPS、安全上传、内容审核、隐私权和版权授权说明、违规举报/删除入口。
- 单测/集成测试/恶意滥用测试/上线前的有限额度真实测试。

### 1.3 不属于首版

- 用户自定义任意原视频、公众人物换脸库、批量生成、多人物逐一替换、无水印保证、逐帧 100% 相似保证。
- 自训模型、GPU 本地部署、自动抓取社交网站视频、重复自动生成直至满意。
- 额外模型：Kling Motion Control / Seedance 2.5 等只预留接口，不在成本价不明时上线。
- 为了 SEO 自动生成无实际视频示例的海量低质量页面。

### 1.4 合法使用边界

- 图片中的真人必须是用户本人或获得本人授权；模板画面、表演和配乐必须具有对应商业许可。
- 不支持未经同意真人冒充、欺诈、人脸身份验证规避、性化深度伪造、裸露/未成年人性化内容及其他违法滥用。
- 对生成内容显示 AI 合成声明，依据适用法律/平台政策实现必要的水印或标识；用户可举报违法滥用。
- 原视频若带音轨，**不要默认承诺**所有模型都能保留原声；单独 A/B 实测和标明音频行为。

---

## 2. 真实上游 API 与能力边界（2026-10-17 核查）

| 上游项 | 已核查事实 | 开发要求 |
|---|---|---|
| 创建 | `POST https://api.kie.ai/api/v1/jobs/createTask` | Bearer Key，JSON，检查 HTTP 和 `body.code` |
| 查询 | `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...` | 只在服务端；状态以此为准 |
| 返回 | 创建时 `data.taskId`；不是成片 | 保存外部 ID，等待终态 |
| 状态 | `waiting`, `queuing`, `generating`, `success`, `fail` | 未知状态安全处理，保留原始值 |
| 成片 | `data.resultJson` JSON 字符串可能含 `resultUrls[]` | 严格解析、校验、私有转存 |
| 成本明细 | 任务详情可有 `creditsConsumed` | 优先核验实际值；不保证每次必有 |
| 结果保留 | Kie 生成媒体约 14 天 | 立即转存自有桶，失败告警 |
| 创建频率 | 官方默认每账户最多 20 个新生成请求/10 秒 | 本系统设更严格的独立上限 |
| Key 配额 | 官方 Key 支持小时/日/总消费限制、IP 白名单 | 后台务必开启 |
| Webhook | 官方支持 HMAC-SHA256 时间戳签名 | **必须**启用，不以路由秘密代替 |

### 2.1 模型 A：Wan Animate Replace（面向真正人物替换）

- `model = "wan/2-2-animate-replace"`
- `input.video_url`：已授权模板视频的 HTTPS URL；公开 Playground 说明单文件 ≤10 MB；可用 MP4/MOV/MKV。
- `input.image_url`：目标人物图像 HTTPS URL；公开 Playground 说明 ≤10 MB，可用 JPEG/PNG/WebP。
- `input.resolution`：`480p`, `580p`, `720p`。
- `input.nsfw_checker = true`（强制服务端固定，不允许客户端设为 false）。
- 公开页面称任务最多 30 秒；**MVP 为统一规范只使用 4–15 秒预置视频**，实际能力须实测。

**构造示例**（占位符不能直接发送生产请求）：

```json
{
  "model": "wan/2-2-animate-replace",
  "callBackUrl": "https://APP_DOMAIN/api/webhooks/kie",
  "input": {
    "video_url": "https://SIGNED_TRUSTED_TEMPLATE_URL",
    "image_url": "https://SIGNED_USER_IMAGE_URL",
    "resolution": "480p",
    "nsfw_checker": true
  }
}
```

### 2.2 模型 B：Seedance 2.0 Mini（参考视频重新生成）

- `model = "bytedance/seedance-2-mini"`。
- `reference_image_urls = [目标人像 HTTPS URL]`。
- `reference_video_urls = [预置参考视频 HTTPS URL]`。
- `prompt` 从**受版本管理的服务端模板**得到，用户不可自由覆盖系统提示词。
- `resolution`：480p / 720p；`duration`：4–15 秒，生产禁用 `-1` 自动时长以免成本无法预测。
- `aspect_ratio`：以模板预存的可信比例为准（例如 `9:16`）；`generate_audio=false`, `web_search=false`, `nsfw_checker=true`。
- `first_frame_url` / `last_frame_url` 与 `reference_*` **不能混用**。
- 支持更广泛多模态参考，但 MVP 只传 1 图 + 1 视频；模板视频总时长 ≤15 秒。
- 人物、动作、背景的绝对保持程度 **不保证**，与专用替换不同，可能发生重生成漂移。

**构造示例**：

```json
{
  "model": "bytedance/seedance-2-mini",
  "callBackUrl": "https://APP_DOMAIN/api/webhooks/kie",
  "input": {
    "reference_image_urls": ["https://SIGNED_USER_IMAGE_URL"],
    "reference_video_urls": ["https://SIGNED_TRUSTED_TEMPLATE_URL"],
    "prompt": "Replace the lead performer in the reference video with the person in the reference image. Preserve the timing, main choreography, camera framing and scene composition as closely as possible. Maintain the same new identity throughout, natural anatomy and consistent lighting. No extra people, no text overlay.",
    "resolution": "480p",
    "aspect_ratio": "9:16",
    "duration": 8,
    "generate_audio": false,
    "web_search": false,
    "nsfw_checker": true
  }
}
```

提示词中可在实测时验证 `@Image1`、`@Video1` 引用语法；当前示例采用中性写法避免对未验证引用语法的依赖。**不能因为示例返回创建成功就认定视频人物替换功能达到可交付质量。**

### 2.3 Kie HMAC Webhook 的精确定义

从 Kie 设置页面生成 `webhookHmacKey` 并开启签名。其官方文档定义：

```
message = taskId + "." + X-Webhook-Timestamp
X-Webhook-Signature = Base64( HMAC_SHA256(message, webhookHmacKey) )
```

- `X-Webhook-Timestamp` 为 Unix 秒；`taskId` 通常从 `body.data.taskId` 取（注意该供应商其他产品回调格式可能不同）。
- 校验时间戳窗口建议 ±300 秒，并使用常量时间比较；验签失败 HTTP 401/403，不进行入账。
- 签名仅覆盖 `taskId` 和时间戳，**不覆盖全部 body**：验签通过后仍必须向 Kie 查询任务详情，确认所属模型/外部任务 ID 和真实终态后结算。
- 如果后台尚未启用 HMAC，生产回调必须**拒绝**，不能悄悄降级为 `secret URL`。
- 接收端支持重复、乱序、重放：写入事件 inbox，去重后处理；未知 taskId 不直接创建可计费任务。

### 2.4 官方参考链接

- https://docs.kie.ai/
- https://docs.kie.ai/market/bytedance/seedance-2-mini
- https://docs.kie.ai/market/wan/2-2-animate-replace
- https://docs.kie.ai/market/common/get-task-detail
- https://docs.kie.ai/common-api/webhook-verification
- https://kie.ai/seedance-2-0-mini
- https://kie.ai/wan-animate
- https://kie.ai/pricing

---

## 3. 视频积分定价：第一版严格按公开 Kie 直接模型成本

### 3.1 首版定价目标

**不加毛利，不加附加服务费；只按 Kie.ai 公布的视频生成模型成本收取网站视频积分。** 云服务器、存储、审核、失败供应商实际扣费、支付通道费等不在用户首次积分里追加，但必须在后台成本报表记录：这意味着首版可能经营亏损，不应误认为商业净利润为零。

**默认展示映射：1 个网站视频积分 = 1 个 Kie credit，官方价格展示等价约 $0.005。**

- 内部财务金额使用**整数**，推荐定义 `video_credit_unit = 0.1 网站视频积分`，一单位等价 `$0.0005`，避免 JS 浮点数引发扣费误差。
- 数据库存储 `credit_units` 整数：`24 units/s = 2.4 网站积分/s`。
- 若当前网站已经有通用积分，**不能改写已有积分的全局兑换关系**：建立 `VideoPricingAdapter` 映射已有钱包最小整数单位，或为视频模块建立隔离账本。若无法无损表达小数积分，则增加内部更细的整数计价单位，前端只格式化展示。
- 充值与授予均需显式账本记录；**赠送积分默认不可用于调用付费视频模型**；如以后开启，必须另设赠送预算和专门风控。

### 3.2 模型价格配置（截至 2026-10-17 公开页面）

| 模型 | 模式 | 输出清晰度 | Kie credits/秒 | USD/秒 | 内部 units/秒 | 秒数公式 |
|---|---|---|---:|---:|---:|---|
| `bytedance/seedance-2-mini` | 带参考视频 | 480p | 2.4 | $0.012 | 24 | 参考视频秒数 + 输出秒数 |
| `bytedance/seedance-2-mini` | 带参考视频 | 720p | 5 | $0.025 | 50 | 参考视频秒数 + 输出秒数 |
| `wan/2-2-animate-replace` | 人物替换 | 480p | 6 | $0.0300 | 60 | 源视频秒数 |
| `wan/2-2-animate-replace` | 人物替换 | 580p | 9.5 | $0.0475 | 95 | 源视频秒数 |
| `wan/2-2-animate-replace` | 人物替换 | 720p | 12.5 | $0.0625 | 125 | 源视频秒数 |

**Seedance 带视频输入的低秒单价不等于只收输出时长；输入和输出都算。** 不得误用无视频参考的 $0.019/s、$0.041/s 价格。对无视频输入模式，当前模块一律不允许。

### 3.3 明确样例（全部为「网站视频积分」，同 Kie credits）

| 模板输入时长 | 输出时长 | Seedance 480p | Seedance 720p | Wan 480p | Wan 580p | Wan 720p |
|---|---|---:|---:|---:|---:|---:|
| 8 秒 | 8 秒 | 38.4 | 80 | 48 | 76 | 100 |
| 12 秒 | 12 秒 | 57.6 | 120 | 72 | 114 | 150 |
| 15 秒 | 15 秒 | 72 | 150 | 90 | 142.5 | 187.5 |

12 秒 Seedance 480p 算式：`(12+12) × 2.4 = 57.6 网站积分 ≈ $0.288`。  
12 秒 Wan 480p 算式：`12 × 6 = 72 网站积分 ≈ $0.36`。

### 3.4 费用算法（核心纯函数；必须单元测试）

```typescript
// money: never use float for wallet/ledger modifications
export type Model = 'bytedance/seedance-2-mini' | 'wan/2-2-animate-replace';
export type Resolution = '480p' | '580p' | '720p';
type PriceEntry = { unitPerSec: number; mode: 'input_plus_output' | 'input_only'; enabled: boolean };
const RATES: Record<Model, Partial<Record<Resolution, PriceEntry>>> = {
  'bytedance/seedance-2-mini': {
    '480p': { unitPerSec: 24, mode: 'input_plus_output', enabled: true },
    '720p': { unitPerSec: 50, mode: 'input_plus_output', enabled: true },
  },
  'wan/2-2-animate-replace': {
    '480p': { unitPerSec: 60, mode: 'input_only', enabled: true },
    '580p': { unitPerSec: 95, mode: 'input_only', enabled: false },
    '720p': { unitPerSec: 125, mode: 'input_only', enabled: true },
  },
};
export function calculateQuoteUnits(
  model: Model,
  resolution: Resolution,
  inputSeconds: number,
  outputSeconds: number,
): number {
  const entry = RATES[model]?.[resolution];
  if (!entry?.enabled) throw new Error('MODEL_DISABLED_OR_UNPRICED');
  if (!Number.isSafeInteger(inputSeconds) || inputSeconds < 4 || inputSeconds > 15) throw new Error('INVALID_INPUT_DURATION');
  if (!Number.isSafeInteger(outputSeconds) || outputSeconds < 4 || outputSeconds > 15) throw new Error('INVALID_OUTPUT_DURATION');
  const billableSeconds = entry.mode === 'input_plus_output'
    ? inputSeconds + outputSeconds
    : inputSeconds;
  const units = entry.unitPerSec * billableSeconds;
  if (!Number.isSafeInteger(units) || units <= 0) throw new Error('PRICE_OVERFLOW');
  return units;
}
// UI: videoCredits = units / 10. Never accept the displayed quote back as authority.
```

在生产代码中，`RATES` **必须迁至数据库配置 / 后台配置**并带 `version`、`effective_at`、`checked_at`、`enabled`。上面只是初始 seed 与测试样例。对于确有小数秒的视频：MVP 在模板入库时预处理为经过 `ffprobe` 验证的**整秒固定时长**，不依赖浏览器时长，禁止用户提交小数秒来低估消费。

### 3.5 报价锁定与结算

1. `POST /quote` 服务端按当前 **价格版本 + 模板时长 + 模型 + 规格**生成报价，保存 `quote_id`、`quote_units`、`rate_version`、`expires_at`、`template_version`、`user_id`（5 分钟有效）。
2. `POST /generate` 仅接受 `quote_id`（以及上传资产 ID/幂等键），重新校验归属、未过期、资产、模板版本、价格版本、余额及所有限额。**报价中的积分不能由前端自带**。
3. 事务内持久化 job 和账本 `hold`：从 `available_units` 转入 `held_units`。预冻结的点数为当时确认的报价，后台改价不会追溯到已冻结 job。
4. 任务 `success` 且输出转存成功后，优先检查官方 `creditsConsumed`，记录实际消耗（若字段缺失则记为未知，仍用原报价）；不得自动向用户追加超出确认报价的费用。
5. 若可靠、已核验的上游实际消耗比报价少，第一版可按**更低的实际成本**结算并退还差额（必须保证原子账本操作）；若上游多扣，则保留报价上限，对供应商差额记损失并告警、自动停用该价格规则等待人工检查。
6. 上游任务失败且未得到可用结果时，**向用户全额释放冻结积分**，同时单独记录供应商是否真实扣费；不允许把 supplier fee 悄悄转嫁给用户。
7. 后台调整模型价格只影响新 `quote`；前端在计价前明确提示“积分为生成一次的消耗；生成成功不代表人物 100% 还原”。
8. `creditsConsumed` 单位以 Kie 实际字段说明/账单核验；不要将一个未知数字直接换算成 US dollars。如果上游账单异常，设置 `billing_review` 并停用模型，不得盲目继续向用户收费。

### 3.6 价格漂移防护

- 管理员可维护每个 `model+resolution` 价格、启停、最大时长；修改记录写 `pricing_audit`，不能由用户端修改。
- 每天至少人工或可信自动化核对官方 https://kie.ai/pricing 与 https://kie.ai/logs 账单，记录核对时间。**网页抓取失败不应臆造报价**；过期超过可配置阈值（MVP 默认 7 天）就禁用需要核验的模型并发出告警，运维确认后恢复。
- Kie 账户开通 Key **日/小时/总消耗硬限额**，并设置白名单固定出口 IP；不同环境单独 Key。
- 对账偏差超过 5%（或任何不能解释的持续偏差）触发告警、进入受控模式；不要无限自动调价。

---

## 4. 架构设计：复用当前站点，按最小增量开发

```
Browser (authenticated)
  |-- Templates page / upload / credit quote / job status
  v
Web App (Next.js / current framework)
  |-- Auth + CSRF protection + Zod validation
  |-- Rate-limit + anti-abuse + app budget circuit breaker
  |-- Upload signing API -> PRIVATE S3/R2 bucket
  |-- Quote API -> versioned provider_pricing
  |-- Generate API -> transactional HOLD + idempotent job/outbox
  v
PostgreSQL  <-->  Worker (job dispatch, reconciliation, output import)
  |                  |
  |                  `--> Kie createTask / recordInfo (SERVER-SIDE ONLY)
  |
Kie signed webhook --> Authenticated webhook inbox --> Worker verifies provider state
                                                       |--> Private object storage
                                                       `--> Atomic CREDIT capture / release

Admin: feature flags, pricing, task quarantine, manual reconciliation, budget & logs
```

### 4.1 栈选择原则

- **首先复用现有**：Next.js/React、Auth.js/Clerk/Supabase Auth、Prisma/Drizzle、PostgreSQL、现有钱包/支付、已有 R2/S3、队列与通知系统。
- 若没有后台作业系统，MVP 可使用 PostgreSQL `jobs + dispatch_outbox + webhook_inbox`，以独立 Node Worker 和 cron 扫描（含 PostgreSQL `FOR UPDATE SKIP LOCKED`）实现。避免在 serverless 请求进程中长时间后台等待。
- 若原项目已有 Redis/BullMQ，复用，**但钱包和幂等数据仍以 DB 为最终事实源**。
- 云服务器磁盘紧张：输入/输出直接使用对象存储，不缓存大量视频；对模板处理采用临时空间配额、流式下载后清理；不要用 Docker 镜像携带大素材。
- 对外回调采用生产 HTTPS，回调处理快速 ACK，执行任务由队列完成；Worker 停止仍能通过 outbox 补偿。

### 4.2 权限域

- PUBLIC：模板预览、功能介绍（只读，不露用户素材）。
- AUTH_USER：本人资产上传、报价、创建任务、访问自己的任务/作品。
- WORKER：唯一允许调用 Kie 生成功能的主体。
- WEBHOOK_RECEIVER：只验签、入 inbox，无修改用户余额的直接入口。
- ADMIN：模型开关、预算、价格版本、授权模板、对账与处置，须服务端 RBAC 和操作日志；不得靠前端隐藏按钮。

---

## 5. 页面与 UX 规范

### 5.1 主要路由

- `/ai-video-character-replacement`（可沿用网站现有 i18n 如 `/zh/ai-video-character-replacement`）：SEO Hero、真实授权示例、选择模板、上传目标照片、模型/分辨率、积分显示、生成按钮、状态与 FAQ。
- `/my-creations?type=character-replace`：作品状态、生成时间、预览、重试入口（**重新生成必须重新报价并扣费**）、下载、删除、举报。
- 可选 `/effects/[slug]`：仅为有授权视频和真实样例的少数优质模板页面，`canonical` + hreflang 与现有 SEO 模块一致。

### 5.2 主功能交互

1. 用户查看模板样例/选择模板；默认模型由后台配置，**切换模型会实时重新报价**。
2. 上传单张 JPG/PNG/WebP；提示正面清晰、单人、非裸露且有肖像授权；展示前端预览，但不信任其大小/MIME 元数据。
3. 用户主动勾选“我是照片本人或已取得许可，并同意 AI 合成声明”，该勾选每次提交服务器记录审计（时间、条款版本）；不可默认勾选。
4. 报价区域展示：模板时长、生成时长、清晰度、模型、预计消耗网站视频积分、当前余额；如果余额不足显示充值入口但**不得越过余额检查**。
5. 提交后禁用按钮并显示 job ID/待处理状态；网络抖动重试前端要携带同一幂等键。
6. 前端每 5–10 秒请求**本站** job API 获取状态；只读不触发供应商查状态；用户离开后通过作品库继续查看。
7. 视频返回后展示预览/下载；私有存储短时签名 URL；删除前用户确认，删除原图/输出按隐私策略执行。
8. 对失败展示可理解的信息、自动退款状态；不显示供应商 API Key/原始错误栈/内部路径。

### 5.3 文案禁区

不要声称“100% 一模一样”“零失败”“无条件完全保留原视频音效”“任何名人均可替换”。明确为 AI 生成、存在质量差异。不要把普通失败自动描述成“已退款”，只有 ledger release 成功后才显示退款完成。

---

## 6. 文件上传与媒体预处理（防绕过、SSRF、资源攻击）

### 6.1 目标人像

- 前端允许 JPG/PNG/WebP，单文件最大 **8 MiB（可配，低于 Wan 10 MB）**；1 个上传资产归属一个登录用户。
- 上传签名 `POST /api/assets/presign`：登录认证+频率限制，服务端生成不可猜测 key（如 `private/uploads/{userId}/{UUID}`），**不接收完整用户指定 object key**。
- PUT 对象存储限定 Content-Length/Content-Type/TTL（不支持签名限制时，用私有隔离临时桶 + 上传后严格后验校验）；同一签名不可导致覆写其他用户的对象。
- 上传完成时通过服务端 `POST /api/assets/complete` 根据 object key 的存储侧 metadata 校验真实字节数、魔数/MIME、图像解码、最大像素和维度；使用安全图像库重新编码为 JPEG/WebP 并剥离 EXIF/GPS；禁止 SVG、动图、多页 PDF 或可执行文件伪装图片。
- `sharp` 解码设置像素上限与并发限制；分离的异步工作队列避免压垮 web 进程；超过时间/CPU/文件大小立即拒绝。
- 对有效性和内容审核检查，判定 `asset.status = READY` 才允许生成，失败进入隔离或清理状态；客户端图片的本地预览并不代表审核通过。
- 单人人像检测可作为“用户体验建议”，识别不到单人时阻止提交；不能仅靠人脸检测代替合法授权。
- 禁止客户端传任意 `image_url`、`video_url` 到生成接口；服务器只按 `asset_id` 查归属及安全状态。

### 6.2 模板视频（只允许管理员添加）

- 首版只用预置、商业许可齐备的视频；写 `template_license_record`（权利方、授权范围、地域、期限、证明存储位置、音轨许可证）。
- 管理员后台或受限 seed 命令用 `ffprobe/ffmpeg` 验证/规范化：MP4(H.264/AAC 如适用)，9:16 优先，4–15 秒**固定整秒数**，无异常时间戳/负时长，单模板源文件 <= 10 MB 以兼容 Wan；严格限制 CPU/文件大小并沙箱运行。
- 以经服务端检测的视频实际秒数为计费输入，不能从用户表单读取；导入计算 `source_duration_seconds`，维护版本和校验散列 `sha256`，模板变更使旧 quote 作废。
- 模板私有对象存储，服务器生成供 Kie 下载的**有限有效期签名 GET URL**（建议覆盖供应商拉取可能延迟并通过 staging 验证，配置 24 小时上限，不能直接暴露长期公共 Bucket）。
- 被撤销版权授权、违规举报或源视频变更后立即 `template.enabled=false`，未提交任务不可继续生成。

### 6.3 URL 安全

- 使用可信固定的对象存储域名、bucket/key 查表构造上传输入地址；拒绝用户直接提供 URL、协议、重定向目标、私网 IP/localhost、云 metadata 地址。
- 下载 Kie 结果时，即使 URL 来源于供应商，也视作非可信：允许官方明确列出的下载域名，严格 HTTPS、不自动跟随跨域重定向、禁止内网 IP/DNS 重绑定、限制 50MB/输出类型/超时，**流式转存**到私有桶而非内存中整段读取。
- 浏览器拿到的播放链接须有短 TTL（例如 5–15 分钟）；禁止公开列桶和凭 object key 直接访问。

---

## 7. 数据库 / 约束设计（按既有 ORM 实现）

> 表名为参考建议。若原项目已有等价表，可扩展；**不要复制出第二套用户/全局钱包**。金额采用整数 `units`：10 units = 1 网站视频积分。

### 7.1 表一：`video_templates`

| 字段 | 类型/要求 |
|---|---|
| `id` | UUID PK |
| `slug`, `title` | 唯一 slug，可国际化标题 |
| `template_version` | int NOT NULL，修改素材或时长自增 |
| `source_object_key`, `cover_object_key` | 私有对象 key（封面可使用授权公开缓存） |
| `source_duration_seconds` | SMALLINT，4..15 |
| `aspect_ratio` | 允许值，如 `9:16`、`16:9` |
| `sha256` | 素材散列 |
| `license_verified`, `license_expiry_at` | 不可无限假定授权，过期禁用 |
| `prompt_version`, `prompt_template` | 仅 Seedance 使用，服务端受控 |
| `enabled`, `created_at`, `updated_at` | 启停及时间 |

### 7.2 表二：`video_assets`

`id UUID PK`, `user_id FK`, `object_key UNIQUE`, `kind`, `status` (`UPLOADING`,`SCANNING`,`READY`,`REJECTED`,`DELETED`), `size_bytes`, `mime`, `sha256`, `width`, `height`, `created_at`, `expires_at`, `moderation_state`, `deleted_at`。须索引 `(user_id,status)`，不可通过猜测 ID 读取别人的素材。

### 7.3 表三：`provider_pricing`

`id UUID PK`, `model`, `resolution`, `rate_version`, `billable_mode`, `units_per_second`, `enabled`, `effective_at`, `checked_at`, `changed_by`, `change_reason`, `created_at`。唯一 `(model,resolution,rate_version)`。需要管理操作审计，不允许直接前端修改。

### 7.4 表四：`video_quotes`

`id UUID PK`, `user_id`, `template_id`, `template_version`, `model`, `resolution`, `input_seconds`, `output_seconds`, `rate_version`, `quoted_units`, `expires_at`, `created_at`, `consumed_at`; 报价与账户绑定；同一个 quote 只允许匹配一个创建动作，防止旧报价重放。

### 7.5 表五：`video_jobs`

| 字段 | 约束/作用 |
|---|---|
| `id` | UUID PK（本站公开展示的 jobId） |
| `user_id`, `asset_id`, `template_id` | 外键且要求归属/版本校验 |
| `quote_id` | UNIQUE，已消耗报价 |
| `model`, `resolution`, `input_seconds`, `output_seconds` | 创建时快照 |
| `rate_version`, `quoted_units`, `held_units`, `captured_units` | 一次性财务事实快照 |
| `provider` | `kie` |
| `provider_task_id` | UNIQUE NULLABLE；一旦写入不能被另一个 job 重用 |
| `status` | 有限状态机枚举，见第 9 章 |
| `idempotency_key_hash` | 仅存用户作用域下的哈希/规范化值；UNIQUE `(user_id,idempotency_key_hash)` |
| `request_fingerprint` | 模板+模型+输入素材+计价参数规范化 hash；同键不同 body 返回 409 |
| `output_object_key` | 私有输出 key，可能为空 |
| `provider_credits_consumed` | 已核验上游实际积分或 NULL |
| `provider_error_code`, `error_category` | 脱敏错误分类 |
| `started_at`, `deadline_at`, `finished_at`, `created_at`, `updated_at` | 事件时间 |

`video_jobs` 不保存长时有效的外部签名 URL、API Key、完整未经必要脱敏的人像元数据。

### 7.6 表六：`credit_accounts`（或适配既有钱包）

`user_id UNIQUE`, `paid_available_units BIGINT >= 0`, `paid_held_units BIGINT >= 0`, `promo_available_units BIGINT >=0`, `updated_at`, `version`。**视频生成只可从 paid 余额支出**（默认）。若复用原积分模型，务必保证来源区分与一致的换算关系。

### 7.7 表七：`credit_ledger`

`id UUID PK`, `user_id`, `job_id NULL`, `payment_id NULL`, `event_type` (`TOPUP`,`HOLD`,`CAPTURE`,`RELEASE`,`PARTIAL_RELEASE`,`ADJUST`), `delta_available_units`, `delta_held_units`, `dedupe_key UNIQUE`, `created_at`, `actor_id`, `metadata_json`。账本 append-only，不许物理删行；所有钱包变更必须与对应 ledger 同一个数据库事务。

### 7.8 调度、风控和管理表

- `provider_dispatch_outbox`：`job_id UNIQUE`, `state`, `attempt_no`, `send_started_at`, `lease_until`, `last_error`，用于只发送一次、可核对的外部任务创建。
- `provider_webhook_inbox`：`id`, `provider`, `task_id`, `timestamp`, `signature_digest`, `received_at`, `processed_at`, `state`，有效验签后写入，唯一去重 key。
- `provider_reconciliation`：`id`, `job_id`, `provider_task_id`, `provider_credits`, `difference_units`, `review_status`, `notes`。
- `abuse_events`：用户/IP hash/设备 hash/规则/严重级别/限制终止时间，不存无必要的完整敏感标识。
- `daily_spend_budget` 或统一 `budget_reservations`：`day`, `scope`, `reserved_cost_units`, `spent_cost_units`, `limit_cost_units`，全站与用户维度需要原子计数。
- `admin_audit_log`：管理员、动作、对象、变更前后摘要、时间、来源 IP。

**迁移要求**：所有整数余额 DB CHECK 非负、必要唯一索引、外键、索引和显式枚举；大表加索引用可用的在线策略。生产必须先备份/快照与迁移 dry-run，避免拆原钱包。

---

## 8. API 契约 / 授权规则

> 统一返回 `{ code, message, data?, requestId }`；非法请求不得触发 provider 或扣费。请求路径可适配项目现有 API 命名。

| 方法 / 路径 | 请求主要字段 | 权限 | 要求 |
|---|---|---|---|
| `GET /api/video/templates` | 无 | public | 只返回已授权且启用模板的非敏感字段 |
| `POST /api/assets/presign` | `contentType`, `sizeBytes`, `sha256?` | login | 检查容量/频率/用户配额，返回受限 PUT URL 和 assetId |
| `POST /api/assets/complete` | `assetId` | asset owner | 从对象存储核验/排队审核，不直接接受客户端验证状态 |
| `POST /api/video/quote` | `templateId`, `model`, `resolution` | login | 服务端读取模板时长/输出时长，生成不可篡改报价快照 |
| `POST /api/video/generate` | `quoteId`, `assetId`, `authorizationAccepted`, `idempotencyKey` | login | **高风险接口**：防刷、验证、持久化 hold+job，返回本地 jobId |
| `GET /api/video/jobs/:id` | id | job owner | 只查本站 DB，不每次反查 Kie |
| `GET /api/video/creations` | page cursor | login | 仅当前用户 |
| `GET /api/video/creations/:id/play` | id | owner | 返回短期签名 GET 或可信代理 |
| `DELETE /api/video/creations/:id` | id | owner | 作废分享、隐私清理，不允许未结算任务中途因删记录造成孤儿账 |
| `POST /api/webhooks/kie` | Kie 回调体 + HMAC headers | provider | HMAC 验签、时间窗、inbox、异步 authoritative lookup |
| `POST /api/admin/video/models/toggle` | model, enabled | admin | RBAC+审计+多因素（复用项目能力） |
| `PATCH /api/admin/video/pricing` | versioned rates | admin | 只作用新报价，保留版本/审批日志 |
| `POST /api/admin/video/jobs/:id/reconcile` | reason, operation | admin | 有审批/复核，不能手工任意加钱或重复退款 |

### 8.1 `POST /api/video/quote` 示例

请求：

```json
{ "templateId": "uuid", "model": "bytedance/seedance-2-mini", "resolution": "480p" }
```

返回：

```json
{
  "code": "OK",
  "data": {
    "quoteId": "uuid",
    "templateSeconds": 12,
    "outputSeconds": 12,
    "model": "bytedance/seedance-2-mini",
    "resolution": "480p",
    "credits": "57.6",
    "creditUnits": 576,
    "approxProviderUsd": "0.2880",
    "pricingVersion": 1,
    "expiresAt": "2026-10-17T03:00:00Z"
  }
}
```

前端的 `creditUnits` 仅供展示；后端创建任务重新读 `video_quotes` 和数据库模板、用户权限。旧版本/过期报价返回 `QUOTE_EXPIRED`，应引导重新报价，不因差价私自扣更多。

### 8.2 `POST /api/video/generate` 示例

Header：`Idempotency-Key: <opaque-random-uuid>`。请求体：

```json
{
  "quoteId": "uuid",
  "assetId": "uuid",
  "authorizationAccepted": true,
  "termsVersion": "v1"
}
```

响应 HTTP 202（**仅表示受理站内任务**）：

```json
{ "code": "ACCEPTED", "data": { "jobId": "uuid", "status": "RESERVED" } }
```

错误枚举：`UNAUTHENTICATED`, `FORBIDDEN`, `QUOTE_EXPIRED`, `INSUFFICIENT_PAID_CREDITS`, `ASSET_NOT_READY`, `TEMPLATE_DISABLED`, `MODEL_DISABLED`, `DAILY_QUOTA_EXCEEDED`, `RATE_LIMITED`, `PROVIDER_PAUSED`, `SYSTEM_BUDGET_EXCEEDED`, `IDEMPOTENCY_CONFLICT`, `CONTENT_REJECTED`。

### 8.3 强制认证/CSRF/RBAC

- 使用已有 HTTP-only Secure SameSite Cookie 或服务端 verified session；所有 mutation 检查用户身份、CSRF token/Origin 与 CORS 同源策略（Bearer 模式另行按设计验证）。
- 不因 `userId` 出现在 JSON 中就相信调用者；永远取服务端 session。
- 全部 `/api/admin/*` 通过 server-side RBAC，不凭角色从前端传入。
- 列表查询过滤 `user_id`；单个任务/资产 lookup 必须 `WHERE id=? AND user_id=session.id`。
- 登录态与余额/风控操作不可用时 **fail closed**；不可自动退化为匿名免费生成。

---

## 9. 任务状态机 / 外部不确定性处理

### 9.1 本地状态

`RESERVED`（已冻结但尚未发送）、`DISPATCHING`、`PROVIDER_PENDING`、`PROVIDER_RUNNING`、`OUTPUT_IMPORTING`、`SUCCEEDED`、`FAILED_REFUNDED`、`REVIEW_REQUIRED`、`CANCELLED_BEFORE_SEND`。

- `SUCCEEDED` 和 `FAILED_REFUNDED` 是**终态**；不允许迟到回调将其直接转换为另一终态。
- `REVIEW_REQUIRED` 非终态，保持资金原始 hold，需人工查明供应商是否创建/扣费；允许运维工具经审计确认成功/失败并结算。前端显示“正在核实”而不是编造已退款。
- 若客户端在任务已经发往 Kie 后请求取消，只能停止本站通知/展示；不能保证外部取消，也不能无条件释放已冻结金额。

### 9.2 必须实现的执行顺序

1. 用户生成请求进来，先按第 10 章限流/预算、素材/账号/授权、价格有效性校验。
2. DB **一个事务**：锁定 `credit_accounts` 用户行及预算行；检查余额/并发/当天次数；条件扣减 `available_units` 并增加 `held_units`，插入 `HOLD` ledger、job、quote 消耗标志和 outbox。写唯一幂等键。
3. Worker 在 DB 事务中 claim outbox（`FOR UPDATE SKIP LOCKED`），**在出网前记录 `send_started_at`**，建立短租约并进入 `DISPATCHING`。
4. Worker 仅用官方规定模型构建请求，严格固定 endpoint、Key、上限和 HTTPS、设置出网超时；收到 `code=200` 且 `data.taskId` 才认定上游接收，持久化 `provider_task_id` 与 `PROVIDER_PENDING`。
5. 有明确信号确认“未创建任何任务”的错误（例如 Kie 业务码 429、参数拒绝）可原子退款；**出网超时/连接断开/响应解析不明/Worker 在出网过程中崩溃时，绝不能自动重发**，进入 `REVIEW_REQUIRED` 并报警，在 Kie 日志按时间/请求指纹人工核对。
6. Webhook 先 HMAC 校验、限制 body 大小、记录 inbox 并快速 2xx；Worker 从 inbox 取 `taskId`，由 `recordInfo` 再查权威状态。若回调早于外部 ID 关联，先留 inbox 并等待关联，不能直接生成无 owner 的 job。
7. 供应商 `success` → 输出链接校验 → 私有桶流式转存成功及必要内容审核后 → **事务中 `CAPTURE` 且任务 `SUCCEEDED`**；供应商 `fail` → **事务中 `RELEASE` 且任务 `FAILED_REFUNDED`**。
8. 输出下载失败应在**不调用额外视频生成**的情况下重试下载（幂等、有限重试）；仍无法保存时标记 `REVIEW_REQUIRED`，不要自动二次生成。超过 14 天无供应商文件的事例由运营人工处理/退款。
9. 定时 reconciliation：扫描长时间未更新的 provider job，限流调用 `recordInfo`，同步状态、实际积分与出错情况；包括已在 review 的任务但**不能根据“超时”推断 Kie 失败**。
10. 每晚对账：`credit_accounts` = ledger 累计可用/冻结；任务 `held_units/captured_units` 与 provider 账单对比，异常报警并自动停止进一步派单。

### 9.3 重复提交 / 出网熔断

- **同一用户 + 同一 Idempotency-Key** 必须只产生一个 job / 一次 hold / 至多一次明确供应商提交；同键同请求返回同一 job；同键不同请求返回 HTTP 409。
- 不同 key 的连续点击仍受“同一用户同时 1 个活跃任务”和每日计数约束。
- Kie 429、余额不足、HTTP 5xx、异常延迟连续发生时，打开模型 circuit breaker：禁止新增 provider createTask，已创建的任务继续补偿查询。
- 不为“提高成功率”偷偷自动改模型/提高清晰度/重生新片；任何重新生成都需要用户确认新报价及新独立订单。

---

## 10. 防薅羊毛 / API 消耗防护（上线硬指标）

### 10.1 推荐的保守默认限制（必须配置化）

| 控制范围 | 初始默认值 | 触发动作 |
|---|---:|---|
| 匿名用户创建生成任务 | **0** | 401 |
| 赠送/促销积分用于本功能 | **0** | 403 或提示使用付费积分 |
| 用户同时运行（含 RESERVED/REVIEW_REQUIRED） | **1** | 429 / 返回已有 job |
| 单账号 24 小时成功受理任务数 | **3** | 429；仅管理员可调整 |
| 单账号 7 天任务数 | **10** | 429 |
| 同账号创建 `generate` | **每分钟最多 2 次**（仍受并发） | 429 |
| 同 IP `generate` | **每小时 5 次**，按需降低 | 429/挑战 |
| 单账号每天供应商预算 | **$1.50** 等价 300 Kie credits（上限按 quote 预留） | 暂停新增 |
| 全站同时上游运行 | **3** | 队列等待或拒绝 |
| 全站每小时**预计**上游预算 | **$3** | 熔断新任务 |
| 全站每天**预计**上游预算 | **$10** | 熔断新任务 |
| 单模板秒数 | **4–15 秒** | 超限拒绝 |
| 同账号上传 | 每小时 10 张，暂存未审核总容量 ≤50 MiB | 429/413 |
| 上传照片尺寸 | ≤8 MiB、尺寸/像素上限按实现 | 413/422 |
| 任一请求体 JSON | ≤64 KiB（Webhook 按真实 payload 设置） | 413 |

以上额度是**建议的防损初值，不是 Kie 上游限制或销售套餐承诺**。预算是上限，运营可结合充值/用户量调整；当预算控制、数据库锁或限流系统故障时 **拒绝新增任务而不是放行**。需要以数据库原子预算预留而非仅靠内存变量，以免多实例并发突破上限。

### 10.2 每层具体防护

**账户层**：强制邮箱验证/可信 OAuth；新账号冷却期可选；设备指纹/IP/ASN 只做风险信号，不作为唯一封禁依据；对可疑注册/代理/批量账户启用验证码（如现有 Turnstile），优先对敏感行为挑战；维护风控状态和申诉通道。

**积分层**：只许从已结算付费余额冻结；支付成功必须校验支付平台 Webhook 签名、事件 ID 幂等、金额/币种/订单 owner；退款和拒付后冻结剩余充值额度并暂停相关视频生成功能。**不得根据浏览器“支付成功”页面给积分**。

**上传层**：限制文件容量、校验真正字节、对象归属、强制审核；上传本身不能触发任何 Kie 生成功能；对异常未完成上传自动回收。

**生成层**：唯一服务端 `POST /generate` 出口；只接预置模板 id、支持模型、指定时长；全站共享 token bucket / DB 限额，不要只对浏览器按钮做节流；用条件更新完成余额扣减并锁用户并发。

**Kie 密钥层**：按环境分离 Key、IP 白名单、Key 的小时/日/总消耗上限；Key 放部署的 secrets manager/环境变量，禁止 Git、浏览器、Telemetry、截图及用户可见错误。密钥轮换和泄露停机预案要写清。

**账户成本层**：运营面板显示当日冻结积分、确认收取积分、上游实际 credits、预算剩余、未确定 provider 请求、API 错误率、涉嫌滥用次数；达到阈值自动 `FEATURE_GENERATION_ENABLED=false` 并发通知。

**风控对抗测试**：并发 20–100 次生成请求、不同 idempotency key、旧 quote 重放、多账号同 IP、金额篡改、假支付成功、批量视频生成脚本、Webhook 重放、时间戳偏移；确保积分和任务不能被绕过，且不会耗尽上游配额。

### 10.3 停机/开关与事故应急

必须有以下可操作开关：

```
VIDEO_REPLACEMENT_ENABLED=false           # 页面可看，但提交关闭
VIDEO_REPLACEMENT_PROVIDER_SEND_ENABLED=false
VIDEO_REPLACEMENT_ALLOW_PROMO_CREDITS=false
KIE_LIVE_TEST_ENABLED=false
VIDEO_REPLACEMENT_DAILY_BUDGET_USD=10
VIDEO_REPLACEMENT_HOURLY_BUDGET_USD=3
VIDEO_REPLACEMENT_PROVIDER_MAX_INFLIGHT=3
```

- 客户端显示维护提示，已提交的任务仍做最终查询/结算；关闭新建不等于丢弃原始任务。
- Kie Key 发生疑似泄露：立即在 Kie 控制台禁用 Key、收紧 IP/配额并轮换，暂停派单，核验 Kie 日志及站内账本，检查异常预算/用户影响。
- 24/7 监控无法在 MVP 保证时，使用足够保守的 Key 总配额与自动熔断；拒绝把无限余额风险暴露给一个小站。

---

## 11. 钱包事务示意（实现时适配具体 ORM）

伪 SQL 展示原则：**必须同一个数据库事务、条件检查、数据库唯一约束**，不能前端先扣后调用，也不能“先调用 Kie 再试扣积分”。

```sql
BEGIN;
-- 1. user row; lock prevents double-spend
SELECT paid_available_units, paid_held_units
FROM credit_accounts WHERE user_id = :user_id FOR UPDATE;

-- 2. enforce paid_available_units >= :quote_units,
--    model enabled, quote bound, idempotency, quotas, budget, inflight.

UPDATE credit_accounts
SET paid_available_units = paid_available_units - :quote_units,
    paid_held_units = paid_held_units + :quote_units
WHERE user_id = :user_id AND paid_available_units >= :quote_units;
-- assert affected_rows == 1

INSERT INTO video_jobs (..., quoted_units, held_units, status, ...)
VALUES (..., :quote_units, :quote_units, 'RESERVED', ...);

INSERT INTO credit_ledger
(id, user_id, job_id, event_type, delta_available_units, delta_held_units, dedupe_key)
VALUES (:ledger_id,:user_id,:job_id,'HOLD',-:quote_units,:quote_units,:dedupe_hold);

INSERT INTO provider_dispatch_outbox (job_id, state)
VALUES (:job_id, 'PENDING');
COMMIT;
```

成功交易（只执行一次，且只允许当前状态/账本符合条件）：

- `captured = MIN(verified_cost_units, held_units)` 当实际值可信；未知则 `captured=held_units`；原子扣减 held，按差额释放 available；账本 `CAPTURE` + 必要 `PARTIAL_RELEASE`，`SUCCEEDED` 状态跃迁。
- 用户确认报价是最高收费额度，`verified_cost_units > held_units` 不额外追扣，记录成本异常并报警。

失败交易：

- 条件转移 `job.status NOT IN ('SUCCEEDED','FAILED_REFUNDED')` 且供应商明确 `fail`/未发出：`held_units -> paid_available_units`，`RELEASE` ledger 唯一，`FAILED_REFUNDED`；并发回调或 cron 重入应变成 no-op。
- 不允许退款把 **赠送钱包** 与 **付费钱包** 互相迁移。资金完整性优先于展示速度。

---

## 12. Webhook HMAC 示例代码（Node / TypeScript）

> 示例核心验证函数，生产仍需 body 大小限制、可靠持久化、inbox 去重、服务端对 Kie 再查询。读取 `taskId` 格式应以实际收到的已验签事件为准。

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyKieWebhook(params: {
  taskId: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  key: string;
  nowSeconds?: number;
}): boolean {
  const { taskId, timestampHeader, signatureHeader, key } = params;
  if (!taskId || !key || !timestampHeader || !signatureHeader) return false;
  if (!/^\d{10}$/.test(timestampHeader)) return false;
  const ts = Number(timestampHeader);
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(ts) || Math.abs(now - ts) > 300) return false;
  const expected = createHmac('sha256', key)
    .update(`${taskId}.${timestampHeader}`, 'utf8')
    .digest();
  if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(signatureHeader)) return false;
  const provided = Buffer.from(signatureHeader, 'base64');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
```

回调验证通过只意味着发送方持有 HMAC Key；供应商结果字段仍通过官方 `recordInfo` 复核。在 staging 用官方或受控 HMAC 例子测试：正确、错 key、错 taskId、过期 timestamp、伪造 body、重复回调、先成功后失败、先回调后保存外部 ID 均不造成错账。

---

## 13. 上游服务适配 / 出网保护

### 13.1 接口分层

建议实现：

```
ProviderAdapter {
  validateInput(snapshot): ValidatedInput;
  estimateCost(snapshot): CreditUnits;
  buildCreateTaskPayload(snapshot, urls): KieCreateTaskPayload;
  parseCreateTaskResponse(body): ProviderTaskId;
  getTaskDetail(taskId): ProviderTaskDetail;
}

KieWanReplaceAdapter
KieSeedanceMiniAdapter
```

- 代码路径严格限固定 `https://api.kie.ai`，禁止用户改变 Host/endpoint/model/proxy。
- `fetch` 超时与响应体上限、Retry-After、业务 `body.code`，错误敏感字段脱敏，返回稳定错误码。
- `createTask` 为有经济副作用的操作：超时/未知提交状态**不自动 retry**；`recordInfo` 是只读，可有限指数退避。
- 模型价格不在 Adapter 里散落硬编码；适配器依靠 `provider_pricing` 快照/版本计算。
- 模型/分辨率/时长组合的全部校验在**服务器**和测试里重复验证。

### 13.2 Kie 查询结果

示例：

```json
{
  "code": 200,
  "data": {
    "taskId": "task_123",
    "state": "success",
    "resultJson": "{\"resultUrls\":[\"https://PROVIDER_CDN/video.mp4\"]}",
    "creditsConsumed": 48
  }
}
```

状态转换依据 `data.state`，不是 `resultUrls` 出现就判成功。响应可能格式变化，严格校验与告警；任务成功后先转存，再结算。`creditsConsumed` 必须通过官方实际 response + 后台账单校验后才作为可信结算值。

### 13.3 供应商配额与隔离

- Kie 官方初始账号新生成请求默认 20/10 秒；**本站默认 3 inflight、独立速率限制远低于该值**，不能用“官方还允许”来放宽本站反滥用。
- Key 分 `development/staging/production`；真实 Key 不参与单测、不写 `.env.example` 真值；`NEXT_PUBLIC_*` 绝对禁止放私密 Key。
- 输出下载和上传不允许向 API 域附带从浏览器来的 Authorization；外部网络出站目的地分级管理。

---

## 14. 隐私、内容安全、SEO 和法律合规

### 14.1 素材与个人信息保护

- 上传前展示告知：人脸/视频素材会传给第三方生成服务；说明处理目的、存储期限、跨境处理情况，提供隐私政策/服务协议入口。
- 图片最少保留期限：待生成输入（默认 7 天，用户可主动删除且不影响已执行中的结算）、输出作品默认私有保存 30 天（建议后台配置、用户可删除）。删除时删除对象/访问凭据并记录审计；例外为合法保留必要的财务和安全日志。
- 不允许在日志或监控事件中输出带签名 URL、图片内容、API Key、完整人脸图片 base64、私密用户信息。
- 运营人员查看用户素材需要明确访问控制与记录；不能为了“客服方便”给全员公开桶权限。
- 数据主体权利/投诉处理入口，结合目标市场 GDPR/CCPA 等评估，生产前由运营确认最终隐私条款。

### 14.2 内容安全

- `nsfw_checker: true` 固定；不视其为充分审核。
- 上传图像审核 + 模板审核 + 生成视频审核/抽检。禁止性化深度伪造，尤其未成年人；拒绝欺诈冒充与没有授权的身份挪用。对疑似违规进入人工审核或拒绝，并保留最少必要审计。
- 不存储未经授权的知名视频/配乐到模板库；删除/下架机制立刻生效。
- 网站说明结果为 AI 合成，营销演示不能暗示是真实人物亲自参与过原片拍摄。

### 14.3 SEO 页面

- Title 示例：`AI Video Character Replacement – Replace a Video Character with Your Photo`。
- Meta Description：说明选模板+上传照片+生成，而不是虚构保真率或免费无限。
- 页面结构：H1、真实可用模板、3 步教程、工作原理、透明计价和常见问题。
- 首版仅在模型与素材实际跑通、能真实下载结果后允许索引功能页；模板页必须有唯一说明/示例与合法素材。

---

## 15. 运维、日志、指标、监控

### 15.1 必须采集（不包含敏感素材/密钥）

- 订单 `jobId`, `userId` (内部 ID 或 hash), `provider_task_id`, model, status, quoted/captured/released units, requestId, 耗时、错误类别。
- 指标：`jobs_created`, `jobs_succeeded`, `jobs_failed`, `jobs_review_required`, `provider_request_429`, `provider_errors`, `open_holds`, `stale_jobs`, `webhook_invalid_signature`, `provider_cost_mismatch`, `daily_budget_reserved`, `daily_budget_spent`, `rate_limit_blocked`。
- 告警：Webhook 验签失败突增；任何负余额/账本不一致；上游成本差异；请求未知状态；持久化失败；预算达到 80% / 100%；Key 余额预警；未知敏感 URL 访问尝试。

### 15.2 持续一致性巡检

- 每 5 分钟调度长时任务查询：严格限速并设置总查询上限，避免某个异常任务造成无限轮询。
- 每日汇总当日上游实际 Kie 消耗与本站结算额、退款额及余额，并列出无法匹配的 provider task ID。
- 任务有 `deadline_at` 但 **超时≠失败**；超过运营 SLA 转人工/补偿流程，不可自动重发 createTask。
- 在 `FEATURE_GENERATION_ENABLED=false` 下，历史任务的状态同步、作品下载和必要退款仍正常运行。

### 15.3 快速处置 Runbook

1. 上游价格变化：先停对应模型 → 修订价格版本 → 小额真实任务验证 → 恢复。
2. API Key 失窃：Kie 控制台吊销 → 排查使用日志 → 轮换密钥 → 对账 → 恢复。
3. 大量机器人刷接口：启用全局暂停 + CDN/WAF 挑战 → 统计已经冻结与实际消耗 → 恢复预算。
4. 用户说“扣分没视频”：通过 jobId 查状态/ledger/Kie 日志，不手改余额；先解决异常状态，按有审计的操作补发结果或退款。
5. 供应商 callback 未到：定时查询补偿，不再次 createTask。

---

## 16. 测试矩阵（必须自动化，非只截图）

### 16.1 价格单测

- Seedance 8+8 秒，480p = 384 units；720p = 800 units。
- Seedance 12+12 秒，480p = 576 units；720p = 1200 units。
- Wan 12 秒，480p = 720 units；580p = 1140 units（默认关闭要返回禁用错误）；720p = 1500 units。
- 负时长、小数时长、超过 15 秒、未知模型、禁用模型、被更新的旧 quote 皆拒绝。
- 无浮点精度错误；用户展示值准确对应 units / 10。

### 16.2 余额和幂等并发测试

- 同一个用户 20/100 并发相同请求/Idempotency-Key：只创建 1 job、1 HOLD、至多 1 provider dispatch。
- 同一个用户 100 并发不同 key：因 1 个活跃任务限制，最多受理 1，且余额不为负。
- 不足余额、过期报价、不归属人像、禁用模板、超每日预算：提供确定性拒绝、Kie createTask 调用计数为 0。
- 两次重复 `success` 事件：`CAPTURE` 1 次；两次 `fail`：`RELEASE` 1 次。
- 成功后迟到 fail、不确定阶段迟到 success、重复 webhook、先到 webhook 后关联 taskId：不多扣、不多退。
- 支付 Webhook 重放/订单重复入账：仅 1 次 TOPUP。

### 16.3 安全测试

- 无登录、伪造 cookie/session、错 CSRF/Origin、JSON 中篡改 userId、读取他人 job/assets/作品、伪造 Admin 权限全部失败。
- 自定义 `image_url=http://169.254.169.254/`、`localhost`、私有网地址、重定向劫持等绕过失败。
- 伪造 HMAC、缺少签名、时间戳过期、同签名换 taskId、body 声称 success 但 provider 为 fail 时不成功入账。
- 类型伪装/巨大图像炸弹/超大图片/恶意视频 / SVG / 双扩展名、上传链接重复使用都不能触发生成。
- 失败/异常日志/打包资源中不包含 Key、用户签名原图 URL、存储 secret。
- 赠送积分单独存在而 paid=0 时，视频生成必须拒绝。
- 网络超时导致 `createTask` 结果未知，确认不会自动重发造成多个付费任务。
- 全站预算耗尽/数据库预算表故障/风控依赖不可用，确认不会放行。

### 16.4 E2E 与真实小额烟雾测试

- 浏览器从模板选择 → 上传真人合法照片 → 有效报价 → 扣积分 → 状态 → 上游生成 → 私有转存 → 播放 → 下载。
- 只需 1–3 个真实测试任务（总测试花费由管理员设定上限，建议 ≤$3），记录 taskId、时间、预计/实际供应商 Kie credits 和画质评分。
- 实测前必须有真实 Key、可达的 HMAC Webhook、授权视频和照片；无条件的 mock 场景和真实环境要明显隔离。
- 验收画质使用 2 张合法肖像 × 2 条合法模板（正面/侧转或舞蹈），同时对照 Wan 与 Seedance（受测试预算限制）。若实测质量不佳，不将其描述为完全成功，仅算接口端到端验证。

---

## 17. 交付节奏 / 任务分解（Codex 顺序执行）

### 阶段 P0：仓库审计与安全设计

- [ ] 清点现有依赖、Schema、登录、充值、钱包、AI 任务、对象存储、部署方式。
- [ ] 明确站内现有积分的最小单位；产出价格适配设计，不动原全站兑换关系。
- [ ] 确认合法素材是否已提供；若无合法模板，开发种子配置但保持生成功能关闭。
- [ ] 整理 Kie 官方文档字段 + HMAC、价格版本；形成 `docs/kie-validation-notes.md`。

### 阶段 P1：账户/资产/钱包基础

- [ ] DB 迁移、价格版本、报价、job、账本、预算、outbox/inbox、索引。
- [ ] auth、CSRF、RBAC、asset 私有存储与安全验证。
- [ ] 账本原子冻结/捕获/释放；充值流水复用并核验来源。
- [ ] 配置化预算 + kill switch + 账户限额 + Key 隔离。

### 阶段 P2：接口与安全测试

- [ ] server-side quote（所有价格样例单测）。
- [ ] server-side generate（幂等、同用户并发、预算、素材归属、多用户隔离）。
- [ ] Kie Provider Adapter + mock provider，**先不接真 Key**。
- [ ] provider 出网“不确定”状态处理，outbox 工作流，重复请求防止。

### 阶段 P3：Webhook、结果保存和用户页

- [ ] Kie Webhook HMAC 开启、验签、inbox 幂等、recordInfo 再校验。
- [ ] job 状态查询/cron 补偿、输出安全下载、私有转存、atomic settlement。
- [ ] 用户创作页、积分展示、作品库、下载、删除、错误提示。
- [ ] 敏感素材/违规使用提示、投诉与隐私删除功能。

### 阶段 P4：有限真实测试

- [ ] 生产前核对每个模型的参数/价格/支持时长/音频；不支持则下线模型。
- [ ] 配置 staging 测试专用 Key 和官方 Key 消耗限额，手工开启 LIVE_TEST。
- [ ] 执行受限真实测试，核对 Kie logs `creditsConsumed` 与本地报价/账本；失败和高偏差及时停止。
- [ ] 做并发/重放/SSRF/用户隔离测试、安全审计，修复所有 P0/P1 漏洞。

### 阶段 P5：上线与回滚

- [ ] 备份数据库、部署环境变量安全配置、Webhook 公网 HTTPS 与签名密钥就绪。
- [ ] 生产采用 feature flag 默认 OFF 完成迁移、健康检查、内部账户测试。
- [ ] 上线前确认供应商 Key 小时/日/总消费限额和出口 IP 白名单，确认预算能硬停止。
- [ ] 小流量灰度开启：每用户 1 inflight、每日 3 次，全站 3 inflight，$10/d 总预算。
- [ ] 制定一键关闭新建、保留已创建任务对账/退款的可逆回滚方案。

---

## 18. 最终验收门槛（DoD）与 Codex 输出格式

**下列任何一项未满足，报告“未达到可公开上线”，不应宣布完成。**

- [ ] 真正可用：成功跑通上传、服务端报价、余额冻结、createTask、HMAC callback、recordInfo、转存、成功结算/失败退款、作品查看与下载。
- [ ] 成本价：第 3 章算式/结果全部测试通过；同一报价不会因浏览器改价格而变；价格版本可改，不修改全站原有积分关系。
- [ ] 防损：匿名/零付费积分/每日超额/并发超额/预算耗尽都不会调用 Kie；全局开关有效；Kie Key 设置独立小时/日/总消耗限额。
- [ ] 幂等：100 并发同键不会多单扣费；provider timeout 未知不自动重发；重复 webhook/cron 不会双扣/双退。
- [ ] 安全：Key 不在客户端、HMAC 验签且再查询权威状态、私有存储/跨用户隔离、图片/URL 校验、内容安全与授权声明齐备。
- [ ] 可靠：监控、ledger 核对、异常 job review、价格/供应商消耗偏差报警。
- [ ] 部署：迁移可回滚、env 示例不含真实密钥、README 清楚说明如何启停功能和处理事故。

Codex 完成后必须按以下格式回复：

```
1. 仓库审计结果与架构复用情况（原有组件 / 新增组件）
2. 实际修改/新增文件清单及用途
3. 数据库迁移清单及如何回滚
4. 功能与风控规则实现说明（引用文件路径/行号）
5. 自动化测试命令、通过数量、失败项及其原因
6. Kie 真 API 验证记录（taskId、模型、费用、结果；未实测必须明确写未实测）
7. 当前是否满足公开上线 DoD：YES/NO
8. 需要运营手工完成的配置（授权模板、Kie Key、HMAC、IP 白名单、消费限额、域名等）
9. 风险列表与后续优化项（附级别）
```

**结论原则**：真正接入成功不是 API 返回 200，而是 **每一个通过认证的付费生成订单都可计价、可追踪、可防重、可结算、可限额、可删除、可审计，且没有越权或无成本调用入口**。

---

## 19. 环境变量 / 运行配置样例（仅名称和安全默认值）

```dotenv
# No secret values in repo.
VIDEO_REPLACEMENT_ENABLED=false
VIDEO_REPLACEMENT_PROVIDER_SEND_ENABLED=false
VIDEO_REPLACEMENT_ALLOW_PROMO_CREDITS=false
KIE_LIVE_TEST_ENABLED=false

# Set via hosting secret manager, never NEXT_PUBLIC_*
KIE_API_KEY=
KIE_WEBHOOK_HMAC_KEY=
KIE_API_BASE_URL=https://api.kie.ai

# Existing app/database/auth preferred
DATABASE_URL=
APP_ORIGIN=https://your-domain.example

# Private S3-compatible storage
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET_PRIVATE=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Server-side rate, account and budget checks, fail closed
VIDEO_REPLACEMENT_MAX_ACTIVE_PER_USER=1
VIDEO_REPLACEMENT_MAX_JOBS_PER_USER_DAY=3
VIDEO_REPLACEMENT_MAX_JOBS_PER_USER_WEEK=10
VIDEO_REPLACEMENT_PROVIDER_MAX_INFLIGHT=3
VIDEO_REPLACEMENT_HOURLY_BUDGET_USD=3
VIDEO_REPLACEMENT_DAILY_BUDGET_USD=10
VIDEO_REPLACEMENT_PER_USER_DAILY_BUDGET_USD=1.5
VIDEO_REPLACEMENT_QUOTE_TTL_SECONDS=300
```

- `KIE_API_BASE_URL` 在生产运行时必须与固定可信域名匹配，配置错域名时拒绝启动，不允许指向任意用户输入 URL。
- 不要使用 `KIE_WEBHOOK_SECRET` 路由密钥替代官方 `KIE_WEBHOOK_HMAC_KEY`；若原有旧 key 命名请明确分开迁移。
- 真实部署时所有预算/余额限制必须以**持久化 DB 原子预留**为准，环境变量只是策略默认值。

---

## 20. 可复制给 Codex 的启动指令

```text
请完整阅读本仓库中的 VIDEO_CHARACTER_REPLACEMENT_CODEX_PRD_V1.md，并严格按其中 P0→P5 的顺序开发 AI 视频人物替换模块。

首先审计仓库已存在的鉴权、数据库、积分/支付、对象存储、AI 任务和部署方式；最大程度复用，避免重构其它业务。以 Kie.ai Wan Animate Replace + Seedance 2.0 Mini 作为模型适配器。初版按供应商直接模型成本配置网站视频积分（1 网站视频积分 = 1 Kie credit；在现有网站积分体系不兼容时用模块适配层，不能全局修改旧规则），使用整数最小单位和可版本化价格，先不加利润。

安全优先：匿名禁止生成、默认赠送积分不可生成、来源合法且有授权、素材归属和服务端验证、扣费冻结/退款原子事务、账本幂等、账号和 IP 限流、全站每小时/每日预算熔断、Kie Key 严格放服务器并启用供应商官方配额/IP 白名单、Webhook 按官方 HMAC-SHA256 验签并通过 recordInfo 再确认、createTask 结果不明时绝不自动重试、私有 R2/S3 保存和结果 URL SSRF 防护。风险控制失效一律 fail closed。

先完成 mock E2E/并发安全测试，然后仅在管理员配置的 staging Key、合法测试素材和明确小额预算下尝试真实调用。没有 Key 时如实报告并保证功能默认关闭。完成后输出修改文件、迁移/回滚、测试结果、实际 API 验证、剩余风险，以及是否通过可公开上线的全部验收门槛。不要在没有真实验证时宣称上线成功。
```

---

## 附录：供应商定价更新提醒

本表记录的是 2026-10-17 所见公开页面标价，后续供应商可能调整；实际扣费以 Kie 账户官方明细为准。Seedance Mini 官方页面显示历史限时优惠字样，可能发生价格变化；正式发布前务必再次人工核对。Kie 高额充值可能额外赠送供应商 credits，这不应被当作可永久依赖的基准成本或用户永久免费额度。站内按公布的基础成本价计费，并在后台展示自身真实采购成本与运营开销。
