// 将结果数据上传到gitlab 某个仓库的的 wiki

import fs from "fs";
import fetch from "node-fetch";
import PERSONALINFO from "../personal.js";
import GitLabConfigs from "../configs/gitLabConfigs.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Tools from "./utils/index.js"


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {
  gitLabBaseUrl,
  uploadLintResRepoId
} = GitLabConfigs;

const { accessToken } = PERSONALINFO;


async function loadFileList() {
  const data = await fs.promises.readFile(
    `${__dirname}/../allProjectsLintResult.json`,
    "utf-8"
  );
  return JSON.parse(data);
}

// 上传结果到指定仓库的wiki content中
async function uploadToWiki(repoId, data) {
  // TODO
  try {
    const wikiTitle = `lintResult-${Tools.getFormattedDate()}`
    const postData = {
      id: repoId,
      title: wikiTitle,
      content: JSON.stringify(data)
    }
    const response = await fetch(
      `${gitLabBaseUrl}/api/v4/projects/${repoId}/wikis`,
      {
        headers: {
          "PRIVATE-TOKEN": accessToken,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify(postData)
      }
    );
    const detail = await response.json();
    return detail && detail?.slug === wikiTitle
  } catch (error) {
    console.error("Error occurred while upload projects lint data to wiki:\n", error.message);
    return false
  }
}

async function upoadLintRes2Wiki() {
  const lintResData = await loadFileList();

  // 上传数据
  const uploadStatus = await uploadToWiki(uploadLintResRepoId, lintResData)
  if(uploadStatus) {
    console.log("上传成功");
  } else {
    console.log("上传失败");
  }

}
upoadLintRes2Wiki()