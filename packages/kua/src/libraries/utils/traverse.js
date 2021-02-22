/**
 * 遍历树
 * @param {Object} tree - 树根节点
 * @return {Array} - 树的遍历结果
 */
const traverse = (tree) => {
  const nodes = [];
  const dependencies = tree.dependencies || [];
  for (const dependency of dependencies) {
    nodes.push(...traverse(dependency));
  }
  nodes.push(tree);
  return nodes;
};

module.exports = traverse;
