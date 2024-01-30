import fetch from "node-fetch";
import fs from "fs";
import PERSONALINFO from "../personal.js";
import GitLabConfigs from "../configs/gitLabConfigs.js";

const {
  gitLabBaseUrl,
  rootGroupId,
  ignoreGroupIds,
  ignoreProjectsIds,
  addRepoIds,
  per_page,
} = GitLabConfigs;

const { accessToken } = PERSONALINFO;

// 获取指定 Group ID 下的所有 Projects
async function getProjects(groupId, page = 1) {
  try {
    const response = await fetch(
      `${gitLabBaseUrl}/api/v4/groups/${groupId}/projects?per_page=${per_page}&page=${page}`,
      {
        headers: {
          "PRIVATE-TOKEN": accessToken,
        },
      }
    );
    const status = await response.status;
    if (status === 200) {
      const projects = await response.json();
      if (projects.length === per_page) {
        return [...projects, ...(await getProjects(groupId, page + 1))];
      }
      return projects;
    }
    return [];
  } catch (error) {
    console.error("Error occurred while fetching projects:", error.message);
    throw error;
  }
}

// 获取指定 Group ID 下的所有子 Group
async function getSubGroups(groupId, page = 1) {
  try {
    const response = await fetch(
      `${gitLabBaseUrl}/api/v4/groups/${groupId}/subgroups?per_page=${per_page}&page=${page}`,
      {
        headers: {
          "PRIVATE-TOKEN": accessToken,
        },
      }
    );

    const status = await response.status;
    if (status === 200) {
      const subGroups = await response.json();
      // 排除 ignoreGroupIds
      const afterFilterSubGroups = subGroups.filter(
        ({ id }) => !ignoreGroupIds.includes(id)
      );
      if (subGroups.length === per_page) {
        return [
          ...afterFilterSubGroups,
          ...(await getSubGroups(groupId, page + 1)),
        ];
      }
      return afterFilterSubGroups;
    }

    return [];
  } catch (error) {
    console.error("Error occurred while fetching subgroups:", error.message);
    throw error;
  }
}

// 递归获取所有子 Group 下的 Projects，并提取所需字段
async function getAllSubGroupProjects(groupId) {
  try {
    const subProjects = await getProjects(groupId);
    const subGroups = await getSubGroups(groupId);

    // 使用 Promise.all 并行地获取每个子组的项目
    const subGroupProjectsPromises = subGroups.map(group => getAllSubGroupProjects(group.id));
    const subGroupProjectsArrays = await Promise.all(subGroupProjectsPromises);

    // 将所有子组的项目合并成一个数组
    const allSubGroupProjects = [].concat(...subGroupProjectsArrays);

    // 合并本组和所有子组的项目
    return [...subProjects, ...allSubGroupProjects];
  } catch (error) {
    console.error("Error occurred while fetching projects:", error.message);
    throw error;
  }
}


// 获取指定 projectIds 的信息
async function getProjectsByIds(ids) {
  if (!ids || ids.length === 0) {
    return [];
  }
  try {
    const projects = await Promise.all(ids.map(repo_id =>
      fetch(`${gitLabBaseUrl}/api/v4/projects/${repo_id}`, { headers: { "PRIVATE-TOKEN": accessToken } })
        .then(response => response.status === 200 ? response.json() : null)
        .catch(err => {
          console.error(`Error occurred while fetching project ${repo_id}:`, err.message);
          return null; // 如果请求失败，返回null
        })
    ));

    return projects.filter(project => project !== null); // 过滤掉错误的请求结果
  } catch (error) {
    console.error("Unexpected error occurred while fetching projects:", error.message);
    throw error;
  }
}

(async () => {
  try {
    // 获取所有子 Group 下的 Projects
    const rootGroupIdProjectsInfos = await getAllSubGroupProjects(rootGroupId);

    const addProjectInfos = await getProjectsByIds(addRepoIds);

    // 所有的项目信息 集合
    const allProjectsMap = new Map();
    const allProjectsTempArr = [
      ...rootGroupIdProjectsInfos,
      ...addProjectInfos,
    ];

    allProjectsTempArr.forEach((item) => allProjectsMap.set(item.id, item));
    const result = [...allProjectsMap.values()];

    // result去除 ignoreProjectsIds
    const filteredResult = result.filter(
      (item) => !ignoreProjectsIds.includes(item.id)
    );

    fs.writeFileSync(
      "allProjects.json",
      JSON.stringify(filteredResult, null, 2)
    );

    console.log(
      `共统计有 ${filteredResult.length} 个项目，结果已导出到 allProjects.json \n`
    );
  } catch (error) {
    console.error("Error occurred:", error.message);
  }
})();
