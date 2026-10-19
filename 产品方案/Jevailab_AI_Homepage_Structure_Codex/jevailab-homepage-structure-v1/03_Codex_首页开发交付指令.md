# Codex 开发指令｜AI 图片 + AI 视频首页内容结构 v1.0

## 任务一句话

在**现有项目**中实现新的长首页信息架构，保留顶部 Hero 与现有图片创作三栏工作台，参考 rapvideo.ai/zh 的内容转化节奏，在其下方添加原创的产品介绍、案例展示、核心工具、三步教程、创意玩法、照片建议、工具导航、积分计费说明、FAQ、CTA 和 Footer。不要开发模板管理后台。

**先阅读本目录的：**
- `01_首页完整结构与中文文案.md`（内容单一事实来源）
- `02_SEO_GEO_实施与路由.md`（关键词、路由、语义/结构化数据）
- `04_英文首页核心文案.md`（英文国际站文本）
- `首页内容原型.html`（**参考布局和交互演示，不是生产代码，不是真实 AI API**）

## 开发之前

1. 扫描现有项目的 Next.js/React 等框架、路由、国际化、组件库、样式约定和图片/积分/登录 API。
2. 找到之前已经存在的 Hero、AI 图片创作工作台，**复用组件，不要重写已经联通的业务逻辑**。
3. 确认品牌变量 `SITE_NAME`，暂使用 `jevailab`，这是工作名称，用户最终确认前不硬编码域名、logo 外链、社交账户。
4. 明确视频功能目前是否有真实 API。若未上线，保留规划位但不可产生可支付/可提交的任务；通过 `ENABLE_VIDEO_GENERATION=false` 控制，并使所有涉及视频的 CTA 行为真实、一致。
5. 只把所需前台模块集成到已有页面；不要引入 `/admin`、模板 CRUD、模板管理后台、另起新站或大范围架构迁移。

## 必需页面模块：按顺序

1. `HeaderNav` — logo、图片工具、视频工具、模板、玩法、积分、FAQ、登录/创作历史
2. `Hero` — 原功能不变，可优化文案，保证 H1 唯一
3. `CreationStudio` — 复用已有三栏：模板 / 创作 / 预览及历史。图片模板默认封面始终 3:4；图片上传 0–1 张；提示词不暴露；1K/2K、图片比例、1–9 输出数；按真实 API 显示积分；默认隐私及 NSFW 规则
4. `WhatIs` — GEO 清晰定义段 + 能力事实卡
5. `CreationGallery` — 图片/视频 Tabs；带真实自有/授权素材；示例卡点击能带模板 ID 返回工作台，视频未上线不伪装成可用
6. `FeatureGrid` — 四项核心能力，标签可标注未上线
7. `HowItWorks` — 3 步流程 + 返回创作 CTA
8. `UseCases` — 8 种创意场景
9. `PhotoTips` — 推荐/避免示例，需含授权、成人及 NSFW 限制
10. `ToolsAndGuides` — 可用产品功能内链与教程分类；没有内容的专题暂不发布页面
11. `PricingSummary` — 真实 API / 配置数据；不得发明价格、积分有效期、退款承诺
12. `FAQAccordion` — FAQ 数据驱动、可展开和键盘操作
13. `FinalCTA` + `Footer` — 返回工作台；足够完整的政策、联系及语言链接

## 建议组件目录（可随现有架构调整）

```text
app/(public)/page.tsx
components/landing/HeaderNav.tsx
components/landing/Hero.tsx
components/studio/CreationStudio.tsx          # 已有组件优先复用
components/landing/WhatIs.tsx
components/landing/CreationGallery.tsx
components/landing/FeatureGrid.tsx
components/landing/HowItWorks.tsx
components/landing/UseCases.tsx
components/landing/PhotoTips.tsx
components/landing/ToolsAndGuides.tsx
components/landing/PricingSummary.tsx
components/landing/FAQAccordion.tsx
components/landing/FinalCTA.tsx
components/landing/Footer.tsx
content/home/zh-CN.ts
content/home/en.ts
config/site.ts
```

> 以上路径仅用于说明，不是要求把非 Next.js 项目改造成 Next.js。

## 交互规范

- Hero 的所有 CTA `scrollIntoView({behavior:'smooth'})` 定位 `#create` / `#gallery`，考虑 sticky Header 偏移。
- 模板卡点击：只改变工作台中的模板 ID/风格/默认参数；已经上传的图片不能意外丢失。图片和视频类别明确分离。
- 从画廊点击案例：如果有真实映射的 `templateId`，自动选中该模板、定位工作台；没有对应模板则展示明确的不可用提示，不随意选错模板。
- 视频尚未上线时，显示 `即将推出` 标签、禁用真实生成任务，不创建假用户生成记录；可以展示规划卡，但必须标清是概念演示或隐藏整块。
- 上传仍是**单张**：点击或拖拽上传新图将替换旧图；必须进行客户端预检查和服务端尺寸/类型、授权与安全校验。
- 积分和金额以服务端报价为准，前端不能只是 `count * 2` 充当生产价格；不足积分引导购买，但没有价格配置时不显示假的套餐。
- 生成结果必须来自实际生成任务，公开案例必须来自自有/许可素材；用户私密任务不可用作营销素材。
- NSFW 审核在上传/提示词/输出端服务端执行；成人色情、露骨性内容、性化未成年人一律禁止；未经授权的真实人脸禁止滥用。
- FAQ 默认一个或多个展开即可，键盘可操作，展开标签文字 SEO 可读取。
- 响应式：桌面主工作台三栏；平板可两栏；手机为模板→表单→结果纵向排列，不出现水平溢出。

## SEO / GEO 要求

- 首页 H1 唯一，`<title>`/description 本地化；正文明确区分图片已开放和视频规划。
- 可见的 WhatIs 自然语言段落、可抓取的三步教程、可见的 FAQ 答案。
- 合理的 WebSite/Organization/SoftwareApplication 结构化数据仅包含真实事实；Schema FAQ 必须与可见内容一致；不要承诺搜索引擎一定显示富结果。
- 中文/英文分别设 `lang`、canonical、hreflang 且仅互链实际存在语言页。
- 示例图片 `alt`、宽高防布局抖动、lazy loading。首屏 Hero 和工作台优化 LCP，视频预览不要自动下载全高清 MP4。
- 新风格专题页仅在真实工具、独立价值内容、真实案例具备时上线，避免 doorway SEO 页面。

## 模板数据不需要后台

沿用旧需求：模板由数据库种子 / 服务端 JSON / 已存在 API 提供只读数据。保证外显 `id/name/category/coverUrl/description/defaults`，完整正向/负向提示词仅在服务端读取。**不要创建管理后台**。需要变更模板可编辑种子/配置文件并部署，未来可另做后台。

## 页面内容示例数据定义

```ts
export type LandingContent = {
  hero: { eyebrow: string; h1: string; description: string; primaryCta: string; secondaryCta: string };
  whatIs: { title: string; paragraphs: string[]; facts: { title: string; text: string }[] };
  gallery: { image: GalleryCard[]; video: GalleryCard[] };
  features: Feature[];
  steps: Step[];
  useCases: UseCase[];
  photoTips: { do: string[]; dont: string[] };
  tools: ToolCategory[];
  pricing: { title: string; lead: string };
  faqs: { question: string; answer: string }[];
  finalCta: { title: string; description: string; primaryCta: string };
};
```

禁止把一整份 Markdown 直接渲染成纯文本页面；使用真正的分区组件和语义层级。

## 验收

- [ ] 顶部 Hero + 现有图片创作工作台保留；无新的模板后台。
- [ ] Hero 下方依照 PRD 顺序完整渲染十个内容区块。
- [ ] 桌面、平板、移动端布局正确；手机无水平溢出。
- [ ] 所有按钮有意义的行为；不存在指向未创建网页的死链接。
- [ ] 案例点击可打开并选择对应模板（有映射时），无映射时安全提示。
- [ ] 图片模板 3:4 封面，用户上传单张替换，服务端提示词不可泄露。
- [ ] 图片 1K/2K、全部目标比例、生成数量 1–9；不支持的设置提示并不能提交。
- [ ] 视频未上线不可点击假生成，也不可误导已经支持图片转视频。
- [ ] 积分、余额、套餐由真数据决定；失败退款遵守真实计费规则。
- [ ] 素材版权来源合规，真实用户作品不自动公开；明确 NSFW 限制。
- [ ] 页面唯一 H1、正确 title/meta/hreflang/内部导航；核心内容服务器可读。
- [ ] 中文和英文内容至少主站描述、Hero、模块标题、FAQ 文案同步。
- [ ] 前端构建/测试通过，提供修改文件、页面截图和剩余风险清单。

## Codex 开始执行建议

请先向我报告项目扫描结论，告诉我已存在的组件、视频可用状态、素材目录、当前积分接口，以及你将修改的文件。接着按顺序实现首页内容模块、数据源与交互、SEO/GEO 配置、响应式测试。除明确需要的首页更新外，不要改变已有图片生成、积分扣款、登录/用户记录的业务逻辑。

