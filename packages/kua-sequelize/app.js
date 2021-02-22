const assert = require('assert');
const cls = require('cls-hooked');
const SequelizeGenerator = require('./sequelize-generator');

module.exports = async (app) => {
  assert(
    app.config.sequelize,
    '[@kukumoon/kua-sequelize]请在kua项目配置文件中配置sequelize.config',
  );

  // 懒加载
  let lazyCreate = false;
  if (
    process.env.NODE_ENV === 'dev'
    || process.env.NODE_ENV === 'development'
    || app.config.sequelize.lazyCreate
  ) {
    lazyCreate = true;
  }

  // 事务配置
  if (app.config.sequelize.useCLS) {
    SequelizeGenerator.Sequelize.useCLS(cls.createNamespace(app.name || 'default'));
  }

  let sequelize = null;
  const options = {};

  const { client, clients } = app.config.sequelize;

  // welink 额外配置
  if (app.config.mysql && app.config.mysql.enable && app.config.mysql.database) {
    Object.keys(app.config.mysql.database).forEach((key) => {
      clients.push({
        name: app.config.mysql.database || key,
        ...app.config.mysql.database[key],
      });
    });
  }

  if (
    app.config.sequelize.customDataTypesFunc
    && typeof app.config.sequelize.customDataTypesFunc === 'function'
  ) {
    options.customDataTypesFunc = app.config.sequelize.customDataTypesFunc;
  }

  const sequelizeGenerator = new SequelizeGenerator(options, app.coreLogger);

  if (client) {
    client.options = { lazyCreate, ...client.options };
    sequelize = await sequelizeGenerator.create(client);
  }

  if (clients) {
    const promises = [];
    sequelize = sequelize || {};
    for (const name of Object.keys(clients)) {
      clients[name].options = { lazyCreate, ...clients[name].options };
      promises.push(sequelizeGenerator
        .create(clients[name])
        .then((sequelizeInstance) => {
          sequelize[name] = sequelizeInstance;
        }));
    }

    await Promise.all(promises);
  }

  assert(
    sequelize,
    '[@kukumoon/kua-sequelize]创建Sequelize实例失败',
  );

  // eslint-disable-next-line no-param-reassign
  app.model = sequelize;
  // eslint-disable-next-line no-param-reassign
  app.sequelize = sequelize;
  // eslint-disable-next-line no-param-reassign
  app.Sequelize = SequelizeGenerator.Sequelize;
};
