const fs = require('fs');
const path = require('path');
const assert = require('assert');
const is = require('is-type-of');
const camelCase = require('camelcase');
const compatibleRequire = require('../utils/compatible-require');
const Instrument = require('./instrument');
const merge = require('../utils/merge');

class Assembler {
  constructor(app) {
    this.app = app;
  }

  /**
   * 装载Instrument
   * @param {String} root - 目录单元路径
   */
  assemble(root) {
    return new Instrument({
      root,
      pkg: this.assembleNPMPackage(root),
      config: this.assembleConfig(root),
      controllerClasses: this.assembleControllerClass(root),
      serviceClasses: this.assembleServiceClass(root),
      routerRegisters: this.assembleRouterRegister(root),
      initiator: this.assembleInitiator(root),
      extensions: {
        app: this.assembleExtension(root, 'app'),
        context: this.assembleExtension(root, 'context'),
        request: this.assembleExtension(root, 'request'),
        response: this.assembleExtension(root, 'response'),
      },
    });
  }

  /**
   * 装载NPM包信息
   * @param {String} root - 功能单元根目录
   */
  assembleNPMPackage(root) {
    let pkg = null;
    try {
      /* eslint-disable-next-line */
      pkg = require(path.resolve(root, 'package.json'));
    } catch (e) {
      /* eslint-disable-next-line */
    }
    return pkg;
  }

  /**
   * 装载配置
   * @param {String} root - 目录单元路径
   */
  assembleConfig(root) {
    let aggregatedDefaultConfig = {}; // 默认的聚合config
    let aggregatedEnvConfig = {}; // 环境的聚合config
    let scatteredDefaultConfig = {}; // 默认的分散config
    let scatteredEnvConfig = {}; // 环境的分散config

    const configDir = path.resolve(root, 'config');
    const env = this.app.env || '';

    if (!fs.existsSync(configDir)) {
      return {};
    }

    fs.readdirSync(configDir).forEach((filename) => {
      const reg = /^([^.]+)\.([^.]+)\.([^.]+)$/;
      const match = reg.exec(filename);
      if (!match || (match[2] !== 'default' && match[2] !== env)) {
        return;
      }
      if (!require.extensions[path.extname(filename)]) {
        return;
      }

      let config = compatibleRequire(path.resolve(configDir, filename));
      if (is.function(config)) {
        config = config(this.app);
      }

      if (match[1] === 'config') {
        assert(
          is.object(config),
          'config must be object or function to return object.',
        );
      }

      if (match[1] === 'config') {
        if (match[2] === 'default') {
          aggregatedDefaultConfig = merge(
            aggregatedDefaultConfig,
            config,
          );
        } else {
          aggregatedEnvConfig = merge(aggregatedEnvConfig, config);
        }
      } else if (match[2] === 'default') {
        scatteredDefaultConfig = merge(scatteredDefaultConfig, {
          [match[1]]: config,
        });
      } else {
        scatteredEnvConfig = merge(scatteredEnvConfig, {
          [match[1]]: config,
        });
      }
    });

    return merge(
      aggregatedDefaultConfig,
      scatteredDefaultConfig,
      aggregatedEnvConfig,
      scatteredEnvConfig,
    );
  }

  /**
   * 装载Controller
   * @param {String} root - 目录单元路径
   */
  assembleControllerClass(root) {
    const controllerDir = path.resolve(root, 'app', 'controller');
    const controllerClasses = {};

    const scanControllerDir = (dir, paths = []) => {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        return;
      }

      fs.readdirSync(dir).forEach((filename) => {
        // ignore private dir or file
        if (filename.startsWith('_')) {
          return;
        }

        const filepath = path.resolve(dir, filename);
        const filestat = fs.statSync(filepath);
        if (filestat.isDirectory()) {
          scanControllerDir(path.resolve(dir, filename), [
            ...paths,
            filename,
          ]);
          return;
        }
        if (!filestat.isFile()) {
          return;
        }
        if (!require.extensions[path.extname(filepath)]) {
          return;
        }

        const controllerClass = compatibleRequire(filepath);

        assert(is.class(controllerClass), 'controller must be class.');
        // eslint-disable-next-line no-underscore-dangle
        controllerClass.__root = root;
        // eslint-disable-next-line no-underscore-dangle
        controllerClass.__fileName = filename;

        [...paths, path.basename(filename, path.extname(filepath))]
          .map(p => camelCase(p))
          .reduce((previous, current, index, array) => {
            const original = path.resolve(
              root,
              'app/controller',
              ...array.slice(0, index + 1),
            );
            const replacement = path.resolve(
              root,
              'app/controller',
              ...array.slice(0, index + 1),
            );

            /* eslint-disable no-param-reassign */
            if (index === array.length - 1) {
              if (is.class(previous[current])) {
                this.app.coreLogger.warn(`[core] controller at path "${original}" is replaced by controller at path "${replacement}"`);
              } else if (is.object(previous[current])) {
                this.app.coreLogger.warn(`[core] all controllers under path "${original}/" are replaced by controller at path "${replacement}"`);
              }
              previous[current] = controllerClass;
            } else {
              if (is.class(previous[current])) {
                previous[current] = {};
                this.app.coreLogger.warn(`[core] controller at path "${original}" is replaced by controllers under path "${replacement}/"`);
              }
              previous[current] = previous[current] || {};
            }
            return previous[current];
            /* eslint-enable no-param-reassign, max-len */
          }, controllerClasses);
      });
    };

    scanControllerDir(controllerDir);

    return controllerClasses;
  }

  /**
   * 装载Service
   * @param {String} root - 目录单元路径
   */
  assembleServiceClass(root) {
    const serviceDir = path.resolve(root, 'app', 'service');
    const serviceClasses = {};

    const scanServiceDir = (dir, paths = []) => {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        return;
      }

      fs.readdirSync(dir).forEach((filename) => {
        // ignore private dir or file
        if (filename.startsWith('_')) {
          return;
        }

        let filepath = path.resolve(dir, filename);
        const filestat = fs.statSync(filepath);

        if (filestat.isDirectory()) {
          filepath = this.app.resolver.resolveFileWithoutExt(path.resolve(filepath, 'index'));
          if (!filepath) {
            scanServiceDir(path.resolve(dir, filename), [
              ...paths,
              filename,
            ]);
            return;
          }
        }
        if (!filestat.isFile() && !filepath) {
          return;
        }
        if (!require.extensions[path.extname(filepath)]) {
          return;
        }

        const serviceClass = compatibleRequire(filepath);

        assert(is.class(serviceClass), 'service must be class.');
        /* eslint-disable-next-line */
        serviceClass.__root = root;
        // eslint-disable-next-line no-underscore-dangle
        serviceClass.__fileName = filename;

        [...paths, path.basename(filename, path.extname(filepath))]
          .map(p => camelCase(p))
          .reduce((previous, current, index, array) => {
            const original = path.resolve(
              root,
              'app/service',
              ...array.slice(0, index + 1),
            );
            const replacement = path.resolve(
              root,
              'app/service',
              ...array.slice(0, index + 1),
            );

            /* eslint-disable no-param-reassign, max-len */
            if (index === array.length - 1) {
              if (is.class(previous[current])) {
                this.app.coreLogger.warn(`[core] service at path "${original}" is replaced by service at path "${replacement}"`);
              } else if (is.object(previous[current])) {
                this.app.coreLogger.warn(`[core] all services under path "${original}/" are replaced by service at path "${replacement}"`);
              }
              previous[current] = serviceClass;
            } else {
              if (is.class(previous[current])) {
                previous[current] = {};
                this.app.coreLogger.warn(`[core] service at path "${original}" is replaced by services under path "${replacement}/"`);
              }
              previous[current] = previous[current] || {};
            }
            return previous[current];
            /* eslint-enable no-param-reassign, max-len */
          }, serviceClasses);
      });
    };

    scanServiceDir(serviceDir);

    return serviceClasses;
  }

  /**
   * 装载路由注册器
   * @param {String} root - 目录单元路径
   */
  assembleRouterRegister(root) {
    const registers = [];

    let registerPath = this.app.resolver.resolveFileWithoutExt(path.resolve(root, 'app', 'router'));
    if (registerPath) {
      const register = compatibleRequire(registerPath);
      assert(
        is.function(register),
        `router register [${registerPath}] must be function`,
      );
      registers.push(register);
    }

    const registerAssembleDir = path.resolve(root, 'app', 'router');
    if (
      fs.existsSync(registerAssembleDir)
      && fs.statSync(registerAssembleDir).isDirectory()
    ) {
      fs.readdirSync(registerAssembleDir).forEach((filename) => {
        registerPath = path.resolve(registerAssembleDir, filename);
        if (fs.statSync(registerPath).isFile()) {
          const register = compatibleRequire(registerPath);
          assert(
            is.function(register),
            `router register [${registerPath}] must be function.`,
          );
          registers.push(register);
        }
      });
    }

    return registers;
  }

  /**
   * 装载initiator
   * @param {String} root - 目录单元路径
   */
  assembleInitiator(root) {
    const initiatorPath = this.app.resolver.resolveFileWithoutExt(path.resolve(root, 'app'));
    if (!initiatorPath) {
      return;
    }

    const initiator = compatibleRequire(initiatorPath);
    assert(
      is.function(initiator)
      || is.asyncFunction(initiator)
      || is.object(initiator),
      'app initiator must be function or object',
    );
    return initiator;
  }

  /**
   * 装载扩展
   * @param {String} root - 目录单元路径
   * @param {String} name - 扩展名称
   */
  assembleExtension(root, name) {
    const extensionPath = this.app.resolver.resolveFileWithoutExt(path.resolve(root, 'app', 'extension', name));
    if (!extensionPath) {
      return;
    }

    const extension = compatibleRequire(extensionPath);
    assert(
      is.object(extension) || is.function(extension),
      `${name} extension must be object or function.`,
    );
    return extension;
  }
}

module.exports = Assembler;
