# 4.0.0 验证记录

2026-10-18，Intel macOS，Safari + AdGuard。

- `npm ci` 完成；`npm test` 32 项通过，并通过 userscript 语法与配置/路由验证。
- 安装通过 AdGuard Extensions 的 Install from File or URL 官方界面完成。安装版内容与本地脚本逐字比较一致（忽略末尾空行），默认 universal=true。
- MDN JavaScript Guide Introduction：真实标题、正文、列表显示中文译文，截图目视确认左右侧栏、目录和顶部导航保持英文。
- Rust Book Installation：真实安装标题与正文显示译文，代码及导航未插入译文。
- GitHub LaTeX2e README、GitHub Blog Changelog、Reddit LogicPro 帖子：安装版刷新后有可见译文；Reddit 评论未纳入范围。
- DOM 查询在上述页面的 nav、aside、footer、form、pre、code、shreddit-comment 中未发现译文节点。
- 上述验证只证明所检查页面；不能证明所有网站准确。X 保留提取回归测试，本轮没有新增 X 实页验证。
- Google 公共端点出现过临时请求失败；失败段落延迟重试，因此实页验证不代表每个段落均已成功翻译。

自动测试使用模拟布局和翻译响应；实页验证使用安装版及真实服务，不注入缓存示例译文。
