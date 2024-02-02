// 根目含有linttype的json文件，对项目进行eslint规则应用
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadFileList() {
  const data = await fs.promises.readFile(
    `${__dirname}/../allProjectsWithLinType.json`,
    "utf-8"
  );
  return JSON.parse(data);
}

// 执行具体的lint 返回结果
function runLint(lintType, lintPath) {
  let lintresult = {
    errors: 0,
    warnings: 0,
  };

  // 检查path是否存在
  if (!fs.existsSync(lintPath)) {
    return lintresult;
  }

  const res = execSync(
    `npx @afuteam/eslint-plugin-fe@latest --type=${lintType} --path=${lintPath}`,
    { encoding: "utf8" }
  );
  const errorsMatch = res.match(/Total errors:\s*(\d+)/);
  const warningsMatch = res.match(/Total warnings:\s*(\d+)/);

  if (errorsMatch && warningsMatch) {
    lintresult = {
      errors: +errorsMatch[1],
      warnings: +warningsMatch[1],
    };
  }
  return lintresult;
}

// 项目维度累计数据之和
function summarizeErrorsAndWarnings(array) {
  console.log(88888888, "\n", JSON.stringify(array, null, 2));
  return array.map((item) => {
    // 获取第一个键名作为工具集名称
    const toolsetName = Object.keys(item)[0];

    // 初始化错误和警告总数
    let totalErrors = 0;
    let totalWarnings = 0;

    // 递归函数，累加 errors 和 warnings
    function accumulateErrorsAndWarnings(info) {

      if (typeof info === "object" && info !== null) {
        const objs = Object.keys(info);
        objs.forEach((obj) => {
          const value1 = info[obj];
          if (typeof value1 === "object") {
            const value1_keys = Object.keys(value1);

            value1_keys.forEach((key) => {
              if (key === "errors") {
                totalErrors += value1[key];
              }
              if (key === "warnings") {
                totalWarnings += value1[key];
              }
              // 递归调用
              accumulateErrorsAndWarnings(value1[key]);
            });
          } else {
            if (obj === "errors") {
              totalErrors += info[obj];
            }
            if (obj === "warnings") {
              totalWarnings += info[obj];
            }
          }
        });
      }
    }

    // 从 AFULintType 属性开始递归遍历
    accumulateErrorsAndWarnings(item);

    // 构建结果对象
    const summary = {
      [toolsetName]: {
        errors: totalErrors,
        warnings: totalWarnings,
      },
    };
    return summary;
  });
}

// 返回 error warn数
function lintProject(project) {
  const { AFULintType, name } = project;
  const alllintresult = {
    [`${name}`]: {},
  };
  const AFULintTypeKeys = Object.keys(AFULintType);

  const repositoryPath = path.join(
    __dirname,
    "../../../afu/afu-all-projects/",
    name
  );

  // 标准的 根目录有 package.json 和 src的项目，只有root一个值
  if (AFULintTypeKeys.length === 1 && AFULintTypeKeys.includes("root")) {
    const lintRelativePath = repositoryPath + "/src";
    const res = runLint(AFULintType.root, lintRelativePath);
    alllintresult[name] = res;
  }

  function lastCeng(keys, curType, curRepoName, curPath) {
    keys.forEach((key) => {
      let lintRelativePath = curPath + `/${key}`;
      const lintRelativePathSrc = lintRelativePath + '/src'

      // src目录，有就用，没有就不用
      if(fs.existsSync(lintRelativePathSrc)) {
        lintRelativePath = lintRelativePathSrc
      }

      const curTypeKey = curType[key];

      if (typeof curTypeKey === "string") {
        const res = runLint(curTypeKey, lintRelativePath);
        alllintresult[curRepoName][key] = res;
      }

      if (typeof curTypeKey === "object") {
        lastCeng(
          Object.keys(curTypeKey),
          curTypeKey,
          curRepoName,
          lintRelativePath
        );
      }
    });
  }

  if (AFULintTypeKeys.length > 0) {
    lastCeng(AFULintTypeKeys, AFULintType, name, repositoryPath);
  }

  return alllintresult;
}

async function lintAllProject() {
  const allProjects = await loadFileList();

  console.log(`共有项目 ${allProjects.length} 个`, "\n");

  if (allProjects && allProjects.length > 0) {
    const allData = [];

    allProjects.forEach((project, index) => {
      const projectLintData = lintProject(project);
      console.log(
        `已完成 ${index + 1}/${allProjects.length} : ${
          project.name
        } \n ${JSON.stringify(projectLintData)} \n`
      );
      allData.push(projectLintData);
    });

    // 计算所有的结果
    if (allData && allData.length > 0) {
      console.log("开始计算最终结果...\n");
      const finalData = summarizeErrorsAndWarnings(allData);

      fs.writeFileSync(
        "allProjectsLintResult.json",
        JSON.stringify(finalData, null, 2)
      );

      console.log(`计算最终结果完毕, 结果输出在 allProjectsLintResult.json \n`);
    }
  }
}

lintAllProject();
