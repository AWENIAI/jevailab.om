# Kie 视频任务校验记录

更新日期：2026-10-17

## 已按官方文档实现的边界

- 只在服务端调用 `https://api.kie.ai/api/v1/jobs/createTask`；浏览器不会得到 Kie Key，也不能提交任意上游 URL。
- 创建任务只有在 HTTP 成功、响应 `code=200` 且存在 `data.taskId` 时才标记为已提交；网络异常、超时或不完整响应统一进入 `REVIEW_REQUIRED`，不会自动重发。
- Webhook 仅快速验签并写入 inbox。验签内容为 `taskId + "." + timestamp` 的 HMAC-SHA256 Base64，时间窗口为 300 秒，并使用常量时间比较。
- 结算不相信 webhook body：后台通过 `recordInfo` 复核任务状态，只有视频转存到私有对象存储后才 capture；明确失败时 release；未知状态保持人工复核。
- Seedance 请求固定为单图、单已授权模板视频、`generate_audio=false`、`web_search=false`、`nsfw_checker=true`；Wan 请求同样固定 `nsfw_checker=true`。

官方依据：[Kie Webhook verification](https://docs.kie.ai/common-api/webhook-verification)、[Kie task detail](https://docs.kie.ai/market/common/get-task-detail)。

## 尚未进行真实供应商验证

仓库中没有使用任何真实 Kie Key、真实 webhook 密钥或已核验模板素材。本功能当前是安全关闭状态，未产生 Kie 任务、不会声称真实视频已经生成成功。

在 staging 小额实测前，必须完成：

1. 配置合法的 staging Key 与 HTTPS 回调域名。
2. 上传并登记 1–3 个拥有商业授权的模板视频与许可证证据。
3. 将模板、价格规则和预算限制逐项启用。
4. 以不超过 `$3` 的测试上限分别验证 Wan 与 Seedance 的创建、回调、查询、私有转存、下载及失败退款。
