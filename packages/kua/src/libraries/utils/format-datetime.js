// 转换时间戳to日期格式
const formatDatetime = (timestamp) => {
  // eslint-disable-next-line no-param-reassign
  timestamp = new Date(timestamp);
  return `${timestamp.getFullYear()}-${String((timestamp.getMonth() + 1))
    .padStart(2, '0')}-${String(timestamp.getDate())
    .padStart(2, '0')} ${String(timestamp.getHours())
    .padStart(2, '0')}:${String(timestamp.getMinutes())
    .padStart(2, '0')}:${String(timestamp.getSeconds())
    .padStart(2, '0')}`;
};

module.exports = formatDatetime;
