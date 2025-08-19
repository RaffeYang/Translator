# Translator

沉浸式双语（原文在上、译文在下）翻译脚本。适配全站文本、视口内懒加载翻译、YouTube 字幕即时双语，支持 AdGuard 与常见 Userscript 管理器。

-  轻量快速：基于 Google Translate 免费端点，批处理并发优化
-  沉浸式体验：原文与译文分层排版，保持页面结构
-  智能触发：视口检测、滚动/动态内容监测、可配置自动翻译站点
-  现代 UI：浮动圆形按钮、面板设置、主题跟随、快捷键 Alt+W 默认
-  YouTube 字幕双语：按段翻译，原文与译文叠加展示

English: Immersive bilingual translator userscript (original above, translation below). Fast Google Translate backend, viewport-aware batching, AdGuard-compatible, and a polished UI with hotkeys and auto-translate rules.

![Bilingual Translation Dark Theme](./images/BilingualTranslationDarkTheme.png)

![Bilingual Translation Light Theme](./images/BilingualTranslationLightTheme.png)


## Features

-  Translation
  - Google Translate free endpoint
  - Batch concurrency with cache and debouncing
  - Auto-detect source language; configurable source/target
  - Immersive bilingual layout for text blocks
  - YouTube subtitles bilingual overlay
-  UI/UX
  - Floating FAB button and settings panel
  - Themes: System/Light/Dark
  - Progress bar and toasts
  - Keyboard shortcut: Alt+W toggle translate/restore
-  Smart automation
  - Viewport IntersectionObserver to translate only visible content
  - MutationObserver with debounce for dynamic pages
  - Auto-translate on selected domains (youtube.com, github.com, x.com, twitter.com by default)

## Compatibility

-  AdGuard for Safari/macOS: Fully supported
-  Tampermonkey / Violentmonkey / Greasemonkey: Supported across major browsers
-  Desktop and Mobile: Responsive panel and typography

## Installation

-  Userscript managers:
  - Install Translator.user.js into AdGuard, Tampermonkey, Violentmonkey, or Greasemonkey
-  AdGuard:
  - Follow AdGuard extension guide: https://adguard.com/kb/general/extensions/
  - Ensure network permissions for translate.googleapis.com are allowed

## Quick Start

1) 点击右侧“🌐”浮动按钮打开设置面板  
2) 选择语言：源语言可设为“Auto Detect”，目标语言例如“简体中文（zh-Hans）”  
3) 可选：编辑自动翻译站点列表（逗号分隔域名）  
4) 点击“Translate”或使用快捷键 Alt+W  
5) 再次按 Alt+W 可一键还原原文

## YouTube 字幕双语

-  在设置中开启 “YouTube Subtitle Translation”
-  播放视频时，字幕将以“原文在上、译文在下”的双行样式显示

## Privacy & Security

-  本脚本不收集任何用户数据
-  翻译文本会发送至 Google Translate（免费端点）；请留意第三方服务的隐私政策
-  所有设置（语言、主题、快捷键、自动站点列表、字幕开关）仅存储于本地（GM_setValue）

## Troubleshooting

-  无法翻译/超时
  - 检查网络和是否允许 translate.googleapis.com
  - 重载页面或等待数秒后重试（批处理有节流/防抖）
-  样式冲突
  - 脚本使用高优先级样式隔离；如个别站点冲突，请反馈 issue 附上 URL
-  性能问题
  - 在长页面中仅翻译视口内文本；如仍卡顿，可减少并发或关闭自动翻译

## Development

-  Tech highlights
  - IntersectionObserver + MutationObserver + scroll debounce
  - Batched GM_xmlhttpRequest with concurrency and caching
  - Modern UI components (dropdowns, toggles, progress)
-  Project structure
  - Translator.user.js: main userscript
  - README.md, LICENSE
-  Local build
  - 直接编辑 userscript 文件并导入至管理器测试
-  Credits
  - Thanks to the open userscript community

## Roadmap

-  Drag & drop for FAB and panel position persistence
-  Ignore-lists and domain-specific selectors via UI
-  Per-language typography tweaks and punctuation normalization
-  Multi-engine backend toggle (DeepL, Gemini, OpenAI) with fallback
-  Sentence-level diffing to reduce DOM churn
-  On-demand inline selection translation (hover/tooltip)
-  Accessibility: focus management, ARIA roles, reduced motion

## License

Apache License 2.0

