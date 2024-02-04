
import path from 'path';
import fs from 'fs';
const ResDirPath = '/Users/wangxudong/sh-scripts/afuLints/lintResults/';

function getFormattedDate() {
  const date = new Date();

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份从0开始计数
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${year}-${month}-${day}-${hours}-${minutes}`;
}

function writeRes2SomePath(fileName, data) {
  // 目标文件夹路径
  const dirPath = ResDirPath;

  // 确保目标文件夹存在，如果不存在就创建它
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // 目标文件完整路径
  // filename 加个时间 日期-小时-分
  const name = getFormattedDate() + '-' + fileName;
  const filePath = path.join(dirPath, name);

  // 写入文件
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2)
  );
}

export default {
  getFormattedDate,
  writeRes2SomePath
};
