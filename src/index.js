import fetch from "node-fetch";
import fs from "fs";
import PERSONALINFO from "../personal.js";
import GitLabConfigs from "../configs/gitLabConfigs.js";

const { gitLabBaseUrl, rootGroupId, ignoreGroupIds, ignoreProjectsIds, addRepoIds, per_page, page } = GitLabConfigs;

const { accessToken } = PERSONALINFO;

// 获取指定 Group ID 下的所有 Projects
async function getProjects(groupId, accessToken, page = 1) {

  try {
    const response = await fetch(
      `${gitLabBaseUrl}/api/v4/groups/${groupId}/projects?per_page=${per_page}&page=${page}`,
      {
        headers: {
          "PRIVATE-TOKEN": accessToken,
        },
      }
    );
    const status = await response.status
    if(status === 200) {
      const projects = await response.json();
      if(projects.length === per_page) {
        return [...projects, ...(await getProjects(groupId, accessToken, page + 1))]
      }
      return projects;
    }
    return []
  } catch (error) {
    console.error("Error occurred while fetching projects:", error.message);
    throw error;
  }
}

// 获取指定 Group ID 下的所有子 Group
async function getSubGroups(groupId, accessToken, page = 1) {
  try {
    const response = await fetch(
      `${gitLabBaseUrl}/api/v4/groups/${groupId}/subgroups?per_page=${per_page}&page=${page}`,
      {
        headers: {
          "PRIVATE-TOKEN": accessToken,
        },
      }
    );

    const status = await response.status
    if(status === 200) {
      const subGroups = await response.json();
      // 排除 ignoreGroupIds
      const afterFilterSubGroups = subGroups.filter(
        ({ id }) => !ignoreGroupIds.includes(id)
      );
      if(subGroups.length === per_page) {
        return [...afterFilterSubGroups, ...(await getSubGroups(groupId, accessToken, page + 1))]
      }
      return afterFilterSubGroups;
    }

    return []

  } catch (error) {
    console.error("Error occurred while fetching subgroups:", error.message);
    throw error;
  }
}

// 递归获取所有子 Group 下的 Projects，并提取所需字段
async function getAllSubGroupProjects(groupId, accessToken) {
  try {
    const allProjects = [];

    const subProjects = await getProjects(groupId, accessToken);
    allProjects.push(...subProjects);

    const subGroups = await getSubGroups(groupId, accessToken);
    for (const group of subGroups) {
      // 递归获取子 Group 下的 Projects
      const subGroupProjects = await getAllSubGroupProjects(
        group.id,
        accessToken
      );

      allProjects.push(...subGroupProjects)

    }

    return allProjects;
  } catch (error) {
    console.error("Error occurred while fetching projects:", error.message);
    throw error;
  }
}

// 获取指定 projectIds 的信息
async function getProjectsByIds(ids, accessToken) {
  if(!ids || ids.length === 0) {
    return [];
  }
  try {
    const projects = [];

    for (const repo_id of ids) {
      const response = await fetch(
        `${gitLabBaseUrl}/api/v4/projects/${repo_id}`,
        {
          headers: {
            "PRIVATE-TOKEN": accessToken,
          },
        }
      );
      const status = response.status;
      if(status === 200) {
        const projectData = await response.json();
        projects.push(projectData);
      }
    }

    return projects;
  } catch (error) {
    console.error("Error occurred while fetching projects:", error.message);
    throw error;
  }
}


(async () => {
  try {

    // 获取所有子 Group 下的 Projects
    const rootGroupIdProjectsInfos = await getAllSubGroupProjects(rootGroupId, accessToken);

    const addProjectInfos = await getProjectsByIds(addRepoIds, accessToken)

    // 所有的项目信息 集合
    const allProjectsMap = new Map()
    const allProjectsTempArr = [ ...rootGroupIdProjectsInfos, ...addProjectInfos ]

    allProjectsTempArr.forEach(item => allProjectsMap.set(item.id, item))
    const result = [...allProjectsMap.values()]

    // result去除 ignoreProjectsIds
    const filteredResult = result.filter(item => !ignoreProjectsIds.includes(item.id))

    fs.writeFileSync('allProjects.json', JSON.stringify(filteredResult, null, 2));

    console.log(`共统计有 ${filteredResult.length} 个项目，结果已导出到 allProjects.json \n`);

  } catch (error) {
    console.error("Error occurred:", error.message);
  }
})();
