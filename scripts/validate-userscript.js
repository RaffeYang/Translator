#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const userscriptPath = path.join(root, 'immersive-bilingual-adguard.user.js');
const source = fs.readFileSync(userscriptPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractConfig(src) {
  const marker = '  const CONFIG = ';
  const start = src.indexOf(marker);
  assert(start !== -1, 'CONFIG declaration not found');

  const objectStart = src.indexOf('{', start);
  assert(objectStart !== -1, 'CONFIG object start not found');

  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let i = objectStart; i < src.length; i += 1) {
    const ch = src[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) {
      const literal = src.slice(objectStart, i + 1);
      return vm.runInNewContext(`(${literal})`);
    }
  }

  throw new Error('CONFIG object end not found');
}

const config = extractConfig(source);
const siteRules = config.siteRules || {};

// Universal is enabled by default, with an explicit opt-out.
assert(config.universal === true, 'CONFIG.universal must default to true');

// Preserve X and its Twitter alias.
['x.com', 'twitter.com'].forEach((host) => {
  assert(siteRules[host], `missing site rule for ${host}`);
  assert(Array.isArray(siteRules[host].selectors) && siteRules[host].selectors.length > 0, `${host} selectors missing`);
  assert(Array.isArray(siteRules[host].roots) && siteRules[host].roots.length > 0, `${host} roots missing`);
});
assert(siteRules['x.com'].selectors.includes('div[data-testid="tweetText"]'), 'x.com tweetText selector missing');

// Unrelated presets must remain absent.
['economist.com', 'ft.com', 'youtube.com', 'google.com'].forEach((host) => {
  assert(!siteRules[host], `unexpected leftover site rule: ${host}`);
});

// Dedicated rules must never merge generic page extraction.
['github.com', 'reddit.com'].forEach((host) => {
  const rule = siteRules[host];
  assert(rule, `missing site rule for ${host}`);
  assert(rule.roots.length > 0 && rule.selectors.length > 0, `${host} extraction missing`);
  assert(rule.mergeDefaultRoots === false, `${host} must not merge generic roots`);
  assert(rule.mergeBaseSelectors === false, `${host} must not merge generic selectors`);
  assert(!rule.roots.some((s) => ['body', 'main', 'article', '.markdown-body'].includes(s)), `${host} roots too broad`);
  assert(rule.excludeSelectors.length > 0, `${host} exclusions missing`);
});
assert(siteRules['github.com'].selectors.some((s) => s.includes('readme')), 'GitHub README missing');
assert(siteRules['github.com'].selectors.includes('[itemprop="about"]'), 'GitHub description missing');
assert(siteRules['reddit.com'].selectors.some((s) => s.includes('post-title')), 'Reddit title missing');
assert(siteRules['reddit.com'].selectors.some((s) => s.includes('text-body')), 'Reddit body missing');

// Header must load everywhere so universal mode can work when enabled.
assert(source.includes('// @match        *://*/*'), 'global @match *://*/* missing (needed for universal mode)');

// Core runtime hooks must still exist.
[
  'function isAllowedPage',
  'function isActive',
  'function isXHost',
  'CONFIG.universal',
  'rf-translation-block',
].forEach((needle) => {
  assert(source.includes(needle), `missing source marker: ${needle}`);
});

// Removed machinery must not linger.
[
  'siteAutoTranslate',
  'allowedHosts',
  'isGoogleSearchReadableElement',
].forEach((needle) => {
  assert(!source.includes(needle), `leftover removed code: ${needle}`);
});

// Exercise the actual runtime routing/extraction settings without starting browser hooks.
const location = { hostname: 'github.com', href: 'https://github.com/owner/repo' };
const context = { location, console: { info() {} } };
vm.runInNewContext(source.replace('  init();', '  globalThis.runtime = { CONFIG, getSiteRuleEntry, isAllowedPage, getSelectors, getRootSelectors };'), context);
const runtime = context.runtime;
for (const host of ['github.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com']) {
  location.hostname = host;
  assert(runtime.isAllowedPage(), host + ' must be allowed');
  const entry = runtime.getSiteRuleEntry();
  assert(JSON.stringify(runtime.getRootSelectors()) === JSON.stringify(entry.rule.roots), host + ' must only use dedicated roots');
  assert(runtime.getSelectors() === [...new Set(entry.rule.selectors)].join(','), host + ' must only use dedicated text selectors');
  runtime.CONFIG.universal = true;
  assert(JSON.stringify(runtime.getRootSelectors()) === JSON.stringify(entry.rule.roots), host + ' universal mode must preserve strict roots');
  runtime.CONFIG.universal = false;
}
for (const host of ['example.com', 'notgithub.com', 'reddit.com.example.com']) {
  location.hostname = host;
  assert(!runtime.isAllowedPage(), host + ' must be blocked when universal is off');
  runtime.CONFIG.universal = true;
  assert(runtime.isAllowedPage(), host + ' must be allowed in universal mode');
  runtime.CONFIG.universal = false;
}
console.log('userscript static validation and runtime routing checks passed');
