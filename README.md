# 高一（12）班班级看板 · GitHub Pages 发布包

这个目录是可以直接放进 `jraixue.github.io` 仓库的静态网页版本。入口文件是 `index.html`，网页只读取同目录的 `data/class-board.json`，不依赖本地 Node 服务。

## 上传方式

1. 打开 `github.com/jraixue/jraixue.github.io`。
2. 如果要让网址直接打开班级看板，把本目录中的**所有内容**上传到仓库根目录，保留 `index.html` 在最外层。
3. 在仓库的 Settings → Pages 中选择 `Deploy from a branch`、`main` 分支和 `/ (root)`。
4. 等待 GitHub Pages 发布后，访问 `https://jraixue.github.io/`。

如果希望放在仓库子目录（例如 `class-board`），请将整个目录上传为 `class-board` 文件夹，访问 `https://jraixue.github.io/class-board/`。目录内已使用相对路径，放在根目录或子目录都可以工作。

## 每日更新

后续只需要更新 `data/class-board.json`，再提交到 GitHub，网页就会显示最新的课表、作业完成情况、倒计时和通知。公开页只放班级整体信息，不放姓名、成绩、身份证号、电话等个人隐私。

## 与教师端的边界

教师端仍建议留在本地电脑或私有服务器，不要把含有学生个人信息的后台文件上传到公开的 GitHub Pages。公开班级端是只读看板；后续可以再为教师端配置独立的登录和私有部署。
