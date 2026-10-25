const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const source = fs.readFileSync('immersive-bilingual-adguard.user.js', 'utf8');
function page(host, html) {
  const dom = new JSDOM(html, { url: `https://${host}/owner/repo`, runScripts: 'outside-only' });
  dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 400, height: 30 });
  dom.window.console.info = () => {};
  dom.window.eval(source.replace('  init();', '  window.runtime = { resolveContentRoots, collectCandidates, isAllowedPage, isLikelyArticleRoot, createTranslationNode, translateAndRender, clearTranslatedNodes, scheduleScan, sourceText, state, CONFIG };'));
  const r = dom.window.runtime;
  r.resolveContentRoots();
  return { dom, r, nodes: r.collectCandidates(dom.window.document) };
}
test('GitHub readme-toc content passes filters, navigation and code stay excluded', () => {
  const { nodes } = page('github.com', '<div id="readme-toc"><article class="markdown-body"><h1>Getting started</h1><p>Install this package to build your application.</p><nav><p>Navigation links</p></nav><pre><code>example code</code></pre></article></div>');
  assert.equal(nodes.length, 2);
});
test('GitHub sidebar Description is translated without other sidebar text', () => {
  const { nodes } = page('github.com', '<aside class="Layout-sidebar"><p itemprop="about">A useful developer toolkit.</p><p>Other sidebar information.</p></aside>');
  assert.equal(nodes.length, 1);
});
test('Generic article root detection does not throw', () => {
  const { dom, r } = page('example.com', '<article><h1>A guide to reliable applications</h1><p>This article provides detailed explanations and useful examples for developers who want to understand how a reliable application can be built and maintained.</p></article>');
  assert.equal(r.isLikelyArticleRoot(dom.window.document.querySelector('article')), true);
});
test('Reddit slotted title translation stays assigned to its visible slot', async () => {
  const { dom, r, nodes } = page('www.reddit.com', '<shreddit-post><h1 slot="title">An interesting programming discovery</h1><div slot="text-body"><p>Here is the full explanation.</p></div><shreddit-comment><p>Leave comments alone.</p></shreddit-comment></shreddit-post>');
  const post = dom.window.document.querySelector('shreddit-post');
  const shadow = post.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<slot name="title"></slot><slot name="text-body"></slot>';
  assert.equal(nodes.length, 2);
  for (const el of nodes) r.state.cache[`google::en::zh-CN::${el.textContent}`] = '测试译文';
  await r.translateAndRender(nodes[0]);
  assert.equal(shadow.querySelector('slot').assignedElements().length, 2);
});
test('Old Reddit titles and selftext are selected, comments excluded', () => {
  const { nodes } = page('old.reddit.com', '<div class="thing link"><div class="top-matter"><a class="title">An interesting programming discovery</a></div><div class="usertext-body"><div class="md"><p>Here is the full explanation.</p></div></div><div class="commentarea"><div class="usertext-body"><div class="md"><p>Leave comments alone.</p></div></div></div></div>');
  assert.equal(nodes.length, 2);
});
test('GitHub Blog article body and title are supported by default', () => {
  const { r, nodes } = page('github.blog', '<main><article><header><h1>Building better software together</h1></header><div class="entry-content"><p>Learn how to build a reliable application.</p></div><aside><p>Related content.</p></aside></article></main>');
  assert.equal(r.isAllowedPage(), true);
  assert.equal(nodes.length, 2);
});
test('X tweet extraction remains supported', () => {
  const { nodes } = page('x.com', '<main><article data-testid="tweet"><div data-testid="tweetText">An interesting programming discovery</div></article></main>');
  assert.equal(nodes.length, 1);
});
test('Live GitHub code-view README structure is extracted without legacy IDs', () => {
  const { nodes } = page('github.com', '<react-app app-name="code-view"><article class="markdown-body entry-content container-lg"><h1>The LaTeX2e Kernel Code Repository</h1><p>This repository holds the unpackaged sources.</p></article></react-app><div class="comment-body"><article class="markdown-body"><p>Do not translate this comment.</p></article></div>');
  assert.equal(nodes.length, 2);
});
test('Reddit fixed-sidebar layout does not suppress the main post', () => {
  const { nodes } = page('www.reddit.com', '<div class="main-container fixed-sidebar"><shreddit-post><h1 slot="title">I try to learn logic pro but Idk what to do</h1><div slot="text-body"><p>I recently bought Logic Pro and have spent countless hours watching tutorials.</p><aside><p>Do not translate related links.</p></aside></div></shreddit-post></div>');
  assert.equal(nodes.length, 2);
});
test('Blog no-sidebar body class does not suppress article content', () => {
  const { nodes } = page('github.blog', '<body class="single-changelog no-sidebar"><main><article><p>Enterprises can now manage their dependencies at scale.</p><nav><p>Do not translate the contents list.</p></nav></article></main></body>');
  assert.equal(nodes.length, 1);
});
const prose = 'This is a detailed explanation of how the application works. It contains useful information for developers who want to understand the underlying concepts and build reliable software.';
test('Universal is enabled, and explicit disabling preserves dedicated sites', () => {
  const { r } = page('example.org', '<main></main>');
  assert.equal(r.isAllowedPage(), true);
});
test('Universal article includes its header title but excludes metadata and chrome', () => {
  const { nodes } = page('example.org', `<nav><p>${prose}</p></nav><main><article><header><h1>Understanding reliable software</h1><p class="byline">Written by the editorial team.</p></header><p>${prose}</p><p>${prose}</p><aside><p>${prose}</p></aside><section class="related-posts"><p>${prose}</p></section><section id="comments"><p>${prose}</p></section><footer><p>${prose}</p></footer></article></main>`);
  assert.equal(nodes.length, 3);
});
test('Documentation excludes nested navigation, code, and hidden text', () => {
  const { nodes } = page('docs.example.org', `<main class="docs-content"><h1>Installation guide</h1><p>${prose}</p><p>${prose}</p><nav><p>${prose}</p></nav><pre><code>${prose}</code></pre><p hidden>${prose}</p><div aria-hidden="true"><p>${prose}</p></div><form><p>${prose}</p></form></main>`);
  assert.equal(nodes.length, 3);
});
test('Plain div article can be discovered from continuous long paragraphs', () => {
  const { nodes } = page('example.org', `<div id="layout"><div id="story"><h1>A practical introduction</h1><p>${prose}</p><p>${prose}</p><p>${prose}</p></div><div class="sidebar"><p>${prose}</p></div></div>`);
  assert.equal(nodes.length, 4);
});
test('Universal does not translate home cards or standalone UI paragraphs', () => {
  const { nodes } = page('example.org', '<main><article><h2>Explore our products</h2><p>Find out more.</p><a href="/">Learn more</a></article><article><h2>Latest announcements</h2><p>Read the news.</p></article><p>Manage your account preferences.</p></main>');
  assert.equal(nodes.length, 0);
});
test('Universal selects leaves instead of nested list and blockquote duplicates', () => {
  const { nodes } = page('example.org', `<article><p>${prose}</p><p>${prose}</p><ul><li><p>A useful explanatory paragraph in a list.</p></li></ul><blockquote><p>A quotation with enough useful information.</p></blockquote></article>`);
  assert.equal(nodes.length, 4);
});
test('A modified original can be translated again without including its previous translation', async () => {
  const { dom, r, nodes } = page('x.com', '<main><article data-testid="tweet"><div data-testid="tweetText">Original programming discovery</div></article></main>');
  const el=nodes[0];
  r.state.cache['google::en::zh-CN::Original programming discovery']='原有译文';
  await r.translateAndRender(el);
  el.textContent='Updated programming discovery';
  assert.equal(r.collectCandidates(dom.window.document).length,1);
});
test('Pausing while a request is pending prevents stale rendering', async () => {
  const { dom, r, nodes } = page('x.com', '<main><article data-testid="tweet"><div data-testid="tweetText">Original programming discovery</div></article></main>');
  let complete;
  dom.window.GM_xmlhttpRequest=details=>{complete=details.onload;};
  const pending=r.translateAndRender(nodes[0]);
  r.state.enabled=false;
  complete({status:200,responseText:JSON.stringify([[['译文']]])});
  await pending;
  assert.equal(dom.window.document.querySelectorAll('.rf-translation-block').length,0);
});
test('Changing source during a request prevents stale rendering', async () => {
  const { dom, r, nodes } = page('x.com', '<main><article data-testid="tweet"><div data-testid="tweetText">Original programming discovery</div></article></main>');
  let complete;
  dom.window.GM_xmlhttpRequest=details=>{complete=details.onload;};
  const pending=r.translateAndRender(nodes[0]);
  nodes[0].textContent='A completely different discovery';
  complete({status:200,responseText:JSON.stringify([[['译文']]])});
  await pending;
  assert.equal(dom.window.document.querySelectorAll('.rf-translation-block').length,0);
});
test('Article title remains in scope when its body has a separate semantic container', () => {
  const { nodes } = page('example.org', `<article><header><h1>Understanding reliable software</h1></header><div class="entry-content"><p>${prose}</p><p>${prose}</p></div></article>`);
  assert.equal(nodes.length,3);
});
test('Equal text requests share the same provider call and keep separate owned blocks', async () => {
  const { dom,r,nodes }=page('example.org',`<article><p>${prose}</p><p>${prose}</p></article>`);
  let calls=0,complete;
  dom.window.GM_xmlhttpRequest=details=>{calls++;complete=details.onload;};
  const work=nodes.map(el=>r.translateAndRender(el));
  assert.equal(calls,1);
  complete({status:200,responseText:JSON.stringify([[['译文']]])});
  await Promise.all(work);
  assert.equal(dom.window.document.querySelectorAll('.rf-translation-block').length,2);
});
test('List and table translations retain valid structure and do not contaminate source text', async () => {
  const {dom,r,nodes}=page('example.org',`<article><p>${prose}</p><p>${prose}</p><ul><li>A useful item with explanatory information.</li></ul><table><tbody><tr><td>Detailed information about this example.</td></tr></tbody></table></article>`);
  for(const el of nodes) r.state.cache[`google::en::zh-CN::${r.sourceText(el)}`]='测试译文';
  await Promise.all(nodes.map(el=>r.translateAndRender(el)));
  assert.equal(dom.window.document.querySelector('ul').children.length,1);
  assert.equal(dom.window.document.querySelector('tr').children.length,1);
  assert.equal(r.collectCandidates(dom.window.document).length,0);
});
test('A cleared generation cannot render pending results after resuming', async () => {
  const {dom,r,nodes}=page('x.com','<main><article data-testid="tweet"><div data-testid="tweetText">Original programming discovery</div></article></main>');
  let complete;
  dom.window.GM_xmlhttpRequest=details=>{complete=details.onload;};
  const work=r.translateAndRender(nodes[0]);
  r.clearTranslatedNodes();
  complete({status:200,responseText:JSON.stringify([[['译文']]])});
  await work;
  assert.equal(dom.window.document.querySelectorAll('.rf-translation-block').length,0);
});
test('A scan timer scheduled before pause does not run after pause', async () => {
  const {dom,r}=page('x.com','<main><article data-testid="tweet"><div data-testid="tweetText">Original programming discovery</div></article></main>');
  let calls=0;
  dom.window.GM_xmlhttpRequest=()=>{calls++;};
  r.scheduleScan(dom.window.document);
  r.state.enabled=false;
  await new Promise(resolve=>setTimeout(resolve,300));
  assert.equal(calls,0);
  dom.window.close();
});
test('Real startup drains more than one batch without duplicate requests or observer loops', async () => {
  const html='<article><h1>A guide to reliable software</h1>'+Array.from({length:55},(_,i)=>`<p>${prose} Section ${i}.</p>`).join('')+'</article>';
  const dom=new JSDOM(html,{url:'https://example.org/article',runScripts:'outside-only'});
  dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({width:400,height:30});
  dom.window.console.info=()=>{};
  let calls=0;
  dom.window.GM_xmlhttpRequest=details=>{calls++;details.onload({status:200,responseText:JSON.stringify([[['自动翻译结果']]])});};
  dom.window.eval(source);
  try {
    await new Promise(resolve=>setTimeout(resolve,1600));
    assert.equal(dom.window.document.querySelectorAll('.rf-translation-block').length,56);
    assert.equal(calls,56);
    dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{code:'KeyT',key:'t',altKey:true}));
    assert.equal(dom.window.document.querySelectorAll('.rf-translation-block').length,0);
  } finally {dom.window.close();}
});
test('Documentation keeps its main title across section containers', () => {
  const {nodes}=page('docs.example.org',`<main><h1>A documentation guide</h1><section><div><p>${prose}</p><p>${prose}</p></div></section><nav><p>${prose}</p></nav></main>`);
  assert.equal(nodes.length,3);
});
test('Linked documentation headings remain translatable inside confirmed content', () => {
  const {nodes}=page('docs.example.org',`<main><h1><a href="#installation">Installation</a></h1><p>${prose}</p><p>${prose}</p><h2><a href="#setup">Setting up the environment</a></h2></main>`);
  assert.equal(nodes.length,4);
});
test('Long homepage article teasers without article titles are not treated as body', () => {
  const {nodes}=page('example.org',`<main><article><h2>First story</h2><p>${prose}</p></article><article><h2>Second story</h2><p>${prose}</p></article></main>`);
  assert.equal(nodes.length,0);
});
test('Multi-paragraph homepage article cards remain excluded', () => {
  const {nodes}=page('example.org',`<main><section><article><h2>First story</h2><p>${prose}</p><p>${prose}</p></article><article><h2>Second story</h2><p>${prose}</p><p>${prose}</p></article></section></main>`);
  assert.equal(nodes.length,0);
});
for (const change of ['move','hide']) test(`Pending response is discarded when source eligibility changes: ${change}`,async()=>{
  const {dom,r,nodes}=page('example.org',`<article><h1>A useful guide</h1><p>${prose}</p><p>${prose}</p></article><nav></nav>`);
  const el=nodes.find(n=>n.tagName==='P');
  let complete;
  dom.window.GM_xmlhttpRequest=details=>{complete=details.onload;};
  const work=r.translateAndRender(el);
  if(change==='move')dom.window.document.querySelector('nav').appendChild(el);
  else el.hidden=true;
  complete({status:200,responseText:JSON.stringify([[['译文']]])});
  await work;
  assert.equal(dom.window.document.querySelectorAll('.rf-translation-block').length,0);
});
test('Live Blog TOC source is body content, while related article cards stay excluded',()=>{
 const {nodes}=page('github.blog',`<main><article class="editorial-typography"><h1>Software updates for developers</h1><div class="PostContent-main editorial-content-block js-table-of-contents-source"><p>${prose}</p><h2>How it works</h2></div><article><h3>Related article metadata</h3><p>${prose}</p></article></article><article><h3>Recommended release notes</h3><p>${prose}</p></article></main>`);
 assert.equal(nodes.length,3);
});
test('DocC main inside adjustable-sidebar layout is body, separate navigator is excluded',()=>{
 const {nodes}=page('docs.swift.org',`<div class="adjustable-sidebar-width full-width-container topic-wrapper"><nav><p>${prose}</p></nav><div class="content"><div class="doc-topic"><main id="app-main"><div class="documentation-hero"><h1>The Basics</h1></div><div class="doc-content"><div class="primary-content"><p>${prose}</p><p>${prose}</p></div></div><pre><code>${prose}</code></pre></main></div></div></div>`);
 assert.equal(nodes.length,3);
});
test('ARIA article wrapper keeps TypeScript title outside its nested article',()=>{
 const {nodes}=page('www.typescriptlang.org',`<main><section><div id="handbook-content" role="article"><h1>Everyday Types</h1><article><div class="markdown"><p>${prose}</p><p>${prose}</p></div></article></div><article><h3>Customize</h3><label><p>Site Colours:</p><select></select></label></article></section></main>`);
 assert.equal(nodes.length,3);
});
test('Detached documentation title enters the first batch in document order',()=>{
 const {nodes}=page('docs.swift.org',`<main><div><h1>The Basics</h1></div><div class="doc-content">${Array.from({length:60},()=>`<p>${prose}</p>`).join('')}</div></main>`);
 assert.equal(nodes[0].tagName,'H1');
 assert.equal(nodes.length,48);
});
