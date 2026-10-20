const http = require('../../utils/request');
const auth = require('../../utils/auth');
const config = require('../../utils/config');

const MODE_LABELS = { '1K_SD': '1K SD', '2K_HD': '2K HD' };
const RATIO_LABELS = {
  AUTO: '原始', '9:16': '9:16', '2:3': '2:3', '3:4': '3:4', '1:1': '1:1',
  '4:3': '4:3', '3:2': '3:2', '16:9': '16:9', '21:9': '21:9',
};

Page({
  data: {
    templates: [],
    selectedTemplate: null,
    modeOptions: [],
    ratioOptions: [],
    maxCount: 9,
    refPolicy: 'optional', // required | optional | forbidden

    extraPrompt: '',
    mode: '1K_SD',
    ratio: 'AUTO',
    count: 1,
    reference: null, // { assetId, previewUrl }
    consent: false,

    quote: null,
    walletAvailable: null,
    policyVersion: '',
    canGenerate: false,
    generating: false,

    currentJob: null,
    pollTimer: null,
  },

  onLoad() {
    this.loadBootstrap();
  },

  onUnload() {
    this.stopPolling();
  },

  async loadBootstrap() {
    try {
      await auth.ensureLogin();
      const [templates, caps, policy, wallet] = await Promise.all([
        http.get('/templates'),
        http.get('/capabilities'),
        http.get('/policy'),
        http.get('/wallet').catch(() => ({ availableCredits: null })),
      ]);
      const modeOptions = (caps.modes || config.FALLBACK.modes).map((m) => ({
        value: m,
        label: MODE_LABELS[m] || m,
      }));
      const ratioOptions = (caps.ratios || config.FALLBACK.ratios).map((r) => ({
        value: r,
        label: RATIO_LABELS[r] || r,
      }));
      this.setData({
        templates: (templates && templates.items) || [],
        modeOptions,
        ratioOptions,
        maxCount: (caps && caps.maxCount) || config.FALLBACK.maxCount,
        policyVersion: (policy && policy.version) || '',
        walletAvailable: wallet ? wallet.availableCredits : null,
        refPolicy: (templates && templates.items[0] && templates.items[0].inputPolicy) || 'optional',
      });
    } catch (e) {
      wx.showToast({ title: '初始化失败，请重试', icon: 'none' });
    }
  },

  onSelectTemplate(e) {
    const tpl = e.detail.template;
    // 再次点击同一模板 = 取消选择（回到自由创作）
    const cur = this.data.selectedTemplate;
    const selectedTemplate = cur && cur.id === tpl.id ? null : tpl;
    this.setData({
      selectedTemplate,
      refPolicy: selectedTemplate ? selectedTemplate.inputPolicy : 'optional',
      reference: null,
    });
    this.refreshQuote();
  },

  onFreeCreate() {
    this.setData({ selectedTemplate: null, refPolicy: 'optional', reference: null });
    this.refreshQuote();
  },

  onDescInput(e) {
    this.setData({ extraPrompt: e.detail.value });
    this.refreshQuote();
  },
  onModeSelect(e) {
    this.setData({ mode: e.currentTarget.dataset.value });
    this.refreshQuote();
  },
  onRatioSelect(e) {
    this.setData({ ratio: e.currentTarget.dataset.value });
    this.refreshQuote();
  },
  onCountDec() {
    if (this.data.count > 1) {
      this.setData({ count: this.data.count - 1 });
      this.refreshQuote();
    }
  },
  onCountInc() {
    if (this.data.count < this.data.maxCount) {
      this.setData({ count: this.data.count + 1 });
      this.refreshQuote();
    }
  },
  onRefChange(e) {
    this.setData({ reference: e.detail });
    this.refreshQuote();
  },
  onConsent() {
    this.setData({ consent: !this.data.consent });
    this.evaluateGenerate();
  },

  // 报价：参数变化 300ms 防抖请求服务端（浏览器/小程序只展示，不自行计算）
  refreshQuote() {
    this.setData({ quote: null });
    clearTimeout(this._quoteTimer);
    this._quoteTimer = setTimeout(() => this.fetchQuote(), 300);
  },

  async fetchQuote() {
    const { selectedTemplate, extraPrompt, mode, ratio, count, reference } = this.data;
    if (!selectedTemplate && !extraPrompt.trim()) return;
    try {
      const quote = await http.post('/quote', {
        templateId: selectedTemplate ? selectedTemplate.id : null,
        referenceAssetId: reference ? reference.assetId : null,
        mode,
        ratio,
        count,
        extraPrompt,
      });
      this.setData({ quote });
      this.evaluateGenerate();
    } catch (e) {
      /* 报价失败不阻断输入，仅不显示 */
    }
  },

  evaluateGenerate() {
    const { quote, consent, walletAvailable, generating, selectedTemplate, reference, refPolicy } = this.data;
    let can = !!quote && consent && !generating;
    if (walletAvailable !== null && quote) {
      can = can && walletAvailable >= quote.totalCredits;
    }
    if (refPolicy === 'required' && !reference) can = false;
    if (refPolicy === 'forbidden' && reference) can = false;
    this.setData({ canGenerate: can });
  },

  async onGenerate() {
    if (!this.data.canGenerate) return;
    const { selectedTemplate, extraPrompt, mode, ratio, count, reference, policyVersion } = this.data;
    this.setData({ generating: true });
    wx.showLoading({ title: '创建任务中' });
    try {
      const res = await http.post('/generations', {
        templateId: selectedTemplate ? selectedTemplate.id : null,
        referenceAssetId: reference ? reference.assetId : null,
        mode,
        ratio,
        count,
        extraPrompt,
        consentAccepted: true,
        policyVersion,
      });
      wx.hideLoading();
      this.setData({ generating: false });
      wx.showToast({ title: '已提交，生成中', icon: 'none' });
      this.startPolling(res.id || res.jobId);
    } catch (e) {
      wx.hideLoading();
      this.setData({ generating: false });
      wx.showToast({ title: (e && e.message) || '生成失败', icon: 'none' });
    }
  },

  startPolling(jobId) {
    this.stopPolling();
    const tick = async () => {
      try {
        const job = await http.get(`/generations/${jobId}`);
        this.setData({ currentJob: this.normalizeJob(job) });
        if (['completed', 'partial', 'failed', 'rejected'].includes(job.status)) {
          this.stopPolling();
        }
      } catch (e) {
        this.stopPolling();
      }
    };
    tick();
    this.setData({ pollTimer: setInterval(tick, 3000) });
  },

  stopPolling() {
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
      this.setData({ pollTimer: null });
    }
  },

  // 把后端任务映射为组件需要的形状（含 outputs、状态文案、时间）
  normalizeJob(job) {
    const outputs = (job.outputs || []).map((o) => ({
      id: o.id,
      url: o.url,
      state: o.state,
    }));
    return Object.assign({}, job, { outputs });
  },

  saveCurrentImage() {
    if (!this.data.currentJob || !this.data.currentJob.outputs.length) return;
    const url = this.data.currentJob.outputs[0].url;
    wx.showLoading({ title: '保存中' });
    wx.downloadFile({
      url,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已保存到相册' }),
          fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
          complete: () => wx.hideLoading(),
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },

  goProfile() {
    wx.navigateTo({ url: '/subpackages/profile/profile' });
  },
});
