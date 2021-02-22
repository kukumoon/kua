# kua-sequelize

基于`sequelize`封装的数据库插件。

## 安装

```shell script
tnpm install @kukumoon/kua-sequelize --save
```

## 使用

### 插件加载

```javascript
// config.default.js
module.exports = (app) => {
    return {
        plugin: [
            '@kukumoonkua-sequelize',
        ],
    };
}
```

### 插件配置

    - config.sequelize
        - useCLS 是否使用事务
        - lazyCreate 是否懒加载
        - customDataTypesFunc 是否自定义创建sequelize DataTypes func
        - name InstanceName 
        - host IP
        - port 端口号
        - user 用户名
        - password 密码
        - database 数据库名
        - ...见下方实例
        
        
```javascript
// config.default.js
module.exports = (app) => {
    return {
        sequelize: {
            client: {
                name: '', // 数据库名称
                username: '',      // 用户名
                password: '',      // 密码
                modelDir: path.resolve(app.root, 'app', 'model'), // 模型文件定义目录
                options: {

                    // 单机模式，直接指定IP和端口
                    host: '127.0.0.1',
                    port: 3306,

                    // 主从模式
                    replication: {
                        read: [{
                            // 直接指定IP和端口
                            host: '127.0.0.1',
                            port: 3306,

                            username: 'xxx',
                            password: 'xxx'
                        }],
                        write: {
                            // 直接指定IP和端口
                            host: '127.0.0.1',
                            port: 3306,

                            username: 'xxx',
                            password: 'xxx'
                        }
                    },
                },
            },
            customDataTypesFunc: function(Sequelize) {
                // 此处自定义 DataTypes
                // 详情见：http://docs.sequelizejs.com/manual/data-types.html#extending-datatypes
            }
        },
    };
}
```

## SequelizeGenerator相关
```js
// Sequelize Generator的全部配置内容

const sequelizeGenerator = new SequelizeGenerator({
  customDataTypesFunc,
}, app.coreLogger);

const sequelize = await sequelizeGenerator.create({
    name: 'kua_sequelize',
    username: '',
    password: '',
    modelDir: path.resolve(__dirname, 'model'), // 模型定义目录
    options: {
        replication: {
            read: [{
                host: '127.0.0.1',
                port: 3306,
                username: '',
                password: ''
            }],
            write: {
                host: '127.0.0.1',
                port: 3306,
                username: '',
                password: ''
            }
        },
    }
});
```
