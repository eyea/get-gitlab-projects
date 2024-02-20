
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Tools from "./utils/index.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadFileList() {
  const data = await fs.promises.readFile(`${__dirname}/../allProjects.json`, 'utf-8');
  return JSON.parse(data);
}

function findFilePath(startPath, name = "") {
  const filePath = path.join(startPath, name);
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  return null; // 如果在当前路径及其子目录中都未找到 package.json 文件，则返回null
}


// 读取package.json内容  返回是 vue2 vue3 和 react
function readPackageJson(directoryPath) {

  const packageJsonPath = findFilePath(directoryPath, "package.json");

  if(!packageJsonPath) {
    return ''
  }

  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");

  let packageJson = {}
  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    console.error(`\n读取目录 ${directoryPath} 下的 package.json 文件内容异常: `, error);
  }

  return packageJson

}


// AFULintType 字段返回多级
function detectProjectType(directoryPath) {
  const rootHasPkg = fs.existsSync(path.join(directoryPath, 'package.json'))

  if (rootHasPkg) {
    const scripts = readPackageJson(directoryPath).scripts
    if(scripts && scripts.release){
      return true
    } else {
      return false
    }
  }

  return false


}

function updateProjectLint(repositories) {
  const result = []

  for (const repositoryInfo of repositories) {
    const { name, web_url } = repositoryInfo;

    const repositoryPath = path.join(
      __dirname,
      '../../../afu/afu-all-projects/',
      name
    );

    if (fs.existsSync(repositoryPath)) {
      const hasReleaseCmd = detectProjectType(repositoryPath)
      result.push({
        name,
        hasReleaseCmd,
        web_url
      })
    }

  }

  return result;

}


async function checkLintType() {
  const allProjects = await loadFileList();

  console.log('项目共有 ',allProjects.length)

  let result = updateProjectLint(allProjects)
  result.filter(item => item.hasReleaseCmd)
  // console.log('项目类型检测结果: ', result)
  Tools.writeRes2SomePath('wowwowow.json', result)

}

checkLintType();
