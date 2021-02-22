# 扩展

在某些场景下，我们希望在应用实例、上下文实例、请求实例或者响应实例上挂载一些工具方法以便使用，这个时候可以使用框架提供的扩展功能。扩展定义放置在`app/extension`目录下。
 - `app/extension/app.js`：应用扩展
 - `app/extension/context.js`：上下文扩展
 - `app/extension/request.js`：请求扩展
 - `app/extension/response.js`： 响应扩展

## 写法
**方法一：导出扩展生成函数，适用于动态扩展**
```javascript
module.exports = (app) => {
    return {
        get test() {
            return 'test';
        }
    };
}
```

**方法二：导出扩展对象，适用于静态扩展**
```
module.exports = {
	get test() {
	    return 'test';
    }
};
```
框架会将导出的返回的对象合并到目标扩展对象的原型上。