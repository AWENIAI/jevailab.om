// 微信支付封装：后端下单返回 wx.requestPayment 所需参数，前端拉起微信支付。
// 对应后端新增的微信支付 provider（JSAPI），积分套餐结算复用现有账本/webhook。
const http = require('./request');

// 创建积分订单，返回微信支付参数
const createOrder = (payload) => {
  return http.post('/orders', payload);
};

// 拉起微信支付。payParams 由后端 /orders 返回（timeStamp/nonceStr/package/signType/paySign）
const pay = (payParams) => {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.package,
      signType: payParams.signType || 'RSA',
      paySign: payParams.paySign,
      success: (res) => resolve({ success: true, detail: res }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') > -1) {
          resolve({ success: false, reason: 'cancelled' });
        } else {
          reject({ success: false, reason: 'payment_failed', detail: err });
        }
      },
    });
  });
};

// 一站式：下单 + 拉起支付
const purchaseCredits = async (payload) => {
  const order = await createOrder(payload);
  return pay(order.payParams);
};

module.exports = { createOrder, pay, purchaseCredits };
