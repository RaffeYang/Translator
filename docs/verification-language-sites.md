# 官方语言网站验证（4.0.1）

2026-10-18，Safari + AdGuard 安装版，universal=true。官网与下列每篇文档均观察到真实正文译文；四篇文档的截图已目视检查。抽查结果不代表全部页面或每个段落都成功翻译。

| 语言 | 官网 | 文档样本 |
| --- | --- | --- |
| Swift | https://www.swift.org/ | https://docs.swift.org/latest/documentation/the-swift-programming-language/thebasics/ |
| TypeScript | https://www.typescriptlang.org/ | https://www.typescriptlang.org/docs/handbook/2/everyday-types.html |
| Go | https://go.dev/ | https://go.dev/doc/tutorial/getting-started |
| Rust | https://rust-lang.org/ | https://doc.rust-lang.org/book/ch01-01-installation.html |

Swift 旧 swift-book URL 重定向到新版 DocC。初次测试正文无法识别，实际布局是 adjustable-sidebar-width 外层同时包含侧栏与 main；修正识别边界后正文出现译文。侧栏导航未翻译。

TypeScript 的 role=article 容器将主标题放在嵌套 article 外，已补充 ARIA 正文容器识别。页面标题 Everyday Types 已实际显示“日常类型”。设置控件的 label 与 status 区域排除。

独立正文标题按文档顺序进入首批，避免被长文后续批次延迟。

DOM 检查：nav、role=navigation、aside、footer、form、label、pre、code、Swift navigator-card-item 与 code-listing 中的译文数量均为 0。截图中侧栏、目录、代码保持原样。

`npm test`：35 项通过。安装版与本地脚本内容比较一致。页面和翻译服务网络偶有延迟/失败，因此只报告实际可见译文及排除区域，不宣称全文网络翻译完成。

剩余问题：Swift DocC 的 The Basics 主标题在真实页面仍未出现译文；前台等待 12 秒后正文已有 149 个译文块，主标题仍缺失。不能据模拟 DOM 测试宣称这个标题已修好。TypeScript 主标题“日常类型”已实际确认。
