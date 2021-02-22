# 目录规范

在进行框架设计之前，我们确定了目录规范，如下：

```
├── app
│   ├── controller
│   ├── service
│   ├── extension
│   │   ├── app.js
│   │   ├── context.js
│   │   ├── request.js
│   │   └── response.js
│   ├── middleware
│   ├── plugin
│   └── router.js
├── config
└── app.js

```

- `app.js`：应用启动钩子定义文件
- `config`：配置文件目录
- `app/controller`：控制器目录
- `app/service`：业务目录，用于存放可复用的业务逻辑
- `app/extension`：扩展目录，用于扩展`Koa`内置对象的功能
- `app/extension/app.js`：应用扩展定义文件，可在应用实例`app`上定义工具方法或属性
- `app/extension/context.js`：上下文扩展定义文件，可在上下文对象`ctx`上定义工具方法或属性
- `app/extension/request.js`：请求扩展定义文件，可在请求对象`request`上定义工具方法或属性
- `app/extension/response.js`：响应扩展定义文件，可在响应对象`response`上定义工具方法或属性
- `app/middleware`：中间件目录
- `app/plugin`：插件目录
- `app/router.js`：路由定义文件

对于符合目录规范的目录，我们称之为一个`Instrument`。一个`Instrument`其实就是分别在启动前后、配置、控制器 Controller、服务者 Service、扩展、中间件、插件、路由等各个不同的方面定义了应用的能力。我们可以把许多个`Instrument`都加载到`Koa`中去以增强`Koa`的能力。

顶层应用目录与插件目录都是符合目录规范的`Instrument`。`Instrument`之间存在依赖关系，比如应用会依赖插件，插件也可能会依赖其他插件。

对于框架来说，不管是应用目录还是插件目录，它们都是等价的。

框架在加载一个`Instrument`时，会分析它的依赖关系。一般情况下，我们会从应用目录开始加载，框架会从应用目录开始分析`Instrument`之间的依赖，最后得到一棵依赖树。

依赖树上的`Instrument`会被框架以后序遍历的方式依次加载到`Koa`实例上。
