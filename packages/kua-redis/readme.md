# Kua-Redis

kua redis plugin.

基于ioredis开发,更进一步细致的文档可以参考[ioredis官方文档](https://github.com/luin/ioredis)

redis client实例会被挂载在`app.redis`与`ctx.redis`(`koa.context.redis`)上。


## Usage

### Parameters（extends ioRedis）
param | explain
----|----
enable | 是否启用
isCluster | 是否是集群
nodes | 集群配置
nodes.host | IP 
nodes.port | 端口
redisOptions | { password }
db | 单实例配置信息

### Examples
```js
// cluster without password
config.redis = {
  enable: true,
  isCluster: true,
  nodes: [{
    host: '127.0.0.1',
    port: 6380
  }, {
    host: '127.0.0.1',
    port: 6381
  }, {
    host: '127.0.0.1',
    port: 6382
  }, {
    host: '127.0.0.1',
    port: 6383
  }, {
    host: '127.0.0.1',
    port: 6384
  }, {
    host: '127.0.0.1',
    port: 6385
  }]
}

// cluster with password
config.redis = {
  enable: true,
  isCluster: true,
  nodes: [{
    host: '127.0.0.1',
    port: 6380
  }, {
    host: '127.0.0.1',
    port: 6381
  }, {
    host: '127.0.0.1',
    port: 6382
  }, {
    host: '127.0.0.1',
    port: 6383
  }, {
    host: '127.0.0.1',
    port: 6384
  }, {
    host: '127.0.0.1',
    port: 6385
  }],
  redisOptions: {
    password: 'your password'
  }
}

// not cluster
config.redis = {
  enable: true,
  isCluster: false,
  db: {
    port: 6379, // Redis port
    host: '127.0.0.1', // Redis host
    family: 4, // 4 (IPv4) or 6 (IPv6)
    password: 'your password',
    db: 0
  }
}
```

### 配置文件引入
1. 引入plugin
```js
// config.${env}.js
module.exports = app => ({
  plugin: [
    '@kukumoon/kua-redis',
  ]
});
```

2. redis 配置
```js
// config.${env}.js
module.exports = app => ({
  redis: {
    ...  
  } 
});
```
或者，采取离散配置的方式
```js
// redis.${env}.js
module.exports = {
    ...
}
```

**备注：welink实例配置读取，请使用kua-welink-config-connector**
