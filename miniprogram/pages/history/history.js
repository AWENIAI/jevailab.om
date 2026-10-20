const http = require('../../utils/request');
const auth = require('../../utils/auth');

const STATUS_TEXT = {
  queued: '排队中', running: '生成中', moderating: '审核中', completed: '已完成',
  partial: '部分完成', failed: '失败', rejected: '已拒绝', reconciling: '对账中',
};

Page({
  data: { jobs: [], loading: true },

  onShow() { this.loadList(); },
  onPullDownRefresh() { this.loadList(() => wx.stopPullDownRefresh()); },

  async loadList(done) {
    try {
      await auth.ensureLogin();
      const res = await http.get('/generations');
      const jobs = (res && res.items ? res.items : []).map((j) => this.normalize(j));
      this.setData({ jobs, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    } finally {
      if (done) done();
    }
  },

  normalize(job) {
    const outputs = (job.outputs || []).map((o) => ({ id: o.id, url: o.url }));
    const createdAt = job.createdAt ? new Date(job.createdAt) : null;
    const timeText = createdAt
      ? `${createdAt.getMonth() + 1}/${createdAt.getDate()} ${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`
      : '';
    return Object.assign({}, job, {
      outputs,
      statusText: STATUS_TEXT[job.status] || job.status,
      timeText,
    });
  },

  onOpen(e) {
    const job = e.detail.job;
    wx.navigateTo({ url: `/pages/result/result?id=${job.id}` });
  },
});
