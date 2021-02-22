# 配置文件 - 应用的核心

## 命名
配置文件由默认配置和环境配置组成。默认配置的文件名以`default.js`结尾，环境配置的文件名以`${env}.js`结尾。

`Kua`支持两种配置方式：整合性配置和开放式配置。它们的文件命名方式分别如下：
整合式配置：`config.${env}.js`
开放式配置：`${配置项key}.${env}.js`

整合式配置会把配置项都收拢到一个文件里面，在项目配置比较简单的时候，可以采用这种方式。

开放式配置会以配置项的`key`作为文件名，配置项的`value`作为文件内容，这样可以将配置打散到不同的文件中，在项目配置比较复杂的时候，可以采用这种方式。

配置加载的时机是在各个`Instruments`已经装载之后，`Kua`实例启动之前，因此可以通过攥写`plugin`的方式来对应用配置进行覆写以满足更复杂的业务逻辑。

### 整合式配置
```
├── config
|   ├── config.default.js
|   ├── config.dev.js
|   ├── config.prod.js
└── └── config.test.js
```

### 开放式配置
```
├── config
|   ├── redis.default.js
|   ├── redis.dev.js
|   ├── redis.prod.js
└── └── redis.test.js
```

## 配置写法
**方法一：导出配置生成函数，适用于动态配置**
```js
module.exports = (app) => {
    return {
        middleware: [
            'koa-body',
        ],
        plugin: [
            '@kukumoon/kua-redis',
        ],
        koaBody: {
        },
    };
}
```

**方法二：导出配置对象，适用于静态配置**
```js
module.exports = {
    middleware: [
        'koa-body',
    ],
    plugin: [
        '@kukumoon/kua-redis',
    ],
    koaBody: {
    },
};
```

## 优先级
- 环境配置 > 默认配置
- 开放式配置 > 整合式配置

框架加载`Instrument`时会按优先级对配置进行深度合并。

应用启动前，框架会按顺序将所有`Instrument`的配置进行深度合并，然后挂载到`app`实例上。在`Kua`应用内部，可以通过`app.config`访问配置。
