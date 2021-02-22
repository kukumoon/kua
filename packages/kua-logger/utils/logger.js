const path = require('path');
const winston = require('winston');
const formatDatetime = require('../utils/format-datetime');
const mkdirp = require('mkdirp');

const { createLogger, format, transports } = winston;
const { combine, colorize, printf, timestamp } = format;

// 错误级别定义
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// 错误级别颜色定义
const colors = {
  ERROR: 'red',
  WARN: 'yellow',
  INFO: 'green',
  DEBUG: 'blue',
  TRACE: 'magenta',
};

// 错误级别转大写
const upperCaseLevel = format((info) => {
  /* eslint-disable-next-line */
  info.level = info.level.toUpperCase();
  return info;
});

// 日志输出格式
const logFormat = printf((info) => {
  const items = [
    formatDatetime(info.timestamp),
    info.level,
  ];

  if (info.label) {
    items.push(`[${info.label}]`);
  }

  items.push(info.message);

  if (info.durationMs !== undefined) {
    items.push(`${info.durationMs}ms`);
  }

  return items.join(' ');
});

// 文件日志格式
const formatForFile = combine(
  upperCaseLevel(),
  timestamp(),
  logFormat,
);

// 控制台日志格式
const formatForConsole = combine(
  upperCaseLevel(),
  timestamp(),
  colorize({
    colorize: true,
    colors,
  }),
  logFormat,
);

// 日志传输实例
let coreFileLogTransport = null;
let coreErrorFileLogTransport = null;
let coreConsoleLogTransport = null;
let appFileLogTransport = null;
let appErrorFileLogTransport = null;
let appConsoleLogTransport = null;
let contextFileLogTransport = null;
let contextErrorFileLogTransport = null;
let contextConsoleLogTransport = null;


/**
 * 创建核心Logger
 * @param {Object} app - koa实例
 */
function createCoreLogger(app) {
  const { logDir } = app;
  mkdirp.sync(logDir);

  const logger = createLogger({
    levels,
    format: formatForFile,
  });

  if (!coreFileLogTransport) {
    coreFileLogTransport = new transports.File({
      filename: path.resolve(logDir, 'core.log'),
      level: 'info',
    });
  }
  if (!coreErrorFileLogTransport) {
    coreErrorFileLogTransport = new transports.File({
      filename: path.resolve(logDir, 'core-error.log'),
      level: 'error',
    });
  }
  if (!coreConsoleLogTransport) {
    coreConsoleLogTransport = new transports.Console({
      level: 'info',
      format: formatForConsole,
    });
  }

  logger.add(coreFileLogTransport);
  logger.add(coreErrorFileLogTransport);
  logger.add(coreConsoleLogTransport);

  return logger;
}

/**
 * 创建应用Logger
 * @param {Object} app - koa实例
 */
function createAppLogger(app) {
  const { logDir } = app;
  mkdirp.sync(logDir);

  const logger = createLogger({
    levels,
    format: formatForFile,
  });

  if (!appFileLogTransport) {
    appFileLogTransport = new transports.File({
      filename: path.resolve(logDir, 'app.log'),
      level: 'info',
    });
  }
  if (!appErrorFileLogTransport) {
    appErrorFileLogTransport = new transports.File({
      filename: path.resolve(logDir, 'app-error.log'),
      level: 'error',
    });
  }
  if (!appConsoleLogTransport) {
    appConsoleLogTransport = new transports.Console({
      level: 'debug',
      format: formatForConsole,
    });
  }

  logger.add(appFileLogTransport);
  logger.add(appErrorFileLogTransport);
  if (app.env === 'dev') {
    logger.add(appConsoleLogTransport);
  }

  return logger;
}

/**
 * 创建上下文Logger
 * @param {Object} app - koa实例
 */
function createContextLogger(app) {
  const { logDir } = app;
  mkdirp.sync(logDir);

  const logger = createLogger({
    levels,
    format: formatForFile,
  });

  if (!contextFileLogTransport) {
    contextFileLogTransport = new transports.File({
      filename: path.resolve(logDir, 'context.log'),
      level: 'info',
    });
  }
  if (!contextErrorFileLogTransport) {
    contextErrorFileLogTransport = new transports.File({
      filename: path.resolve(logDir, 'context-error.log'),
      level: 'error',
    });
  }
  if (!contextConsoleLogTransport) {
    contextConsoleLogTransport = new transports.Console({
      level: 'debug',
      format: formatForConsole,
    });
  }

  logger.add(contextFileLogTransport);
  logger.add(contextErrorFileLogTransport);
  if (app.env === 'dev') {
    logger.add(contextConsoleLogTransport);
  }

  return logger;
}

/**
 * 创建控制台Logger
 */
function createConsoleLogger() {
  const logger = createLogger({
    levels,
    transports: [
      new transports.Console({
        level: 'debug',
        format: formatForConsole,
      }),
    ],
  });
  return logger;
}

module.exports = {
  createCoreLogger,
  createAppLogger,
  createContextLogger,
  createConsoleLogger,
};
