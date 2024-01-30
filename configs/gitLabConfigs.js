import ignoreGroupIds from "./ignoreGroupIds.js"
import ignoreProjectsIds from "./ignoreProjectsIds.js"
import addRepoIds from "./addRepoIds.js"

const GitLabConfigs = {
  gitLabBaseUrl: 'https://gitlab.com',
  rootGroupId: 80513252, // 群组id web访问 dashboard/groups.json的其中一条
  ignoreGroupIds,
  ignoreProjectsIds,
  addRepoIds,
  page: 1,
  per_page: 100, // api 分页 max 100 default 20  https://docs.gitlab.com/ee/api/rest/#offset-based-pagination
}

export default GitLabConfigs
