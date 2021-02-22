/* eslint-disable */
const { createCoreLogger, createAppLogger, createContextLogger, createConsoleLogger } = require('./utils/logger');


function createLoggers(app) {
  app.coreLogger = createCoreLogger(app);
  app.logger = createAppLogger(app);
  app.contextLogger = createContextLogger(app);
  app.console = createConsoleLogger(app);
  Object.defineProperty(app.context, 'logger', {
    configurable: true,
    get() {
      return app.contextLogger;
    },
  });
  Object.defineProperty(app.context, 'console', {
    configurable: true,
    get() {
      return app.console;
    },
  });
}

module.exports = {
  beforeStart(app) {
    createLoggers(app);
  }
}
