// 图生图核心组件：参考图选择 + 上传 + 删除，向上抛出 assetId。
const upload = require('../../utils/upload');
const http = require('../../utils/request');

Component({
  properties: {
    policy: { type: String, value: 'optional' }, // required | optional | forbidden
    assetId: { type: String, value: '' },
    previewUrl: { type: String, value: '' },
    maxBytes: { type: Number, value: 10 * 1024 * 1024 },
  },
  data: { uploading: false },
  methods: {
    async onChoose() {
      if (this.data.uploading || this.properties.policy === 'forbidden') return;
      this.setData({ uploading: true });
      try {
        const res = await upload.pickAndUploadReference();
        this.triggerEvent('change', {
          assetId: res.assetId,
          previewUrl: res.previewUrl,
        });
      } catch (e) {
        wx.showToast({ title: (e && e.message) || '上传失败', icon: 'none' });
      } finally {
        this.setData({ uploading: false });
      }
    },
    async onRemove() {
      const assetId = this.properties.assetId;
      if (assetId) {
        try {
          await http.post('/upload/delete', { assetId });
        } catch (e) {
          /* 忽略删除失败，前端先移除 */
        }
      }
      this.triggerEvent('change', null);
    },
  },
});
