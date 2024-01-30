
## GET-GITLAB-PROJECT-LIST

### 使用
```bash
mv demo.personal.js personal.js

# 然后配置文件中的 accessToken
# 配置 configs 目录下 你想要配置的字段

pnpm get:all

# 内容输出在 allProjects.json 中

```


#### 核心功能
使用gitlab的api，获取指定的group下的project列表。

#### 支持功能：
1. 支持分页
2. group下的subgroup黑名单
3. 在group下project黑名单
4. 不在project的白名单添加

### 参考
[gitlab上的示例项目](https://gitlab.com/afu7953802)
