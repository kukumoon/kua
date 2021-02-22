# 中间件

> 有时我们需要去撰写`Koa`中间件来处理请求上下文：

## 使用
```js
// config.${env}.js
module.exports = {
    middleware: [
        'koa-body', // name
    ],
    koaBody: {
	    // config for middleware
    },
};
```
如果需要给中间件传配置参数，可以应用配置中添加配置项，配置项的`key`中间件名称的驼峰形式，配置项的值为要传的参数。

中间件必须符合以下两种形式之一：
- `(options) => {}`
- `(options, app) => {}`
其中，`options`为对象，`app`为应用实例。

因此第三方中间件需要通过移植方能正常使用。


## 查找
框架在加载中间件时，会按以下顺序查找：
- 当前`Instrument`的`app/middleware`目录
- 当前`Instrument`的`node_modules`目录
- 应用目录的`node_modules`目录

## 中间件的启用和禁用

- 全局控制
```js
module.exports = {
    enableMiddleware: (ctx, middleware) => {
        // 动态逻辑
        return true;
    }
};
```

- 控制部分中间件
```js
module.exports = {
    middleware: [
        {
            name: 'foo',
            enable: (ctx, middleware) => {
                // 动态逻辑
                return true;
            }
        },
    ],    
};
```