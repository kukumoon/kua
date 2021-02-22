# Kua-Logger - 日志处理

> 日志对于 Web 开发的重要性毋庸置疑，它对于监控应用的运行状态、问题排查等都有非常重要的意义。

可以引入本模块来获得这些能力。

## 主要特性：

- logger分类：`coreLogger` / `appLogger` / `contextLogger` 
- 日志分级
- 启动日志和运行日志分离
- 自定义日志
- 多进程日志
- 自动切割日志

## 安装

```shell script
npm install --save @kukumoon/kua-logger
``` 

## 配置

在配置文件中添加`kua-logger` ：`config.${env}.js`

```js
module.exports = app => ({
  middleware: [],
  plugin: [
    '@kukumoon/kua-logger',
  ],
});

```
