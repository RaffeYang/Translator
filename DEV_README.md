# Translator — Dev Guide

## 目标

- 沉浸式双语：原文在前、译文在后，仅翻译网页主要内容（标题、正文、关键文本），保留导航/页脚/菜单。
- 兼容性：AdGuard 扩展与常见 Userscript 管理器（Tampermonkey/Violentmonkey/Greasemonkey）。
- 体验与稳定：视口感知、批处理并发、缓存、指数退避，非破坏式 DOM 操作，可随时还原。

## 项目结构

- Translator.user.js
  - 主脚本（最新），包含性能、UI、选择器、幂等与 YouTube 字幕增强
- README.md
  - 用户/安装说明
- DEV_README.md
  - 开发者指南（本文）
- LICENSE

## 架构总览（模块职责）

- TranslationManager
  - 维护源/目标语言
  - 批量接口 translateBatch(items, onProgress)
  - 目前使用 Google Translate 免费端点；未来可插拔其他引擎
- GoogleTranslate
  - 并发控制、缓存（LRU-ish）、指数退避、失败回退
- ContentProcessor
  - 站点规则（selectorsByDomain + getAllowedRoots）
  - 视口 IntersectionObserver + 动态 MutationObserver + 滚动轻抖
  - 幂等与安全：data-st-processed、.translation-wrapper、非破坏式包裹 + 隐藏 + 可还原
- YouTubeSubtitleManager
  - 监听 .ytp-caption-segment，强制“两行：原文/译文”
- UI Panel
  - FAB 按钮与旋转反馈、主题（System/Light/Dark）、原文透明度、快捷键录制、自动站点、字幕开关、进度条

## 数据契约

- 批量输入项
  - { element: HTMLElement, text: string, selector?: string }
- 批量结果项
  - { element: HTMLElement, text: string, result: string, success: boolean }
- 幂等标识
  - data-st-processed="1"
  - data-translated="true"
  - .translation-wrapper（译文容器）
  - .st-original-host（原始 DOM 子树容器，视觉隐藏）

## 核心不变量与约束

- 不破坏原始内容树：原子树搬移到 .st-original-host（隐藏），译文以 .translation-wrapper 注入
- 应用前必须检查：未包含 .translation-wrapper 且未标记 data-st-processed
- 仅在主要容器内处理：main、article、[role=main]、.content、.post-content、.entry-content、.prose、.markdown-body 等
- 跳过导航区域：header/nav/footer/aside、[role=navigation]/[role=banner]/[role=contentinfo]、.menu/.navbar/.sidebar/.toolbar
- 网络策略：并发自适应（4–15）、失败退避重试一次、缓存键截断到前200字符

## 站点内置规则

- YouTube
  - roots: #content, ytd-app, body
  - selectors: #video-title h1（字幕单独处理）
- X/Twitter
  - roots: main
  - selectors: [data-testid="tweetText"]
- GitHub
  - roots: .markdown-body
  - selectors: .markdown-body h1/h2/h3/p
- Reddit（新/老）
  - roots: [data-test-id="post-content"], [data-testid="post-container"], shreddit-post, faceplate-partial, main
  - selectors: h1[data-click-id="title"], h1._eYtD..., .RichTextJSON-root p, div[data-click-id="text"] p, ._1qeIAgB0cPwnLhDF9XSiJM p, .Comment p, [data-testid="comment"] p
- 默认站点
  - roots: main, article, [role=main], .content, .post-content, .entry-content, .prose, .markdown-body
  - selectors: 仅 h1/h2/p

## 选择器策略与适配流程

- 分层策略：
  1) 域名专属精确选择器（优先）
  2) 主容器白名单 + 标题/段落选择器
  3) 黑名单过滤（导航/页脚/菜单/侧栏）
- 回退：
  - 若未找到容器，逐一尝试默认 roots；仅处理视口内元素
- 自定义规则（建议后续加入）：
  - JSON 存储并在启动时 merge 内置规则
  - 结构：
    {
      "example.com": {
        "roots": ["main", ".content"],
        "selectors": ["article h1", "article p"]
      }
    }

## 样式与可访问性

- CSS 变量：
  - --st-bg, --st-text, --st-border, --st-primary, --st-accent, ...
  - --st-original-opacity（原文透明度，默认 0.85）
- 深色主题：original-text 用亮灰和轻阴影提升可读性
- 字幕：subtitle-original（第一行原文）、subtitle-translation（第二行译文）

## 性能策略

- 并发：初始 12，最大 15，错误≥2 降并发，最小 4
- 缓存：上限 800，键=from|to|前200字；成功写入
- 重试：失败退避一次，仍失败则返回原文
- 观察器：IO 视口感知；MO 100 ms 防抖；滚动 160 ms 轻抖

## 日志与调试

- logVerbose 开关（可考虑暴露到 UI）
- 建议日志格式：
  - [ST][processor] collected=<n> visible=<n>
  - [ST][apply] ok=<n>/<total>
  - [ST][translate] batch=<n> errors=<n> concurrency=<c>
- 规则测试模式（建议后续加入）：
  - 面板显示命中 roots/selectors 数量与预览

## 回归测试清单

- YouTube：标题翻译、字幕两行；其他 UI 不变
- X/Twitter：仅 tweet 正文翻译
- GitHub：README（.markdown-body）翻译；导航不变
- Reddit：标题、正文与评论翻译；侧栏/导航不变
- 通用文章页：main/article/[role=main] 的 h1/h2/p 翻译；菜单/页脚保留原样
- 还原：快捷键与按钮均可完整还原，多次操作幂等

## 扩展点（未来路线）

- 多引擎（DeepL/Gemini/OpenAI）
  - ITranslateEngine：translate(text, from, to): Promise<string>
  - TranslationManager 注入当前引擎
- 文本分句/句级缓存
  - 提升命中率、降低请求体
- 自定义站点规则 UI
  - 导入/导出 JSON、命中预览、快速测试
- FAB 拖拽与位置记忆
- 可观测性：Debug 开关、命中统计、失败率/并发自调参数可视化

## 代码风格与注释要求

- 使用 JSDoc 给核心函数与跨模块接口加注释
- 注释关注“为什么”（设计意图、约束、不变量）
- data-* 命名统一使用 data-st- 前缀

## 常见问题与处理

- 重复显示/二次注入
  - 检查是否遗漏 data-st-processed 或 .translation-wrapper 判断
  - 限制仅对最内层匹配元素生效，避免父子同时被命中
- 漏翻
  - 按站点 DOM 结构补充 roots/selectors 或通过自定义规则
- 样式冲突
  - 优先使用自有命名空间；必要时提升选择器特异性

## 版本与发布

- 语义化版本：MAJOR.MINOR.PATCH
- 建议维护 CHANGELOG 或在 README 顶部记录重要变更
- 发布前跑一遍“回归测试清单”

## 附录：核心接口 JSDoc 示例

```js
/**
 * Batch translate with adaptive concurrency.
 * @param {Array<{element: HTMLElement, text: string}>} items
 * @param {(done:number, total:number)=>void} [onProgress]
 * @returns {Promise<Array<{element: HTMLElement, text: string, result: string, success: boolean}>>}
 */
async function translateBatch(items, onProgress) {}

/**
 * Apply immersive bilingual wrapper (non-destructive).
 * Preconditions: element NOT processed, NOT contains .translation-wrapper.
 * @param {HTMLElement} element
 * @param {string} originalText
 * @param {string} translatedText
 */
function apply(element, originalText, translatedText) {}
```
