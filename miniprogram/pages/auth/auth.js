const auth = require('../../utils/auth');

Page({
  data: { loading: false, error: '' },
  async onLogin() {
    this.setData({ loading: true, error: '' });
    try {
      await auth.login();
      wx.showToast({ title: '登录成功' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/workbench/workbench' });
      }, 600);
    } catch (e) {
      this.setData({ error: (e && e.message) || '登录失败，请重试' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
