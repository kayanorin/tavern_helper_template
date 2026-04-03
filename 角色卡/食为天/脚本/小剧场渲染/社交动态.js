// ══════════════════════════════════════════════════════════════════════════════
// 小剧场渲染 - 社交动态（社交媒体帖子风格）
// 基于 Codex 生成的社交媒体帖子卡片模板改造（Tailwind → 原生CSS）
// ══════════════════════════════════════════════════════════════════════════════

const SP_RENDERED_CLASS = 'social-post-rendered';

// ── 解析器 ──
function spParseBlock(text) {
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

function parseSocialPost(messageText) {
  const outerMatch = messageText.match(/<social_post>([\s\S]*?)<\/social_post>/);
  if (!outerMatch) return null;
  const post = spParseBlock(outerMatch[1]);
  if (!post['正文']) return null;

  // 提取 comments 块
  const comments = [];
  const commentRegex = /<comments>([\s\S]*?)<\/comments>/g;
  let m;
  while ((m = commentRegex.exec(messageText)) !== null) {
    const c = spParseBlock(m[1]);
    if (c['内容']) comments.push(c);
  }

  return { post, comments };
}

function spEsc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function spParseTags(raw) {
  if (!raw) return [];
  return raw.split(/[,，]/).map(t => t.trim()).filter(Boolean);
}

function spParseEngagement(raw) {
  if (!raw) return { likes: 0, saves: 0, comments: 0 };
  const nums = raw.match(/\d+/g) || [];
  return { likes: parseInt(nums[0]) || 0, saves: parseInt(nums[1]) || 0, comments: parseInt(nums[2]) || 0 };
}

let _spId = 0;
function spUniqueId() { return `sp-${Date.now()}-${_spId++}`; }

// ── CSS ──
const socialCSS = `<style>
.sp-wrapper {
  --sp-bg: #f1f5f9; --sp-card: #ffffff; --sp-card-hover: #f8fafc;
  --sp-border: #e2e8f0; --sp-text: #1e293b; --sp-text-soft: #64748b;
  --sp-text-faint: #94a3b8; --sp-accent: #3b82f6; --sp-accent-soft: #dbeafe;
  --sp-rose: #f43f5e; --sp-rose-soft: #ffe4e6;
  --sp-avatar-bg: linear-gradient(135deg, #fff1f2, #fff7ed);
  --sp-comment-avatar: #e0f2fe; --sp-comment-accent: #0284c7;
  --sp-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.05);
  --sp-tag-bg: #f1f5f9; --sp-tag-text: #475569;
  max-width: min(100%, 640px); margin: 16px auto;
  font-family: "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;
  color: var(--sp-text); line-height: 1.55;
}
body.dark .sp-wrapper, [data-theme="dark"] .sp-wrapper, .dark_theme .sp-wrapper, .sp-wrapper.dark {
  --sp-bg: #0f172a; --sp-card: #1e293b; --sp-card-hover: #334155;
  --sp-border: #334155; --sp-text: #f1f5f9; --sp-text-soft: #94a3b8;
  --sp-text-faint: #64748b; --sp-accent: #60a5fa; --sp-accent-soft: #1e3a5f;
  --sp-rose: #fb7185; --sp-rose-soft: #4c1d2e;
  --sp-avatar-bg: linear-gradient(135deg, #334155, #1e293b);
  --sp-comment-avatar: rgba(14,165,233,0.15); --sp-comment-accent: #7dd3fc;
  --sp-shadow: none; --sp-tag-bg: rgba(51,65,85,0.6); --sp-tag-text: #cbd5e1;
}
.sp-theme-btn{background:none;border:1px solid var(--sp-border);border-radius:999px;color:var(--sp-text-faint);cursor:pointer;font-size:.75rem;line-height:1;padding:2px 7px;margin-left:8px;transition:all .16s;font-family:inherit;vertical-align:middle}
.sp-theme-btn:hover{border-color:var(--sp-accent);color:var(--sp-text-soft)}
.sp-wrapper *{box-sizing:border-box}
.sp-card{padding:24px;border-radius:16px;background:var(--sp-card);border:1px solid var(--sp-border);box-shadow:var(--sp-shadow);display:flex;flex-direction:column;gap:0}
/* 作者头 */
.sp-author{display:flex;align-items:center;padding-bottom:20px;gap:14px}
.sp-avatar{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--sp-avatar-bg);border:1px solid var(--sp-border);font-size:1.8rem;flex-shrink:0;text-shadow:0 2px 5px rgba(0,0,0,0.1)}
.sp-author-info{flex:1;min-width:0}
.sp-author-top{display:flex;align-items:center;justify-content:space-between}
.sp-nickname{font-size:1.12rem;font-weight:700;color:var(--sp-text);letter-spacing:.02em}
.sp-timestamp{font-size:.88rem;color:var(--sp-text-faint);font-weight:500}
.sp-identity{font-size:.88rem;color:var(--sp-text-soft);margin-top:2px;font-weight:500}
/* 正文 */
.sp-body{padding-bottom:20px;font-size:1.06rem;line-height:1.85;color:var(--sp-text);white-space:pre-line;letter-spacing:.02em}
/* 图片描述 */
.sp-image-placeholder{padding-bottom:20px}
.sp-image-box{border-radius:12px;overflow:hidden;background:var(--sp-bg);border:1px solid var(--sp-border);padding:20px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative}
.sp-image-box::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,0,0,0.03),transparent);pointer-events:none}
.sp-image-icon{color:var(--sp-text-faint);margin-bottom:10px}
.sp-image-icon svg{width:32px;height:32px;stroke:currentColor;fill:none;stroke-width:2}
.sp-image-caption{color:var(--sp-text-soft);font-size:.92rem;font-style:italic;line-height:1.6;position:relative;z-index:1}
/* 标签 */
.sp-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.sp-tag{display:inline-block;background:var(--sp-tag-bg);color:var(--sp-tag-text);border-radius:999px;padding:4px 12px;font-size:.88rem;font-weight:500;transition:background .16s;cursor:default}
.sp-tag:hover{filter:brightness(0.95)}
/* 互动栏 */
.sp-engagement{display:flex;align-items:center;gap:24px;padding:14px 0;border-top:1px solid var(--sp-border)}
.sp-eng-btn{display:inline-flex;align-items:center;gap:8px;background:none;border:none;color:var(--sp-text-soft);cursor:pointer;padding:4px;font:inherit;font-size:1rem;font-weight:700;transition:color .16s}
.sp-eng-btn:hover{color:var(--sp-rose)}
.sp-eng-btn.sp-save:hover{color:var(--sp-accent)}
.sp-eng-btn.is-active .sp-eng-icon{color:var(--sp-rose)}
.sp-eng-btn.sp-save.is-active .sp-eng-icon{color:var(--sp-accent)}
.sp-eng-icon{display:flex}
.sp-eng-icon svg{width:24px;height:24px;fill:currentColor}
/* 评论区 */
.sp-comments{padding-top:12px}
.sp-comment{display:flex;gap:12px;padding-bottom:16px}
.sp-comment-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--sp-comment-avatar);color:var(--sp-comment-accent);font-weight:700;font-size:.88rem;flex-shrink:0;border:1px solid rgba(14,165,233,0.2)}
.sp-comment-body{flex:1;min-width:0}
.sp-comment-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.sp-comment-name{font-weight:700;font-size:.92rem;color:var(--sp-text)}
.sp-comment-badge{font-size:.78rem;padding:1px 8px;border-radius:999px;background:var(--sp-tag-bg);color:var(--sp-text-soft);border:1px solid var(--sp-border)}
.sp-comment-text{font-size:.92rem;line-height:1.6;color:var(--sp-text);margin-top:2px}
.sp-comment-time{font-size:.78rem;color:var(--sp-text-faint);margin-top:6px}
/* 折叠 */
.sp-wrapper details summary{list-style:none;cursor:pointer}
.sp-wrapper details summary::-webkit-details-marker{display:none}
.sp-collapse-summary{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;font-size:.88rem;color:var(--sp-text-soft);font-weight:600;transition:color .16s}
.sp-collapse-summary:hover{color:var(--sp-accent)}
.sp-collapse-summary::before{content:'💬'}
.sp-collapse-arrow{transition:transform .2s;display:inline-block}
.sp-wrapper details[open] .sp-collapse-arrow{transform:rotate(90deg)}
/* responsive */
@media(max-width:560px){
  .sp-wrapper{font-size:.92rem}
  .sp-card{padding:16px;border-radius:14px;gap:0}
  .sp-author{flex-wrap:wrap;padding-bottom:14px;gap:10px}
  .sp-avatar{width:44px;height:44px;font-size:1.4rem}
  .sp-nickname{font-size:1rem}
  .sp-timestamp{font-size:.8rem}
  .sp-identity{font-size:.82rem}
  .sp-body{padding-bottom:14px;font-size:.95rem;line-height:1.75}
  .sp-image-box{padding:14px 16px}
  .sp-image-icon svg{width:26px;height:26px}
  .sp-image-caption{font-size:.84rem}
  .sp-tags{gap:6px;margin-bottom:12px}
  .sp-tag{padding:3px 10px;font-size:.82rem}
  .sp-engagement{gap:18px;padding:10px 0}
  .sp-eng-btn{font-size:.9rem;gap:6px}
  .sp-eng-icon svg{width:20px;height:20px}
  .sp-comments{padding-top:10px}
  .sp-comment{gap:10px;padding-bottom:12px}
  .sp-comment-avatar{width:30px;height:30px;font-size:.78rem}
  .sp-comment-name{font-size:.85rem}
  .sp-comment-badge{font-size:.72rem;padding:1px 6px}
  .sp-comment-text{font-size:.85rem}
  .sp-comment-time{font-size:.72rem}
}
@media(max-width:420px){
  .sp-card{padding:12px}
  .sp-author{gap:8px;padding-bottom:12px}
  .sp-avatar{width:38px;height:38px;font-size:1.2rem}
  .sp-nickname{font-size:.92rem}
  .sp-body{font-size:.9rem;line-height:1.7;padding-bottom:12px}
  .sp-tag{font-size:.78rem;padding:2px 8px}
  .sp-engagement{gap:14px;padding:8px 0}
  .sp-eng-btn{font-size:.84rem}
  .sp-eng-icon svg{width:18px;height:18px}
  .sp-comment-avatar{width:26px;height:26px;font-size:.72rem}
  .sp-comment-name{font-size:.8rem}
  .sp-comment-text{font-size:.8rem}
}
@media(prefers-reduced-motion:reduce){.sp-wrapper *{transition:none!important}}
</style>`;

// ── HTML 构建 ──
function buildSocialHTML(data) {
  const { post, comments } = data;
  const id = spUniqueId();
  const avatar = post['作者头像'] || '🙂';
  const nickname = spEsc(post['作者昵称'] || '');
  const identity = spEsc(post['作者身份'] || '');
  const timestamp = spEsc(post['发布时间'] || '');
  const body = spEsc(post['正文'] || '');
  const imageCaption = spEsc(post['图片描述'] || '');
  const tags = spParseTags(post['标签']);
  const eng = spParseEngagement(post['互动数据']);

  const tagsHTML = tags.length > 0 ? `<div class="sp-tags">${tags.map(t => `<span class="sp-tag">${spEsc(t)}</span>`).join('')}</div>` : '';

  const imageHTML = imageCaption ? `<div class="sp-image-placeholder">
    <div class="sp-image-box">
      <div class="sp-image-icon"><svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>
      <p class="sp-image-caption">[ 图片描述：${imageCaption} ]</p>
    </div>
  </div>` : '';

  const commentsHTML = comments.length > 0 ? `<div class="sp-comments">
    ${comments.map(c => {
      const ca = spEsc((c['昵称'] || '').charAt(0) || '?');
      const cn = spEsc(c['昵称'] || '');
      const ci = spEsc(c['身份'] || '');
      const ct = spEsc(c['内容'] || '');
      return `<div class="sp-comment">
        <div class="sp-comment-avatar">${ca}</div>
        <div class="sp-comment-body">
          <div class="sp-comment-head">
            <span class="sp-comment-name">${cn}</span>
            ${ci ? `<span class="sp-comment-badge">${ci}</span>` : ''}
          </div>
          <p class="sp-comment-text">${ct}</p>
          <div class="sp-comment-time">刚刚回复</div>
        </div>
      </div>`;
    }).join('')}
  </div>` : '';

  return `<div class="${SP_RENDERED_CLASS} sp-wrapper" data-sp-id="${id}">
  ${socialCSS}
  <details open>
    <summary class="sp-collapse-summary">${nickname || '社交动态'} <span class="sp-collapse-arrow">▸</span><button class="sp-theme-btn" type="button" title="切换日夜">🌙</button></summary>
    <div class="sp-card">
      <div class="sp-author">
        <div class="sp-avatar">${avatar}</div>
        <div class="sp-author-info">
          <div class="sp-author-top">
            <span class="sp-nickname">${nickname}</span>
            <span class="sp-timestamp">${timestamp}</span>
          </div>
          <div class="sp-identity">${identity}</div>
        </div>
      </div>
      <div class="sp-body">${body}</div>
      ${imageHTML}
      ${tagsHTML}
      <div class="sp-engagement">
        <button class="sp-eng-btn sp-like" type="button" data-sp-action="like">
          <span class="sp-eng-icon"><svg viewBox="0 0 24 24"><path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"></path></svg></span>
          <span>${eng.likes}</span>
        </button>
        <button class="sp-eng-btn sp-save" type="button" data-sp-action="save">
          <span class="sp-eng-icon"><svg viewBox="0 0 24 24"><path d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3M17,18L12,15.82L7,18V5H17V18Z"></path></svg></span>
          <span>${eng.saves}</span>
        </button>
      </div>
      ${commentsHTML}
    </div>
  </details>
</div>`;
}

// ── 交互 ──
function initSocialInteractions($wrapper) {
  $wrapper.on('click', '.sp-eng-btn', function () {
    $(this).toggleClass('is-active');
  });
  $wrapper.on('click', '.sp-theme-btn', function() {
    const $w = $(this).closest('.sp-wrapper');
    const isDark = $w.toggleClass('dark').hasClass('dark');
    $(this).text(isDark ? '☀️' : '🌙');
  });
}

// ── 渲染 ──
function renderSocialPost(message_id) {
  try {
    const messages = getChatMessages(message_id);
    if (!messages || messages.length === 0) return;
    const data = parseSocialPost(messages[0].message);
    if (!data) return;
    const $mes_text = retrieveDisplayedMessage(message_id);
    if (!$mes_text || $mes_text.length === 0) return;
    $mes_text.find(`.${SP_RENDERED_CLASS}`).remove();
    $mes_text.append(buildSocialHTML(data));
    initSocialInteractions($mes_text.find(`.${SP_RENDERED_CLASS}`).last());
    console.info(`[社交动态] 楼层 ${message_id} 已渲染`);
  } catch (e) { console.error(`[社交动态] 渲染失败:`, e); }
}

function renderAllSocialPosts() {
  $('#chat', window.parent.document)
    .children(".mes[is_user='false'][is_system='false']")
    .each((_, node) => {
      const mesId = node.getAttribute('mesid');
      if (mesId !== null) renderSocialPost(Number(mesId));
    });
}

// ── 初始化 ──
$(() => {
  errorCatched(async () => {
    console.info('[社交动态] 脚本加载中...');
    await renderAllSocialPosts();
    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, errorCatched(renderSocialPost));
    eventOn(tavern_events.MESSAGE_UPDATED, errorCatched(renderSocialPost));
    eventOn(tavern_events.MESSAGE_SWIPED, errorCatched(renderSocialPost));
    eventOn(tavern_events.MESSAGE_DELETED, errorCatched(renderAllSocialPosts));
    toastr.success('社交动态渲染脚本已加载', '✅ 加载成功');
  })();
});
$(window).on('pagehide', () => { console.info('[社交动态] 脚本已卸载'); });
