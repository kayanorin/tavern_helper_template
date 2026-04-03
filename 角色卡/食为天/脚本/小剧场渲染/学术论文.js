// ══════════════════════════════════════════════════════════════════════════════
// 小剧场渲染 - 学术论文（期刊摘要卡片风格）
// 基于 Codex 生成的期刊论文摘要卡片模板改造
// 改良术语注释：摘要内高亮 + 点击跳转 + 术语区折叠展开
// ══════════════════════════════════════════════════════════════════════════════

const AP_RENDERED_CLASS = 'academic-paper-rendered';

// ──────────────────────────────────────────────────────────────────────────────
// 解析器
// ──────────────────────────────────────────────────────────────────────────────

function apParseBlock(text) {
  const data = {};
  text.trim().split('\n').forEach(line => {
    const sep = line.search(/[:：]/);
    if (sep === -1) return;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (key && value) data[key] = value;
  });
  return data;
}

/**
 * 从消息文本中提取学术论文数据
 * @returns {{ paper: object, terms: object[] } | null}
 */
function parseAcademicPaper(messageText) {
  const outerMatch = messageText.match(/<academic_paper>([\s\S]*?)<\/academic_paper>/);
  if (!outerMatch) return null;
  const paper = apParseBlock(outerMatch[1]);
  if (!paper['标题']) return null;

  // 提取 term_note 块
  const terms = [];
  const termRegex = /<term_note>([\s\S]*?)<\/term_note>/g;
  let m;
  while ((m = termRegex.exec(messageText)) !== null) {
    const t = apParseBlock(m[1]);
    if (t['术语']) terms.push(t);
  }

  return { paper, terms };
}

/** 转义 HTML */
function apEsc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 唯一 ID */
let _apIdCounter = 0;
function apUniqueId() { return `ap-${Date.now()}-${_apIdCounter++}`; }

/** 解析关键词 */
function apParseKeywords(raw) {
  if (!raw) return [];
  return raw.split(/[,，、]/).map(t => t.trim()).filter(Boolean);
}

/** GMA 等级标准化 */
function apBadgeLevel(gma) {
  const v = String(gma || '').toUpperCase().replace(/类.*$/, '').trim();
  if (v === 'A' || v === 'A+') return 'A';
  if (v === 'B') return 'B';
  return 'C';
}

// ──────────────────────────────────────────────────────────────────────────────
// CSS 样式
// ──────────────────────────────────────────────────────────────────────────────

const academicCSS = `<style>
/* ── 学术论文渲染 ── */
.ap-wrapper {
  --page-bg: transparent;
  --paper-bg: #fffdfa; --paper-edge: #ece4d6;
  --ink: #24211d; --ink-soft: #6f685e; --ink-faint: #9b9388;
  --accent: #7b5f3d; --accent-soft: #efe6d7;
  --badge-a: #8c6a36; --badge-a-bg: #f3ead8;
  --badge-b: #4d6d78; --badge-b-bg: #e6eef1;
  --badge-c: #6e7a59; --badge-c-bg: #e9eee2;
  --line: #d9d0c1;
  --shadow: 0 12px 28px rgba(56,46,34,0.08);
  --term-hover: #faf6ef;
  --term-hl: rgba(123,95,61,0.12);
  --term-hl-active: rgba(123,95,61,0.28);
  max-width: min(100%, 640px);
  margin: 16px auto;
  font-family: "Noto Serif SC","Source Han Serif SC","Songti SC","STSong",Georgia,serif;
  color: var(--ink); line-height: 1.55;
}
/* 暗色适配 */
body.dark .ap-wrapper, [data-theme="dark"] .ap-wrapper, .dark_theme .ap-wrapper, .ap-wrapper.dark {
  --paper-bg: #2b2724; --paper-edge: #3c3631;
  --ink: #f6f1e8; --ink-soft: #cbc2b5; --ink-faint: #978f84;
  --accent: #d8b37c; --accent-soft: #43372c;
  --badge-a: #f0ca8f; --badge-a-bg: #4b3d2d;
  --badge-b: #b8d3de; --badge-b-bg: #32414a;
  --badge-c: #d3ddb7; --badge-c-bg: #394133;
  --line: #4b443d;
  --shadow: 0 14px 30px rgba(0,0,0,0.24);
  --term-hover: #322d29;
  --term-hl: rgba(216,179,124,0.12);
  --term-hl-active: rgba(216,179,124,0.28);
}
.ap-theme-btn{background:none;border:1px solid var(--line);border-radius:999px;color:var(--ink-faint);cursor:pointer;font-size:.75rem;line-height:1;padding:2px 7px;margin-left:8px;transition:all .16s;font-family:inherit;vertical-align:middle}
.ap-theme-btn:hover{border-color:var(--accent);color:var(--ink-soft)}
.ap-wrapper *{box-sizing:border-box}
/* 卡片 */
.ap-card{background:var(--paper-bg);border:1px solid var(--paper-edge);border-radius:24px;box-shadow:var(--shadow);overflow:hidden}
/* 期刊头 */
.ap-journal-bar{position:relative;padding:16px 18px 14px;border-bottom:1px solid var(--line);text-align:center}
.ap-journal-name{margin:0;color:var(--ink);font-size:1rem;line-height:1.4;letter-spacing:.05em;font-weight:700}
.ap-badge{position:absolute;right:18px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;min-width:74px;padding:6px 10px;border-radius:999px;font-size:.76rem;font-weight:700;letter-spacing:.04em}
.ap-badge[data-level="A"],.ap-badge[data-level="A+"]{color:var(--badge-a);background:var(--badge-a-bg)}
.ap-badge[data-level="B"]{color:var(--badge-b);background:var(--badge-b-bg)}
.ap-badge[data-level="C"]{color:var(--badge-c);background:var(--badge-c-bg)}
/* 正文区 */
.ap-body{padding:22px 20px 18px}
.ap-title{margin:0;color:var(--ink);font-size:clamp(1.15rem,3.5vw,1.75rem);line-height:1.38;text-align:center;font-weight:700}
.ap-author{margin:14px auto 0;max-width:32rem;color:var(--ink-soft);text-align:center;font-size:.94rem;line-height:1.8;font-style:italic}
/* 关键词 */
.ap-keywords{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:18px 0 22px}
.ap-kw-pill{border:1px solid var(--line);border-radius:999px;padding:5px 11px;color:var(--ink-soft);background:transparent;font-size:.82rem;line-height:1.2}
/* section */
.ap-section{margin-top:18px}
.ap-section-heading{position:relative;margin:0 0 12px;padding-bottom:8px;color:var(--ink);font-size:1rem;line-height:1.35;font-weight:700}
.ap-section-heading::after{content:"";position:absolute;left:0;bottom:0;width:88px;height:2px;background:linear-gradient(90deg,var(--accent),transparent);border-radius:999px}
/* 摘要 */
.ap-abstract{margin:0;color:var(--ink);font-size:.98rem;line-height:1.95;text-align:justify;text-indent:2em;word-break:break-word}
/* ── 术语高亮（摘要中） ── */
.ap-term-link{
  background:var(--term-hl);
  border-bottom:1.5px dashed var(--accent);
  cursor:pointer;padding:0 2px;border-radius:2px;
  transition:background .16s,border-color .16s;
  text-decoration:none;color:inherit;
}
.ap-term-link:hover,.ap-term-link.is-active{
  background:var(--term-hl-active);
  border-bottom-style:solid;
}
/* ── 术语注释区（折叠式） ── */
.ap-term-list{display:grid;gap:0}
.ap-term-item{
  border-left:3px solid var(--accent);border-radius:0 14px 14px 0;
  background:rgba(255,255,255,0.08);
  border-top:1px solid var(--line);border-right:1px solid var(--line);border-bottom:1px solid var(--line);
  overflow:hidden;transition:background .16s,border-color .16s;
}
.ap-term-item+.ap-term-item{margin-top:8px}
.ap-term-item.is-highlighted{
  background:var(--term-hover);
  border-top-color:var(--accent);border-right-color:var(--accent);border-bottom-color:var(--accent);
}
.ap-term-header{
  display:flex;align-items:center;gap:8px;padding:10px 13px;cursor:pointer;
  user-select:none;transition:background .12s;
}
.ap-term-header:hover{background:var(--term-hover)}
.ap-term-arrow{
  font-size:.7em;color:var(--ink-faint);transition:transform .2s;flex-shrink:0;
}
.ap-term-item.is-open .ap-term-arrow{transform:rotate(90deg)}
.ap-term-name{margin:0;color:var(--accent);font-size:.92rem;line-height:1.4;font-weight:700;flex:1}
.ap-term-def{
  margin:0;padding:0 13px 12px 16px;
  color:var(--ink-soft);font-size:.9rem;line-height:1.72;
  display:none;
}
.ap-term-item.is-open .ap-term-def{display:block}
/* footer */
.ap-footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px 14px;margin-top:20px;padding-top:12px;border-top:1px solid var(--line);color:var(--ink-faint);font-size:.82rem;line-height:1.5}
.ap-footer strong{color:var(--ink-soft);font-weight:700}
/* 折叠外框 */
.ap-wrapper details summary{list-style:none;cursor:pointer}
.ap-wrapper details summary::-webkit-details-marker{display:none}
.ap-collapse-summary{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:10px;font-size:.88rem;color:var(--ink-soft);font-weight:700;
  transition:color .16s;
}
.ap-collapse-summary:hover{color:var(--accent)}
.ap-collapse-summary::before{content:'📄'}
.ap-collapse-arrow{transition:transform .2s;display:inline-block}
.ap-wrapper details[open] .ap-collapse-arrow{transform:rotate(90deg)}
/* responsive */
@media(max-width:560px){
  .ap-wrapper{font-size:.92rem}
  .ap-journal-bar{padding:12px 14px 10px}
  .ap-journal-name{font-size:.88rem;letter-spacing:.03em}
  .ap-badge{position:static;transform:none;margin-top:8px;font-size:.7rem;min-width:60px;padding:4px 8px}
  .ap-body{padding:14px 14px 14px}
  .ap-title{font-size:clamp(1.05rem,3.2vw,1.4rem);line-height:1.35}
  .ap-author{font-size:.84rem;line-height:1.6;margin-top:10px}
  .ap-keywords{gap:6px;margin:12px 0 16px}
  .ap-kw-pill{padding:4px 9px;font-size:.76rem}
  .ap-section{margin-top:14px}
  .ap-section-heading{font-size:.9rem;padding-bottom:6px;margin-bottom:10px}
  .ap-section-heading::after{width:60px}
  .ap-abstract{font-size:.88rem;line-height:1.8}
  .ap-term-name{font-size:.84rem}
  .ap-term-def{font-size:.82rem;line-height:1.6;padding:0 11px 10px 14px}
  .ap-term-header{padding:8px 11px}
  .ap-footer{flex-direction:column;font-size:.76rem;gap:6px;margin-top:14px;padding-top:10px}
  .ap-collapse-summary{font-size:.82rem}
}
@media(max-width:420px){
  .ap-wrapper{font-size:.86rem}
  .ap-journal-bar{padding:10px 10px 8px}
  .ap-journal-name{font-size:.82rem}
  .ap-badge{font-size:.66rem;padding:3px 7px;min-width:50px}
  .ap-body{padding:12px 10px 12px}
  .ap-title{font-size:1rem;line-height:1.32}
  .ap-author{font-size:.8rem;line-height:1.55}
  .ap-keywords{gap:4px;margin:10px 0 14px}
  .ap-kw-pill{padding:3px 7px;font-size:.72rem}
  .ap-section-heading{font-size:.84rem}
  .ap-abstract{font-size:.84rem;line-height:1.72;text-indent:1.5em}
  .ap-term-link{font-size:inherit}
  .ap-term-name{font-size:.8rem}
  .ap-term-def{font-size:.78rem;line-height:1.55}
  .ap-footer{font-size:.72rem}
}
@media(prefers-reduced-motion:reduce){.ap-wrapper *,.ap-wrapper *::before,.ap-wrapper *::after{transition:none!important}}
</style>`;

// ──────────────────────────────────────────────────────────────────────────────
// HTML 构建器
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 在摘要文本中高亮术语，包裹为可点击的 span
 * 点击后会滚动到下方术语注释区对应条目
 */
function apHighlightTerms(abstractText, terms, widgetId) {
  let html = apEsc(abstractText);
  terms.forEach((t, i) => {
    const term = t['术语'];
    if (!term) return;
    // 转义术语用于正则
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'g');
    const targetId = `${widgetId}-term-${i}`;
    html = html.replace(regex,
      `<span class="ap-term-link" data-ap-term-target="${targetId}" title="点击查看释义">$1</span>`
    );
  });
  return html;
}

function apRenderKeywords(keywords) {
  return keywords.map(kw => `<span class="ap-kw-pill">${apEsc(kw)}</span>`).join('');
}

function apRenderTerms(terms, widgetId) {
  return terms.map((t, i) => {
    const termId = `${widgetId}-term-${i}`;
    const name = apEsc(t['术语'] || '');
    const def = apEsc(t['释义'] || '');
    return `<div class="ap-term-item" data-ap-term-id="${termId}">
      <div class="ap-term-header">
        <span class="ap-term-arrow">▸</span>
        <dt class="ap-term-name">${name}</dt>
      </div>
      <dd class="ap-term-def">${def}</dd>
    </div>`;
  }).join('');
}

function buildAcademicHTML(data) {
  const { paper, terms } = data;
  const widgetId = apUniqueId();

  const journal = apEsc(paper['期刊名'] || paper['期刊'] || '');
  const gma = paper['GMA评级'] || '';
  const badgeLevel = apBadgeLevel(gma);
  const title = apEsc(paper['标题'] || '');
  const author = apEsc(paper['作者'] || '');
  const affiliation = apEsc(paper['单位'] || '');
  const position = apEsc(paper['职位'] || '');
  const keywords = apParseKeywords(paper['关键词']);
  const abstractRaw = paper['摘要'] || '';
  const submitDate = apEsc(paper['投稿日期'] || '');
  const ref = apEsc(paper['参考编号'] || paper['DOI'] || '');

  // 作者行
  const authorParts = [author, affiliation, position].filter(Boolean);
  const authorLine = authorParts.length > 0
    ? `<p class="ap-author">${authorParts.join(' · ')}</p>` : '';

  // 摘要 + 术语高亮
  const abstractHTML = apHighlightTerms(abstractRaw, terms, widgetId);

  // 术语区
  const termsHTML = terms.length > 0 ? `
    <section class="ap-section">
      <h3 class="ap-section-heading">术语注释</h3>
      <dl class="ap-term-list">${apRenderTerms(terms, widgetId)}</dl>
    </section>` : '';

  // 页脚
  const footerParts = [];
  if (submitDate) footerParts.push(`<span><strong>投稿日期</strong> ${submitDate}</span>`);
  if (ref) footerParts.push(`<span><strong>参考编号</strong> ${ref}</span>`);
  const footer = footerParts.length > 0
    ? `<footer class="ap-footer">${footerParts.join('')}</footer>` : '';

  // 摘要标题
  const summaryLabel = journal || '学术论文摘要';

  return `<div class="${AP_RENDERED_CLASS} ap-wrapper" data-ap-widget="${widgetId}">
  ${academicCSS}
  <details open>
    <summary class="ap-collapse-summary">
      ${summaryLabel}
      <span class="ap-collapse-arrow">▸</span>
      <button class="ap-theme-btn" type="button" title="切换日夜">🌙</button>
    </summary>
    <article class="ap-card">
      <header class="ap-journal-bar">
        <h1 class="ap-journal-name">${journal}</h1>
        ${gma ? `<span class="ap-badge" data-level="${badgeLevel}">GMA ${apEsc(gma)}</span>` : ''}
      </header>
      <div class="ap-body">
        <h2 class="ap-title">${title}</h2>
        ${authorLine}
        ${keywords.length > 0 ? `<div class="ap-keywords">${apRenderKeywords(keywords)}</div>` : ''}
        <section class="ap-section">
          <h3 class="ap-section-heading">摘要 / Abstract</h3>
          <p class="ap-abstract">${abstractHTML}</p>
        </section>
        ${termsHTML}
        ${footer}
      </div>
    </article>
  </details>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 交互逻辑
// ══════════════════════════════════════════════════════════════════════════════

function initAcademicInteractions($wrapper) {
  // 点击摘要中的术语高亮 → 跳转到术语区 + 展开 + 高亮
  $wrapper.on('click', '.ap-term-link', function () {
    const targetId = $(this).attr('data-ap-term-target');
    if (!targetId) return;

    const $item = $wrapper.find(`[data-ap-term-id="${targetId}"]`);
    if ($item.length === 0) return;

    // 高亮摘要中的术语链接
    $wrapper.find('.ap-term-link').removeClass('is-active');
    $(this).addClass('is-active');

    // 展开目标术语条目
    $item.addClass('is-open is-highlighted');

    // 其他条目取消高亮（但不折叠——允许用户同时开多个）
    $wrapper.find('.ap-term-item').not($item).removeClass('is-highlighted');

    // 平滑滚动到术语条目
    // 在酒馆的 iframe 环境中，需要找到正确的滚动容器
    const itemEl = $item[0];
    if (itemEl) {
      itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // 点击术语区条目头 → 折叠/展开
  $wrapper.on('click', '.ap-term-header', function () {
    const $item = $(this).closest('.ap-term-item');
    $item.toggleClass('is-open');

    // 如果折叠了，同时取消高亮和摘要中的 active
    if (!$item.hasClass('is-open')) {
      $item.removeClass('is-highlighted');
      const termId = $item.attr('data-ap-term-id');
      $wrapper.find(`.ap-term-link[data-ap-term-target="${termId}"]`).removeClass('is-active');
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 渲染逻辑
// ══════════════════════════════════════════════════════════════════════════════

function renderAcademicPaper(message_id) {
  try {
    const messages = getChatMessages(message_id);
    if (!messages || messages.length === 0) return;

    const message = messages[0].message;
    const data = parseAcademicPaper(message);
    if (!data) return;

    const html = buildAcademicHTML(data);

    const $mes_text = retrieveDisplayedMessage(message_id);
    if (!$mes_text || $mes_text.length === 0) return;

    // 移除已有渲染
    $mes_text.find(`.${AP_RENDERED_CLASS}`).remove();

    // 追加新渲染
    $mes_text.append(html);

    // 初始化交互
    const $wrapper = $mes_text.find(`.${AP_RENDERED_CLASS}`).last();
    initAcademicInteractions($wrapper);
    $wrapper.on('click', '.ap-theme-btn', function() {
      const $w = $(this).closest('.ap-wrapper');
      const isDark = $w.toggleClass('dark').hasClass('dark');
      $(this).text(isDark ? '☀️' : '🌙');
    });
    console.info(`[学术论文] 楼层 ${message_id} 已渲染`);
  } catch (error) {
    console.error(`[学术论文] 渲染楼层 ${message_id} 失败:`, error);
  }
}

function renderAllAcademicPapers() {
  $('#chat', window.parent.document)
    .children(".mes[is_user='false'][is_system='false']")
    .each((_index, node) => {
      const mesId = node.getAttribute('mesid');
      if (mesId !== null) {
        renderAcademicPaper(Number(mesId));
      }
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// 初始化与事件监听
// ══════════════════════════════════════════════════════════════════════════════

$(() => {
  errorCatched(async () => {
    console.info('[学术论文] 脚本加载中...');

    await renderAllAcademicPapers();

    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, errorCatched(renderAcademicPaper));
    eventOn(tavern_events.MESSAGE_UPDATED, errorCatched(renderAcademicPaper));
    eventOn(tavern_events.MESSAGE_SWIPED, errorCatched(renderAcademicPaper));
    eventOn(tavern_events.MESSAGE_DELETED, errorCatched(renderAllAcademicPapers));

    toastr.success('学术论文渲染脚本已加载', '✅ 加载成功');
  })();
});

$(window).on('pagehide', () => {
  console.info('[学术论文] 脚本已卸载');
});
