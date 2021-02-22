## 写法

```javascript
// app/router.js
module.exports = (app) => {
    const { router, controller } = app;
    
    router.get('/app', controller.app.query);
    router.get('/', controller.index.index);
}
```

`router`就是常用的`koa-router`实例。

如果路由规则比较多，需要按业务模块分组管理，可以创建一个`app/router`目录，在该目录下按业务模块编写路由文件，框架会自动加载执行`app/router`目录下的文件。