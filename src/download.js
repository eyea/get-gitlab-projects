// 下载所有的git仓库
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const successRepositories = [];
const failedRepositories = [];

async function loadFileList() {
  const data = await fs.promises.readFile(`${__dirname}/../allProjects.json`, 'utf-8');
  return JSON.parse(data);
}

function downReopFromGit(repositories) {

  let currentIndex = 0; // 初始化索引计数器
  const allLength = repositories.length;
  for (const repositoryInfo of repositories) {
    const { ssh_url_to_repo, name, default_branch } = repositoryInfo;
    console.log(`处理进度 ${currentIndex + 1}/${allLength} ：${repositoryInfo.name}(${default_branch})`);

    // 有 空项目情况
    if(!default_branch || !ssh_url_to_repo) {
      console.log(`跳过 ${name}，默认分支: ${default_branch}； ssh_url_to_repo地址是${ssh_url_to_repo}`, );
      failedRepositories.push(repositoryInfo)
      currentIndex++
      continue
    }

    const repositoryPath = path.join(
      __dirname,
      '../../../afu/afu-all-projects/',
      name
    );

    if (!fs.existsSync(repositoryPath)) {
      console.log(`Cloning repository ${ssh_url_to_repo}...`);
      try {
        execSync(`git clone ${ssh_url_to_repo} ${repositoryPath}`);
        console.log(`Repository ${ssh_url_to_repo} cloned successfully. \n`);
        successRepositories.push(repositoryInfo)
      } catch (error) {
        console.error(
          `Error cloning repository ${ssh_url_to_repo}:`,
          error.message
        );
        failedRepositories.push(repositoryInfo)
        continue;
      }
    } else {
      console.log(`Updating repository ${ssh_url_to_repo}...`);
      try {
        execSync(`git -C ${repositoryPath} pull`);
        console.log(`Repository ${ssh_url_to_repo} updated successfully. \n`);
        successRepositories.push(repositoryInfo)
      } catch (error) {
        console.error(
          `Error updating repository ${ssh_url_to_repo}:`,
          error.message
        );
        failedRepositories.push(repositoryInfo)
        continue;
      }
    }

    currentIndex++

  }

  console.log(`共处理了 ${repositories.length} 个项目 \n其中成功 ${successRepositories.length}个；\n异常 ${failedRepositories.length}个\n`)

}

async function downloadFile() {
  const allProjects = await loadFileList();
  console.log(`一共要处理 ${allProjects.length}个项目\n`);

  downReopFromGit(allProjects)

}

downloadFile();
