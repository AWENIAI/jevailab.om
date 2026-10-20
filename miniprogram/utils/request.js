// 统一网络请求封装：注入 Bearer Token、401 自动重新登录、统一错误码处理。
const { API_BASE } = require('./config');
const auth = require('./auth');

const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('access_token');
    wx.request({
      url: `${API_BASE}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: Object.assign(
        { 'Content-Type': 'application/json' },
        token ? { Authorization: `Bearer ${token}` } : {},
        options.header || {}
      ),
      success: async (res) => {
        if (res.statusCode === 401) {
          // Token 失效：清掉本地 token，重新走微信登录，再重试一次。
          try {
            await auth.login();
            const retry = await request(options);
            resolve(retry);
          } catch (e) {
            reject({ code: 'AUTH_FAILED', message: '登录失效，请重试' });
          }
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject({
            code: (res.data && res.data.code) || `HTTP_${res.statusCode}`,
            message: (res.data && res.data.message) || '请求失败',
          });
        }
      },
      fail: (err) => {
        reject({ code: 'NETWORK_ERROR', message: '网络异常', detail: err });
      },
    });
  });
};

module.exports = {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  del: (url, data) => request({ url, method: 'DELETE', data }),
};
