// 小程序入口：全局生命周期与 globalData（token、能力配置、模板缓存）。
const auth = require('./utils/auth');

App({
  globalData: {
    accessToken: '',
    user: null,
    capabilities: null, // 模式/比例/张数上限/上传限制
    templates: [], // 模板列表缓存（远程拉取，不进包）
    policy: null, // 隐私/条款版本与链接
  },

  onLaunch() {
    this.globalData.accessToken = wx.getStorageSync('access_token') || '';
    // 静默确保登录（失败不阻塞启动，页面会按需重试）
    auth.ensureLogin().catch(() => {});
  },
});
