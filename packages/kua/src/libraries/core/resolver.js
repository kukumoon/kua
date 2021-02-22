const fs = require('fs');
const path = require('path');
const assert = require('assert');
const is = require('is-type-of');
const compatibleRequire = require('../utils/compatible-require');

class Resolver {
  constructor(app) {
    this.app = app;
  }

  /**
     * 获取兜底的查找目录
     * @param {String} startDir - 起始目录
     */
  fallbackLookupDirs(startDir) {
    const dirs = [];

    if (Array.isArray(startDir)) {
      startDir.forEach((dir) => {
        dirs.push(...this.fallbackLookupDirs(dir));
      });

      return Array.from(new Set(dirs));
    }

    const trunks = startDir.split(path.sep).slice(1);
    while (trunks.length > 0) {
      dirs.push(path.resolve(path.sep, ...trunks, 'node_modules'));
      trunks.pop();
    }
    dirs.push(path.resolve(path.sep, ...trunks, 'node_modules'));

    return dirs;
  }

  /**
     * 查找Instrument
     * @param {String} root - 功能单元根目录
     */
  resolveInstrument(root) {
    const instrument = this.app.assembler.assemble(root);
    const queue = [instrument];

    while (queue.length > 0) {
      const item = queue.pop();
      const plugins = item.config.plugin || [];
      const dependencies = [];
      for (const plugin of plugins) {
        const name = is.object(plugin) ? plugin.name : plugin;
        const enable = is.object(plugin) ? plugin.enable : true;
        if (enable === false) {
          continue;
        }
        const pluginPath = this.resolvePlugin(item.root, name);
        const dependency = this.app.assembler.assemble(pluginPath);
        dependencies.push(dependency);
      }
      item.dependencies = dependencies;
      queue.push(...dependencies);
    }

    return instrument;
  }

  /**
     * 查找插件
     * @param {String} root - 功能单元根目录
     * @param {String} name - 插件名称
     */
  resolvePlugin(root, name) {
    const searchPaths = [
      path.resolve(root, 'app', 'plugin'),
      ...this.fallbackLookupDirs([root, this.app.root]),
    ];

    let pluginPath = '';
    for (const searchPath of searchPaths) {
      const candidatePath = path.resolve(searchPath, name);
      if (
        fs.existsSync(candidatePath)
                && fs.statSync(candidatePath).isDirectory()
      ) {
        pluginPath = candidatePath;
        break;
      }
    }

    assert(pluginPath, `Can't find plugin '${name}'`);

    return pluginPath;
  }

  /**
     * 查找中间件
     * @param {String} root - 功能单元根目录
     * @param {String} name - 中间件名称
     */
  resolveMiddleware(root, name) {
    const searchPaths = [
      path.resolve(root, 'app', 'middleware'),
      ...this.fallbackLookupDirs([root, this.app.root]),
    ];

    let middlewarePath = '';
    let middleware = null;
    let pkg = null;
    for (const searchPath of searchPaths) {
      middlewarePath = path.resolve(searchPath, name);

      let resolvedMiddlewarePath = '';
      try {
        resolvedMiddlewarePath = require.resolve(middlewarePath);
      } catch (e) {
        continue;
      }

      middleware = compatibleRequire(resolvedMiddlewarePath);

      try {
        /* eslint-disable-next-line */
                pkg = require(path.resolve(middlewarePath, 'package.json'));
      } catch (e) {
        /* eslint-disable-next-line */
            }

      break;
    }

    assert(middleware, `Can't find middleware '${name}'`);

    return {
      middleware: (options, app, enable) => {
        const middlewareFunc = middleware(options, app);
        const { enableMiddleware } = app.config;

        return async (ctx, next) => {
          if (enableMiddleware === false) {
            return next();
          }
          if (is.function(enableMiddleware)) {
            let isEnabled = true;
            if (is.asyncFunction(enableMiddleware)) {
              isEnabled = await enableMiddleware(ctx, {
                name,
                pkg,
                path: middlewarePath,
              });
            } else {
              isEnabled = enableMiddleware(ctx, {
                name,
                pkg,
                path: middlewarePath,
              });
            }
            if (is.promise(isEnabled)) {
              isEnabled = await isEnabled;
            }
            if (isEnabled === false) {
              return next();
            }
          }

          if (enable === false) {
            return next();
          }
          if (is.function(enable)) {
            let isEnabled = true;
            if (is.asyncFunction(enable)) {
              isEnabled = await enable(ctx, {
                name,
                pkg,
                path: middlewarePath,
              });
            } else {
              isEnabled = enable(ctx, {
                name,
                pkg,
                path: middlewarePath,
              });
            }
            if (is.promise(isEnabled)) {
              isEnabled = await isEnabled;
            }
            if (isEnabled === false) {
              return next();
            }
          }
          return middlewareFunc(ctx, next);
        };
      },
      pkg,
      path: middlewarePath,
    };
  }

  /**
     * 查找没有后缀名的文件模块
     * @param {String} filepath - 文件路径
     */
  resolveFileWithoutExt(filepath) {
    let filepathWithExt = '';

    const exts = Object.keys(require.extensions);
    for (const ext of exts) {
      const p = `${filepath}${ext}`;
      if (fs.existsSync(p)) {
        filepathWithExt = p;
        break;
      }
    }

    return filepathWithExt;
  }
}

module.exports = Resolver;
