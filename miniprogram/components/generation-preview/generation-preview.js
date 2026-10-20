Component({
  properties: {
    job: { type: Object, value: null },
  },
  data: {
    statusText: {
      queued: '排队中',
      running: '生成中',
      moderating: '审核中',
      completed: '已完成',
      partial: '部分完成',
      failed: '失败',
      rejected: '已拒绝',
      reconciling: '对账中',
    },
  },
  methods: {
    onOpenOutput(e) {
      this.triggerEvent('open', { url: e.currentTarget.dataset.url });
    },
    onRegenerate() {
      this.triggerEvent('regenerate', { job: this.data.job });
    },
  },
});
