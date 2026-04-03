// ══════════════════════════════════════════════════════════════════════════════
// 小剧场渲染 - 新闻通讯（报纸 / GMA 官方通告）
// 参考模板: oliviale/BaoXOOP (The Codepen Times) + silkine/QWBxVX (NEWPOST YORK)
// ══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────────
// 常量
// ──────────────────────────────────────────────────────────────────────────────

const NEWS_REGEX = /<news_bulletin>([\s\S]*?)<\/news_bulletin>/g;
const SIDEBAR_REGEX = /<sidebar>([\s\S]*?)<\/sidebar>/g;
const NEWS_RENDERED_CLASS = 'news-bulletin-rendered';

// ──────────────────────────────────────────────────────────────────────────────
// 解析器
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 解析 key：value 块
 * 中英文冒号均可，一行一个字段
 */
function parseBlock(text) {
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
 * 从消息文本中提取新闻通讯数据
 * @returns {{ bulletin: object, sidebars: object[] } | null}
 */
function parseNewsBulletin(messageText) {
  // 提取主新闻
  const bulletinMatch = messageText.match(/<news_bulletin>([\s\S]*?)<\/news_bulletin>/);
  if (!bulletinMatch) return null;

  const bulletin = parseBlock(bulletinMatch[1]);
  if (!bulletin['标题']) return null; // 至少要有标题

  // 提取 sidebars（可选）
  const sidebars = [];
  const sidebarRegex = /<sidebar>([\s\S]*?)<\/sidebar>/g;
  let sMatch;
  while ((sMatch = sidebarRegex.exec(messageText)) !== null) {
    const sb = parseBlock(sMatch[1]);
    if (sb['内容']) sidebars.push(sb);
  }

  return { bulletin, sidebars };
}

// ──────────────────────────────────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────────────────────────────────

let _newsIdCounter = 0;
function newsUniqueId() {
  return `news-${Date.now()}-${_newsIdCounter++}`;
}

/** 转义 HTML 特殊字符 */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ──────────────────────────────────────────────────────────────────────────────
// CSS 样式
// ──────────────────────────────────────────────────────────────────────────────

const newsCSS = `<style>
/* ── 新闻通讯渲染 ── */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Noto+Serif+SC:wght@400;700;900&display=swap');

.news-wrapper {
  --nw-bg: #FDF5E6;
  --nw-text: #2C2C2C;
  --nw-text-light: #666;
  --nw-border: #2C2C2C;
  --nw-border-light: #D4C5A9;
  --nw-accent: #8B4513;
  --nw-header-bg: transparent;
  --nw-sidebar-bg: rgba(139, 69, 19, 0.05);
  --nw-link: #8B4513;
  max-width: min(620px, 100%);
  margin: 16px auto;
  font-family: 'Noto Serif SC', 'Playfair Display', 'Georgia', serif;
  color: var(--nw-text);
  line-height: 1.7;
  position: relative;
}

/* ── 暗色模式适配 ── */
.mes_text .news-wrapper,
[data-theme="dark"] .news-wrapper,
.dark_theme .news-wrapper,
.news-wrapper.dark {
  --nw-bg: #1A1A1A;
  --nw-text: #D4C5A9;
  --nw-text-light: #A09070;
  --nw-border: #D4C5A9;
  --nw-border-light: #3D3020;
  --nw-accent: #D4A05A;
  --nw-header-bg: transparent;
  --nw-sidebar-bg: rgba(212, 160, 90, 0.06);
  --nw-link: #D4A05A;
}
/* 酒馆暗色主题检测 */
body.dark .news-wrapper {
  --nw-bg: #1A1A1A;
  --nw-text: #D4C5A9;
  --nw-text-light: #A09070;
  --nw-border: #D4C5A9;
  --nw-border-light: #3D3020;
  --nw-accent: #D4A05A;
  --nw-header-bg: transparent;
  --nw-sidebar-bg: rgba(212, 160, 90, 0.06);
  --nw-link: #D4A05A;
}
.news-theme-btn{background:none;border:1px solid var(--nw-border-light);border-radius:999px;color:var(--nw-text-light);cursor:pointer;font-size:.75rem;line-height:1;padding:2px 7px;margin-left:8px;transition:all .16s;font-family:inherit;vertical-align:middle}
.news-theme-btn:hover{border-color:var(--nw-accent);color:var(--nw-accent)}

/* ── 报纸主容器 ── */
.news-paper {
  background: var(--nw-bg);
  border: 2px solid var(--nw-border);
  padding: 0;
  overflow: hidden;
}

/* ── 报头 ── */
.news-masthead {
  text-align: center;
  padding: 20px 16px 12px;
  border-bottom: 3px double var(--nw-border);
  position: relative;
}
.news-masthead::before {
  content: '';
  display: block;
  border-top: 1px solid var(--nw-border);
  margin-bottom: 12px;
}
.news-media-name {
  font-family: 'Playfair Display', 'Noto Serif SC', serif;
  font-size: clamp(1.6em, 4vw, 2.4em);
  font-weight: 900;
  letter-spacing: 4px;
  color: var(--nw-text);
  line-height: 1.2;
  margin: 0;
}
.news-slogan {
  font-style: italic;
  font-size: 0.8em;
  color: var(--nw-text-light);
  margin-top: 4px;
  letter-spacing: 1px;
}
.news-meta-row {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.78em;
  color: var(--nw-text-light);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--nw-border-light);
}
.news-meta-row span {
  white-space: nowrap;
}

/* ── 主要内容区 ── */
.news-content {
  padding: 16px;
}

/* 标题 */
.news-headline {
  font-family: 'Playfair Display', 'Noto Serif SC', serif;
  font-size: clamp(1.3em, 3.5vw, 1.8em);
  font-weight: 900;
  line-height: 1.3;
  color: var(--nw-text);
  margin: 0 0 6px 0;
  text-align: center;
}
.news-subtitle {
  font-style: italic;
  font-size: 0.9em;
  color: var(--nw-text-light);
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--nw-border-light);
}

/* 正文 */
.news-body {
  font-size: 0.95em;
  line-height: 1.8;
  text-align: justify;
  hyphens: auto;
  color: var(--nw-text);
  margin-bottom: 12px;
}
/* 宽屏时分栏 */
@media (min-width: 480px) {
  .news-body.multi-col {
    column-count: 2;
    column-gap: 20px;
    column-rule: 1px solid var(--nw-border-light);
  }
}

/* 署名 */
.news-byline {
  text-align: right;
  font-size: 0.82em;
  color: var(--nw-text-light);
  font-style: italic;
  padding-top: 8px;
  border-top: 1px solid var(--nw-border-light);
}

/* ── 侧边栏 ── */
.news-sidebars {
  border-top: 2px solid var(--nw-border);
  padding: 0;
}
.news-sidebar-item {
  padding: 12px 16px;
  background: var(--nw-sidebar-bg);
  border-bottom: 1px solid var(--nw-border-light);
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.news-sidebar-item:last-child {
  border-bottom: none;
}
.news-sidebar-type {
  font-weight: 700;
  font-size: 0.8em;
  color: var(--nw-accent);
  white-space: nowrap;
  padding: 2px 8px;
  border: 1px solid var(--nw-accent);
  border-radius: 3px;
  flex-shrink: 0;
}
.news-sidebar-content {
  font-size: 0.88em;
  color: var(--nw-text);
  line-height: 1.6;
}

/* ── GMA 官方通告特殊样式 ── */
.news-paper.news-gma .news-masthead {
  border-bottom-color: var(--nw-accent);
}
.news-paper.news-gma .news-media-name {
  color: var(--nw-accent);
}
.news-paper.news-gma .news-headline {
  border-left: 4px solid var(--nw-accent);
  padding-left: 12px;
  text-align: left;
}
.news-paper.news-gma .news-body {
  column-count: 1 !important;
}

/* ── 底部装饰 ── */
.news-footer {
  text-align: center;
  padding: 8px;
  font-size: 0.7em;
  color: var(--nw-text-light);
  border-top: 1px solid var(--nw-border-light);
  letter-spacing: 2px;
}

/* ── 折叠动画 ── */
.news-wrapper details summary {
  cursor: pointer;
  list-style: none;
  text-align: center;
  padding: 8px;
  font-family: 'Playfair Display', 'Noto Serif SC', serif;
  font-weight: 700;
  font-size: 0.9em;
  color: var(--nw-text-light);
  transition: color 0.2s;
}
.news-wrapper details summary:hover {
  color: var(--nw-accent);
}
.news-wrapper details summary::before {
  content: '📰 ';
}
.news-wrapper details summary::after {
  content: ' ▸';
  transition: transform 0.2s;
  display: inline-block;
}
.news-wrapper details[open] summary::after {
  transform: rotate(90deg);
}

/* ── 窄屏适配 ── */
@media (max-width: 520px) {
  .news-wrapper{font-size:.93rem}
  .news-media-name{font-size:clamp(1.3em,3.5vw,1.8em);letter-spacing:2px}
  .news-headline{font-size:clamp(1.1em,3vw,1.5em)}
  .news-subtitle{font-size:.82em}
  .news-body{font-size:.88em;line-height:1.7}
  .news-meta-row{font-size:.72em;gap:10px}
  .news-byline{font-size:.78em}
  .news-sidebar-content{font-size:.82em}
  .news-sidebar-type{font-size:.74em;padding:2px 6px}
  .news-footer{font-size:.65em}
  .news-slogan{font-size:.72em}
}
@media (max-width: 400px) {
  .news-paper { border-width: 1px; }
  .news-masthead { padding: 14px 10px 8px; }
  .news-content { padding: 10px; }
  .news-media-name{font-size:1.2em;letter-spacing:1px}
  .news-headline{font-size:1.05em}
  .news-body{font-size:.84em;line-height:1.65}
  .news-meta-row { font-size: 0.68em; gap: 8px; }
}

/* 滚动保底（超长正文） */
.news-body-scroll {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--nw-border-light) transparent;
}
.news-body-scroll::-webkit-scrollbar {
  width: 4px;
}
.news-body-scroll::-webkit-scrollbar-thumb {
  background: var(--nw-border-light);
  border-radius: 2px;
}
</style>`;

// ──────────────────────────────────────────────────────────────────────────────
// HTML 构建
// ──────────────────────────────────────────────────────────────────────────────

function buildNewsHTML(data) {
  const { bulletin, sidebars } = data;
  const id = newsUniqueId();

  const isGMA = (bulletin['类型'] || '').includes('GMA') || (bulletin['类型'] || '').includes('官方');
  const gmaClass = isGMA ? 'news-gma' : '';

  const mediaName = escapeHtml(bulletin['媒体名'] || '号外');
  const slogan = bulletin['刊头标语'] ? `<div class="news-slogan">${escapeHtml(bulletin['刊头标语'])}</div>` : '';
  const date = escapeHtml(bulletin['日期'] || '');
  const section = escapeHtml(bulletin['版面'] || '');
  const headline = escapeHtml(bulletin['标题'] || '');
  const subtitle = bulletin['副标题'] ? `<div class="news-subtitle">${escapeHtml(bulletin['副标题'])}</div>` : '';
  const bodyText = escapeHtml(bulletin['正文'] || '');
  const byline = bulletin['署名'] ? `<div class="news-byline">${escapeHtml(bulletin['署名'])}</div>` : '';

  // 正文较长时启用分栏和滚动
  const isLong = bodyText.length > 200;
  const multiColClass = (!isGMA && isLong) ? 'multi-col' : '';
  const scrollClass = bodyText.length > 600 ? 'news-body-scroll' : '';

  // 构建 sidebar HTML
  let sidebarHTML = '';
  if (sidebars.length > 0) {
    sidebarHTML = `<div class="news-sidebars">
      ${sidebars.map(sb => `
        <div class="news-sidebar-item">
          <span class="news-sidebar-type">${escapeHtml(sb['类型'] || '简讯')}</span>
          <span class="news-sidebar-content">${escapeHtml(sb['内容'] || '')}</span>
        </div>
      `).join('')}
    </div>`;
  }

  // 构建 meta 行
  const metaParts = [];
  if (date) metaParts.push(`<span>📅 ${date}</span>`);
  if (section) metaParts.push(`<span>📄 ${section}</span>`);
  const metaRow = metaParts.length > 0
    ? `<div class="news-meta-row">${metaParts.join('')}</div>`
    : '';

  // 折叠标题（显示在 summary 中）
  const summaryText = isGMA ? 'GMA 官方通告' : mediaName.replace(/[「」『』《》]/g, '');

  return `<div class="${NEWS_RENDERED_CLASS} news-wrapper" data-news-id="${id}">
  ${newsCSS}
  <details open>
    <summary>${summaryText}<button class="news-theme-btn" type="button" title="切换日夜">🌙</button></summary>
    <div class="news-paper ${gmaClass}">
      <div class="news-masthead">
        <div class="news-media-name">${mediaName}</div>
        ${slogan}
        ${metaRow}
      </div>
      <div class="news-content">
        <h2 class="news-headline">${headline}</h2>
        ${subtitle}
        <div class="news-body ${multiColClass} ${scrollClass}">
          ${bodyText}
        </div>
        ${byline}
      </div>
      ${sidebarHTML}
      <div class="news-footer">— ✦ —</div>
    </div>
  </details>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 渲染逻辑
// ══════════════════════════════════════════════════════════════════════════════

function renderNewsBulletin(message_id) {
  try {
    const messages = getChatMessages(message_id);
    if (!messages || messages.length === 0) return;

    const message = messages[0].message;
    const data = parseNewsBulletin(message);
    if (!data) return;

    const html = buildNewsHTML(data);

    const $mes_text = retrieveDisplayedMessage(message_id);
    if (!$mes_text || $mes_text.length === 0) return;

    // 移除已有的渲染
    $mes_text.find(`.${NEWS_RENDERED_CLASS}`).remove();

    // 追加渲染
    $mes_text.append(html);
    $mes_text.find(`.${NEWS_RENDERED_CLASS}`).last().on('click', '.news-theme-btn', function() {
      const $w = $(this).closest('.news-wrapper');
      const isDark = $w.toggleClass('dark').hasClass('dark');
      $(this).text(isDark ? '☀️' : '🌙');
    });
    console.info(`[新闻通讯] 楼层 ${message_id} 已渲染`);
  } catch (error) {
    console.error(`[新闻通讯] 渲染楼层 ${message_id} 失败:`, error);
  }
}

function renderAllNewsBulletins() {
  $('#chat', window.parent.document)
    .children(".mes[is_user='false'][is_system='false']")
    .each((_index, node) => {
      const mesId = node.getAttribute('mesid');
      if (mesId !== null) {
        renderNewsBulletin(Number(mesId));
      }
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// 初始化与事件监听
// ══════════════════════════════════════════════════════════════════════════════

$(() => {
  errorCatched(async () => {
    console.info('[新闻通讯] 脚本加载中...');

    // 初始渲染
    await renderAllNewsBulletins();

    // 角色消息渲染完成
    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, errorCatched(renderNewsBulletin));

    // 消息被更新
    eventOn(tavern_events.MESSAGE_UPDATED, errorCatched(renderNewsBulletin));

    // 消息被滑动切换
    eventOn(tavern_events.MESSAGE_SWIPED, errorCatched(renderNewsBulletin));

    // 消息被删除后重渲所有
    eventOn(tavern_events.MESSAGE_DELETED, errorCatched(renderAllNewsBulletins));

    toastr.success('新闻通讯渲染脚本已加载', '✅ 加载成功');
  })();
});

// 卸载清理
$(window).on('pagehide', () => {
  console.info('[新闻通讯] 脚本已卸载');
});
