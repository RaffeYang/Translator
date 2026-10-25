// ==UserScript==
// @name         Immersive Bilingual Translator
// @namespace    https://github.com/RaffeYang/adguard-userscripts
// @version      4.0.1
// @description  Conservative article-body bilingual translation on any website, with dedicated X, GitHub and Reddit rules.
// @author       RaffeYang + Codex
// @match        *://*/*
// @exclude      *://*/*.pdf
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        window.onurlchange
// @connect      translate.googleapis.com
// @connect      api.deepseek.com
// @connect      api.moonshot.cn
// @connect      api.minimaxi.com
// @connect      api.minimax.io
// @connect      *
// ==/UserScript==

(function () {
  'use strict';

  /*
   * ===== User Config (edit here) =====
   * All runtime behavior is controlled by this object.
   *
   * Universal mode detects article content on all websites.
   * Dedicated site rules take priority and keep their narrow scope.
   */
  const CONFIG = {
    // Global switch. Hotkey Alt+T toggles this at runtime.
    enabled: true,

    // Automatically translate confidently identified article content.
    // Set false to limit translation to the dedicated site rules below.
    universal: true,

    // Display mode: 'bilingual' | 'translation-only'
    mode: 'bilingual',

    // Translation direction.
    // sourceLang supports: 'auto' | 'en' | 'zh-CN' | 'ja' | 'ko' | 'fr' | 'de' | 'es'
    // targetLang supports: same as above (except 'auto' is not recommended for target).
    // Default requested: English -> Simplified Chinese.
    sourceLang: 'en',
    targetLang: 'zh-CN',

    // Skip translation when detected language is in this list.
    // Supported values: 'zh-CN', 'en', 'mixed', 'unknown'.
    // Default requested: do not translate Simplified Chinese.
    skipIfDetectedLangs: ['zh-CN', 'mixed'],

    // Minimum trimmed text length before translation.
    minChars: 8,
    maxCandidatesPerScan: 48,
    concurrency: 3,
    retryDelayMs: 30000,
    spaHeartbeatMs: 2400,
    spaForceRescanMs: 10000,

    // If URL contains any of these substrings, skip translation.
    blockedUrlPatterns: [],

    // Provider: 'google' | 'deepseek' | 'kimi' | 'minimax'
    provider: 'google',

    // If AI provider fails, fallback to Google.
    fallbackGoogle: true,

    // Provider-specific API config.
    providers: {
      google: {
        // Google public endpoint does not require key.
        apiKey: '',
        model: '',
        baseUrl: '',
      },
      deepseek: {
        apiKey: '',
        model: 'deepseek-chat',
        baseUrl: 'https://api.deepseek.com',
      },
      kimi: {
        apiKey: '',
        model: 'moonshot-v1-8k',
        baseUrl: 'https://api.moonshot.cn/v1',
      },
      minimax: {
        apiKey: '',
        model: 'MiniMax-M2.5',
        baseUrl: 'https://api.minimaxi.com/v1',
      },
    },

    // Site-specific extraction rules.
    // selectors: extra CSS selectors for text blocks.
    // minChars: override global minChars for this host.
    siteRules: {
      'github.com': {
        "roots": [
                'react-app[app-name="code-view"] article.markdown-body',
                "#readme",
                "[data-testid=\"readme\"]",
                "#readme-toc",
                ".Layout-sidebar"
        ],
        "selectors": [
                'react-app[app-name="code-view"] article.markdown-body p',
                'react-app[app-name="code-view"] article.markdown-body h1',
                'react-app[app-name="code-view"] article.markdown-body h2',
                'react-app[app-name="code-view"] article.markdown-body h3',
                'react-app[app-name="code-view"] article.markdown-body h4',
                'react-app[app-name="code-view"] article.markdown-body h5',
                'react-app[app-name="code-view"] article.markdown-body h6',
                'react-app[app-name="code-view"] article.markdown-body li',
                'react-app[app-name="code-view"] article.markdown-body blockquote',
                'react-app[app-name="code-view"] article.markdown-body td',
                'react-app[app-name="code-view"] article.markdown-body th',
                "#readme .markdown-body p",
                "#readme .markdown-body h1",
                "#readme .markdown-body h2",
                "#readme .markdown-body h3",
                "#readme .markdown-body h4",
                "#readme .markdown-body h5",
                "#readme .markdown-body h6",
                "#readme .markdown-body li",
                "#readme .markdown-body blockquote",
                "#readme .markdown-body td",
                "#readme .markdown-body th",
                "[data-testid=\"readme\"] .markdown-body p",
                "[data-testid=\"readme\"] .markdown-body h1",
                "[data-testid=\"readme\"] .markdown-body h2",
                "[data-testid=\"readme\"] .markdown-body h3",
                "[data-testid=\"readme\"] .markdown-body h4",
                "[data-testid=\"readme\"] .markdown-body h5",
                "[data-testid=\"readme\"] .markdown-body h6",
                "[data-testid=\"readme\"] .markdown-body li",
                "[data-testid=\"readme\"] .markdown-body blockquote",
                "[data-testid=\"readme\"] .markdown-body td",
                "[data-testid=\"readme\"] .markdown-body th",
                "#readme-toc .markdown-body p",
                "#readme-toc .markdown-body h1",
                "#readme-toc .markdown-body h2",
                "#readme-toc .markdown-body h3",
                "#readme-toc .markdown-body h4",
                "#readme-toc .markdown-body h5",
                "#readme-toc .markdown-body h6",
                "#readme-toc .markdown-body li",
                "#readme-toc .markdown-body blockquote",
                "#readme-toc .markdown-body td",
                "#readme-toc .markdown-body th",
                "[itemprop=\"about\"]",
                ".Layout-sidebar p.f4.my-3"
        ],
        "mergeDefaultRoots": false,
        "mergeBaseSelectors": false,
        "allowShortText": true,
        "minChars": 2,
        "allowNonArticleSelectors": [
                "[itemprop=\"about\"]",
                ".Layout-sidebar p.f4.my-3"
        ],
        "excludeSelectors": [
                "pre",
                "code",
                ".js-comment-container",
                ".comment-body",
                ".js-discussion",
                ".Box-header",
                "nav"
        ]
},
      'github.blog': {
        roots: ['main > article:first-of-type', 'main article.editorial-typography'],
        selectors: ['article h1', 'article h2', 'article h3', 'article p', 'article li', 'article blockquote', '.entry-content p', '.entry-content h2', '.entry-content h3', '.entry-content li', '.article-body p'],
        mergeDefaultRoots: false,
        mergeBaseSelectors: false,
        allowShortText: true,
        allowNonArticleSelectors: ['article header h1'],
        excludeSelectors: ['nav', 'aside', 'footer', 'pre', 'code', 'article article', '.related-posts', '.ChangelogItem'],
      },
      'reddit.com': {
        "roots": [
                "shreddit-post",
                ".Post",
                ".thing.link"
        ],
        "selectors": [
                "shreddit-post [slot=\"title\"]",
                "shreddit-post [slot=\"full-post-link\"]",
                "shreddit-post [id$=\"-post-title\"]",
                "shreddit-post [slot=\"text-body\"] p",
                "shreddit-post [slot=\"text-body\"] h1",
                "shreddit-post [slot=\"text-body\"] h2",
                "shreddit-post [slot=\"text-body\"] h3",
                "shreddit-post [slot=\"text-body\"] li",
                "shreddit-post [slot=\"text-body\"] blockquote",
                ".Post [data-testid=\"post-title\"]",
                ".Post h3",
                ".Post [data-click-id=\"text\"] p",
                ".Post [data-click-id=\"text\"] li",
                ".Post [data-click-id=\"text\"] blockquote",
                ".thing.link .top-matter a.title",
                ".thing.link .usertext-body .md p",
                ".thing.link .usertext-body .md li",
                ".thing.link .usertext-body .md blockquote"
        ],
        "mergeDefaultRoots": false,
        "mergeBaseSelectors": false,
        "allowShortText": true,
        "allowLinkDenseText": true,
        "minChars": 2,
        "excludeSelectors": [
                "shreddit-comment",
                "[slot=\"comments\"]",
                ".Comment",
                ".comment",
                ".commentarea",
                "[data-testid=\"comment\"]",
                "pre",
                "code"
        ]
},
      'x.com': {
        selectors: [
          'article[data-testid="tweet"] [data-testid="tweetText"]',
          'article [data-testid="tweetText"]',
          'div[data-testid="tweetText"]',
          'article[data-testid="tweet"] div[lang]',
          'div[lang][dir="auto"]',
        ],
        roots: ['[data-testid="primaryColumn"]', '[data-testid="cellInnerDiv"]', 'article[data-testid="tweet"]', 'main[role="main"]', 'main'],
        mergeDefaultRoots: true,
        mergeBaseSelectors: false,
        allowLooseRoots: true,
        allowLinkDenseText: true,
        allowShortText: true,
        minChars: 2,
      },
      'twitter.com': {
        selectors: [
          'article[data-testid="tweet"] [data-testid="tweetText"]',
          'article [data-testid="tweetText"]',
          'div[data-testid="tweetText"]',
          'article[data-testid="tweet"] div[lang]',
          'div[lang][dir="auto"]',
        ],
        roots: ['[data-testid="primaryColumn"]', '[data-testid="cellInnerDiv"]', 'article[data-testid="tweet"]', 'main[role="main"]', 'main'],
        mergeDefaultRoots: true,
        mergeBaseSelectors: false,
        allowLooseRoots: true,
        allowLinkDenseText: true,
        allowShortText: true,
        minChars: 2,
      },
    },
  };

  const STORAGE_KEYS = {
    cache: 'rf_cache_v3',
    enabledOverride: 'rf_enabled_override_v3',
  };

  const PROVIDER_META = {
    google: { needsKey: false },
    deepseek: { needsKey: true },
    kimi: { needsKey: true },
    minimax: { needsKey: true },
  };

  const BASE_SELECTORS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'figcaption', 'td', 'th', 'dt', 'dd'];
  const ARTICLE_ROOT_SELECTORS = [
    'article', '[role="article"]', '[itemprop="articleBody"]', '.markdown-body', '.prose',
    '.entry-content', '.post-content', '.article-content', '.article-body',
    '.post-body', '.docs-content', '.documentation', '.doc-content',
    '.theme-doc-markdown', '.md-content', '.editorial-content-block', '.PostContent-main',
  ];
  const DEFAULT_CONTENT_ROOT_SELECTORS = [...ARTICLE_ROOT_SELECTORS, 'main', '[role="main"]', '#main', '#content', '.main-content'];
  const BLOCK_SELECTOR = BASE_SELECTORS.join(',');
  const CHROME_SELECTORS = 'nav,aside,footer,form,[role="navigation"],[role="complementary"],[role="dialog"],[role="menu"],[role="toolbar"],[role="contentinfo"],[role="button"],button';
  const CHROME_TOKEN = /(^|[\s_-])(sidebar|toc|table-of-contents|breadcrumb|breadcrumbs|pagination|navbar|menu|toolbar|cookie|captcha|advertisement|advert|related|recommended|recommendations|comments?|commentarea|disqus|byline|social|share|sharing|newsletter|subscribe)(?=$|[\s_-])/i;

  const IGNORE_SELECTORS = [
    'script',
    'style',
    'noscript',
    'textarea',
    'label',
    '[role="status"]',
    'input',
    'select',
    'button',
    'code',
    'pre',
    'kbd',
    'samp',
    'svg',
    'canvas',
    'math',
    '[contenteditable="true"]',
    '.rf-translation-block',
  ].join(',');

  const state = {
    enabled: CONFIG.enabled,
    cache: {},
    queue: [],
    running: false,
    observer: null,
    scanTimer: null,
    lastUrl: location.href,
    theme: 'light',
    themeTimer: null,
    heartbeatTimer: null,
    lastHeartbeatScanAt: 0,
    contentRoots: [],
    lastViewSignature: '',
    generation: 0,
    queued: new WeakSet(),
    failures: new WeakMap(),
    inFlight: new Map(),
    blocks: new Map(),
    lastErrorAt: 0,
  };

  let processedTexts = new WeakMap();

  function gmGetValue(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') return Promise.resolve(GM_getValue(key, fallback));
      if (typeof GM !== 'undefined' && GM.getValue) return Promise.resolve(GM.getValue(key, fallback));
    } catch (e) {
      // ignore
    }
    return Promise.resolve(fallback);
  }

  function gmSetValue(key, value) {
    try {
      if (typeof GM_setValue === 'function') return Promise.resolve(GM_setValue(key, value));
      if (typeof GM !== 'undefined' && GM.setValue) return Promise.resolve(GM.setValue(key, value));
    } catch (e) {
      // ignore
    }
    return Promise.resolve();
  }

  function gmAddStyle(css) {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css);
      return;
    }
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function gmRequest(details) {
    return new Promise((resolve, reject) => {
      const req = typeof GM_xmlhttpRequest === 'function'
        ? GM_xmlhttpRequest
        : (typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function' ? GM.xmlHttpRequest : null);
      if (!req) {
        reject(new Error('No GM_xmlhttpRequest available'));
        return;
      }
      req({
        method: details.method || 'GET',
        url: details.url,
        headers: details.headers || {},
        data: details.data,
        timeout: details.timeout || 20000,
        onload: (res) => resolve(res),
        onerror: (err) => reject(err),
        ontimeout: () => reject(new Error('Request timeout')),
      });
    });
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function isLikelyUrlLikeText(text) {
    const t = normalizeText(text);
    if (!t) return false;
    if (/^https?:\/\//i.test(t)) return true;
    if (/^(www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i.test(t)) return true;
    if (/^[A-Za-z0-9._~%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(t)) return true;
    if (/^[A-Za-z0-9-]+(\s*[>\/›]\s*[A-Za-z0-9._~%-]+){1,}$/.test(t)) return true;
    if (!/\s/.test(t) && /[./]/.test(t) && /[A-Za-z]/.test(t) && !/[，。！？,.!?]/.test(t)) return true;
    return false;
  }

  function isXHost() {
    const host = location.hostname;
    return host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com');
  }

  function statusTip(text, timeoutMs) {
    const old = document.querySelector('#rf-tip');
    if (old) old.remove();
    const tip = document.createElement('div');
    tip.id = 'rf-tip';
    tip.className = 'rf-tip';
    tip.textContent = text;
    document.documentElement.appendChild(tip);
    setTimeout(() => {
      if (tip.parentNode) tip.remove();
    }, timeoutMs || 2200);
  }

  // Routing and extraction are separate: universal never widens dedicated rules.
  function isAllowedPage() {
    if (!/^https?:/.test(location.href)) return false;
    if (CONFIG.blockedUrlPatterns.some((p) => p && location.href.includes(p))) return false;
    if (getSiteRule()) return true;
    return !!CONFIG.universal;
  }

  // Master gate for every scan trigger.
  function isActive() {
    return state.enabled && isAllowedPage();
  }

  function getSiteRuleEntry() {
    const host = location.hostname;
    const rules = CONFIG.siteRules || {};
    const keys = Object.keys(rules).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (host === key || host.endsWith(`.${key}`)) return { key, rule: rules[key] || null };
    }
    return null;
  }

  function getSiteRule() {
    const entry = getSiteRuleEntry();
    return entry ? entry.rule : null;
  }

  function setHostDataset() {
    const entry = getSiteRuleEntry();
    if (entry && entry.key) {
      document.documentElement.dataset.rfHostKey = entry.key;
    } else {
      delete document.documentElement.dataset.rfHostKey;
    }
  }

  function getSelectors() {
    const rule = getSiteRule();
    const extra = rule && Array.isArray(rule.selectors) ? rule.selectors : [];
    if (extra.length && rule && rule.mergeBaseSelectors === false) return [...new Set(extra)].join(',');
    return [...new Set([...BASE_SELECTORS, ...extra])].join(',');
  }

  function getRootSelectors() {
    const rule = getSiteRule();
    const extra = rule && Array.isArray(rule.roots) ? rule.roots : [];
    if (extra.length && rule && rule.mergeDefaultRoots === false) return [...new Set(extra)];
    if (extra.length && rule && rule.mergeDefaultRoots !== true) return [...new Set(extra)];
    return [...new Set([...extra, ...DEFAULT_CONTENT_ROOT_SELECTORS])];
  }

  function sourceText(el) {
    if (!el) return '';
    const copy = el.cloneNode(true);
    copy.querySelectorAll('.rf-translation-block,script,style,button,[hidden],[aria-hidden="true"]').forEach((node) => node.remove());
    return normalizeText(copy.textContent);
  }

  function isHidden(el) {
    if (el.closest('[hidden],[aria-hidden="true"],[inert]')) return true;
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return true;
    }
    return false;
  }

  function isChromeElement(el) {
    if (el.matches(CHROME_SELECTORS)) return true;
    const marker = (String(el.className || '') + ' ' + el.id)
      .replace(/\b(?:no|fixed|flex)-sidebar\b/gi, '')
      .replace(/\b(?:js-)?table-of-contents-source\b/gi, '');
    if (CHROME_TOKEN.test(marker)) return true;
    const label = el.getAttribute('aria-label') || '';
    return /\b(breadcrumb|sidebar|navigation|table of contents|share|menu)\b/i.test(label);
  }

  function resolveContentRoots() {
    const rule = getSiteRule();
    const selectors = getRootSelectors();
    const candidates = [...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
    if (rule) {
      state.contentRoots = candidates.filter((el) => !el.closest(IGNORE_SELECTORS));
      return;
    }
    // Fallback for sites without article/main markup: score paragraph parents,
    // never the entire body. Bound traversal on very large application pages.
    for (const paragraph of [...document.querySelectorAll('p')].slice(0, 800)) {
      let parent = paragraph.parentElement;
      for (let depth = 0; parent && parent !== document.body && depth < 3; depth += 1, parent = parent.parentElement) {
        if (!candidates.includes(parent)) candidates.push(parent);
      }
    }
    const ranked = candidates.filter((el) => isLikelyArticleRoot(el));
    const articles = ranked.filter((el) =>
      (el.tagName === 'ARTICLE' && !el.querySelector('article'))
      || (el.matches('[role="article"]') && el.querySelector('h1')));
    const semantic = ranked.filter((el) => el.matches([...ARTICLE_ROOT_SELECTORS, 'main', '[role="main"]'].join(',')));
    const preferred = semantic.filter((el) => {
      if (articles.includes(el)) return true;
      if (articles.some((article) => article.contains(el))) return false;
      return !semantic.some((other) => other !== el && el.contains(other));
    });
    const specific = [...preferred, ...ranked.filter((el) =>
      !preferred.some((root) => root.contains(el) || el.contains(root))
      && !ranked.some((other) => other !== el && el.contains(other)))];
    state.contentRoots = specific.sort((a, b) => sourceText(b).length - sourceText(a).length).slice(0, 12);
    // Documentation frameworks often put the page title beside the body root.
    // Include only an unambiguous title in the same semantic main container.
    for (const root of [...state.contentRoots]) {
      const main = root.closest('main,[role="main"]');
      if (!main) continue;
      const titles = [...main.querySelectorAll('h1')].filter((el) =>
        !isInNonArticleRegion(el) && !isHidden(el));
      if (titles.length === 1 && !isInsideMainContent(titles[0])) state.contentRoots.push(titles[0]);
    }
  }

  function isInsideMainContent(el) {
    return state.contentRoots.some((root) => root.contains(el));
  }

  function getMinChars() {
    const rule = getSiteRule();
    if (rule && typeof rule.minChars === 'number') return Math.max(1, rule.minChars);
    return Math.max(1, Number(CONFIG.minChars || 1));
  }

  function getRenderMode() {
    const rule = getSiteRule();
    const mode = rule && typeof rule.renderMode === 'string' ? rule.renderMode : '';
    if (mode === 'inline-after' || mode === 'compact-after') return mode;
    return 'block-after';
  }

  function getExcludeSelectors() {
    const rule = getSiteRule();
    return rule && Array.isArray(rule.excludeSelectors) ? rule.excludeSelectors.filter(Boolean).join(',') : '';
  }

  function closestSiteExcludedElement(el) {
    const selectors = getExcludeSelectors();
    if (!selectors || !el || !el.closest) return null;
    try {
      return el.closest(selectors);
    } catch (e) {
      return null;
    }
  }

  function detectTextLang(text) {
    const t = normalizeText(text);
    if (!t) return 'unknown';
    const han = (t.match(/[\u4e00-\u9fff]/g) || []).length;
    const latin = (t.match(/[A-Za-z]/g) || []).length;

    if (han >= 2 && latin >= 2) return 'mixed';
    if (han >= 2 && han >= latin) return 'zh-CN';
    if (latin >= 2 && latin > han) return 'en';
    return 'unknown';
  }

  function shouldSkipByLang(text) {
    const list = Array.isArray(CONFIG.skipIfDetectedLangs) ? CONFIG.skipIfDetectedLangs : [];
    if (!list.length) return false;
    const detected = detectTextLang(text);
    return list.includes(detected);
  }

  function allowsNonArticleText(el) {
    const rule = getSiteRule();
    return !!(rule && Array.isArray(rule.allowNonArticleSelectors)
      && rule.allowNonArticleSelectors.some((selector) => el.matches(selector)));
  }

  function isInNonArticleRegion(el) {
    const allow = allowsNonArticleText(el);
    for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      if (getSiteRuleEntry()?.key === 'github.com' && node.id === 'readme-toc') continue;
      if (allow && node.matches('.Layout-sidebar,aside,header')) continue;
      if (isChromeElement(node)) return true;
      // An article header can contain the article title, but not its metadata.
      if (node.tagName === 'HEADER' && !allow && !(/^H[1-6]$/.test(el.tagName) && node.closest('article'))) return true;
      // Layout ancestors outside an identified root must not suppress its text.
      if (state.contentRoots.includes(node) || node.matches('main,[role="main"]')) break;
    }
    return false;
  }

  function isLikelyArticleRoot(el) {
    if (!el || !(el instanceof Element) || el === document.body || el === document.documentElement) return false;
    if (el.closest(IGNORE_SELECTORS) || isInNonArticleRegion(el) || isHidden(el)) return false;
    const article = el.closest('article');
    const collection = article && (article.closest('main,[role="main"]') || article.parentElement);
    if (article && !article.querySelector('h1') && collection?.querySelectorAll('article').length > 1) return false;
    const paragraphs = [...el.querySelectorAll('p')].filter((p) =>
      !p.closest(IGNORE_SELECTORS) && !isInNonArticleRegion(p) && !isHidden(p));
    const lengths = paragraphs.map((p) => {
      const text = sourceText(p);
      const links = [...p.querySelectorAll('a')].reduce((sum, link) => sum + sourceText(link).length, 0);
      return text.length >= 60 && links / Math.max(1, text.length) < 0.5 ? text.length : 0;
    });
    const longCount = lengths.filter(Boolean).length;
    const chars = lengths.reduce((sum, value) => sum + value, 0);
    const semantic = el.matches(ARTICLE_ROOT_SELECTORS.join(','));
    const hasTitle = !!el.querySelector('h1');
    if (el.tagName === 'ARTICLE' && !hasTitle && longCount < 2) return false;
    if (!semantic && el.querySelectorAll('article').length > 1 && !hasTitle) return false;
    // Short semantic articles need a real title; broad wrappers require two
    // substantial paragraphs. Teaser collections do not qualify as one story.
    return semantic ? chars >= 120 && longCount >= 1 : chars >= 240 && longCount >= 2;
  }

  function parseErrorText(res) {
    const status = res && typeof res.status === 'number' ? res.status : 0;
    const body = res && res.responseText ? String(res.responseText).slice(0, 220) : '';
    if (status) return `HTTP ${status}${body ? `: ${body}` : ''}`;
    return body || 'request failed';
  }

  function getViewSignature() {
    const host = location.hostname;
    const title = normalizeText(document.title || '');

    if (isXHost()) {
      const selectedTabs = Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]'))
        .map((el) => normalizeText(el.innerText || el.textContent || ''))
        .filter(Boolean)
        .join('|');
      const activeNav = Array.from(document.querySelectorAll('[aria-current="page"],[aria-selected="true"]'))
        .slice(0, 6)
        .map((el) => normalizeText(el.innerText || el.textContent || ''))
        .filter(Boolean)
        .join('|');
      const primary = document.querySelector('[data-testid="primaryColumn"]') || document.querySelector('main[role="main"]') || document.querySelector('main');
      const primaryHeadingEl = primary ? primary.querySelector('h1,[role="heading"]') : null;
      const primaryHeading = primaryHeadingEl ? normalizeText(primaryHeadingEl.innerText || primaryHeadingEl.textContent || '') : '';
      return `x:${location.pathname}?${location.search}::${title}::${selectedTabs}::${activeNav}::${primaryHeading}`;
    }
    // For other sites like YouTube, simplify signature to avoid accidental clears
    return `g:${location.pathname}?${location.search}::${title}`;
  }

  function onViewMaybeChanged() {
    const sig = getViewSignature();
    if (!sig) return;
    if (!state.lastViewSignature) {
      state.lastViewSignature = sig;
      return;
    }
    if (sig !== state.lastViewSignature) {
      // Only clear if the path/search (the actual page content) changed significantly
      const oldPath = state.lastViewSignature.split('::')[0];
      const newPath = sig.split('::')[0];
      if (oldPath !== newPath) {
        clearTranslatedNodes();
      }
      state.lastViewSignature = sig;
      if (isActive()) scheduleScan(document);
    }
  }

  function setupHeartbeat() {
    if (state.heartbeatTimer) clearInterval(state.heartbeatTimer);
    const everyMs = Math.max(1200, Number(CONFIG.spaHeartbeatMs || 2400));
    const forceMs = Math.max(everyMs, Number(CONFIG.spaForceRescanMs || 10000));
    state.heartbeatTimer = setInterval(() => {
      if (!isActive()) return;
      if (document.visibilityState && document.visibilityState !== 'visible') return;

      onViewMaybeChanged();

      const now = Date.now();
      if (!state.lastHeartbeatScanAt || now - state.lastHeartbeatScanAt >= forceMs) {
        state.lastHeartbeatScanAt = now;
        scheduleScan(document);
      }
    }, everyMs);
  }

  function getProviderConfig(name) {
    return CONFIG.providers[name] || { apiKey: '', model: '', baseUrl: '' };
  }

  function cacheKey(text) {
    return `${CONFIG.provider}::${CONFIG.sourceLang}::${CONFIG.targetLang}::${text}`;
  }

  async function saveCache() {
    const entries = Object.entries(state.cache);
    if (entries.length > 3000) {
      state.cache = Object.fromEntries(entries.slice(entries.length - 2200));
    }
    await gmSetValue(STORAGE_KEYS.cache, state.cache);
  }

  async function translateViaGoogle(text) {
    const sl = encodeURIComponent(CONFIG.sourceLang || 'auto');
    const tl = encodeURIComponent(CONFIG.targetLang || 'zh-CN');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await gmRequest({ url, timeout: 15000 });
    if (!res || res.status < 200 || res.status >= 300) throw new Error(parseErrorText(res));
    const data = JSON.parse((res && res.responseText) || '[]');
    if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Google response format error');
    return data[0].map((it) => (it && it[0]) ? it[0] : '').join('').trim();
  }

  function getProviderEndpoint(provider) {
    const cfg = getProviderConfig(provider);
    const base = String(cfg.baseUrl || '').replace(/\/+$/, '');
    if (!base) throw new Error(`${provider} baseUrl missing`);
    if (provider === 'deepseek' || provider === 'kimi') return `${base}/chat/completions`;
    if (provider === 'minimax') return `${base}/text/chatcompletion_v2`;
    throw new Error(`unsupported provider: ${provider}`);
  }

  function extractAiText(data) {
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
      return content.map((p) => (typeof p === 'string' ? p : (p && p.text ? p.text : ''))).join('').trim();
    }
    if (data && typeof data.reply === 'string') return data.reply.trim();
    if (data && typeof data.output === 'string') return data.output.trim();
    return '';
  }

  async function translateViaAi(provider, text) {
    const cfg = getProviderConfig(provider);
    if (!PROVIDER_META[provider] || !PROVIDER_META[provider].needsKey) {
      throw new Error('provider does not need AI endpoint');
    }
    if (!cfg.apiKey) throw new Error(`${provider} apiKey missing`);

    const body = {
      model: cfg.model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional translation engine. Return translation only, no explanation, no markdown.',
        },
        {
          role: 'user',
          content: `Translate from ${CONFIG.sourceLang || 'auto'} to ${CONFIG.targetLang}. Keep meaning and structure:\n\n${text}`,
        },
      ],
      temperature: 0.2,
      stream: false,
    };

    const res = await gmRequest({
      method: 'POST',
      url: getProviderEndpoint(provider),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      data: JSON.stringify(body),
      timeout: 25000,
    });
    if (!res || res.status < 200 || res.status >= 300) throw new Error(parseErrorText(res));

    const data = JSON.parse((res && res.responseText) || '{}');
    const out = extractAiText(data);
    if (!out) throw new Error(`${provider} empty response`);
    return out;
  }

  async function requestTranslation(text) {
    const key = cacheKey(text);
    if (state.cache[key]) return state.cache[key];

    let translated = '';
    try {
      if (CONFIG.provider === 'google') translated = await translateViaGoogle(text);
      else translated = await translateViaAi(CONFIG.provider, text);
    } catch (e) {
      if (CONFIG.provider !== 'google' && CONFIG.fallbackGoogle) {
        translated = await translateViaGoogle(text);
      } else {
        throw e;
      }
    }

    state.cache[key] = translated || text;
    return state.cache[key];
  }

  function translateText(text) {
    const key = cacheKey(text);
    if (state.cache[key]) return Promise.resolve(state.cache[key]);
    if (!state.inFlight.has(key)) {
      const request = requestTranslation(text).finally(() => state.inFlight.delete(key));
      state.inFlight.set(key, request);
    }
    return state.inFlight.get(key);
  }

  function isReadableElement(el) {
    if (!el || !(el instanceof Element)) return false;
    if (el.dataset.rfTranslated === '1') return false;

    const text = sourceText(el);
    if (processedTexts.get(el) === text) return false;
    if (state.queued.has(el)) return false;
    const failure = state.failures.get(el);
    if (failure && failure.text === text && Date.now() - failure.at < CONFIG.retryDelayMs) return false;

    const rule = getSiteRule();
    const allowLinkDenseText = !!(rule && rule.allowLinkDenseText);
    const allowShortText = !!(rule && rule.allowShortText);
    const onX = isXHost();
    if (el.closest(IGNORE_SELECTORS) || isHidden(el)) return false;
    if (isInNonArticleRegion(el)) return false;
    if (closestSiteExcludedElement(el)) return false;
    if (!isInsideMainContent(el)) return false;
    if (!onX && el.querySelector('input,select,textarea')) return false;
    if (!onX && el.querySelector(BLOCK_SELECTOR)) return false;
    if (onX) {
      const tweet = el.closest('article[data-testid="tweet"]');
      if (!tweet) return false;
      const outerTweetText = el.closest('[data-testid="tweetText"]');
      if (outerTweetText && outerTweetText !== el) return false;
    }

    if (!text || text.length < getMinChars()) return false;
    if (isLikelyUrlLikeText(text)) return false;
    if (processedTexts.get(el) === text && el.dataset.rfOriginal === '1') return false;
    if (/^[\d\s\W_]+$/.test(text)) return false;
    if (shouldSkipByLang(text)) return false;

    const detectedLang = detectTextLang(text);
    // If sourceLang is explicit, skip text that clearly does not match.
    if (CONFIG.sourceLang === 'en' && detectedLang === 'zh-CN') return false;
    if (CONFIG.sourceLang === 'zh-CN' && detectedLang === 'en') return false;

    const rect = el.getBoundingClientRect();
    if (rect.width < 30 || rect.height < 8) return false;

    // Skip UI-like blocks where link text dominates (TOC, cards, nav lists, action rows).
    const allTextLen = text.length;
    let linkTextLen = 0;
    const links = el.querySelectorAll('a');
    for (const a of links) {
      const t = normalizeText(a.innerText || a.textContent || '');
      linkTextLen += t.length;
    }
    if (!allowLinkDenseText && !/^H[1-6]$/.test(el.tagName) && allTextLen >= 12 && linkTextLen / allTextLen > 0.6) return false;

    // Prefer sentence-like content; short UI labels are usually not正文.
    if (!allowShortText && allTextLen < 28 && !/[，。；：！？,.!?;:]/.test(text) && !/^H[1-3]$/.test(el.tagName)) return false;
    return true;
  }

  function collectCandidates(root) {
    const nodes = new Set();
    const selectors = getSelectors();
    for (const scope of state.contentRoots) {
      if (scope.matches?.(selectors)) nodes.add(scope);
      scope.querySelectorAll(selectors).forEach((el) => nodes.add(el));
    }
    // Resolve overlapping scopes before limiting the batch, so separately
    // identified titles are not starved behind hundreds of body paragraphs.
    const ordered = [...nodes].sort((a, b) =>
      a === b ? 0 : a.compareDocumentPosition(b) & 4 ? -1 : 1);
    const list = [];
    for (const el of ordered) {
      if (!isReadableElement(el)) continue;
      list.push(el);
      if (list.length >= Math.max(12, Number(CONFIG.maxCandidatesPerScan || 48))) break;
    }
    return list;
  }

  function findTranslationNode(el) {
    const block = state.blocks.get(el);
    return block && block.isConnected ? block : null;
  }

  function createTranslationNode(sourceEl, text) {
    const renderMode = getRenderMode();
    const node = document.createElement('span');
    node.className = 'rf-translation-block';
    node.classList.add(`rf-render-${renderMode}`);
    node.dataset.rfTranslated = '1';
    // Direct light-DOM children must retain their named slot to remain visible.
    if (sourceEl.hasAttribute('slot')) node.setAttribute('slot', sourceEl.getAttribute('slot'));
    node.textContent = text;
    if (/^H[1-6]$/.test(sourceEl.tagName)) node.classList.add('rf-heading-translation');
    return node;
  }

  function applyMode() {
    document.documentElement.dataset.rfMode = CONFIG.mode === 'translation-only' ? 'translation-only' : 'bilingual';
  }

  async function translateAndRender(el) {
    const originalText = sourceText(el);
    if (!originalText || !isActive()) return;
    const generation = state.generation;
    const url = location.href;
    try {
      const translated = await translateText(originalText);
      if (!translated || !isActive() || generation !== state.generation || url !== location.href
        || !el.isConnected || sourceText(el) !== originalText || !isInsideMainContent(el)
        || isHidden(el) || isInNonArticleRegion(el) || closestSiteExcludedElement(el)) return;
      processedTexts.set(el, originalText);
      el.dataset.rfOriginal = '1';
      let block = findTranslationNode(el);
      if (!block) {
        block = createTranslationNode(el, translated);
        state.blocks.set(el, block);
        // Keep table/list markup valid, and keep ordinary paragraphs as siblings.
        if (/^(LI|TD|TH|DT|DD)$/.test(el.tagName)) {
          el.dataset.rfContainsTranslation = '1';
          el.appendChild(block);
        } else el.insertAdjacentElement('afterend', block);
      } else block.textContent = translated;
      state.failures.delete(el);
    } catch (error) {
      if (generation !== state.generation || !isActive() || !el.isConnected) return;
      state.failures.set(el, { text: originalText, at: Date.now() });
      if (Date.now() - state.lastErrorAt > 5000) {
        state.lastErrorAt = Date.now();
        statusTip('翻译失败: ' + (error?.message || '请求失败'), 2600);
      }
    }
  }

  async function runQueue() {
    if (state.running) return;
    state.running = true;
    try {
      const workers = Array.from({ length: Math.max(1, Math.min(6, CONFIG.concurrency)) }, async () => {
        while (state.queue.length && isActive()) {
          const job = state.queue.shift();
          try {
            if (job.generation === state.generation && job.el.isConnected) await translateAndRender(job.el);
          } finally { job.queued.delete(job.el); }
        }
      });
      await Promise.all(workers);
      await saveCache();
    } finally { state.running = false; }
    // Drain long articles in bounded batches, even without another DOM mutation.
    if (isActive()) scheduleScan(document);
  }

  function cleanStaleBlocks() {
    for (const [el, block] of state.blocks) {
      if (!el.isConnected || !block.isConnected || sourceText(el) !== processedTexts.get(el)
        || isInNonArticleRegion(el) || closestSiteExcludedElement(el)
        || (CONFIG.mode !== 'translation-only' && isHidden(el))) {
        block.remove();
        el.removeAttribute('data-rf-original');
        el.removeAttribute('data-rf-contains-translation');
        processedTexts.delete(el);
        state.blocks.delete(el);
      }
    }
  }

  function scheduleScan(root) {
    if (!isActive() || state.scanTimer) return;
    // Throttle instead of resetting a debounce on every busy-page mutation.
    state.scanTimer = setTimeout(() => {
      state.scanTimer = null;
      if (!isActive()) return;
      cleanStaleBlocks();
      resolveContentRoots();
      const candidates = collectCandidates(root || document);
      for (const el of candidates) {
        state.queued.add(el);
        state.queue.push({ el, generation: state.generation, queued: state.queued });
      }
      if (state.queue.length) runQueue();
    }, 240);
  }

  function clearTranslatedNodes() {
    state.generation += 1;
    if (state.scanTimer) clearTimeout(state.scanTimer);
    state.scanTimer = null;
    document.querySelectorAll('[data-rf-translated="1"]').forEach((node) => node.remove());
    document.querySelectorAll('[data-rf-original="1"]').forEach((node) => {
      node.removeAttribute('data-rf-original');
      node.removeAttribute('data-rf-contains-translation');
    });
    processedTexts = new WeakMap();
    state.blocks.clear();
    state.queue = [];
    state.queued = new WeakSet();
    state.contentRoots = [];
  }

  function parseRgb(rgb) {
    const m = String(rgb || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }

  function luminance(c) {
    if (!c) return 1;
    const v = [c.r, c.g, c.b].map((n) => {
      const s = n / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  function applyTheme() {
    const bodyBg = parseRgb(getComputedStyle(document.body || document.documentElement).backgroundColor);
    const htmlBg = parseRgb(getComputedStyle(document.documentElement).backgroundColor);
    const dark = Math.min(luminance(bodyBg), luminance(htmlBg)) < 0.45;
    state.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.rfTheme = state.theme;
  }

  function setupHotkey() {
    window.addEventListener('keydown', (e) => {
      if (!e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return;
      if (e.code !== 'KeyT' && e.key.toLowerCase() !== 't') return;
      if (e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable="true"]')) return;

      e.preventDefault();
      state.enabled = !state.enabled;
      gmSetValue(STORAGE_KEYS.enabledOverride, state.enabled);

      clearTranslatedNodes();
      if (isActive()) scheduleScan(document);
      statusTip(state.enabled ? '翻译已开启 (Alt+T)' : '翻译已暂停 (Alt+T)');
    }, true);
  }

  function onPageChanged() {
    if (location.href === state.lastUrl) return;
    state.lastUrl = location.href;
    state.lastViewSignature = getViewSignature();
    state.lastHeartbeatScanAt = 0;
    clearTranslatedNodes();
    setHostDataset();
    applyTheme();
    if (isActive()) scheduleScan(document);
  }

  function setupSpaHooks() {
    window.addEventListener('hashchange', onPageChanged);
    window.addEventListener('popstate', onPageChanged);

    if ('onurlchange' in window) {
      window.addEventListener('urlchange', onPageChanged);
    }

    const rawPushState = history.pushState;
    const rawReplaceState = history.replaceState;

    history.pushState = function () {
      const out = rawPushState.apply(this, arguments);
      setTimeout(onPageChanged, 0);
      return out;
    };

    history.replaceState = function () {
      const out = rawReplaceState.apply(this, arguments);
      setTimeout(onPageChanged, 0);
      return out;
    };
  }

  function setupObserver() {
    if (state.observer) state.observer.disconnect();
    state.observer = new MutationObserver((mutations) => {
      if (!isActive()) return;
      for (const m of mutations) {
        const target = m.target instanceof Element ? m.target : m.target.parentElement;
        if (target?.closest('.rf-translation-block,#rf-tip')) continue;
        if (m.type === 'childList' && m.addedNodes.length && [...m.addedNodes].every((node) =>
          node instanceof Element && node.matches('.rf-translation-block,#rf-tip'))) continue;
        if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
          onViewMaybeChanged();
          scheduleScan(document);
          break;
        }
        if (m.type === 'characterData' && m.target && m.target.nodeValue) {
          onViewMaybeChanged();
          scheduleScan(document);
          break;
        }
        if (
          m.type === 'attributes'
          && m.target instanceof Element
          && (m.attributeName === 'aria-selected' || m.attributeName === 'aria-hidden' || m.attributeName === 'class' || m.attributeName === 'style')
          && m.target.closest('[role="tablist"],[data-testid="primaryColumn"],main,[role="main"]')
        ) {
          onViewMaybeChanged();
          scheduleScan(document);
          break;
        }
      }
    });

    state.observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-selected', 'aria-hidden', 'class', 'style'],
    });
  }

  function setupStyles() {
    gmAddStyle(`
      :root {
        --rf-tip-bg: rgba(15, 23, 42, 0.92);
        --rf-tip-fg: #f8fafc;
        --rf-trans-bg: #f8fafc;
        --rf-trans-fg: #1f2937;
        --rf-trans-border: #0f766e;
      }

      html[data-rf-theme='dark'] {
        --rf-tip-bg: rgba(15, 23, 42, 0.96);
        --rf-tip-fg: #e5e7eb;
        --rf-trans-bg: rgba(40, 44, 52, 0.7);
        --rf-trans-fg: #e5e7eb;
        --rf-trans-border: #2dd4bf;
      }

      .rf-tip {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 2147483646;
        padding: 8px 10px;
        border-radius: 8px;
        background: var(--rf-tip-bg);
        color: var(--rf-tip-fg);
        font: 12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif;
      }

      .rf-translation-block {
        display: block;
        box-sizing: border-box;
        overflow-wrap: anywhere;
        margin: 0.35em 0 0.85em;
        padding: 0.45em 0.7em;
        border-left: 3px solid var(--rf-trans-border);
        background: var(--rf-trans-bg);
        color: var(--rf-trans-fg);
        border-radius: 4px;
        line-height: 1.7;
        font-size: 0.96em;
        white-space: pre-wrap;
      }

      .rf-heading-translation {
        font-size: 0.8em;
        margin-top: 0.45em;
      }

      .rf-render-compact-after {
        margin: 0.25em 0 0.6em;
        padding: 0.35em 0.62em;
        line-height: 1.55;
      }

      .rf-render-inline-after {
        display: block;
        margin: 0.25em 0 0.45em;
        padding: 0.25em 0.5em;
        border-left-width: 2px;
        line-height: 1.5;
      }


      html[data-rf-mode='translation-only'] [data-rf-original='1']:not([data-rf-contains-translation]) {
        display: none !important;
      }
      html[data-rf-mode='translation-only'] [data-rf-contains-translation='1'] {
        font-size: 0 !important;
      }
      html[data-rf-mode='translation-only'] [data-rf-contains-translation='1'] > :not(.rf-translation-block) {
        display: none !important;
      }
      html[data-rf-mode='translation-only'] [data-rf-contains-translation='1'] > .rf-translation-block {
        font-size: 14px;
      }
    `);
  }

  async function init() {
    // Stay completely dormant on pages we never translate (universal off + not a
    // dedicated site). Avoids installing styles/observers/timers globally.
    if (!isAllowedPage()) return;

    const [cache, enabledOverride] = await Promise.all([
      gmGetValue(STORAGE_KEYS.cache, {}),
      gmGetValue(STORAGE_KEYS.enabledOverride, null),
    ]);

    state.cache = cache && typeof cache === 'object' ? cache : {};
    state.enabled = typeof enabledOverride === 'boolean' ? enabledOverride : !!CONFIG.enabled;

    setupStyles();
    applyMode();
    setHostDataset();
    applyTheme();
    if (state.themeTimer) clearInterval(state.themeTimer);
    state.themeTimer = setInterval(applyTheme, 1800);

    setupHotkey();
    setupObserver();
    setupSpaHooks();
    setupHeartbeat();
    state.lastViewSignature = getViewSignature();
    state.lastHeartbeatScanAt = Date.now();

    window.addEventListener('visibilitychange', () => {
      if (!isActive()) return;
      if (document.visibilityState === 'visible') {
        onViewMaybeChanged();
        scheduleScan(document);
      }
    });
    window.addEventListener('focus', () => {
      if (!isActive()) return;
      onViewMaybeChanged();
      scheduleScan(document);
    });
    window.addEventListener('pageshow', () => {
      if (!isActive()) return;
      onViewMaybeChanged();
      scheduleScan(document);
    });

    if (isActive()) scheduleScan(document);
  }

  // Startup marker so you can confirm in DevTools which build is live.
  // Verify this version after replacing the installed script in AdGuard.
  try {
    console.info(`[Immersive Bilingual] v4.0.1 · universal=${CONFIG.universal} · ${location.hostname}`);
  } catch (e) {
    // ignore
  }

  init();
})();
