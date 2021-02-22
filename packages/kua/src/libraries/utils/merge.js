const deepmerge = require('deepmerge');

module.exports = (...args) => deepmerge.all(args, {
  arrayMerge: (dest, src) => src,
});
