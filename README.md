# Immersive Bilingual

An AdGuard userscript that automatically detects a page’s main content and displays Simplified Chinese translations below the original text. Universal mode is enabled by default. Current version: **4.0.1**.

## Usage

1. In AdGuard’s Extensions section, select **Install from File or URL**.
2. Select this project’s `immersive-bilingual-adguard.user.js` to install it. If a script with the same name is already installed, select Continue to replace it.
3. Refresh the page. Press `Alt + T` to enable or pause translation; the shortcut is ignored while typing in an input field.

Only the userscript file needs to be installed. Node, npm, and the test files are for development only. After updating the local file, import it into AdGuard again. The startup log in the console includes the version and universal mode status.

## Content Scope

- Universal detection covers articles, blogs, news, tutorials, and technical documentation. It identifies main content using containers such as article, articleBody, and markdown/prose, along with consecutive long paragraphs. Plain paragraph pages without an article element are also supported.
- Translates headings, paragraphs, description lists, blockquotes, image captions, and table text. Each content block is translated only once.
- Excludes navigation, sidebars, tables of contents, footers, comments, recommendations, sharing controls, subscriptions, forms, code blocks, and hidden content. Links and inline code within the main content are preserved.
- Skips content when there is insufficient evidence that it belongs to the main body, prioritizing fewer false positives. Accuracy is not guaranteed on every website. Homepage cards, very short articles, Canvas, closed Shadow DOM, and iframe content are not guaranteed to be supported.

Dedicated rules for the following sites always take priority. Enabling universal mode does not expand their scope:

| Site | Scope |
| --- | --- |
| X / Twitter | Tweet text |
| GitHub | Repository README and About description |
| Reddit (including old Reddit) | Post titles and bodies, excluding comments |
| GitHub Blog | Article titles and bodies |

## Configuration

Edit `CONFIG` at the top of the script:

| Setting | Default / Description |
| --- | --- |
| `enabled` | `true`; the toggle state is persisted and overrides this default |
| `universal` | `true`; set to `false` to enable only sites with dedicated rules |
| `mode` | `bilingual`; can also be set to `translation-only` |
| `sourceLang` / `targetLang` | `en` / `zh-CN` |
| `skipIfDetectedLangs` | Skips Simplified Chinese paragraphs and paragraphs mixing Chinese and English |
| `blockedUrlPatterns` | URL substring blocklist; matching pages are not translated |
| `provider` | `google`; also supports deepseek, kimi, and minimax |
| `fallbackGoogle` | Falls back to Google if the AI service fails |
| `providers` | API key, model, and baseUrl; the default Google provider requires no key |
| `maxCandidatesPerScan` | `48`; long articles are processed automatically in successive batches |
| `concurrency` | `3`; number of concurrent requests, limited to 1–6 |
| `retryDelayMs` | `30000`; retry interval for failed nodes |
| `siteRules` | Domain-level roots, selectors, exclusions, and rendering options |

The script uses Google’s public translation endpoint by default. Text selected for translation is sent to the configured translation service. Add sites to `blockedUrlPatterns` to exclude them.

## Implementation and Maintenance

Delivered as a single file to avoid additional library dependencies during installation. The code is organized into configuration, site routing, content detection, translation services, queue management, rendering, and page lifecycle handling.

- Preserves compatibility with the existing v3 cache and toggle state.
- Shares in-flight requests for identical text and deduplicates queued scans by node.
- Discards stale responses after translation is paused, navigation occurs, a node is removed, or the original text changes.
- Tracks the source node for each translation to prevent translations from appearing beside the wrong paragraph. Lists and tables retain valid structure.
- Observers ignore the script’s own translations, and scans are throttled to prevent busy pages from continually postponing them.
- Delays retries after request failures and rate-limits error messages. The cache holds up to approximately 3,000 entries.

Development checks:

```sh
npm ci
npm test
```

Tests cover syntax, configuration and routing, positive and negative content-detection cases, site regressions, asynchronous response freshness, request deduplication, list and table structure, complete startup processing across multiple batches, and keyboard shortcuts. jsdom simulates layout dimensions and translation responses, so these tests do not replace verification in Safari with AdGuard.

## Permissions

Uses `GM_getValue`, `GM_setValue`, `GM_addStyle`, `GM_xmlhttpRequest`, and `window.onurlchange`. `@match *://*/*` supports universal mode; `@connect *` supports custom service URLs. The script does not run on PDF pages or in subframes.
