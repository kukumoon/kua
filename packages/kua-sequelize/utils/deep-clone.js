/**
 *
 * @param obj 深度克隆
 */
function deepClone(obj) {
  let o;
  switch (typeof obj) {
    case 'undefined':
      break;
    case 'string':
      o = `${obj}`;
      break;
    case 'number':
      o = obj - 0;
      break;
    case 'boolean':
      o = obj;
      break;
    case 'object':
      if (obj === null) {
        o = null;
      } else {
        if (Object.prototype.toString.call(obj).slice(8, -1) === 'Array') {
          o = [];
          for (let i = 0; i < obj.length; i++) {
            o.push(deepClone(obj[i]));
          }
        } else {
          o = {};
          Object.keys(obj).map((k) => {
            o[k] = deepClone(obj[k]);
          });
        }
      }
      break;
    default:
      o = obj;
      break;
  }
  return o;
}
module.exports = deepClone;
