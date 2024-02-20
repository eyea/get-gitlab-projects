// 根目含有linttype的json文件，对项目进行eslint规则应用
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { execSync } from "child_process";
import Tools from "./utils/index.js"

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
  let lintresult = {};

  // 检查path是否存在
  if (!fs.existsSync(lintPath)) {
    return lintresult;
  }

  // 增加缓冲区大小到10MB
// const options = { stdio: 'inherit', maxBuffer: 1024 * 1024 * 10 };
  const res = execSync(
    `npx @afuteam/eslint-plugin-fe@latest --type=${lintType} --path=${lintPath}`,
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 10 }
  );
  console.log(res);
  const errorsMatch = res.match(/Total errors:\s*(\d+)/);
  const warningsMatch = res.match(/Total warnings:\s*(\d+)/);
  const totalBlankLines = res.match(/Total totalBlankLines:\s*(\d+)/) || 0;
  const totalCommentLines = res.match(/Total totalCommentLines:\s*(\d+)/) || 0;
  const totalCodeLines = res.match(/Total totalCodeLines:\s*(\d+)/) || 0;

  if (errorsMatch && warningsMatch) {
    lintresult = {
      errors: +errorsMatch[1],
      warnings: +warningsMatch[1],
      total: +errorsMatch[1] + +warningsMatch[1],
      blankLines: +totalBlankLines[1],
      commentLines: +totalCommentLines[1],
      codeLines: +totalCodeLines[1],
    };
  }

  return lintresult;
}

// 项目维度累计数据之和
function summarizeErrorsAndWarnings(array) {

  return array.map((item) => {
    // 获取第一个键名作为工具集名称
    const toolsetName = Object.keys(item)[0];

    // 初始化错误和警告总数
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalBlankLines = 0;
    let totalCommentLines = 0;
    let totalCodeLines = 0;

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
              if (key === "blankLines") {
                totalBlankLines += value1[key];
              }
              if (key === "commentLines") {
                totalCommentLines += value1[key];
              }
              if (key === "codeLines") {
                totalCodeLines += value1[key];
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

            if (obj === "blankLines") {
              totalBlankLines += info[obj];
            }
            if (obj === "commentLines") {
              totalCommentLines += info[obj];
            }
            if (obj === "codeLines") {
              totalCodeLines += info[obj];
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
        total: totalErrors + totalWarnings,
        blankLines: totalBlankLines,
        commentLines: totalCommentLines,
        codeLines: totalCodeLines,
        created_at: item.created_at || '',
        last_activity_at: item.last_activity_at || '',
        id: item.id || ''
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

  // 标准的 根目录有 package.json
  if (AFULintTypeKeys.length === 1 && AFULintTypeKeys.includes("root")) {
    let lintRelativePath = repositoryPath + "/src";

    if(!fs.existsSync(lintRelativePath)) {
      lintRelativePath = repositoryPath + "/";
    }

    const res = runLint(AFULintType.root, lintRelativePath);
    alllintresult[name] = res;

    return alllintresult;
  }

  // 根目录 package.josn， 是 uniapp的
  if (AFULintTypeKeys.length === 1 && AFULintTypeKeys.includes("root_uniappp")) {
    const lintRelativePath = repositoryPath + "/";
    const res = runLint(AFULintType.root_uniappp, lintRelativePath);
    alllintresult[name] = res;

    return alllintresult;

  }

  function handleCommonFileStruc(keys, curType, curRepoName, curPath) {
    keys.forEach((key) => {

      let lintRelativePath = curPath;
      let lintRelativePathKey = curPath + `/${key}`;
      const lintRelativePathSrc = lintRelativePathKey + '/src'

      // src目录，有就用，没有就不用
      if(fs.existsSync(lintRelativePathSrc)) {
        lintRelativePath = lintRelativePathSrc
      }

      // 如果key的目录存在，就用，不存在就当前路径计算
      if(fs.existsSync(lintRelativePathKey)) {
        lintRelativePath = lintRelativePathKey
      }

      const curTypeKey = curType[key];

      if (typeof curTypeKey === "string") {
        const res = runLint(curTypeKey, lintRelativePath);
        alllintresult[curRepoName][key] = res;
      }

      if (typeof curTypeKey === "object") {
        handleCommonFileStruc(
          Object.keys(curTypeKey),
          curTypeKey,
          curRepoName,
          lintRelativePath
        );
      }
    });
  }

  if (AFULintTypeKeys.length > 0) {
    handleCommonFileStruc(AFULintTypeKeys, AFULintType, name, repositoryPath);
  }

  return alllintresult;
}

async function lintAllProject() {
  const allProjects = await loadFileList();

  console.log(`共有项目 ${allProjects.length} 个`, "\n");

  if (allProjects && allProjects.length > 0) {
    const allData = [];

    allProjects.forEach((project, index) => {
      let projectLintData = lintProject(project);
      const { id, created_at, last_activity_at, name, web_url } = project;

      projectLintData = {
        ...projectLintData,
        id, created_at, last_activity_at, name, web_url
      }

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

       // 指定目录写入结果文件
      Tools.writeRes2SomePath('allProjectsLintResultDetail.json', allData)

      console.log(`计算最终结果完毕, 结果输出在 allProjectsLintResultDetail.json \n`);

      const finalData = summarizeErrorsAndWarnings(allData);

      // 指定目录写入结果文件
      fs.writeFileSync(
        "allProjectsLintResult.json",
        JSON.stringify(finalData, null, 2)
      );

      Tools.writeRes2SomePath('allProjectsLintResult.json', finalData)

      console.log(`计算最终结果完毕, 结果输出在 allProjectsLintResult.json \n`);
    }
  }
}

lintAllProject();
