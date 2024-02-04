// 检测项目的lint类型，更新到 allProjects.json
// 计算项目根目录的 package.json
// lint 是对 src目录下的文件进行

import path from 'path';
import fs from 'fs';
import YAML from 'yamljs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import BlackFileList from '../configs/BlackFileList.js'
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

  // Check if client and server directories exist
  // const clientPath = path.join(startPath, "client");
  // const serverPath = path.join(startPath, "server");

  // if (fs.existsSync(clientPath)) {
  //   const packageJsonPathInClient = findFilePath(clientPath, name);
  //   if (packageJsonPathInClient) {
  //     return packageJsonPathInClient;
  //   }
  // }

  // 只计算 client的  server过滤
  // if (fs.existsSync(serverPath)) {
  //   const packageJsonPathInServer = findFilePath(serverPath, name);
  //   if (packageJsonPathInServer) {
  //     return packageJsonPathInServer;
  //   }
  // }

  // 这里不用递归了，每层可能有多个同级的
  // const files = fs.readdirSync(startPath);
  // if (files) {
  //   for (const file of files) {
  //     if (!file) {return null;}
  //     const filePath = path.join(startPath, file);
  //     if (!filePath || filePath.includes("/node_modules/")) {return null;}
  //     if (fs.statSync(filePath).isDirectory()) {
  //       const packageJsonPath = findFilePath(filePath, name); // 递归查找子目录的 package.json 文件
  //       if (packageJsonPath) {
  //         return packageJsonPath; // 如果找到了 package.json 文件，则返回该路径
  //       }
  //     }
  //   }
  // }

  return null; // 如果在当前路径及其子目录中都未找到 package.json 文件，则返回null
}


// 获取指定目录下的文件夹列表
function getDirectories(directoryPath) {
  try {
    const items = fs.readdirSync(directoryPath);
    let directories = [];
    for (let item of items) {
      const fullPath = path.join(directoryPath, item);
      if (fs.statSync(fullPath).isDirectory()) {
        directories.push(item);
      }
    }
    // 根据需要，过滤掉黑名单中的文件夹 以及一些 以 . 开头的
    directories = directories.filter(v => !BlackFileList.includes(v)).filter(v => !v.startsWith('.'));

    return directories;
  } catch(err) {
    // 错误处理
    console.error(`\n读取目录 ${directoryPath} 下的文件夹异常: `, err);
    return [];
  }
}

// 判断目录是否为空
function isDirectoryEmptySync(directoryPath) {
  try {
    const files = fs.readdirSync(directoryPath);
    return files.length === 0;
  } catch (err) {
    // 错误处理，可能是因为目录不存在或没有权限等
    console.error(`判断目录 ${directoryPath}是否为空异常: `, err);
    return true
  }
}

// 读取package.json内容  返回是 vue2 vue3 和 react
function readPackageJson(directoryPath) {
  let pkg_type = ''
  const packageJsonPath = findFilePath(directoryPath, "package.json");

  if(!packageJsonPath) {
    return pkg_type
  }

  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");

  let packageJson = {}
  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    pkg_type = 'error-exit-packagejson-'
    return pkg_type
  }

  // const packageJson = JSON.parse(packageJsonContent);
  // 检查 package.json 文件中的依赖
  if(packageJson.dependencies) {
    if (packageJson.dependencies.react || packageJson.dependencies.preact || packageJson.dependencies['react-native-webview'] || packageJson.dependencies.umi || packageJson.dependencies['@umijs/max']) {
      pkg_type = 'react-';
    } else if (packageJson.dependencies['vue']) {
        if (packageJson.dependencies['vue'].startsWith('^3.')) {
          pkg_type = 'vue3-';
        } else {
          pkg_type = 'vue2-';
        }
    }
  }

  if(packageJson.devDependencies) {
    if (packageJson.devDependencies.react || packageJson.devDependencies.preact || packageJson.devDependencies['react-native-webview']  || packageJson.devDependencies.umi || packageJson.devDependencies['@umijs/max']) {
      pkg_type = 'react-';
    } else if (packageJson.devDependencies['vue']) {
        if (packageJson.devDependencies['vue'].startsWith('^3.')) {
          pkg_type = 'vue3-';
        } else {
          pkg_type = 'vue2-';
        }
    }
  }

  return pkg_type;
}

// 给定起始路径，递归找到是否还有某个后缀的类型存在
function findDeepHasSomeTypeFile(startPath, suffix = '') {
  if(!suffix) {
    return false
  }

  const files = fs.readdirSync(startPath);

  if (files) {
    for (const file of files) {
      if (!file) {return null;}
      const filePath = path.join(startPath, file);
      if (!filePath || filePath.includes("/node_modules/")) {return null;}

      // 使用 fs.statSync 获取路径的状态信息
      try {
        const stats = fs.statSync(filePath);
        // 使用 isFile 方法来判断该路径是否为文件
        if (stats.isFile()) {
          // 获取并输出文件的扩展名
          const fileExtension = path.extname(filePath);
          if(fileExtension === suffix) {
            return true
          }
        }
        if (stats.isDirectory()) {
          return findDeepHasSomeTypeFile(filePath, suffix)
        }
      } catch (error) {
        // 如果出现错误（例如文件不存在），将捕获到这里
        return false
      }

    }
  }
}

// 返回所在路径下的 linttype  (vue2/vue3/react + ts/js)
function getLintTypeByPath(directoryPath) {
  let final_lint_type = 'js'

  const pkg_type = readPackageJson(directoryPath)

  const tsconfigFilePath = findFilePath(directoryPath, "tsconfig.json");
  final_lint_type = fs.existsSync(tsconfigFilePath) ? (pkg_type + 'ts'): (pkg_type + 'js')

  // 还有一种， 直接写ts的，并没有用lint，此时使用js就会报错
  const curChildHasTSTypeFile = findDeepHasSomeTypeFile(directoryPath, '.ts')

  final_lint_type = curChildHasTSTypeFile ? 'ts' : final_lint_type

  return final_lint_type

}

// AFULintType 字段返回多级
function detectProjectType(directoryPath, rootName) {

  const typeList = {}

  const IsUniAppType = fs.existsSync(path.join(directoryPath, 'unpackage'))
  const rootHasPnpmWorkSpace = fs.existsSync(path.join(directoryPath, 'pnpm-workspace.yaml'));
  const rootHasPkg = fs.existsSync(path.join(directoryPath, 'package.json'))
  const rootHasSrc = fs.existsSync(path.join(directoryPath, 'src'))
  const curChildHasPkg = findDeepPkgPath(directoryPath)
  const rootHasPkgAndSrc = rootHasPkg && rootHasSrc && !curChildHasPkg;

  // uniapp 的项目这个 可以细分下
  if(IsUniAppType) {
    const jsorts = getLintTypeByPath(directoryPath)
    typeList.root_uniappp = 'vue2-' + jsorts
    return typeList
  }

  // 常规项目: 根目录有 src 和 package.json； 也有非常规的，根目录有package.json，子项目每一个都有package.json
  if(rootHasPkgAndSrc) {
    const lintType = getLintTypeByPath(directoryPath)
    typeList.root = lintType
    return typeList
  }

  if(rootHasPnpmWorkSpace) {
    // monorepo 读取 pnpm-workspace.yaml 获取一级目录下要遍历的 file list，然后进入到二级，在对应的三级下检测type，默认js
    const pnpmWorkSpacePath = findFilePath(directoryPath, "pnpm-workspace.yaml");

    const pnpmWorkSpaceContent = YAML.load(pnpmWorkSpacePath);
    // 正则表达式匹配路径结尾的 /, /* 或 /** 并将其替换为空字符串
    const pnYmalReg = /\/\*{0,2}$/;
    const pnpmPkgs = pnpmWorkSpaceContent.packages.map(v => v.replace(pnYmalReg, ''))

    pnpmPkgs.forEach(rootFile => {
      // 配置有多配置目录的情况，所以要先判断路径是否存在，
      const temPath = directoryPath + '/' + rootFile
      if(fs.existsSync(temPath)) {
        // 找到每个的子文件夹列表
        const fileNames = fs.readdirSync(temPath);

        fileNames.forEach(fileName => {
          const filePath = temPath + '/' + fileName
          // monorepo会存在目录名存在 但是内容为空，指向别的地址的情况
          const res = !isDirectoryEmptySync(filePath) ? getLintTypeByPath(filePath) : ''
          typeList[`${rootFile}`] = {
            ...typeList[`${rootFile}`],
            [`${fileName}`]: res
          }
        })

      }

    })
    return typeList
  }

  // 给定起始路径，找到是否有package.json的层级
  function findDeepPkgPath(startPath, name='package.json') {
    const files = fs.readdirSync(startPath);
    if (files) {
      for (const file of files) {
        if (!file) {return null;}
        const filePath = path.join(startPath, file);
        if (!filePath || filePath.includes("/node_modules/")) {return null;}
        if (fs.statSync(filePath).isDirectory()) {
          const packageJsonPath = findFilePath(filePath, name);
          if (packageJsonPath) {
            return {
              packageJsonPath,
              curPath: findFilePath(filePath),
              file
            }; // 如果找到了 package.json 文件，则返回该路径
          } else {
            findDeepPkgPath(filePath, name)
          }
        }
      }
    }
  }

  // 找到根目录下所有的file，深层遍历，有package.json的目录，获取其lint type
  function getAllChildrenFileLintType(curDirectoryPath, name='') {
    // 当前目录有package.json
    const curHasPkg = findFilePath(curDirectoryPath, 'package.json')
    const deepHasPkg = findDeepPkgPath(curDirectoryPath)

    if(curHasPkg && !deepHasPkg) {
      const lintType = getLintTypeByPath(curDirectoryPath)
      typeList[`${name}`] = lintType
      return
    }

    // 当前目录没有 package.json，且子目录没有package.json
    // const deepHasPkg = findDeepPkgPath(curDirectoryPath)
    if(!deepHasPkg) {
      return typeList
    }



    // 当前子目录有package.json，继续追
    const rootFileList = getDirectories(curDirectoryPath)
    if(rootFileList.length > 0) {
      rootFileList.forEach(rootFileName => {
        const filePath = directoryPath + '/' + rootFileName
        const curHasPkg2 = findFilePath(filePath, 'package.json')
        const deepHasPkg2 = findDeepPkgPath(filePath)

        if(curHasPkg2) {
          const res = getLintTypeByPath(filePath)
          typeList[`${rootFileName}`] = res
        }

        if(!curHasPkg2 && deepHasPkg2) {
          const filesArr = getDirectories(filePath)
          if(filesArr.length > 0) {
            filesArr.forEach(filename => {
              getAllChildrenFileLintType(filePath+'/' + filename, filename)
            })
          }

        }

        if(!curHasPkg2 && !deepHasPkg2) {
          typeList[`${rootFileName}`] = 'js'
        }

      })
    }
  }

  getAllChildrenFileLintType(directoryPath, rootName)

  return typeList


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
      const AFULintType = detectProjectType(repositoryPath, name)
      result.push({
        name,
        AFULintType,
        web_url
      })
    }

  }

  return result;

}


async function checkLintType() {
  const allProjects = await loadFileList();

  console.log('项目共有 ',allProjects.length)

  const getTypeAllProjects = updateProjectLint(allProjects)

  // 指定目录写入结果文件
  Tools.writeRes2SomePath('allProjectsWithLinType.json', getTypeAllProjects)

  console.log(`allProjectsWithLinType.json 已经添加AFULintType字段 用于lint规则使用依据, 共 ${getTypeAllProjects.length} 条 \n`);

}

checkLintType();
