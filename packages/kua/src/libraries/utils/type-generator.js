/* eslint-disable no-underscore-dangle */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const camelCase = require('camelcase');
const is = require('is-type-of');

class TypeGenerator {
  constructor(app, options = {}) {
    this.app = app;
    this.src = options.src || '';
    this.typeDir = options.typeDir || '';
    this.enable = options.enable !== false;
  }

  /**
     * 生成类型定义
     */
  generateTypes() {
    if (!this.enable || this.app.instruments.length <= 0) {
      return this;
    }
    const appInstrument = this.app.instruments[this.app.instruments.length - 1];

    this.src = this.src || appInstrument.root;
    this.typeDir = this.typeDir
      ? path.resolve(this.typeDir, 'auto-generated')
      : path.resolve(this.src, 'typings/auto-generated');

    rimraf.sync(this.typeDir);
    mkdirp.sync(this.typeDir);

    this.generateBuiltinClassTypes('Controller')
      .generateBuiltinClassTypes('Service')
      .generatePluginTypes()
      .generateExtensionTypes()
      .generateConfigTypes()
      .generateIndexTypes();
    return this;
  }

  /**
     * 生成 index.d.ts，导入所有的类型定义文件
     */
  generateIndexTypes() {
    const filePath = path.resolve(this.typeDir, 'index.d.ts');
    const fileContent =            `${['config', 'controller', 'extension', 'plugin', 'service']
      .map(name => `import "./${name}"`)
      .join(';\n')};`;

    fs.writeFileSync(filePath, fileContent, { encoding: 'utf8' });
    return this;
  }

  /**
     * 生成插件类型定义
     * @return {TypeGenerator}
     */
  generatePluginTypes() {
    // 只引入通过npm包安装的plugin
    const pluginImports = this.app.instruments
      .slice(0, -1)
      .filter(instrument => instrument.pkg)
      .map(instrument => `import '${instrument.pkg.name}'`);

    fs.writeFileSync(
      path.resolve(this.typeDir, 'plugin.d.ts'),
      pluginImports.join('\n'),
      { encoding: 'utf8' },
    );
    return this;
  }

  /**
     * 生成Controller或Service的类型定义
     * @param {String} classType - 类型：Controller|Service
     * @return {TypeGenerator}
     */
  generateBuiltinClassTypes(classType) {
    assert(
      classType === 'Controller' || classType === 'Service',
      `invalid classType: ${classType}`,
    );

    const isController = classType === 'Controller';
    const classDir = path.resolve(
      this.src,
      'app',
      isController ? 'controller' : 'service',
    );
    const imports = [];
    const hubs = [];

    const traverseClasses = (mount, hubName, paths = []) => {
      const hub = {
        name: hubName,
        properties: [],
      };
      hubs.push(hub);

      Object.keys(mount).forEach((key) => {
        const node = mount[key];
        const nextPaths = [...paths, key];
        const camelCasePath = nextPaths
          .map(p => camelCase(p, { pascalCase: true }))
          .join('');
        if (is.class(node)) {
          const basename = path.basename(
            node.__fileName,
            path.extname(node.__fileName),
          );
          const importName = `${camelCasePath}${classType}`;
          const importAbPath = path.resolve(
            node.__root,
            [classDir, ...paths, basename].join('/'),
          );
          const importRePath = path.relative(
            this.typeDir,
            importAbPath,
          );
          hub.properties.push({
            key,
            type: importName,
          });
          imports.push(`import ${importName} from '${importRePath}';`);
        } else if (is.object(node)) {
          const newHubName = `${classType}Hub${camelCasePath}`;
          hub.properties.push({
            key,
            type: newHubName,
          });
          traverseClasses(node, newHubName, [...paths, key]);
        }
      });
    };
    traverseClasses(
      this.app[isController ? 'controllerClasses' : 'serviceClasses'],
      `${classType}Hub`,
    );

    const hubDefs = hubs.map((hub) => {
      const properties = hub.properties
        .map(p => `\t\t${p.key}: ${p.type};`)
        .join('\n');
      return `\tinterface ${hub.name} {\n${properties}\n\t}`;
    });
    fs.writeFileSync(
      path.resolve(
        this.typeDir,
        `${isController ? 'controller' : 'service'}.d.ts`,
      ),
      [
        imports.join('\n'),
        'declare module \'kua\' {',
        hubDefs.join('\n'),
        '}',
      ].join('\n'),
      { encoding: 'utf8' },
    );
    return this;
  }

  /**
     * 生成扩展类型定义
     * @return {TypeGenerator}
     */
  generateExtensionTypes() {
    const extensionDir = path.resolve(this.src, 'app/extension');
    if (!fs.existsSync(extensionDir)) {
      return this;
    }

    const interfaces = {
      app: 'Application',
      context: 'Context',
      request: 'Request',
      response: 'Response',
    };

    const extensionImports = [];
    const extensionInterfaceDefs = [];
    fs.readdirSync(extensionDir).forEach((filename) => {
      const basename = path.basename(
        path.basename(filename),
        path.extname(filename),
      );
      if (!interfaces[basename]) {
        return;
      }

      const importName = basename;
      const importAbPath = path.resolve(extensionDir, basename);
      const importRePath = path.relative(this.typeDir, importAbPath);
      extensionImports.push(`import ${importName} from '${importRePath}'`);
      extensionInterfaceDefs.push(`\tinterface ${
        interfaces[importName]
      } extends UnpackExt<typeof ${importName}>{}`);
    });
    fs.writeFileSync(
      path.resolve(this.typeDir, 'extension.d.ts'),
      [
        extensionImports.join('\n'),
        'type UnpackExt<T> = T extends Function ? ReturnType<T> : T;',
        'declare module \'kua\' {',
        extensionInterfaceDefs.join('\n'),
        '}',
      ].join('\n'),
      { encoding: 'utf8' },
    );
    return this;
  }

  /**
     * 生成配置类型定义
     * @return {TypeGenerator}
     */
  generateConfigTypes() {
    const configDir = path.resolve(this.src, 'config');
    if (!fs.existsSync(configDir)) {
      return this;
    }

    const env = process.env.NODE_ENV;
    const configImports = [];
    const configTypes = [];

    fs.readdirSync(configDir).forEach((filename) => {
      const basename = path.basename(filename, path.extname(filename));
      const reg = /^([^.]+)\.([^.]+)\.([^.]+)$/;
      const match = reg.exec(filename);
      if (!match || (match[2] !== 'default' && match[2] !== env)) {
        return;
      }
      const importName = `${match[2]}${match[1]}`;
      const importAbPath = path.resolve(configDir, basename);
      const importRePath = path.relative(this.typeDir, importAbPath);
      configImports.push(`import ${importName} from '${importRePath}'`);
      configTypes.push(`UnpackConfig<typeof ${importName}>`);
    });
    fs.writeFileSync(
      path.resolve(this.typeDir, 'config.d.ts'),
      [
        configImports.join('\n'),
        'type UnpackConfig<T> = T extends Function ? ReturnType<T> : T;',
        'declare module \'kua\' {',
        `\tinterface Config extends ${configTypes.join(',')} {}`,
        '}',
      ].join('\n'),
      { encoding: 'utf8' },
    );
    return this;
  }
}

module.exports = TypeGenerator;
