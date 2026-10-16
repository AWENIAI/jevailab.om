# 首页 SEO / GEO 与站点路由方案

工作品牌：PicVilo AI（待定）；`SITE_NAME` 是唯一品牌配置变量。域名未核验，以下仅为相对路径建议。

## 搜索定位

- 首页核心意图：`AI Image & Video Generator`（同时覆盖图片与视频），不要把品牌仅定位成 AI Photo Filter。
- 首页唯一 H1（英文站）：`Create AI Images & Videos from Photos & Text`
- 中文首页唯一 H1：`一张照片，一段灵感，创作你的 AI 图片与视频`
- 模板是差异化点：`AI Styles` / `AI Templates` / `AI Photo Styles` / `AI Video Effects`。
- 专题分工：主页品牌+广义生成；图片工具页承接 `AI Image Generator`；视频工具页承接 `AI Video Generator`；图生视频专页承接 `Image to Video AI` / `Photo to Video AI`。
- 长尾主题：`photo to illustration` / `AI crayon drawing` / `retro film AI photo` / `image to video effects`，只有上线且有真实案例的模板才开独立落地页。

## Metadata 建议

中文：首页 `<title>`：`AI 图片与视频生成器 - 风格模板一键创作 | {{SITE_NAME}}`

中文：`<meta name="description">`：`选择 AI 风格模板，上传一张照片或输入创意文字，生成艺术图片与短视频。探索插画、海报、复古胶片、图片转视频等玩法，支持自定义画幅与清晰度，生成前可查看积分消耗。`

英文：首页 `<title>`：`AI Image & Video Generator with Creative Templates | {{SITE_NAME}}`

英文：`<meta name="description">`：`Create AI images and videos from text or a photo. Explore ready-made art styles, photo-to-video effects, customizable formats, and clear credit-based pricing.`

> 文案需根据真实上线状态调整：如视频暂未开放，首页 Meta Description 不得暗示视频已经可以生成。

## GEO / AI 搜索定义块（首页可见）

### 中文

`{{SITE_NAME}} 是一个在线 AI 图片与视频创作平台。用户可选择现成风格模板，上传一张照片或输入创意文字，创建插画、艺术海报和其他 AI 图片。在视频创作功能可用的模式下，还可以将静态图片转为短视频。网站提供可调整的画幅和画质设置、生成前积分报价以及默认私密的作品记录。`

### 英文

`{{SITE_NAME}} is an online AI image and video creation platform. Users can choose ready-made style templates, upload a single reference photo or describe an idea in text, and create illustrations, artistic posters, and other AI images. Supported video modes can animate still photos into short clips. The platform offers adjustable formats, clear credit estimates before generation, and private-by-default creation history.`

首页这一段应在正文可见，不只放进 schema。

## 信息架构 / SEO 路由（分批上线）

| 优先级 | 路由 | Intent | 上线前置条件 |
|---|---|---|---|
| P0 | `/` 与 `/zh` | 主站综合产品介绍 | 图片创作已可用 |
| P0 | `/ai-image-generator` | text-to-image | 可用真实生图模型 |
| P0 | `/ai-photo-styles` | 风格模板目录 | 有分类与示例 |
| P0 | `/pricing` | 计费与商品 | 有真实价格、退款规则 |
| P1 | `/image-to-image` | 参考图风格转换 | 图生图已上线 |
| P1 | `/ai-video-generator` | AI 视频创作 | 视频生成已上线 |
| P1 | `/image-to-video` | 图片转视频 | 图生视频已上线 |
| P1 | `/ai-video-effects` | 视频特效合集 | 视频特效实际可选 |
| P2 | `/photo-to-illustration` | 照片转插画 | 有原创案例与完整工具 |
| P2 | `/ai-poster-generator` | AI 海报创作 | 有匹配模板 |
| P2 | `/guides/how-to-turn-photo-into-art` | 信息型教程 | 原创图文与步骤 |
| P2 | `/guides/how-to-animate-a-photo` | 信息型教程 | 视频模式可用且可演示 |

避免批量创建空壳 doorway pages。结构化数据不会自动保证 GEO 收录或 AI 推荐。

## 页面语义与结构化数据

- 语义布局：`<header>` → `<main>` → `<section aria-labelledby>` → `<footer>`；唯一 H1，按 H2/H3 组织模块。
- 可选 JSON-LD：`Organization`、`WebSite`、`SoftwareApplication`（仅填写真实功能/价格/支持平台），创作教程独立页可用 `HowTo` 描述步骤但不保证富媒体展示。
- FAQ 可用 `FAQPage` 且问题答案与可见内容一致；不要承诺 Google 会显示 FAQ 富结果。
- 图片示例有独立文字描述、`alt` 文本、延迟加载（首屏除外）、正确 width/height，视频 poster 与 captions。
- 价格从实际配置读取，不能直接写虚构商品；`offers` 字段只在购买商品真实存在时生成。
- `hreflang`：英 `en` / 简中 `zh-CN`；两种语言互相指向且 canonical 不交叉，完整内容等价。
- 首页的重要内容服务端渲染或静态预渲染；避免全靠点击 Tab 才在 DOM 出现可爬取的 SEO 正文。
- 性能：压缩图片、根据 viewport 加载示例卡、首屏工作台脚本分包、长视频只在互动时启动播放。
- 内链与锚点：顶部导航与底部专题分类均链接实际有内容的页面，不发布空站群页面。

## 页面模块锚点

`#hero`、`#create`、`#about`、`#gallery`、`#features`、`#how-it-works`、`#use-cases`、`#photo-tips`、`#tools`、`#pricing`、`#faq`、`#start-now`

## 发布真实性检查

- 如果视频工作台尚未上线：隐藏不能使用的视频 CTA；`#features` 的视频卡清楚写“即将推出”；视频案例标成“规划玩法示意”或整体隐藏；SEO title/description 及 GEO 文案按照当前能力调整。
- 如果当前只支持一张参考图：全站使用“最多一张参考图”，不借用参考站的双照片示例。
- 禁止通过公开 HTML 或模板 JSON 暴露完整服务端模板提示词。
- 作品与历史默认非公开；图库里的演示内容必须自有或取得明确许可。
