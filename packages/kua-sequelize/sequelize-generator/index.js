// 引入sequelize
const sequelize = require('sequelize');
const path = require('path');
const assert = require('assert');
const fs = require('fs');
const deepClone = require('../utils/deep-clone');
const uppercamelcase = require('uppercamelcase');
const clsHooked = require('cls-hooked');

const { Model } = sequelize;

Object.assign(Model, {
  insertOrUpdate: Model.upsert,
  find: Model.findOne,
  findAndCount: Model.findAndCountAll,
  findOrInitialize: Model.findOrBuild,
  updateAttributes: Model.update,
  findById: Model.findByPk,
  findByPrimary: Model.findByPk,
  all: Model.findAll,
  hook: Model.addHook,
  Op: sequelize.Sequelize.Op,
});

exports.defaultMysqlOptions = {
  dialect: 'mysql',
  define: {
    freezeTableName: true,
    timestamps: true,
  },
  timezone: '+08:00',
  logging: false,
  pool: {
    max: 100,
  },
  lazyCreate: false,
};

class SequelizeGenerator {
  constructor(options = {}, logger) {
    if (options.customDataTypesFunc) {
      this.customDataTypesFunc = options.customDataTypesFunc;
    }
    assert(logger, '[@kukumoon/kua-sequelize]插件需要传入kua的logger对象方可正常使用');
    this.logger = logger;
  }

  /**
   * 创建 Sequelize 实例
   */
  async create(config) {
    // 加载用户自定义 DataTypes
    if (this.customDataTypesFunc) {
      await this.customDataTypesFunc(sequelize.Sequelize);
    }
    return await this.createSequelize(config);
  }

  async createSequelize(config) {
    const sqlConfig = deepClone(config);
    const { options } = sqlConfig;
    if (options.replication) {
      const { read, write } = this.sequelizeValidate(options).replication;
      const readClients = [];
      for (let i = 0; i < read.length; i++) {
        const item = read[i];
        readClients.push(item);
      }
      options.replication = {
        read: readClients,
        write,
      };
    }
    sqlConfig.options = Object.assign(Object.assign({}, exports.defaultMysqlOptions), options);
    const sequelizeInstance = new sequelize.Sequelize(
      sqlConfig.name,
      sqlConfig.username,
      sqlConfig.password,
      sqlConfig.options,
    );
    this.sequelizeAssociateModel(sequelizeInstance, sqlConfig);
    if (!options.lazyCreate) {
      await sequelizeInstance.authenticate();
    }
    return sequelizeInstance;
  }

  /**
   * 对主从模式中 replication 的 read / write 进行校验
   * @param options
   */
  sequelizeValidate(options) {
    const { read, write } = options.replication;
    if (!read
      || Object.prototype.toString.call(read).slice(8, -1) !== 'Array') {
      throw new Error('[@kukumoon/kua-sequelize]Sequelize主从结构中读(replication.read)结构必须为数组');
    }
    if (!write
      || Object.prototype.toString.call(write).slice(8, -1) !== 'Object') {
      throw new Error('[@kukumoon/kua-sequelize]Sequelize主从结构中写(replication.write)结构必须为对象');
    }
    return options;
  }

  sequelizeAssociateModel(sequelizeInstance, config) {
    if (config.modelDir) {
      const { modelDir } = config;
      const models = [];
      // 目前在 npm test 的时候，require.extensions 是 {}，所以特殊处理一下
      const isJestTest = process.env.NODE_ENV === 'test';
      fs.readdirSync(modelDir).forEach((file) => {
        if (isJestTest || require.extensions[path.extname(file)]) {
          const model = sequelizeInstance.import(path.resolve(modelDir, file));
          // eslint-disable-next-line no-param-reassign
          sequelizeInstance[uppercamelcase(model.name)] = model;
          // 判断是否符合模型定义
          if (!(Object.getPrototypeOf(model) === Model)) {
            this.logger.warn('[@kukumoon/kua-sequelize] 文件 %s 并不符合Sequelize Model的定义规范', file);
          }
          models.push(model);
        }
      });

      // 挂载在sequelize Instance上
      models.forEach((model) => {
        if (model.associate) {
          model.associate(sequelizeInstance);
        }
      });
    }
  }

  useCLS(namespace = 'default') {
    sequelize.Sequelize.useCLS(clsHooked.createNamespace(namespace));
  }
}

module.exports = SequelizeGenerator;
