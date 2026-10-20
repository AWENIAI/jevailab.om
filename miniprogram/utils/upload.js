// 参考图选择 + 上传：wx.chooseMedia 选图 → 压缩 → wx.uploadFile 到后端（图生图前置）。
const { API_BASE } = require('./config');

// 选择参考图（图生图）。sizeType 优先 compressed，count=1（工作流仅允许一张）。
const chooseReference = () => {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => resolve(res.tempFiles[0]),
      fail: (err) => reject({ code: 'CHOOSE_FAIL', message: '选择图片失败', detail: err }),
    });
  });
};

// 上传参考图到后端（后端写入 R2 隔离前审核，返回 assetId + 预览地址）。
// 返回：{ assetId, previewUrl }
const uploadReference = (tempFile) => {
  const token = wx.getStorageSync('access_token');
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE}/upload`,
      filePath: tempFile.tempFilePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data));
          } catch (e) {
            reject({ code: 'PARSE_FAIL', message: '上传响应解析失败' });
          }
        } else {
          let msg = '上传失败';
          try {
            msg = JSON.parse(res.data).message || msg;
          } catch (e) {}
          reject({ code: `HTTP_${res.statusCode}`, message: msg });
        }
      },
      fail: (err) => reject({ code: 'UPLOAD_FAIL', message: '上传异常', detail: err }),
    });
  });
};

// 图生图流程：选图 + 上传，返回 assetId 供生成请求使用
const pickAndUploadReference = async () => {
  const file = await chooseReference();
  wx.showLoading({ title: '上传审核中' });
  try {
    const result = await uploadReference(file);
    return result;
  } finally {
    wx.hideLoading();
  }
};

module.exports = { chooseReference, uploadReference, pickAndUploadReference };
