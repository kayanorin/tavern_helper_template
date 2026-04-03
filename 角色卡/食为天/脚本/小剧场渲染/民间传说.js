// ══════════════════════════════════════════════════════════════════════════════
// 小剧场渲染 - 民间传说（古卷/羊皮纸风格）
// 基于 Codex 生成的民俗童谣卡片模板改造
// ══════════════════════════════════════════════════════════════════════════════

const FL_RENDERED_CLASS = 'folklore-rendered';

// ── 解析器 ──
function flParseBlock(text) {
  const data = {};
  const lines = text.trim().split('\n');
  let currentKey = '';
  lines.forEach(line => {
    const sep = line.search(/[:：]/);
    if (sep === -1) {
      // 续行：追加到上一个 key
      if (currentKey && line.trim()) {
        data[currentKey] += '\n' + line.trim();
      }
      return;
    }
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (key) {
      currentKey = key;
      data[key] = (data[key] ? data[key] + '\n' : '') + value;
    }
  });
  return data;
}

function parseFolklore(messageText) {
  const outerMatch = messageText.match(/<folklore>([\s\S]*?)<\/folklore>/);
  if (!outerMatch) return null;
  const data = flParseBlock(outerMatch[1]);
  if (!data['正文']) return null;
  return data;
}

function flEsc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function flIsRhyme(type) { return /童谣|歌谣/.test(type || ''); }

let _flId = 0;
function flUniqueId() { return `fl-${Date.now()}-${_flId++}`; }

// ── CSS ──
const folkloreCSS = `<style>
/* ── 民间传说渲染 ── */
@import url("https://fontsapi.zeoseven.com/492/main/result.css");
@import url("https://fontsapi.zeoseven.com/629/main/result.css");
@import url("https://fontsapi.zeoseven.com/16/main/result.css");
.fl-wrapper {
  --fl-bg: #d7c3a1; --fl-paper: #f5ecd7; --fl-paper-deep: #e7d3ae;
  --fl-paper-note: #f1e5ca; --fl-ink: #4a3728; --fl-ink-soft: #6d5542;
  --fl-line: #a78358; --fl-accent: #7f4f29; --fl-accent-soft: rgba(140,92,52,0.12);
  max-width: min(100%, 800px); margin: 16px auto;
  font-family: "PING FANG CHANG AN","Kaiti SC","STKaiti","KaiTi","楷体",serif;
  color: var(--fl-ink); line-height: 1.55; font-size: 1.15rem;
}
body.dark .fl-wrapper, [data-theme="dark"] .fl-wrapper, .dark_theme .fl-wrapper, .fl-wrapper.dark {
  --fl-bg: #1b160f; --fl-paper: #2a2218; --fl-paper-deep: #34281d;
  --fl-paper-note: #30251b; --fl-ink: #d4b896; --fl-ink-soft: #b59a7a;
  --fl-line: #8a6d4d; --fl-accent: #e0c49b; --fl-accent-soft: rgba(212,184,150,0.12);
}
.fl-theme-btn{background:none;border:1px solid var(--fl-line);border-radius:999px;color:var(--fl-ink-soft);cursor:pointer;font-size:.78rem;line-height:1;padding:3px 8px;transition:all .16s;margin-left:8px;font-family:inherit;vertical-align:middle}
.fl-theme-btn:hover{border-color:var(--fl-accent);color:var(--fl-ink)}
.fl-wrapper *{box-sizing:border-box}
/* 羊皮纸容器 */
.fl-card{position:relative;margin:0;width:100%;overflow:visible;
  clip-path:polygon(
    1% 1.6%,5% 0.4%,10% 1.9%,16% 0.2%,23% 1.4%,30% 0%,37% 1.2%,44% 0.3%,
    50% 1.7%,57% 0.1%,64% 1.5%,71% 0%,78% 1.3%,85% 0.4%,92% 1.8%,97% 0.2%,100% 1.3%,
    99% 9%,100% 18%,99.2% 28%,100% 37%,98.7% 46%,100% 55%,99.3% 64%,
    100% 73%,98.6% 82%,100% 90%,99% 96%,100% 100%,
    94% 99.7%,87% 100%,80% 98.6%,73% 100%,65% 99.4%,58% 100%,
    50% 98.7%,43% 100%,36% 99.5%,28% 100%,21% 98.5%,14% 100%,7% 99.3%,2% 100%,0% 98.7%,
    0.9% 90%,0% 81%,1.2% 72%,0% 63%,0.7% 54%,0% 45%,1.3% 36%,0% 27%,0.8% 18%,0% 9%,1% 3%
  )}
.fl-parchment-bg{position:absolute;top:0;left:0;width:100%;height:100%;background-color:var(--fl-paper);background-image:url("data:image/png;base64,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");box-shadow:2px 3px 20px rgba(84,58,34,0.4),0 0 120px rgba(143,89,34,0.25) inset;filter:url(#fl-wavy);z-index:1}
body.dark .fl-parchment-bg,.dark_theme .fl-parchment-bg,.fl-wrapper.dark .fl-parchment-bg{background-blend-mode:multiply;box-shadow:2px 3px 20px rgba(0,0,0,0.6),0 0 120px rgba(0,0,0,0.45) inset}
.fl-parchment-content{position:relative;z-index:2;padding:clamp(2.5em,6vw,4.5em) clamp(1.5em,5vw,3.5em)}
.fl-parchment-content::selection,.fl-parchment-content *::selection{background:var(--fl-accent-soft)}
/* 头部 */
.fl-header{display:grid;gap:8px;margin-bottom:24px}
.fl-meta-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end;margin-bottom:12px;font-size:1.1rem;color:var(--fl-ink-soft);font-family:"YuFanXinYu","Kaiti SC","KaiTi","楷体",serif;font-weight:bold;transform:rotate(-1deg);opacity:0.85}
.fl-title{margin:0;color:var(--fl-ink);font-family:"PING FANG CHANG AN","Kaiti SC","STKaiti","KaiTi","楷体",cursive;font-size:clamp(2rem,6vw,3rem);line-height:1.2;text-align:center;text-shadow:1px 1px 0 rgba(255,248,235,0.3);letter-spacing:.05em;font-weight:normal}
.fl-subtitle{margin:0;color:var(--fl-ink-soft);font-size:1.05rem;line-height:1.6;text-align:center;opacity:0.9}
/* 正文 */
.fl-content{display:grid;gap:20px}
.fl-story-block{color:var(--fl-ink);font-size:1.2rem;line-height:2.2;text-align:left;word-break:break-word;letter-spacing:.05em}
.fl-story-block p{margin:0;text-indent:1.5em}
.fl-story-block p+p{margin-top:14px}
/* 童谣 */
.fl-rhyme-block{display:grid;gap:12px;padding:10px 0;text-align:center;color:var(--fl-ink)}
.fl-rhyme-line{font-size:1.25rem;line-height:2.2;letter-spacing:.1em}
.fl-rhyme-line:nth-child(2n){color:var(--fl-ink-soft)}
/* 注解 */
.fl-annotation{position:relative;margin-top:10px;padding:12px 18px}
.fl-annotation::before{content:"注：";display:block;margin-bottom:4px;color:var(--fl-accent);font-size:1.05rem;font-family:"MaokenYingBiKaiShuJ","Kaiti SC","KaiTi","楷体",cursive}
.fl-annotation-text{margin:0;color:var(--fl-ink-soft);font-size:1rem;line-height:2}
/* 页脚 */
.fl-footer{display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-top:30px;padding-top:10px;color:var(--fl-ink-soft);font-size:.92rem;line-height:1.5;transform:rotate(-1deg)}
.fl-footer strong{color:var(--fl-ink);margin-right:4px}
/* 折叠 */
.fl-wrapper details summary{list-style:none;cursor:pointer}
.fl-wrapper details summary::-webkit-details-marker{display:none}
.fl-collapse-summary{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;font-size:.92rem;color:var(--fl-ink-soft);font-weight:700;font-family:"Ma Shan Zheng",cursive;transition:color .16s}
.fl-collapse-summary:hover{color:var(--fl-accent)}
.fl-collapse-summary::before{content:'📜'}
.fl-collapse-arrow{transition:transform .2s;display:inline-block}
.fl-wrapper details[open] .fl-collapse-arrow{transform:rotate(90deg)}
/* responsive */
@media(max-width:560px){
  .fl-wrapper{font-size:1rem}
  .fl-title{font-size:clamp(1.5rem,5vw,2.2rem)}
  .fl-story-block{font-size:1.05rem;line-height:1.95;letter-spacing:.03em}
  .fl-story-block p+p{margin-top:10px}
  .fl-rhyme-line{font-size:1.1rem;line-height:1.95}
  .fl-annotation-text{font-size:.92rem;line-height:1.8}
  .fl-annotation::before{font-size:.95rem}
  .fl-meta-row{font-size:.95rem;gap:8px}
  .fl-subtitle{font-size:.95rem}
  .fl-footer{font-size:.85rem}
}
@media(max-width:420px){
  .fl-parchment-content{padding:2em 1.2em}
  .fl-wrapper{font-size:.92rem}
  .fl-title{font-size:clamp(1.3rem,4.5vw,1.8rem)}
  .fl-story-block{font-size:.95rem;line-height:1.85}
  .fl-rhyme-line{font-size:1rem;line-height:1.85}
  .fl-rhyme-block{gap:8px}
  .fl-annotation-text{font-size:.86rem;line-height:1.7}
  .fl-meta-row{font-size:.86rem;gap:6px;justify-content:flex-start}
  .fl-subtitle{font-size:.88rem}
  .fl-header{margin-bottom:18px}
  .fl-footer{font-size:.8rem;margin-top:22px}
  .fl-content{gap:14px}
}
@media(prefers-reduced-motion:reduce){.fl-wrapper *{transition:none!important}}
</style>`;

// ── SVG filter（羊皮纸边缘侵蚀） ──
const flSvgFilter = `<svg width="0" height="0" aria-hidden="true" style="position:absolute"><filter id="fl-wavy"><feTurbulence x="0" y="0" baseFrequency="0.02" numOctaves="5" seed="1"/><feDisplacementMap in="SourceGraphic" scale="18"/></filter></svg>`;

// ── HTML 构建 ──
function buildFolkloreHTML(data) {
  const id = flUniqueId();
  const type = flEsc(data['类型'] || '');
  const title = flEsc(data['标题'] || data['类型'] || '民间传说');
  const region = flEsc(data['地区'] || '');
  const circulation = flEsc(data['流传度'] || '');
  const subtitle = flEsc(data['副题'] || '');
  const bodyRaw = data['正文'] || '';
  const annotation = flEsc(data['注解'] || '');

  // 正文渲染：传说 vs 童谣
  let bodyHTML;
  if (flIsRhyme(type)) {
    const lines = bodyRaw.split(/\n/).map(l => l.trim()).filter(Boolean);
    bodyHTML = `<div class="fl-rhyme-block">${lines.map(l => `<div class="fl-rhyme-line">${flEsc(l)}</div>`).join('')}</div>`;
  } else {
    const paragraphs = bodyRaw.split(/\n\s*\n/).map(p => p.replace(/\n/g, '').trim()).filter(Boolean);
    bodyHTML = `<div class="fl-story-block">${paragraphs.map(p => `<p>${flEsc(p)}</p>`).join('')}</div>`;
  }

  const annotationHTML = annotation
    ? `<section class="fl-annotation"><p class="fl-annotation-text">${annotation}</p></section>` : '';

  const summaryLabel = type ? `${type}：${title}` : title;

  return `<div class="${FL_RENDERED_CLASS} fl-wrapper" data-fl-id="${id}">
  ${folkloreCSS}
  ${flSvgFilter}
  <details open>
    <summary class="fl-collapse-summary">${summaryLabel} <span class="fl-collapse-arrow">▸</span><button class="fl-theme-btn" type="button" title="切换日夜">🌙</button></summary>
    <article class="fl-card">
      <div class="fl-parchment-bg"></div>
      <div class="fl-parchment-content">
        <header class="fl-header">
          <div class="fl-meta-row">
            ${type ? `<span>【${type}】</span>` : ''}
            ${region ? `<span>[ ${region} ]</span>` : ''}
            ${circulation ? `<span>[ ${circulation} ]</span>` : ''}
          </div>
          <h1 class="fl-title">${title}</h1>
          ${subtitle ? `<p class="fl-subtitle">${subtitle}</p>` : ''}
        </header>
        <main class="fl-content">
          ${bodyHTML}
          ${annotationHTML}
        </main>
      </div>
    </article>
  </details>
</div>`;
}

// ── 渲染 ──
function renderFolklore(message_id) {
  try {
    const messages = getChatMessages(message_id);
    if (!messages || messages.length === 0) return;
    const data = parseFolklore(messages[0].message);
    if (!data) return;
    const $mes_text = retrieveDisplayedMessage(message_id);
    if (!$mes_text || $mes_text.length === 0) return;
    $mes_text.find(`.${FL_RENDERED_CLASS}`).remove();
    $mes_text.append(buildFolkloreHTML(data));
    $mes_text.find(`.${FL_RENDERED_CLASS}`).last().on('click', '.fl-theme-btn', function() {
      const $w = $(this).closest('.fl-wrapper');
      const isDark = $w.toggleClass('dark').hasClass('dark');
      $(this).text(isDark ? '☀️' : '🌙');
    });
    console.info(`[民间传说] 楼层 ${message_id} 已渲染`);
  } catch (e) { console.error(`[民间传说] 渲染失败:`, e); }
}

function renderAllFolklore() {
  $('#chat', window.parent.document)
    .children(".mes[is_user='false'][is_system='false']")
    .each((_, node) => {
      const mesId = node.getAttribute('mesid');
      if (mesId !== null) renderFolklore(Number(mesId));
    });
}

// ── 初始化 ──
$(() => {
  errorCatched(async () => {
    console.info('[民间传说] 脚本加载中...');
    await renderAllFolklore();
    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, errorCatched(renderFolklore));
    eventOn(tavern_events.MESSAGE_UPDATED, errorCatched(renderFolklore));
    eventOn(tavern_events.MESSAGE_SWIPED, errorCatched(renderFolklore));
    eventOn(tavern_events.MESSAGE_DELETED, errorCatched(renderAllFolklore));
    toastr.success('民间传说渲染脚本已加载', '✅ 加载成功');
  })();
});
$(window).on('pagehide', () => { console.info('[民间传说] 脚本已卸载'); });
