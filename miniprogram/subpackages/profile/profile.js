const http = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: { user: null, walletAvailable: null, reserved: 0 },

  onShow() {
    this.setData({ user: auth.getUser() });
    this.loadWallet();
  },

  async loadWallet() {
    try {
      const w = await http.get('/wallet');
      this.setData({
        walletAvailable: w.availableCredits,
        reserved: w.reservedCredits || 0,
      });
    } catch (e) {
      /* 容错 */
    }
  },

  goPay() {
    wx.navigateTo({ url: '/subpackages/pay/pay' });
  },
  goPolicy() {
    wx.navigateTo({ url: '/pages/result/result' }); // 占位：实际跳转内置隐私页/WebView
  },
  onLogout() {
    wx.showModal({
      title: '退出登录',
      success: (sm) => {
        if (sm.confirm) {
          auth.logout();
          wx.reLaunch({ url: '/pages/auth/auth' });
        }
      },
    });
  },
});
