// ══════════════════════════════════════════════════════════════════════════════
// 小剧场渲染 - 美食点评（北欧极简 Scandi 风格）
// 基于 Codex 生成的餐厅点评卡片模板改造
// ══════════════════════════════════════════════════════════════════════════════

const REVIEW_RENDERED_CLASS = 'food-review-rendered';
const STAR_PATH = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';
const TONE_CYCLE = ['sage', 'sky', 'warm'];

// ──────────────────────────────────────────────────────────────────────────────
// 解析器
// ──────────────────────────────────────────────────────────────────────────────

function frParseBlock(text) {
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
 * 从消息文本中提取美食点评数据
 * @returns {{ title, subtitle, restaurants: [{ info, reviews }] } | null}
 */
function parseFoodReview(messageText) {
  const outerMatch = messageText.match(/<food_review>([\s\S]*?)<\/food_review>/);
  if (!outerMatch) return null;
  const inner = outerMatch[1];

  // 提取标题/副标题（在第一个 <restaurant> 之前的键值）
  const headerText = inner.split(/<restaurant>/)[0] || '';
  const header = frParseBlock(headerText);

  // 提取所有 restaurant + review 块（按顺序配对）
  const allBlocks = [];
  const blockRegex = /<(restaurant|review)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = blockRegex.exec(inner)) !== null) {
    allBlocks.push({ type: m[1], data: frParseBlock(m[2]) });
  }

  // 组装：每个 restaurant 后跟随的 review 归属于它
  const restaurants = [];
  let currentRestaurant = null;
  for (const block of allBlocks) {
    if (block.type === 'restaurant') {
      currentRestaurant = { info: block.data, reviews: [] };
      restaurants.push(currentRestaurant);
    } else if (block.type === 'review' && currentRestaurant) {
      currentRestaurant.reviews.push(block.data);
    }
  }

  if (restaurants.length === 0) return null;

  return {
    title: header['标题'] || '美食点评',
    subtitle: header['副标题'] || '',
    restaurants,
  };
}

/** 转义 HTML */
function frEsc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 生成唯一 ID */
let _frIdCounter = 0;
function frUniqueId() { return `fr-${Date.now()}-${_frIdCounter++}`; }

/** 解析招牌菜：菜名|描述 */
function parseSignatureDish(raw) {
  if (!raw) return { name: '', description: '' };
  const parts = raw.split('|');
  return { name: parts[0]?.trim() || '', description: parts[1]?.trim() || '' };
}

/** 解析评分数字 */
function parseScore(raw) {
  const n = parseFloat(raw);
  return isNaN(n) ? 4.0 : Math.min(5, Math.max(0, n));
}

/** 解析标签字符串 */
function parseTags(raw) {
  if (!raw) return [];
  return raw.split(/[,，]/).map(t => t.trim()).filter(Boolean);
}

// ──────────────────────────────────────────────────────────────────────────────
// CSS 样式（Scandi 北欧极简风格）
// ──────────────────────────────────────────────────────────────────────────────

const reviewCSS = `<style>
/* ── 美食点评渲染 ── Scandi Style ── */
.fr-wrapper {
  --canvas: #f6f4ef; --surface: #fbfaf7; --surface-strong: #ffffff;
  --surface-soft: #f1eee7; --surface-hover: #f5f3ee;
  --border: #ddd8cf; --border-strong: #c6c0b6;
  --text: #27302b; --text-soft: #667169; --title: #1f2622;
  --shadow: 0 10px 24px rgba(53,63,56,0.08);
  --sage: #7f9d89; --sage-soft: #e4ece6;
  --sky: #87a9bb; --sky-soft: #e6eef2;
  --warm: #d8b576; --warm-soft: #f3ecde;
  --star: #cfad72; --star-off: #c4c0b9;
  --action-active: #eef3ee;
  max-width: min(100%, 940px);
  margin: 16px auto;
  font-family: "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;
  color: var(--text); line-height: 1.55;
}
/* ── 暗色适配 ── */
body.dark .fr-wrapper, [data-theme="dark"] .fr-wrapper, .dark_theme .fr-wrapper, .fr-wrapper.dark {
  --canvas: #232927; --surface: #262d2b; --surface-strong: #2d3432;
  --surface-soft: #313938; --surface-hover: #313938;
  --border: #404845; --border-strong: #59615e;
  --text: #edf1ee; --text-soft: #bcc8c0; --title: #f7faf7;
  --shadow: 0 10px 24px rgba(0,0,0,0.18);
  --sage: #a9c0b0; --sage-soft: #33413a;
  --sky: #a6bfce; --sky-soft: #33414a;
  --warm: #d8c08d; --warm-soft: #433d30;
  --star: #e2c07f; --star-off: #707874;
  --action-active: #37403d;
}
.fr-theme-btn{background:none;border:1px solid var(--border);border-radius:999px;color:var(--text-soft);cursor:pointer;font-size:.78rem;line-height:1;padding:6px 10px;transition:all .16s;font:inherit;white-space:nowrap}
.fr-theme-btn:hover{background:var(--surface-hover);border-color:var(--border-strong);color:var(--title)}
*,.fr-wrapper *{box-sizing:border-box}
.fr-widget{width:100%;background:var(--canvas);border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow);overflow:hidden}
.fr-widget summary,.fr-review-item summary{list-style:none;cursor:pointer}
.fr-widget summary::-webkit-details-marker,.fr-review-item summary::-webkit-details-marker{display:none}
/* 折叠头 */
.fr-widget-summary{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;background:var(--surface);transition:background .16s}
.fr-widget-summary:hover{background:var(--surface-hover)}
.fr-summary-copy{min-width:0;display:grid;gap:4px}
.fr-summary-kicker{margin:0;color:var(--sage);font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.fr-summary-title{margin:0;color:var(--title);font-size:1.04rem;line-height:1.35;font-weight:700}
.fr-summary-subtitle{margin:0;color:var(--text-soft);font-size:.88rem;line-height:1.55}
.fr-summary-side{display:flex;align-items:center;gap:8px;flex-shrink:0}
.fr-chip,.fr-toggle{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;border:1px solid var(--border);background:var(--surface-strong);color:var(--text-soft);padding:7px 12px;font-size:.84rem;white-space:nowrap;transition:background .16s,border-color .16s,color .16s}
.fr-toggle .open-text,.fr-review-toggle .open-text{display:none}
.fr-widget[open] .fr-toggle .open-text,.fr-review-item[open] .fr-review-toggle .open-text{display:inline}
.fr-widget[open] .fr-toggle .closed-text,.fr-review-item[open] .fr-review-toggle .closed-text{display:none}
/* body */
.fr-widget-body{display:grid;gap:16px;padding:16px 18px 18px;border-top:1px solid var(--border)}
/* tabs */
.fr-tab-list{display:flex;flex-wrap:wrap;gap:8px;padding:4px;border-radius:18px;background:var(--surface-soft);border:1px solid var(--border)}
.fr-tab-btn{min-width:0;flex:1 1 160px;border:1px solid transparent;background:transparent;color:var(--text-soft);border-radius:14px;padding:10px 12px;text-align:left;cursor:pointer;transition:background .16s,border-color .16s,color .16s;font:inherit}
.fr-tab-btn strong{display:block;font-size:.95rem;line-height:1.4;color:inherit;margin-bottom:2px}
.fr-tab-btn span{display:block;font-size:.8rem;line-height:1.45;color:inherit;opacity:.9}
.fr-tab-btn.is-active{background:var(--surface-strong);border-color:var(--border);color:var(--text);box-shadow:0 1px 0 rgba(0,0,0,.02)}
.fr-tab-btn:hover{background:var(--surface-hover);border-color:var(--border-strong);color:var(--text)}
/* panel */
.fr-panel{display:grid;gap:14px;padding:16px;border-radius:20px;background:var(--surface);border:1px solid var(--border)}
.fr-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.fr-panel-title{margin:0;color:var(--title);font-size:clamp(1.18rem,2vw,1.42rem);line-height:1.3}
.fr-panel-subtitle{margin:6px 0 0;color:var(--text-soft);font-size:.92rem;line-height:1.6}
.fr-panel-head-side{display:grid;gap:8px;justify-items:end;flex-shrink:0}
.fr-price-pill,.fr-meta-pill,.fr-tag,.fr-tone-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font-size:.82rem;line-height:1.2;border:1px solid transparent}
.fr-price-pill{background:var(--warm-soft);color:var(--warm)}
.fr-meta-row{display:flex;flex-wrap:wrap;gap:8px}
.fr-meta-pill{background:var(--surface-soft);color:var(--text-soft);border-color:var(--border)}
.fr-tone-chip--sage,.fr-tag--sage{background:var(--sage-soft);color:var(--sage)}
.fr-tone-chip--sky,.fr-tag--sky{background:var(--sky-soft);color:var(--sky)}
.fr-tone-chip--warm,.fr-tag--warm{background:var(--warm-soft);color:var(--warm)}
/* rating */
.fr-rating-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.fr-score-badge{font-size:1rem;font-weight:700;color:var(--title)}
.fr-rating-shell{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.fr-rating-note{color:var(--text-soft);font-size:.84rem}
.fr-rating{display:flex;flex-direction:row-reverse;gap:4px}
.fr-rating input{display:none}
.fr-rating label{display:inline-flex;cursor:pointer}
.fr-rating svg,.fr-static-stars svg{width:16px;height:16px;fill:transparent;stroke:var(--star-off);stroke-width:1.9;transition:fill .16s,stroke .16s,transform .16s}
.fr-rating label:hover svg,.fr-rating label:hover~label svg,.fr-rating input:checked~label svg{fill:var(--star);stroke:var(--star);transform:translateY(-1px)}
/* content grid */
.fr-content-grid{display:grid;grid-template-columns:minmax(0,1.04fr) minmax(220px,.96fr);gap:14px}
.fr-stack{display:grid;gap:12px;min-width:0}
.fr-section-card{border:1px solid var(--border);border-radius:18px;background:var(--surface-strong);padding:14px}
.fr-section-label{margin:0 0 8px;color:var(--text-soft);font-size:.76rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.fr-dish-title{margin:0;color:var(--title);font-size:1rem;line-height:1.45}
.fr-dish-desc,.fr-section-note{margin:8px 0 0;color:var(--text-soft);font-size:.9rem;line-height:1.7}
.fr-tag-row{display:flex;flex-wrap:wrap;gap:8px}
/* reviews */
.fr-reviews-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.fr-reviews-head h3{margin:0;color:var(--title);font-size:.98rem}
.fr-reviews-head span{color:var(--text-soft);font-size:.82rem}
.fr-review-list{display:grid;gap:8px}
.fr-review-item{border:1px solid var(--border);border-radius:14px;background:var(--surface);overflow:hidden}
.fr-review-summary{display:flex;align-items:center;gap:10px;padding:11px 12px;transition:background .16s}
.fr-review-summary:hover{background:var(--surface-hover)}
.fr-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:var(--surface-soft);color:var(--title);font-weight:700;font-size:.88rem}
.fr-review-info{min-width:0;flex:1}
.fr-review-info strong{display:block;color:var(--title);font-size:.9rem;line-height:1.4}
.fr-review-info span{display:block;color:var(--text-soft);font-size:.8rem;line-height:1.45}
.fr-review-side{display:grid;justify-items:end;gap:4px}
.fr-static-stars{display:inline-flex;gap:2px}
.fr-static-stars .is-filled{fill:var(--star);stroke:var(--star)}
.fr-review-date{color:var(--text-soft);font-size:.78rem}
.fr-review-toggle{flex-shrink:0;padding:5px 9px;border-radius:999px;background:var(--surface-soft);color:var(--text-soft);border:1px solid var(--border);font-size:.78rem;white-space:nowrap}
.fr-review-text{margin:0;padding:0 12px 12px;color:var(--text);font-size:.9rem;line-height:1.72}
/* actions */
.fr-action-bar{display:flex;flex-wrap:wrap;gap:8px}
.fr-action-btn{border:1px solid var(--border);border-radius:999px;background:var(--surface-strong);color:var(--text-soft);padding:7px 12px;cursor:pointer;transition:background .16s,border-color .16s,color .16s;font:inherit}
.fr-action-btn:hover{background:var(--surface-hover);border-color:var(--border-strong);color:var(--text)}
.fr-action-btn.is-active{background:var(--action-active);border-color:var(--border-strong);color:var(--title)}
/* responsive */
@media(max-width:780px){.fr-content-grid{grid-template-columns:1fr}.fr-panel-head,.fr-widget-summary{align-items:flex-start}}
@media(max-width:620px){.fr-widget-summary,.fr-panel-head,.fr-review-summary{flex-direction:column}.fr-summary-side,.fr-panel-head-side,.fr-review-side{width:100%;justify-content:flex-start}}
@media(max-width:480px){
  .fr-wrapper{font-size:.92rem;margin:10px auto}
  .fr-widget{border-radius:16px}
  .fr-widget-summary{padding:12px 13px;gap:10px}
  .fr-summary-kicker{font-size:.7rem}
  .fr-summary-title{font-size:.92rem}
  .fr-summary-subtitle{font-size:.82rem}
  .fr-chip,.fr-toggle{padding:5px 9px;font-size:.78rem}
  .fr-widget-body{padding:12px 13px 14px;gap:12px}
  .fr-tab-list{gap:6px;padding:3px}
  .fr-tab-btn{padding:8px 10px;flex:1 1 120px}
  .fr-tab-btn strong{font-size:.88rem}
  .fr-tab-btn span{font-size:.74rem}
  .fr-panel{padding:12px;gap:10px;border-radius:14px}
  .fr-panel-title{font-size:1.05rem!important}
  .fr-panel-subtitle{font-size:.84rem}
  .fr-price-pill,.fr-meta-pill,.fr-tag,.fr-tone-chip{padding:4px 8px;font-size:.76rem}
  .fr-meta-row{gap:6px}
  .fr-rating-row{gap:8px}
  .fr-score-badge{font-size:.92rem}
  .fr-rating svg,.fr-static-stars svg{width:14px;height:14px}
  .fr-rating-note{font-size:.78rem}
  .fr-section-card{padding:10px;border-radius:14px}
  .fr-section-label{font-size:.7rem;margin-bottom:6px}
  .fr-dish-title{font-size:.9rem}
  .fr-dish-desc,.fr-section-note{font-size:.84rem;margin-top:6px}
  .fr-tag-row{gap:6px}
  .fr-reviews-head h3{font-size:.9rem}
  .fr-reviews-head span{font-size:.76rem}
  .fr-review-summary{padding:9px 10px;gap:8px}
  .fr-avatar{width:28px;height:28px;font-size:.78rem}
  .fr-review-info strong{font-size:.84rem}
  .fr-review-info span{font-size:.74rem}
  .fr-review-date{font-size:.72rem}
  .fr-review-toggle{padding:4px 7px;font-size:.72rem}
  .fr-review-text{font-size:.84rem;padding:0 10px 10px;line-height:1.62}
  .fr-action-btn{padding:5px 10px;font-size:.82rem}
}
@media(prefers-reduced-motion:reduce){.fr-wrapper *,.fr-wrapper *::before,.fr-wrapper *::after{transition:none!important}}
</style>`;

// ──────────────────────────────────────────────────────────────────────────────
// HTML 构建器
// ──────────────────────────────────────────────────────────────────────────────

function frStarSvg(className) {
  return `<svg class="${className || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"></path></svg>`;
}

function frStaticStars(value) {
  const n = parseInt(value) || 0;
  return `<span class="fr-static-stars" aria-label="${n} 星">${
    Array.from({ length: 5 }, (_, i) => frStarSvg(i < n ? 'is-filled' : '')).join('')
  }</span>`;
}

function frInteractiveRating(restaurantId, score) {
  const selected = Math.round(score);
  const stars = Array.from({ length: 5 }, (_, i) => {
    const v = 5 - i;
    const id = `${restaurantId}-rating-${v}`;
    return `<input type="radio" id="${id}" name="${restaurantId}-rating" value="${v}" ${v === selected ? 'checked' : ''}>
      <label for="${id}" title="${v} 星">${frStarSvg()}</label>`;
  }).join('');
  return `<div class="fr-rating-shell">
    <div class="fr-rating" aria-label="可交互星级评分">${stars}</div>
    <span class="fr-rating-note" data-rating-note>点星记录印象</span>
  </div>`;
}

function frRenderReview(review, restaurantId, idx) {
  const avatar = frEsc((review['评论者'] || '').charAt(0) || '?');
  const name = frEsc(review['评论者'] || '匿名用户');
  // 从评论者字段提取「」内的昵称和身份
  const nameMatch = (review['评论者'] || '').match(/[「『](.+?)[」』]/);
  const displayName = nameMatch ? nameMatch[1] : name;
  const identity = frEsc(review['味阶'] || '');
  const date = frEsc(review['日期'] || '');
  const rating = parseInt(review['评分']) || 4;
  const text = frEsc(review['内容'] || '');
  const reviewId = `${restaurantId}-review-${idx}`;
  const openAttr = idx === 0 ? ' open' : '';

  return `<details class="fr-review-item"${openAttr} data-review-id="${reviewId}">
    <summary class="fr-review-summary">
      <div class="fr-avatar" aria-hidden="true">${avatar}</div>
      <div class="fr-review-info">
        <strong>${displayName}</strong>
        <span>${identity}</span>
      </div>
      <div class="fr-review-side">
        ${frStaticStars(rating)}
        <time class="fr-review-date">${date}</time>
      </div>
      <span class="fr-review-toggle" aria-hidden="true">
        <span class="closed-text">展开</span>
        <span class="open-text">收起</span>
      </span>
    </summary>
    <p class="fr-review-text">${text}</p>
  </details>`;
}

function frRenderTabs(restaurants, activeIdx, widgetId) {
  if (restaurants.length <= 1) return '';
  return `<div class="fr-tab-list" role="tablist">
    ${restaurants.map((r, i) => {
      const name = frEsc(r.info['名称'] || `餐厅${i + 1}`);
      const cuisine = frEsc(r.info['菜系'] || '');
      const score = parseScore(r.info['评分']);
      return `<button class="fr-tab-btn ${i === activeIdx ? 'is-active' : ''}" type="button" role="tab"
        data-fr-tab-idx="${i}" data-fr-widget="${widgetId}">
        <strong>${name}</strong>
        <span>${cuisine}${cuisine ? ' · ' : ''}${score.toFixed(1)} 分</span>
      </button>`;
    }).join('')}
  </div>`;
}

function frRenderPanel(r, restaurantId) {
  const info = r.info;
  const name = frEsc(info['名称'] || '');
  const overview = frEsc(info['简介'] || '');
  const cuisine = frEsc(info['菜系'] || '');
  const price = frEsc(info['价位'] || '');
  const address = frEsc(info['地址'] || '');
  const hours = frEsc(info['营业时间'] || '');
  const score = parseScore(info['评分']);
  const sig = parseSignatureDish(info['招牌菜']);
  const tags = parseTags(info['标签']);
  const accent = TONE_CYCLE[(parseInt(info['排名']) || 1) % TONE_CYCLE.length];

  // meta pills
  const metaPills = [];
  if (address) metaPills.push(`<span class="fr-meta-pill">地址 · ${address}</span>`);
  if (hours) metaPills.push(`<span class="fr-meta-pill">营业 · ${hours}</span>`);

  // tags
  const tagHTML = tags.map((t, i) =>
    `<span class="fr-tag fr-tag--${TONE_CYCLE[i % TONE_CYCLE.length]}">${frEsc(t)}</span>`
  ).join('');

  // reviews
  const reviewsHTML = r.reviews.map((rv, i) => frRenderReview(rv, restaurantId, i)).join('');

  return `<section class="fr-panel" role="tabpanel" aria-label="${name}">
    <div class="fr-panel-head">
      <div>
        <h2 class="fr-panel-title">${name}</h2>
        ${overview ? `<p class="fr-panel-subtitle">${overview}</p>` : ''}
      </div>
      <div class="fr-panel-head-side">
        ${price ? `<span class="fr-price-pill">${price}</span>` : ''}
        ${cuisine ? `<span class="fr-tone-chip fr-tone-chip--${accent}">${cuisine}</span>` : ''}
      </div>
    </div>
    ${metaPills.length ? `<div class="fr-meta-row">${metaPills.join('')}</div>` : ''}
    <div class="fr-rating-row">
      <span class="fr-score-badge">${score.toFixed(1)}</span>
      ${frInteractiveRating(restaurantId, score)}
    </div>
    <div class="fr-content-grid">
      <div class="fr-stack">
        ${sig.name ? `<section class="fr-section-card">
          <p class="fr-section-label">招牌菜</p>
          <h3 class="fr-dish-title">${frEsc(sig.name)}</h3>
          ${sig.description ? `<p class="fr-dish-desc">${frEsc(sig.description)}</p>` : ''}
        </section>` : ''}
        ${tagHTML ? `<section class="fr-section-card">
          <p class="fr-section-label">风味标签</p>
          <div class="fr-tag-row">${tagHTML}</div>
        </section>` : ''}
        <section class="fr-section-card">
          <p class="fr-section-label">互动</p>
          <div class="fr-action-bar">
            <button class="fr-action-btn" type="button" data-fr-action="like" data-fr-rid="${restaurantId}">♡ 喜欢</button>
            <button class="fr-action-btn" type="button" data-fr-action="save" data-fr-rid="${restaurantId}">☆ 收藏</button>
          </div>
        </section>
      </div>
      <section class="fr-section-card">
        <div class="fr-reviews-head">
          <h3>食客短评</h3>
          <span>${r.reviews.length} 条精选</span>
        </div>
        <div class="fr-review-list">${reviewsHTML}</div>
      </section>
    </div>
  </section>`;
}

function buildReviewHTML(data) {
  const widgetId = frUniqueId();
  const activeIdx = 0;
  const activeR = data.restaurants[activeIdx];
  const restaurantId = `${widgetId}-r${activeIdx}`;

  return `<div class="${REVIEW_RENDERED_CLASS} fr-wrapper" data-fr-widget-id="${widgetId}" data-fr-active="0">
  ${reviewCSS}
  <details class="fr-widget" open data-widget-root>
    <summary class="fr-widget-summary">
      <div class="fr-summary-copy">
        <p class="fr-summary-kicker">Scandi Notes</p>
        <h1 class="fr-summary-title">${frEsc(data.title)}</h1>
        ${data.subtitle ? `<p class="fr-summary-subtitle">${frEsc(data.subtitle)}</p>` : ''}
      </div>
      <div class="fr-summary-side">
        <span class="fr-chip">${data.restaurants.length} 家餐厅</span>
        <button class="fr-theme-btn" type="button" title="切换日夜">🌙</button>
        <span class="fr-toggle" aria-hidden="true">
          <span class="closed-text">展开</span>
          <span class="open-text">收起</span>
        </span>
      </div>
    </summary>
    <div class="fr-widget-body">
      ${frRenderTabs(data.restaurants, activeIdx, widgetId)}
      <div class="fr-panel-container" data-fr-panels="${widgetId}">
        ${frRenderPanel(activeR, restaurantId)}
      </div>
    </div>
  </details>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 交互逻辑
// ══════════════════════════════════════════════════════════════════════════════

/** 缓存每条消息的解析数据，供 tab 切换时重建面板 */
const frDataCache = new Map();

function initReviewInteractions($wrapper) {
  const widgetId = $wrapper.attr('data-fr-widget-id');
  if (!widgetId) return;

  // Tab 切换
  $wrapper.on('click', '.fr-tab-btn', function () {
    const idx = parseInt($(this).attr('data-fr-tab-idx'));
    if (isNaN(idx)) return;
    const data = frDataCache.get(widgetId);
    if (!data || idx >= data.restaurants.length) return;

    // 更新 active
    $wrapper.attr('data-fr-active', idx);
    $wrapper.find('.fr-tab-btn').removeClass('is-active');
    $(this).addClass('is-active');

    // 重建面板
    const restaurantId = `${widgetId}-r${idx}`;
    const panelHTML = frRenderPanel(data.restaurants[idx], restaurantId);
    $wrapper.find(`[data-fr-panels="${widgetId}"]`).html(panelHTML);
  });

  // 互动按钮（喜欢/收藏）
  $wrapper.on('click', '.fr-action-btn', function () {
    $(this).toggleClass('is-active');
    const icon = $(this).hasClass('is-active');
    const action = $(this).attr('data-fr-action');
    if (action === 'like') {
      $(this).html(icon ? '♥ 已喜欢' : '♡ 喜欢');
    } else if (action === 'save') {
      $(this).html(icon ? '★ 已收藏' : '☆ 收藏');
    }
  });

  // 交互式评分
  $wrapper.on('change', 'input[type="radio"]', function () {
    const val = $(this).val();
    const note = $(this).closest('.fr-rating-shell').find('[data-rating-note]');
    if (note.length) {
      note.text(`你的印象：${val} 星`);
    }
  });
  // 日夜切换
  $wrapper.on('click', '.fr-theme-btn', function() {
    const $w = $(this).closest('.fr-wrapper');
    const isDark = $w.toggleClass('dark').hasClass('dark');
    $(this).text(isDark ? '☀️' : '🌙');
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 渲染逻辑
// ══════════════════════════════════════════════════════════════════════════════

function renderFoodReview(message_id) {
  try {
    const messages = getChatMessages(message_id);
    if (!messages || messages.length === 0) return;

    const message = messages[0].message;
    const data = parseFoodReview(message);
    if (!data) return;

    const html = buildReviewHTML(data);

    const $mes_text = retrieveDisplayedMessage(message_id);
    if (!$mes_text || $mes_text.length === 0) return;

    // 移除已有渲染
    $mes_text.find(`.${REVIEW_RENDERED_CLASS}`).remove();

    // 追加新渲染
    $mes_text.append(html);

    // 获取 wrapper 并缓存数据、初始化交互
    const $wrapper = $mes_text.find(`.${REVIEW_RENDERED_CLASS}`).last();
    const widgetId = $wrapper.attr('data-fr-widget-id');
    if (widgetId) frDataCache.set(widgetId, data);
    initReviewInteractions($wrapper);

    console.info(`[美食点评] 楼层 ${message_id} 已渲染`);
  } catch (error) {
    console.error(`[美食点评] 渲染楼层 ${message_id} 失败:`, error);
  }
}

function renderAllFoodReviews() {
  frDataCache.clear();
  $('#chat', window.parent.document)
    .children(".mes[is_user='false'][is_system='false']")
    .each((_index, node) => {
      const mesId = node.getAttribute('mesid');
      if (mesId !== null) {
        renderFoodReview(Number(mesId));
      }
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// 初始化与事件监听
// ══════════════════════════════════════════════════════════════════════════════

$(() => {
  errorCatched(async () => {
    console.info('[美食点评] 脚本加载中...');

    await renderAllFoodReviews();

    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, errorCatched(renderFoodReview));
    eventOn(tavern_events.MESSAGE_UPDATED, errorCatched(renderFoodReview));
    eventOn(tavern_events.MESSAGE_SWIPED, errorCatched(renderFoodReview));
    eventOn(tavern_events.MESSAGE_DELETED, errorCatched(renderAllFoodReviews));

    toastr.success('美食点评渲染脚本已加载', '✅ 加载成功');
  })();
});

$(window).on('pagehide', () => {
  frDataCache.clear();
  console.info('[美食点评] 脚本已卸载');
});
