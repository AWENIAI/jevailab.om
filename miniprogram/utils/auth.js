// 微信登录桥接：wx.login 拿 code → 后端 code2session(openid) → 关联/创建用户 → 下发 token。
// 现有 Better Auth 是 cookie session（Web 端），小程序改用 Bearer Token 模式。
const { API_BASE } = require('./config');
const http = require('./request');

let loggingIn = null;

const login = () => {
  // 防止并发重复登录
  if (loggingIn) return loggingIn;
  loggingIn = new Promise((resolve, reject) => {
    wx.login({
      success: async ({ code }) => {
        try {
          const data = await http.post('/auth/login', { code });
          wx.setStorageSync('access_token', data.accessToken);
          if (data.user) wx.setStorageSync('user', data.user);
          resolve(data);
        } catch (e) {
          reject(e);
        } finally {
          loggingIn = null;
        }
      },
      fail: (err) => {
        loggingIn = null;
        reject({ code: 'WX_LOGIN_FAIL', message: '微信登录失败', detail: err });
      },
    });
  });
  return loggingIn;
};

// 页面 onLoad 时确保已登录；未登录或 token 缺失则触发登录。
const ensureLogin = async () => {
  const token = wx.getStorageSync('access_token');
  if (token) return token;
  return login();
};

const logout = () => {
  wx.removeStorageSync('access_token');
  wx.removeStorageSync('user');
};

const getUser = () => wx.getStorageSync('user') || null;

module.exports = { login, ensureLogin, logout, getUser };
