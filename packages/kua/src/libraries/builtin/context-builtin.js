class ContextBuiltin {
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
    this.config = ctx.app.config;
  }
}

module.exports = ContextBuiltin;
