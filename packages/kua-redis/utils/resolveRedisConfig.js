module.exports = (config) => {
  // 非集群配置时
  if (!config.isCluster) {
    return config.db || {};
  }

  // 若存在集群配置

  // with password
  if ({}.propertyIsEnumerable.call(config, 'redisOptions')) {
    return config.redisOptions;
  }
  // without password but with nodes options
  if ({}.propertyIsEnumerable.call(config, 'nodes')) {
    return  config.nodes;
  }
  // handle fallback options
  return {};
};
