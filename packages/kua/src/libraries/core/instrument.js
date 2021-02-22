/*
* @author kkukuli
* */

const assert = require('assert');
const path = require('path');
const is = require('is-type-of');
const camelCase = require('camelcase');

class Instrument {
  constructor(options = {}) {
    assert(options.root, 'Instrument root can not be empty');

    // eslint-disable-next-line no-param-reassign
    options.extensions = options.extensions || {};

    this.root = options.root;
    this.name = path.basename(this.root);
    this.pkg = options.pkg;
    this.config = options.config || {};
    this.controllerClasses = options.controllerClasses || {};
    this.serviceClasses = options.serviceClasses || {};
    this.routerRegisters = options.routerRegisters || [];
    this.initiator = options.initiator || {};
    this.extensions = {
      app: options.extensions.app || {},
      context: options.extensions.context || {},
      request: options.extensions.request || {},
      response: options.extensions.response || {},
    };
  }

  /**
   * 应用组件
   * @param {Object} app - Koa实例
   * @param {Boolean} isLast - 是否是最后一个组件
   */
  apply(app, isLast) {
    this.applyMiddleware(app)
      .applyController(app, isLast)
      .applyService(app, isLast)
      .applyRouterRegister(app, isLast)
      .applyExtension(app);
  }

  /**
   * 应用中间件
   * @param {Object} app - Koa实例
   */
  applyMiddleware(app) {
    (this.config.middleware || []).forEach((item) => {
      let enable = true;
      let name = '';
      if (is.object(item)) {
        // eslint-disable-next-line prefer-destructuring
        name = item.name;
        // eslint-disable-next-line prefer-destructuring
        enable = item.enable;
      }
      if (is.string(item)) {
        name = item;
        enable = true;
      }
      if (enable === false) {
        return;
      }

      const options = app.config[camelCase(name)] || {};
      const res = app.resolver.resolveMiddleware(this.root, name);
      const exist = app.middlewares.some(({ path, pkg }) => (pkg && res.pkg && pkg.name === res.pkg.name)
          || path === res.path);
      if (exist) {
        return;
      }
      app.middlewares.push(res);
      app.use(res.middleware(options || {}, app, enable));
    });
    return this;
  }

  /**
   * 应用Controller
   * @param {Object} app - Koa实例
   * @param {Boolean} isLast - 是否是最后一个组件
   */
  applyController(app, isLast) {
    this.applyControllerClass(app);

    function traverseControllerClasses(node, mount, paths = []) {
      /* eslint-disable no-param-reassign */
      Object.keys(node).forEach((key) => {
        if (is.class(node[key])) {
          const controller = new node[key](app);

          let proto = controller;
          while (proto) {
            proto = Object.getPrototypeOf(proto);
            if (proto === Object.prototype) {
              break;
            }

            for (const propertyName of Object.getOwnPropertyNames(proto)) {
              if (propertyName === 'constructor') {
                continue;
              }
              const descriptor = Object.getOwnPropertyDescriptor(
                proto,
                propertyName,
              );
              if (is.function(descriptor.value)) {
                controller[propertyName] = controller[
                  propertyName
                ].bind(controller);

                Object.defineProperties(
                  controller[propertyName],
                  {
                    name: {
                      value: propertyName,
                    },
                    __kuaControllerName: {
                      value: [...paths, key]
                        .map(trunk => camelCase(trunk, {
                          pascalCase: true,
                        }))
                        .join('_'),
                    },
                  },
                );
              }
            }
          }
          mount[key] = controller;
        } else {
          mount[key] = mount[key] || {};
          traverseControllerClasses(node[key], mount[key], [
            ...paths,
            key,
          ]);
        }
      });
      /* eslint-enable no-param-reassign */
    }

    if (isLast) {
      traverseControllerClasses(app.controllerClasses, app.controller);
    }
    return this;
  }

  /**
   * 应用Service
   * @param {Object} app - Koa实例
   * @param {Boolean} isLast - 是否是最后一个组件
   */
  applyService(app, isLast) {
    this.applyServiceClass(app);

    function traverseServiceClasses(ctx, node, mount, paths = []) {
      /* eslint-disable no-param-reassign */
      Object.keys(node).forEach((key) => {
        if (is.class(node[key])) {
          Object.defineProperty(mount, key, {
            configurable: true,
            enumerable: true,
            get() {
              const cacheKey = [...paths, key].join('.');
              ctx.kuaCachedService = ctx.kuaCachedService || {};
              if (!ctx.kuaCachedService[cacheKey]) {
                ctx.kuaCachedService[cacheKey] = new node[key](ctx);
              }
              return ctx.kuaCachedService[cacheKey];
            },
          });
        } else {
          mount[key] = mount[key] || {};
          traverseServiceClasses(ctx, node[key], mount[key], [
            ...paths,
            key,
          ]);
        }
      });
      /* eslint-enable no-param-reassign */
    }

    if (isLast) {
      Object.defineProperty(app.context, 'service', {
        configurable: true,
        get() {
          const ctx = this;
          if (!ctx.kuaServiceLazyLoader) {
            ctx.kuaServiceLazyLoader = {};
            traverseServiceClasses(
              ctx,
              app.serviceClasses,
              ctx.kuaServiceLazyLoader,
            );
          }
          return ctx.kuaServiceLazyLoader;
        },
      });
    }

    return this;
  }

  /**
   * 应用路由注册器
   * @param {Object} app - Koa实例
   * @param {Boolean} isLast - 是否是最后一个组件
   */
  applyRouterRegister(app, isLast) {
    if (this.routerRegisters) {
      /* eslint-disable-next-line */
      app.routerRegisters = [
        ...app.routerRegisters,
        ...this.routerRegisters,
      ];
    }
    if (isLast) {
      app.routerRegisters.forEach((routerRegister) => {
        routerRegister(app);
      });
    }
    return this;
  }

  /**
   * 应用扩展
   * @param {Object} app - Koa实例
   */
  applyExtension(app) {
    for (const name of Object.keys(this.extensions)) {
      let extension = this.extensions[name];
      if (is.function(extension)) {
        extension = extension(app);
      }

      let proto = app;
      if (name !== 'app') {
        proto = app[name];
      }

      const properties = [
        ...Object.getOwnPropertyNames(extension),
        ...Object.getOwnPropertySymbols(extension),
      ];
      for (const property of properties) {
        const descriptor = Object.getOwnPropertyDescriptor(
          extension,
          property,
        );
        Object.defineProperty(proto, property, descriptor);
      }
    }
    return this;
  }

  /**
   * 应用Controller类
   * @param {Object} app - Koa实例
   */
  applyControllerClass(app) {
    const traverseControllerClasses = (node, mount, paths = []) => {
      /* eslint-disable no-underscore-dangle, no-param-reassign, max-len */
      Object.keys(node).forEach((key) => {
        let original = ['*/app/controller', ...paths, key].join(path.sep);
        if (is.class(mount[key])) {
          original = path.resolve(
            mount[key].__root,
            'app/controller',
            ...paths,
            key,
          );
        }
        const replacement = path.resolve(
          this.root,
          'app/controller',
          ...paths,
          key,
        );

        if (is.class(node[key])) {
          if (is.class(mount[key])) {
            app.coreLogger.warn(`[core] controller at path "${original}" is replaced by controller at path "${replacement}"`);
          } else if (is.object(mount[key])) {
            app.coreLogger.warn(`[core] all controllers under path "${original}/" is replaced by controller at path "${replacement}"`);
          }
          mount[key] = node[key];
        } else {
          if (is.class(mount[key])) {
            mount[key] = {};
            app.coreLogger.warn(`[core] controller at path "${original}" is replaced by controllers under path "${replacement}/"`);
          }
          mount[key] = mount[key] || {};
          traverseControllerClasses(node[key], mount[key], [
            ...paths,
            key,
          ]);
        }
      });
      /* eslint-enable no-underscore-dangle, no-param-reassign, max-len */
    };
    traverseControllerClasses(
      this.controllerClasses,
      app.controllerClasses,
    );
  }

  /**
   * 应用Services类
   * @param {Object} app - Koa实例
   */
  applyServiceClass(app) {
    const traverseServiceClasses = (node, mount, paths = []) => {
      /* eslint-disable no-underscore-dangle, no-param-reassign, max-len */
      Object.keys(node).forEach((key) => {
        let original = ['*/app/service', ...paths, key].join(path.sep);
        if (is.class(mount[key])) {
          original = path.resolve(
            mount[key].__root,
            'app/service',
            ...paths,
            key,
          );
        }
        const replacement = path.resolve(
          this.root,
          'app/service',
          ...paths,
          key,
        );

        if (is.class(node[key])) {
          if (is.class(mount[key])) {
            app.coreLogger.warn(`[core] service at path "${original}" is replaced by service at path "${replacement}"`);
          } else if (is.object(mount[key])) {
            app.coreLogger.warn(`[core] all services under path "${original}/" is replaced by service at path "${replacement}"`);
          }
          mount[key] = node[key];
        } else {
          if (is.class(mount[key])) {
            mount[key] = {};
            app.coreLogger.warn(`[core] service at path "${original}" is replaced by services under path "${replacement}/"`);
          }
          mount[key] = mount[key] || {};
          traverseServiceClasses(node[key], mount[key], [
            ...paths,
            key,
          ]);
        }
      });
      /* eslint-enable no-underscore-dangle, no-param-reassign, max-len */
    };
    traverseServiceClasses(this.serviceClasses, app.serviceClasses);
  }
}

module.exports = Instrument;
