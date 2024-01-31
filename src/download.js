// 下载所有的git仓库
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

function downReopFromGit(repositories) {

  for (const repositoryInfo of repositories) {
    const { ssh_url_to_repo, name, } = repositoryInfo;

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
      } catch (error) {
        console.error(
          `Error cloning repository ${ssh_url_to_repo}:`,
          error.message
        );
        continue;
      }
    } else {
      console.log(`Updating repository ${ssh_url_to_repo}...\n`);
      try {
        execSync(`git -C ${repositoryPath} pull`);
        console.log(`Repository ${ssh_url_to_repo} updated successfully. \n`);
      } catch (error) {
        console.error(
          `Error updating repository ${ssh_url_to_repo}:`,
          error.message
        );
        continue;
      }
    }

  }

}

async function downloadFile() {
  const allProjects = await loadFileList();
  console.log(allProjects.length, '\n');

  downReopFromGit(allProjects)

}

downloadFile();
