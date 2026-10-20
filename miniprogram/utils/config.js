// 全局配置：上线前替换为你的备案域名与 CDN 地址
// 这些域名必须在微信公众平台「开发管理 → 开发设置 → 服务器域名」中配置为
// request 合法域名 / uploadFile 合法域名 / downloadFile 合法域名。
module.exports = {
  // 小程序专用后端 API 前缀（Cloudflare Worker 自定义域，需 ICP 备案）
  API_BASE: 'https://api.jevailab.com/miniprogram',
  // 静态资源 / 输出图 CDN 基础地址（用于 <image> 远程加载，不进包）
  CDN_BASE: 'https://cdn.jevailab.com',
  // 报价/能力的本地兜底（防止接口未就绪时页面空白）
  FALLBACK: {
    modes: ['1K_SD', '2K_HD'],
    ratios: ['AUTO', '9:16', '2:3', '3:4', '1:1', '4:3', '3:2', '16:9', '21:9'],
    maxCount: 9,
    referenceImage: { maxBytes: 10 * 1024 * 1024, mediaTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  },
  // 积分价格（与后端 IMAGE_CREATOR_PRICE_VERSION 对齐，仅用于本地预估展示）
  CREDIT_UNIT: { '1K_SD': 2, '2K_HD': 5 },
};
