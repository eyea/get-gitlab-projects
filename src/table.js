// 控制台输出 结果的 table
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadFileList() {
  const data = await fs.promises.readFile(
    `${__dirname}/../allProjectsLintResult.json`,
    "utf-8"
  );
  return JSON.parse(data);
}

// 函数将原始数据转换为 console.table 友好的格式
function transformDataForTable(dataArray) {
  return dataArray.map(entry => {
    const Prpject = Object.keys(entry)[0];
    return {
      Prpject: Prpject,
      Errors: entry[Prpject].errors,
      Warnings: entry[Prpject].warnings,
      Total: entry[Prpject].errors + entry[Prpject].warnings
    };
  });
}


async function generaTable() {
  const allProjects = await loadFileList();

  // 转换数据
  const tableData = transformDataForTable(allProjects);
  console.table(tableData);

}
generaTable()