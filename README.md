# Juno Tool Station

`tool.juno.foxbridge.team` 的工具站首页，使用 React 19、TypeScript、Vite 与 Vinext 构建。

## 本地运行

要求 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

开发服务器默认运行在终端显示的本地地址。

## 构建与运行

```bash
npm run build
npm run start
```

## 1Panel 部署

当前版本推荐通过 1Panel 的「Node.js 运行环境」部署：

1. 将整个项目上传到服务器，例如 `/opt/1panel/apps/juno-tool-station`。
2. 在 1Panel 应用商店安装 Node.js 运行环境，Node 版本选择 22。
3. 创建 Node.js 网站，工作目录选择项目目录。
4. 安装命令填写 `npm ci`。
5. 构建命令填写 `npm run build`。
6. 启动命令填写 `npm run start`。
7. 根据运行日志确认应用端口，在网站配置中反向代理到该端口。
8. 为网站绑定 `tool.juno.foxbridge.team`。
9. 申请并启用 HTTPS 证书，开启 HTTP 自动跳转 HTTPS。

DNS 中需要提前添加：

```text
类型：A
主机记录：tool.juno
记录值：你的 1Panel 服务器公网 IP
```

## 搜索引擎推送模块规划

后续增加独立管理页面 `/admin/search-push`，但 API 密钥不能保存在浏览器 LocalStorage 或前端源码中。

```text
管理界面
  └─ 调用受保护的服务端 API
       ├─ 百度普通收录推送
       ├─ 必应 URL Submission API
       ├─ 手动推送指定 URL
       ├─ sitemap 批量推送
       └─ 定时扫描并自动推送新增/更新页面
```

服务端需要记录：

- 搜索引擎 API Token；
- 最近一次推送时间；
- URL、内容更新时间和推送状态；
- 每次请求的结果和错误信息；
- 每日配额使用情况。

自动推送由服务器定时任务执行，不能依赖用户打开网页。1Panel 中可使用计划任务调用内部推送接口，或由 Node 服务自身使用任务调度器执行。

安全要求：

- 管理界面必须登录；
- Token 只在服务端保存；
- 前端接口不能返回完整 Token；
- 推送接口需要防止未授权调用和重复提交；
- 日志不得输出 Token。
