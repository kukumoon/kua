# kua-graphql

graphql extension for kua.

## 安装

```shell script
npm i @kukumoon/kua-graphql
```

## 使用


```javascript
// config.default.js
module.exports = (app) => {
    return {
        plugin: [
            '@kukumoon/kua-graphql',
        ],
    };
}
```

```javascript
// config.default.js
const Mock = require('mockjs')
const { MockList } = require('graphql-tools');

module.exports = (app) => {
    return {
        graphql: {
            router: '/graphql', // GraphQL路由
            graphqlDir: 'project/server/app/graphql', // graphql代码的根目录，默认为应用的app/graphql目录, 支持多目录(传数组)
            graphiql: true, // 是否开启GraphIQL
            mocks: true, // 开启graphql内省mock，只能mock简单数据
            mocks: { // 使用mockjs来mock复杂数据
                Query: () => ({
                    topicList: () => {
                        return new MockList([2, 10], () => 
                            Mock.mock({
                                id: '@id',
                                title: '@ctitle(3, 10)',
                                type: '@integer(0,2)',
                                text: '@cparagraph',
                                createTime: '@datetime'
                            })   
                        )
                    }
                }),
                Url: () => ({
                    uri: () => Mock.Random.uuid(),
                    urlList: () => [Mock.Random.image(), Mock.Random.image()]
                })
            },
            before: (ctx, request) => {},
            after: (ctx, response) => {},
            options: {}, //ApolloServer的配置
            middlewareOptions: {}, // apollo-server-koa的中间件配置
        },
    };
}
```
`GraphIQL`默认情况下不开启，可以在开发环境配置中将其开启，在生产环境下不建议开启。`GraphIQL`的访问路由与`GraphQL`的访问路由一样。

GraphQL相关代码放置在应用的`app/graphql`目录下，目录结构如下所示：
```bash
app/graphql
├── app
│   ├── schema.graphql
│   ├── resolver.js
│   └── connector.js
├── mutation
│   └── schema.graphql
└── query
    └── schema.graphql
```

`GraphQL`子目录下可能存在以下三种文件：
- `schema.graphql`：`schema`定义文件
- `resolver.js`：`resolver`定义文件
- `connector.js`：作用相当于控制器，可在此处编写`GraphQL`相关处理逻辑

**Schema写法**
```javascript
// app/graphql/app/schema.graphql
type App {
    name: String
    thumb: String
    description: String
}
```

**Resolver写法**
```javascript
// app/graphql/app/resolver.js
module.exports = {
  Query: {
    apps: (root, args, ctx) => {
        return ctx.connector.app.queryAll();
    },
  },
};
```
`resolver`中可调用`connector`。插件在初始化的时候，会将`app/graphql`目录下的所有`connector`扩展到`context`中，因此可以通过`ctx.connector.${connector文件名的驼峰形式}`访问具体的`connector`。

**Connector写法**
```javascript
// app/graphql/app/connector.js
const { BaseContextClass } = require('@kukumoon/kua');

class AppConnector extends BaseContextClass {
    async queryAll() {
        return this.ctx.service.app.query();
    }
}

module.exports = AppConnector;
```
