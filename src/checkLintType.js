// 检测项目的lint类型，更新到 allProjects.json
// 计算项目根目录的 package.json
// lint 是对 src目录下的文件进行

import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadFileList() {
  const data = await fs.promises.readFile(`${__dirname}/../allProjects.json`, 'utf-8');
  return JSON.parse(data);
}

function findFilePath(startPath, name = "package.json") {
  const packageJsonPath = path.join(startPath, name);
  if (fs.existsSync(packageJsonPath)) {
    return packageJsonPath;
  }

  // Check if client and server directories exist
  const clientPath = path.join(startPath, "client");
  const serverPath = path.join(startPath, "server");

  if (fs.existsSync(clientPath)) {
    const packageJsonPathInClient = findFilePath(clientPath, name);
    if (packageJsonPathInClient) {
      return packageJsonPathInClient;
    }
  }

  if (fs.existsSync(serverPath)) {
    const packageJsonPathInServer = findFilePath(serverPath, name);
    if (packageJsonPathInServer) {
      return packageJsonPathInServer;
    }
  }

  const files = fs.readdirSync(startPath);
  if (files) {
    for (const file of files) {
      if (!file) return null;
      const filePath = path.join(startPath, file);
      if (!filePath || filePath.includes("/node_modules/")) return null;
      if (fs.statSync(filePath).isDirectory()) {
        const packageJsonPath = findFilePath(filePath, name); // 递归查找子目录的 package.json 文件
        if (packageJsonPath) {
          return packageJsonPath; // 如果找到了 package.json 文件，则返回该路径
        }
      }
    }
  }

  return null; // 如果在当前路径及其子目录中都未找到 package.json 文件，则返回null
}


function detectProjectType(directoryPath) {
  const packageJsonPath = findFilePath(directoryPath, "package.json");
  const tsconfigFilePath = findFilePath(directoryPath, "tsconfig.json");

  let lastType = 'js'

  // 检查 package.json 文件是否存在
  if (fs.existsSync(packageJsonPath)) {
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    lastType = fs.existsSync(tsconfigFilePath) ? 'ts' : 'js'

    // 检查 package.json 文件中的依赖
    if(packageJson.dependencies) {
      if (packageJson.dependencies.react || packageJson.dependencies['react-native-webview']) {
        lastType = 'react-' + lastType;
      } else if (packageJson.dependencies['vue']) {
          if (packageJson.dependencies['vue'].startsWith('^3.')) {
            lastType = 'vue3-' + lastType;
          } else {
            lastType = 'vue2-' + lastType;
          }
      }
    }

    if(packageJson.devDependencies) {
      if (packageJson.devDependencies.react || packageJson.devDependencies['react-native-webview']) {
        lastType = 'react-' + lastType;
      } else if (packageJson.devDependencies['vue']) {
          if (packageJson.devDependencies['vue'].startsWith('^3.')) {
            lastType = 'vue3-' + lastType;
          } else {
            lastType = 'vue2-' + lastType;
          }
      }
    }

    return lastType;

  } else {
    console.log(
      "package.json not found in the specified directory.",
      directoryPath
    );
    return lastType;
  }
}

function updateProjectLint(repositories) {
  const result = []
  for (const repositoryInfo of repositories) {
    const { name } = repositoryInfo;

    const repositoryPath = path.join(
      __dirname,
      '../../../afu/afu-all-projects-demo/',
      name
    );

    if (fs.existsSync(repositoryPath)) {
      const type = detectProjectType(repositoryPath);
      console.log(name, type);
      repositoryInfo.AFULintType = type;
      result.push(repositoryInfo);
    }

  }

  return result;

}

async function checkLintType() {
  const allProjects = await loadFileList();

  const getTypeAllProjects = updateProjectLint(allProjects)

  fs.writeFileSync(
    "allProjects.json",
    JSON.stringify(getTypeAllProjects, null, 2)
  );

  console.log('allProjects.json 已经添加AFULintType字段 用于lint规则使用依据 \n');

}

checkLintType();
