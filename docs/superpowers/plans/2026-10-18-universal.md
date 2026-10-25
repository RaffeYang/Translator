# Universal正文双语 Implementation Plan

**Goal:** 默认开启保守的跨站正文双语翻译，修正动态页面队列与渲染。
**Architecture:** 保持单文件交付，按配置、提取、服务、队列、渲染、生命周期组织函数。专用规则优先；通用规则依靠语义容器和段落密度。
**Tech Stack:** JavaScript userscript, AdGuard GM API, Node test runner, jsdom, Safari automation.

- [x] 扩充 scripts/test-dom.cjs：正文/文档/无语义容器、导航/评论/推荐/隐藏、嵌套、异步暂停和替换。
- [x] 运行失败测试确认缺陷；更新 validate-userscript.js 的 universal 默认和可关闭断言。
- [x] 改写 immersive-bilingual-adguard.user.js 的通用识别；保留四类专用规则及翻译服务。
- [x] 重整源文本读取、节点归属、去重队列、响应时效、观察器去噪和扫描限流。
- [x] 执行 npm test，检查 README、版本、安装一致性。
- [x] 通过 AdGuard 界面更新安装版，Safari 验证实际译文及排除区域，记录验证边界。
