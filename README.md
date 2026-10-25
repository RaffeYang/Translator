# Immersive Bilingual

AdGuard 用户脚本。默认开启 universal，自动识别网站正文，在原文下方显示简体中文译文。当前版本 **4.0.1**。

## 使用

1. 在 AdGuard 的 Extensions 中选择 **Install from File or URL**。
2. 选择本项目的 `immersive-bilingual-adguard.user.js`，安装；同名脚本选择 Continue 替换。
3. 刷新网页。`Alt + T` 开启/暂停翻译；输入框内不响应此快捷键。

只有脚本文件需要安装。Node、npm 和测试文件仅用于开发。更新本地文件后，需要重新导入 AdGuard；控制台启动日志包含版本及 universal 状态。

## 正文范围

- 通用识别：文章、博客、新闻、教程和技术文档。结合 article、articleBody、markdown/prose 等容器以及连续长段落识别正文；支持无 article 标签的普通段落页面。
- 翻译标题、段落、说明列表、引用、图片说明和表格文字；每个正文块只翻译一次。
- 排除导航、侧栏、目录、页脚、评论、推荐、分享、订阅、表单、代码和隐藏内容。保留正文中的链接及行内代码。
- 正文证据不足时跳过，优先减少误翻译。不能保证所有网站都准确；首页卡片、极短文章、Canvas、封闭 Shadow DOM 和 iframe 内容不保证支持。

以下站点的专用规则始终优先，开启 universal 不会扩大它们的范围：

| 站点 | 范围 |
| --- | --- |
| X / Twitter | 推文正文 |
| GitHub | 仓库 README、About Description |
| Reddit（含 old） | 帖子标题和正文，不含评论 |
| GitHub Blog | 文章标题和正文 |

## 配置

编辑脚本顶部 `CONFIG`：

| 配置 | 默认值 / 含义 |
| --- | --- |
| `enabled` | `true`；快捷键状态会持久保存并覆盖此默认值 |
| `universal` | `true`；改为 `false` 后仅启用专用站点 |
| `mode` | `bilingual`；也可设 `translation-only` |
| `sourceLang` / `targetLang` | `en` / `zh-CN` |
| `skipIfDetectedLangs` | 跳过简体中文与中英混合段落 |
| `blockedUrlPatterns` | URL 子串黑名单，命中时不翻译 |
| `provider` | `google`；支持 deepseek、kimi、minimax |
| `fallbackGoogle` | AI 服务失败时回退 Google |
| `providers` | API Key、model、baseUrl；默认 Google 不需要密钥 |
| `maxCandidatesPerScan` | `48`；长文章自动分批继续 |
| `concurrency` | `3`；请求并发数，限制在 1–6 |
| `retryDelayMs` | `30000`；失败节点的重试间隔 |
| `siteRules` | 域名级 roots、selectors、排除和渲染选项 |

默认使用 Google 公共翻译端点，待翻译正文会发送给配置的翻译服务。需要排除的网站可加入 `blockedUrlPatterns`。

## 实现与维护

单文件交付，避免安装时依赖额外库。代码依次组织为配置、站点路由、正文识别、翻译服务、队列、渲染、页面生命周期。

- 已有 v3 缓存和开关状态兼容保留。
- 相同文本共用进行中的请求；扫描队列按节点去重。
- 暂停、跳转、节点移除或原文变化后，丢弃过期响应。
- 每个译文记录对应原文节点，避免相邻段落串位；列表和表格保持有效结构。
- 观察器忽略自身译文，扫描采用节流，避免繁忙页面持续推迟扫描。
- 请求失败暂缓重试，错误提示限频。缓存最多保留约 3000 条。

开发验证：

```sh
npm ci
npm test
```

测试包含语法、配置/路由、正文正反例、站点回归、异步响应时效、请求去重、列表表格结构、超过一批的完整启动及快捷键。jsdom 模拟布局尺寸和翻译响应，因此不能代替 Safari + AdGuard 实际验证。

## 权限

使用 `GM_getValue`、`GM_setValue`、`GM_addStyle`、`GM_xmlhttpRequest`、`window.onurlchange`。`@match *://*/*` 用于 universal；`@connect *` 用于自定义服务地址。PDF 页面及子框架不运行。
