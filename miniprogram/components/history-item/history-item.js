Component({
  properties: {
    job: { type: Object, value: null },
  },
  methods: {
    onOpen() {
      this.triggerEvent('open', { job: this.data.job });
    },
  },
});
