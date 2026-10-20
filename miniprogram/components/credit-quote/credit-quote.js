Component({
  properties: {
    quote: { type: Object, value: null },
    count: { type: Number, value: 1 },
    walletAvailable: { type: Number, value: null },
  },
  data: { insufficient: false },
  observers: {
    'quote, walletAvailable': function (quote, walletAvailable) {
      const total = (quote && quote.totalCredits) || 0;
      this.setData({
        insufficient: walletAvailable !== null && walletAvailable < total,
      });
    },
  },
});
