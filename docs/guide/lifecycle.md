# 生命周期
> 在某些场景下，我们需要在Kua启动前后去做一些事情，这时可以在`app.js`文件中编写相应的钩子去实现。

```javascript
// app.js
module.exports = {
    async beforeStart(app) {
	    // 应用启动前逻辑
    },
    async afterStart(app) {
        // 应用启动后逻辑
    }
}
```

