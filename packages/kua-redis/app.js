// node modules
const assert = require('assert');
const Redis = require('ioredis');

// utils required
const resolveRedisConfig = require('./utils/resolveRedisConfig');

module.exports = async (app) => {
  try {
    assert(app.config.redis, '[kua-redis] redis config is not found');
    const config = app.config.redis;
    // resolve config by conditions ( is cluster or not, with password or not QvQ )
    const ioRedisConfig =  resolveRedisConfig(config);

    // 如果未启用插件 return
    if (ioRedisConfig.enable === false) {
      return ;
    }

    const redis = new Redis({
      ...ioRedisConfig,
    });

    // event handler
    redis.on('connect', () => {
      app.coreLogger.info('[core][welink:redis]connected to redis');
    });
    redis.on('ready', () => {
      app.coreLogger.info('[core][welink:redis]redis ready');
    });
    redis.on('close', () => {
      app.coreLogger.warn('[core][welink:redis]redis closed');
    });
    redis.on('end', () => {
      app.coreLogger.warn('[core][welink:redis]redis ended');
    });
    redis.on('error', (err) => {
      throw new Error(err);
    });
    redis.on('reconnecting', () => {
      app.coreLogger.warn('[core][welink:redis]redis reconnecting');
    });
    redis.on('+node', () => {
      app.coreLogger.info('[core][welink:redis]a new node is connected');
    });
    redis.on('-node', () => {
      app.coreLogger.info('[core][welink:redis]a node is disconnected');
    });
    redis.on('node error', () => {
      app.coreLogger.error('[core][welink:redis]an error occurs when connecting to a node');
    });

    // add hook on app instance
    // eslint-disable-next-line no-param-reassign
    app.redis = redis;
  } catch (e) {
    app.coreLogger.error('[core]kua-redis error with an unexpected error!! please check */kua-redis/app.js');
    process.exit(1);
  }
};
