const winston = require('winston');
const formatDatetime = require('../utils/format-datetime');

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

/**
 * 创建控制台Logger
 */
function createDefaultLogger() {
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
  createDefaultLogger,
};

