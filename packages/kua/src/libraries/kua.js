// node.js modules
const path = require('path');
const http = require('http');

// Koa series modules
const Koa = require('koa');
const KoaRouter = require('koa-router');

// third part modules
const is = require('is-type-of');

// core modules
const Resolver = require('./core/resolver');
const Assembler = require('./core/assembler');
const { createDefaultLogger } = require('./core/logger');

// utils
const merge = require('./utils/merge');
const traverse = require('./utils/traverse');
const TypeGenerator = require('./utils/type-generator');
const compatibleRequire = require('./utils/compatible-require');

// builtins
const AppBuiltin = require('./builtin/app-builtin');
const ContextBuiltin = require('./builtin/context-builtin');

class Kua extends Koa {
  constructor(options = {}) {
    super(options);
    this.root = path.resolve(options.root || process.cwd()); // app root
    this.config = {}; // config predefine

    this.assembler = new Assembler(this);
    this.resolver = new Resolver(this);
    this.router = new KoaRouter();

    this.instruments = [];
    this.middlewares = [];
    this.routerRegisters = [];

    this.controller = {};
    this.controllerClasses = {};
    this.serviceClasses = {};

    this.createLoggers(options);
    // this.handleProcessEvents();

    this.typeGenerator = new TypeGenerator(this, options.typeGenerator);
    this.utils = {
      merge,
      traverse,
      compatibleRequire,
    };
  }

  /**
   * 覆盖Koa的listen方法
   * @param {Array} args
   */
  listen(...args) {
    const server = http.createServer(this.callback());

    this.beforeStart()
      .then(() => {
        server.listen(...args);
      })
      .catch((e) => {
        this.coreLogger.error(e.stack || e.message);
        process.exit();
      });

    server.on('listening', () => {
      this.afterStart()
        .then(() => {
          this.coreLogger.info(`[core] server started on port ${server.address().port}`);
        })
        .catch((e) => {
          this.coreLogger.error(e.stack || e.message);
          process.exit();
        });
    });

    return server;
  }

  /**
   * 应用启动前逻辑
   */
  async beforeStart() {
    this.mergeConfig();

    for (const instrument of this.instruments) {
      let beforeStart = instrument.initiator;
      if (is.object(instrument.initiator)) {
        beforeStart = instrument.initiator.beforeStart;
      }
      if (is.asyncFunction(beforeStart)) {
        await beforeStart(this);
      } else if (is.function(beforeStart)) {
        beforeStart(this);
      }
    }

    this.applyInstruments();
    this.handleProcessEvents();
    this.typeGenerator.generateTypes();
  }

  /**
   * 应用启动后逻辑
   */
  async afterStart() {
    for (const instrument of this.instruments) {
      if (is.object(instrument.initiator)) {
        const { afterStart } = instrument.initiator;
        if (is.asyncFunction(afterStart)) {
          await afterStart(this);
        } else if (is.function(afterStart)) {
          afterStart(this);
        }
      }
      this.coreLogger.info(`[core] ${instrument.name} loaded`);
    }
  }

  /**
   * 合并配置
   */
  mergeConfig() {
    this.config = this.instruments.reduce(
      (target, instrument) => merge(target, instrument.config),
      this.config,
    );
    return this;
  }

  /**
   * 装载应用逻辑
   * @param {String} root - Instrument根目录
   * */
  assemble(root) {
    if (this.instruments.some(instrument => instrument.root === root)) {
      return this;
    }

    const tree = this.resolver.resolveInstrument(root);
    const nodes = traverse(tree);

    for (const node of nodes) {
      if (
        !node.pkg
        || !this.instruments.some(instrument => instrument.pkg && instrument.pkg.name === node.pkg.name)
      ) {
        this.instruments.push(node);
      }
    }
    return this;
  }

  /**
   * 应用Instruments
   */
  applyInstruments() {
    this.instruments.forEach((instrument, index) => {
      instrument.apply(this, index === this.instruments.length - 1);
    });

    this.use(this.router.routes()).use(this.router.allowedMethods());
    return this;
  }

  /**
   * 处理Events
   * */
  handleProcessEvents() {
    // Koa Events Handler
    this.on('error', (error, ctx) => {
      if (error.status === 404 || error.expose || this.silent) {
        return;
      }

      const message = error.stack || error.message;
      if (ctx) {
        ctx.logger.error(message);
      } else {
        this.logger.error(message);
      }
    });

    // Unhandled rejection Handler
    process.on('unhandledRejection', (error) => {
      this.coreLogger.error(error.stack || error.message);
    });

    // Uncaught exception Handler
    process.on('uncaughtException', (error) => {
      this.coreLogger.error(error.stack || error.message);
      process.exit(1);
    });

    // Handler when killed
    process.on('SIGTERM', () => {
      this.coreLogger.error('Receive signal SIGTERM');
      process.exit(1);
    });
    process.on('SIGINT', () => {
      this.coreLogger.error('Receive signal SIGINT');
      process.exit(1);
    });
  }

  /**
   * 创建loggers
   * */
  createLoggers(options) {
    this.logDir = options.logDir || path.resolve(this.root, 'log');
    this.coreLogger = createDefaultLogger(this);
    this.logger = createDefaultLogger(this);
    this.contextLogger = createDefaultLogger(this);
    this.console = createDefaultLogger(this);
    Object.defineProperty(this.context, 'logger', {
      configurable: true,
      get() {
        return this.app.contextLogger;
      },
    });
    Object.defineProperty(this.context, 'console', {
      configurable: true,
      get() {
        return this.console;
      },
    });
  }
}

Kua.Application = Kua;
Kua.InstrumentAssembler = Assembler;
Kua.Controller = AppBuiltin;
Kua.Service = ContextBuiltin;
Kua.AppBuiltin = AppBuiltin;
Kua.ContextBuiltin = ContextBuiltin;

module.exports = Kua;
