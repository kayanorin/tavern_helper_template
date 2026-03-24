const cafeStyleContent = `<style>
    @import url("https://fontsapi.zeoseven.com/243/main/result.css");

    :root {
      --hk-red: #A45A52;
      --hk-tan: #EED8BE;
      --hk-cream: #FDF5E6;
      --hk-dark: #5C4B3B;
      --glass-bg: rgb(253, 245, 230);
      --glass-border: rgba(164, 90, 82, 0.4);
    }

    .hk-cafe-wrapper {
      font-family: "寒蝉半圆体", sans-serif;
      max-width: min(550px, 100%);
      margin: 20px auto;
      position: relative;
      color: var(--hk-dark);
      padding: 10px;
    }

    /* --- 主折叠容器 --- */
    .glass-card {
      background: var(--glass-bg);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1.5px solid var(--glass-border);
      border-radius: 28px;
      box-shadow: 0 12px 40px rgba(92, 75, 59, 0.15);
      transition: box-shadow 0.3s ease;
      position: relative;
      z-index: 5;
    }

    /* 折叠态晶莹动效 */
    details:not([open]).glass-card {
      animation: glass-glow 3s infinite alternate;
      cursor: pointer;
    }

    @keyframes glass-glow {
      from { box-shadow: 0 5px 15px rgba(164, 90, 82, 0.15); }
      to { box-shadow: 0 15px 35px rgba(164, 90, 82, 0.35); border-color: var(--hk-red); }
    }

    .hk-header {
      list-style: none;
      padding: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .hk-header::-webkit-details-marker { display: none; }
    
    .teapot-icon {
      width: 32px;
      height: 32px;
      background: url('https://files.catbox.moe/gopk4h.png') no-repeat center/contain;
      margin-right: 12px;
    }

    .hk-title {
      font-size: 1.4em;
      font-weight: bold;
      letter-spacing: 3px;
      color: var(--hk-red);
      text-shadow: 1px 1px 0px #fff;
    }

    /* --- 动画核心：修复折叠失效问题 --- */
    /* 我们为每一层级定义明确的动画容器 */
    .anim-master, .anim-sub {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    details[open] > .anim-master,
    details[open] > .anim-sub {
      grid-template-rows: 1fr;
    }

    .anim-inner {
      overflow: hidden;
      padding: 0 15px; /* 侧边留白 */
    }

    /* --- 数据网格 --- */
    .hk-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      padding: 35px 5px 20px; /* 顶部留足35px给气泡弹出 */
    }

    @media (max-width: 360px) {
      .hk-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
    }

    .hk-item {
      background: var(--hk-cream);
      border: 1px solid var(--hk-tan);
      border-radius: 12px;
      padding: 10px 15px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      /* 这里的关键是不设置 overflow: hidden，气泡才能出来 */
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }

    .hk-label {
      font-weight: bold;
      color: var(--hk-red);
      white-space: nowrap;
      border-right: 2px solid var(--hk-tan);
      padding-right: 10px;
    }

    .hk-value {
      flex: 1;
      text-align: right;
      font-weight: 600;
    }

    /* --- 进度条与气泡 --- */
    .hk-progress-box {
      flex: 1.5;
      height: 12px;
      background: var(--hk-tan);
      border-radius: 6px;
      position: relative;
      cursor: pointer;
      outline: none;
    }
    .hk-progress-fill {
      height: 100%;
      background: var(--hk-red);
      border-radius: 6px;
    }

    .bubble-val {
      position: absolute;
      bottom: calc(100% + 15px); /* 向上弹出 */
      right: 0;
      background: var(--hk-dark);
      color: var(--hk-cream);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      opacity: 0;
      transform: scale(0.8) translateY(10px);
      transition: 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      pointer-events: none;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .bubble-val::after {
      content: '';
      position: absolute;
      bottom: -6px;
      right: 10px;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid var(--hk-dark);
    }
    .hk-progress-box:focus .bubble-val {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    /* --- 子折叠样式优化 --- */
    .hk-sub-section {
      margin: 10px 0;
      border-top: 1px dashed var(--hk-tan);
    }
    .hk-sub-summary {
      list-style: none;
      cursor: pointer;
      color: var(--hk-red);
      font-weight: bold;
      padding: 15px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .hk-sub-summary::before {
      /* content: '◈'; */
      content: '';
      width: 20px; height: 20px;
      background: url('https://files.catbox.moe/wph50m.png') no-repeat center/contain;
      transition: transform 0.3s;
    }
    details[open] > .hk-sub-summary::before {
      transform: rotate(90deg);
      color: var(--hk-dark);
    }

    /* --- 定制提醒：外置标签 --- */
    .remind-outer {
      margin: 30px 10px 20px;
      position: relative;
    }
    .remind-tag {
      position: absolute;
      top: -15px;
      left: 20px;
      background: var(--hk-red);
      color: var(--hk-cream);
      padding: 3px 18px;
      border-radius: 6px;
      font-size: 0.9em;
      font-weight: bold;
      box-shadow: 3px 3px 0 var(--hk-dark);
      z-index: 10;
    }
    .remind-box {
      background: var(--hk-cream);
      border: 1.5px solid var(--hk-red);
      border-radius: 14px;
      padding: 25px 20px 15px;
      font-size: 0.95em;
      line-height: 1.8;
      box-shadow: 6px 6px 0 rgba(92, 75, 59, 0.08);
    }

    /* --- 右下角横幅 --- */
    .hk-banner {
      position: absolute;
      right: -30px;
      bottom: -5px;
      width: 180px;
      z-index: 100;
      filter: drop-shadow(4px 6px 10px rgba(0,0,0,0.2));
      pointer-events: none;
    }

    @media (max-width: 480px) {
      .hk-grid { grid-template-columns: 1fr; }
    }
  </style>`;

const witchStyleContent = `<style>
    @import url("https://fontsapi.zeoseven.com/381/main/result.css"); /* 经营总结字体 */
    @import url("https://fontsapi.zeoseven.com/324/main/result.css"); /* 其它内容字体 */

    :root {
      --witch-dark: #150905;    
      /* --witch-purple: #885d9d;  
      --witch-orange: #ff925c;  
      --witch-yellow: #f8e8a1;   */
      --glass-panel: #4c4055;
      --witch-orange: #ef9b59;
      --witch-yellow: #fee785;
      --witch-purple: #885d9d;
      --witch-dark: #1e0411;
      --witch-red: #991F16;
    }

    .witch-ui-wrapper {
      font-family: "NanoWoodHei Mono", sans-serif;
      max-width: min(550px, 100%);
      margin: 20px auto;
      position: relative;
      color: var(--witch-yellow); /* 提高整体易读性 */
      padding: 10px;
    }

    /* 标题字体 */
    .witch-title {
      font-family: "XiangcuiZeroHei-2.0", sans-serif;
      font-size: 1.5em;
      letter-spacing: 3px;
      color: var(--witch-yellow);
      /* text-shadow: 0 0 10px rgba(239, 155, 89, 0.5); */
    }

    /* 主容器 */
    .glass-card {
      background: var(--glass-panel);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 2px solid var(--witch-purple);
      border-radius: 24px;
      box-shadow: 0 15px 50px rgba(0,0,0,0.6);
      transition: border-color 0.3s;
    }

    /* 折叠态动效：巫影流光 */
    details:not([open]).glass-card {
      animation: witch-glow 4s infinite alternate;
      cursor: pointer;
    }
    @keyframes witch-glow {
      from { border-color: var(--witch-purple); box-shadow: 0 0 15px rgba(136, 93, 157, 0.3); }
      to { border-color: var(--witch-orange); box-shadow: 0 0 25px rgba(239, 155, 89, 0.4); }
    }

    .witch-header {
      list-style: none;
      padding: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .witch-header::-webkit-details-marker { display: none; }
    
    .icon-ghost {
      width: 38px;
      height: 38px;
      background: url('https://files.catbox.moe/qanwqa.png') no-repeat center/contain;
      margin-right: 12px;
    }

    /* 动画与折叠逻辑 */
    .anim-box {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    details[open] > .anim-box { grid-template-rows: 1fr; }
    .anim-inner { 
      overflow: hidden; 
      padding: 0 15px;
      margin-top: -20px; /* 补偿padding */
    }

    /* 属性网格 */
    .witch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      padding: 40px 10px 20px; /* 顶部留足空间给气泡 */
    }

    @media (max-width: 360px) {
      .witch-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
    }

    .witch-item {
      background: rgba(34, 6, 48, 0.15);
      border: 1px solid rgba(239, 155, 89, 0.4);
      border-radius: 12px;
      padding: 10px 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
    }

    .witch-label {
      font-weight: bold;
      color: var(--witch-orange);
      border-right: 1.5px solid var(--witch-purple);
      padding-right: 10px;
      white-space: nowrap;
    }

    .witch-value { flex: 1; text-align: right; font-weight: bold; }

    /* 进度条统一风格 */
    .witch-progress-box {
      flex: 1.6;
      height: 10px;
      background: var(--witch-dark);
      border: 1px solid var(--witch-orange);
      border-radius: 5px;
      position: relative;
      cursor: help;
      outline: none;
    }
    .witch-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--witch-orange), var(--witch-yellow));
      border-radius: 5px;
      /* box-shadow: 0 0 8px var(--witch-yellow); */
    }

    /* 气泡提示 */
    .bubble-tip {
      position: absolute;
      bottom: calc(100% + 15px);
      right: 0;
      background: var(--witch-yellow);
      color: var(--witch-dark);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      opacity: 0;
      transform: scale(0.8) translateY(10px);
      transition: 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      white-space: nowrap;
      z-index: 100;
    }
    .bubble-tip::after {
      content: '';
      position: absolute;
      bottom: -6px;
      right: 10px;
      border-top: 6px solid var(--witch-yellow);
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
    }
    .witch-progress-box:focus .bubble-tip { opacity: 1; transform: scale(1) translateY(0); }

    /* 子折叠区域 */
    .sub-section { border-top: 1px solid rgba(136, 93, 157, 0.3); margin-top: 10px; }
    .sub-summary {
      list-style: none;
      cursor: pointer;
      color: var(--witch-orange);
      padding: 15px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: bold;
    }
    .sub-summary::before {
      content: '';
      width: 20px; height: 20px;
      background: url('https://files.catbox.moe/nl39g8.png') no-repeat center/contain;
      transition: transform 0.3s;
    }
    details[open] > .sub-summary::before { transform: rotate(45deg); }

    /* 定制提醒：外置标签 */
    .remind-tag-outer {
      margin: 35px 10px 10px;
      position: relative;
    }
    .remind-label {
      position: absolute;
      top: -14px; left: 25px;
      background: var(--witch-orange);
      color: var(--witch-dark);
      padding: 2px 15px;
      border-radius: 5px;
      font-weight: bold;
      font-size: 0.9em;
      z-index: 10;
      box-shadow: 3px 3px 0 var(--witch-purple);
    }
    .remind-content {
      background: rgba(136, 93, 157, 0.1);
      border: 1.5px solid var(--witch-orange);
      border-radius: 15px;
      padding: 25px 20px 15px;
      line-height: 1.8;
      color: var(--witch-yellow);
    }

    /* 右下角大装饰 */
    .witch-banner {
      position: absolute;
      right: -25px; bottom: -35px;
      width: 170px;
      z-index: 200;
      /* filter: drop-shadow(0 0 15px rgba(239, 155, 89, 0.4)); */
      pointer-events: none;
    }
  </style>`;

// 世界书名称
const WORLDBOOK_NAME = '今天吃点啥';

// 正则：匹配 <chef_status_bar>...</chef_status_bar> 纯文本块
const STATUS_BAR_REGEX =
  /<chef_status_bar>\s*\[经营总结\]\s*姓名\|(.*?)\s*声望\|(.*?)\s*状态\|(.*?)\s*存款\|(.*?)\s*\[店铺经营详情\]\s*等级\|(.*?)\s*人气\|(.*?)\s*库存\|(.*?)\s*整洁\|(.*?)\s*\[三餐营业评估\]\s*早市\|(.*?)\s*午市\|(.*?)\s*晚市\|(.*?)\s*总结\|(.*?)\s*\[定制提醒\]\s*([\s\S]*?)\s*<\/chef_status_bar>/s;

// 渲染后的容器 class，用于标识已渲染的元素
const RENDERED_CLASS = 'chef-status-rendered';

// 当前使用的主题: 'cafe' | 'witch'
let currentTheme = 'cafe';

// ──────────────────────────────────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────────────────────────────────

/** 解析 "数值/总量" 格式，返回百分比 */
function parseProgress(text) {
  const parts = text.split('/');
  if (parts.length === 2) {
    const current = parseInt(parts[0].trim(), 10);
    const total = parseInt(parts[1].trim(), 10);
    if (!isNaN(current) && !isNaN(total) && total !== 0) {
      return Math.round((current / total) * 100);
    }
  }
  return 0;
}

function parseStatusData(match) {
  return {
    name: match[1]?.trim() ?? '',
    reputation: match[2]?.trim() ?? '',
    status: match[3]?.trim() ?? '',
    savings: match[4]?.trim() ?? '',
    rank: match[5]?.trim() ?? '',
    popularity: match[6]?.trim() ?? '',
    inventory: match[7]?.trim() ?? '',
    cleanliness: match[8]?.trim() ?? '',
    morning: match[9]?.trim() ?? '',
    lunch: match[10]?.trim() ?? '',
    dinner: match[11]?.trim() ?? '',
    summary: match[12]?.trim() ?? '',
    customOrders: match[13]?.trim() ?? '',
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 模板生成
// ──────────────────────────────────────────────────────────────────────────────

function buildCafeHtml(data) {
  const repPercent = parseProgress(data.reputation);
  const popPercent = parseProgress(data.popularity);
  const invPercent = parseProgress(data.inventory);
  const cleanPercent = parseProgress(data.cleanliness);

  const styleContent = cafeStyleContent;

  return `<div class="${RENDERED_CLASS} hk-cafe-wrapper">
  ${styleContent}
  <chef_status_bar>
    <details class="glass-card">
      <summary class="hk-header">
        <div class="teapot-icon"></div>
        <span class="hk-title">经营总结</span>
      </summary>
      <div class="anim-master">
        <div class="anim-inner">
          <div class="hk-grid">
            <div class="hk-item"><span class="hk-label">姓名</span><span class="hk-value">${data.name}</span></div>
            <div class="hk-item">
              <span class="hk-label">声望</span>
              <div class="hk-progress-box" tabindex="0">
                <div class="hk-progress-fill" style="width: ${repPercent}%"></div>
                <div class="bubble-val">声望值: ${data.reputation}</div>
              </div>
            </div>
            <div class="hk-item"><span class="hk-label">状态</span><span class="hk-value">${data.status}</span></div>
            <div class="hk-item"><span class="hk-label">存款</span><span class="hk-value" style="color:var(--hk-red); font-weight:bold;">${data.savings}</span></div>
          </div>
          <details class="hk-sub-section">
            <summary class="hk-sub-summary">店铺经营详情</summary>
            <div class="anim-sub">
              <div class="anim-inner">
                <div class="hk-grid" style="padding-top: 40px; border-top: 1px solid rgba(164,90,82,0.1);">
                  <div class="hk-item"><span class="hk-label">等级</span><span class="hk-value">${data.rank}</span></div>
                  <div class="hk-item">
                    <span class="hk-label">人气</span>
                    <div class="hk-progress-box" tabindex="0">
                      <div class="hk-progress-fill" style="width: ${popPercent}%"></div>
                      <div class="bubble-val">人气值: ${data.popularity}</div>
                    </div>
                  </div>
                  <div class="hk-item">
                    <span class="hk-label">库存</span>
                    <div class="hk-progress-box" tabindex="0">
                      <div class="hk-progress-fill" style="width: ${invPercent}%"></div>
                      <div class="bubble-val">库存值: ${data.inventory}</div>
                    </div>
                  </div>
                  <div class="hk-item">
                    <span class="hk-label">整洁</span>
                    <div class="hk-progress-box" tabindex="0">
                      <div class="hk-progress-fill" style="width: ${cleanPercent}%"></div>
                      <div class="bubble-val">整洁值: ${data.cleanliness}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </details>
          <details class="hk-sub-section">
            <summary class="hk-sub-summary">三餐营业评估</summary>
            <div class="anim-sub">
              <div class="anim-inner">
                <div class="hk-grid" style="padding-top: 20px; border-top: 1px solid rgba(164,90,82,0.1);">
                  <div class="hk-item"><span class="hk-label">早市</span><span class="hk-value">${data.morning}</span></div>
                  <div class="hk-item"><span class="hk-label">午市</span><span class="hk-value">${data.lunch}</span></div>
                  <div class="hk-item"><span class="hk-label">晚市</span><span class="hk-value">${data.dinner}</span></div>
                  <div class="hk-item"><span class="hk-label">总结</span><span class="hk-value">${data.summary}</span></div>
                </div>
              </div>
            </div>
          </details>
          <div class="remind-outer">
            <div class="remind-tag">定制提醒</div>
            <div class="remind-box">${data.customOrders.replace(/\n/g, '<br>')}</div>
          </div>
          <div style="height: 15px;"></div>
        </div>
      </div>
    </details>
    <img src="https://files.catbox.moe/glpeb6.png" class="hk-banner" alt="caffee banner">
  </chef_status_bar>
</div>`;
}

function buildWitchHtml(data) {
  const repPercent = parseProgress(data.reputation);
  const popPercent = parseProgress(data.popularity);
  const invPercent = parseProgress(data.inventory);
  const cleanPercent = parseProgress(data.cleanliness);

  const styleContent = witchStyleContent;

  return `<div class="${RENDERED_CLASS} witch-ui-wrapper">
  ${styleContent}
  <chef_status_bar>
    <details class="glass-card">
      <summary class="witch-header">
        <div class="icon-ghost"></div>
        <span class="witch-title">经营总结</span>
      </summary>
      <div class="anim-box">
        <div class="anim-inner">
          <div class="witch-grid">
            <div class="witch-item"><span class="witch-label">姓名</span><span class="witch-value">${data.name}</span></div>
            <div class="witch-item">
              <span class="witch-label">声望</span>
              <div class="witch-progress-box" tabindex="0">
                <div class="witch-progress-fill" style="width: ${repPercent}%"></div>
                <div class="bubble-tip">声望: ${data.reputation}</div>
              </div>
            </div>
            <div class="witch-item"><span class="witch-label">状态</span><span class="witch-value">${data.status}</span></div>
            <div class="witch-item"><span class="witch-label">存款</span><span class="witch-value" style="color:var(--witch-orange)">${data.savings}</span></div>
          </div>
          <details class="sub-section">
            <summary class="sub-summary">店铺经营详情</summary>
            <div class="anim-box">
              <div class="anim-inner">
                <div class="witch-grid">
                  <div class="witch-item"><span class="witch-label">等级</span><span class="witch-value">${data.rank}</span></div>
                  <div class="witch-item">
                    <span class="witch-label">人气</span>
                    <div class="witch-progress-box" tabindex="0">
                      <div class="witch-progress-fill" style="width: ${popPercent}%"></div>
                      <div class="bubble-tip">人气: ${data.popularity}</div>
                    </div>
                  </div>
                  <div class="witch-item">
                    <span class="witch-label">库存</span>
                    <div class="witch-progress-box" tabindex="0">
                      <div class="witch-progress-fill" style="width: ${invPercent}%"></div>
                      <div class="bubble-tip">库存: ${data.inventory}</div>
                    </div>
                  </div>
                  <div class="witch-item">
                    <span class="witch-label">整洁</span>
                    <div class="witch-progress-box" tabindex="0">
                      <div class="witch-progress-fill" style="width: ${cleanPercent}%"></div>
                      <div class="bubble-tip">整洁: ${data.cleanliness}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </details>
          <details class="sub-section">
            <summary class="sub-summary">三餐营业评估</summary>
            <div class="anim-box">
              <div class="anim-inner">
                <div class="witch-grid">
                  <div class="witch-item"><span class="witch-label">早市</span><span class="witch-value">${data.morning}</span></div>
                  <div class="witch-item"><span class="witch-label">午市</span><span class="witch-value">${data.lunch}</span></div>
                  <div class="witch-item"><span class="witch-label">晚市</span><span class="witch-value">${data.dinner}</span></div>
                  <div class="witch-item"><span class="witch-label">总结</span><span class="witch-value">${data.summary}</span></div>
                </div>
              </div>
            </div>
          </details>
          <div class="remind-tag-outer">
            <div class="remind-label">定制提醒</div>
            <div class="remind-content">${data.customOrders.replace(/\n/g, '<br>')}</div>
          </div>
          <div style="height: 20px;"></div>
        </div>
      </div>
    </details>
    <img src="https://files.catbox.moe/73nawz.png" class="witch-banner" alt="witch craft">
  </chef_status_bar>
</div>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// 世界书检测
// ──────────────────────────────────────────────────────────────────────────────

async function detectTheme() {
  try {
    const entries = await getWorldbook(WORLDBOOK_NAME);
    const normalEntry = entries.find(e => e.name === '世界设置');
    const darkEntry = entries.find(e => e.name === '黑暗料理世界设置');

    const normalEnabled = normalEntry?.enabled ?? false;
    const darkEnabled = darkEntry?.enabled ?? false;

    if (normalEnabled && darkEnabled) {
      toastr.warning(
        '「世界设置」和「黑暗料理世界设置」不能同时开启！当前将使用咖啡风格显示。',
        '⚠️ 条目冲突',
        { timeOut: 5000 },
      );
      return 'cafe';
    }

    if (darkEnabled) {
      return 'witch';
    }

    // 默认使用咖啡风格（包括 normalEnabled 或两者都关闭的情况）
    return 'cafe';
  } catch (error) {
    console.error('检测世界书主题失败:', error);
    return 'cafe';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 渲染逻辑
// ──────────────────────────────────────────────────────────────────────────────

async function renderOneMessage(message_id) {
  try {
    const messages = getChatMessages(message_id);
    if (!messages || messages.length === 0) return;

    const message = messages[0].message;
    const match = message.match(STATUS_BAR_REGEX);
    if (!match) return;

    const data = parseStatusData(match);
    const html = currentTheme === 'cafe' ? buildCafeHtml(data) : buildWitchHtml(data);

    const $mes_text = retrieveDisplayedMessage(message_id);
    if (!$mes_text || $mes_text.length === 0) return;

    // 移除已有的渲染结果
    $mes_text.find(`.${RENDERED_CLASS}`).remove();

    // 追加新的渲染结果
    $mes_text.append(html);

    console.info(`[状态栏渲染] 楼层 ${message_id} 已渲染 (${currentTheme})`);
  } catch (error) {
    console.error(`[状态栏渲染] 渲染楼层 ${message_id} 失败:`, error);
  }
}

async function renderAllMessages() {
  $('#chat', window.parent.document)
    .children(".mes[is_user='false'][is_system='false']")
    .each((_index, node) => {
      const mesId = node.getAttribute('mesid');
      if (mesId !== null) {
        renderOneMessage(Number(mesId));
      }
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// 初始化与事件监听
// ──────────────────────────────────────────────────────────────────────────────

$(() => {
  errorCatched(async () => {
    // 初始化主题
    currentTheme = await detectTheme();
    console.info(`[状态栏渲染] 初始化完成，当前主题: ${currentTheme}`);

    // 初始渲染所有消息
    await renderAllMessages();

    // 角色消息渲染完成
    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, errorCatched(renderOneMessage));

    // 消息被更新
    eventOn(tavern_events.MESSAGE_UPDATED, errorCatched(renderOneMessage));

    // 消息被滑动切换
    eventOn(tavern_events.MESSAGE_SWIPED, errorCatched(renderOneMessage));

    // 消息被删除后重渲所有
    eventOn(tavern_events.MESSAGE_DELETED, errorCatched(renderAllMessages));

    // 世界书更新时重新检测主题并重渲所有
    eventOn(tavern_events.WORLDINFO_UPDATED, errorCatched(async (name) => {
      if (name !== WORLDBOOK_NAME) return;

      const newTheme = await detectTheme();
      if (newTheme !== currentTheme) {
        currentTheme = newTheme;
        console.info(`[状态栏渲染] 主题切换为: ${currentTheme}`);
        toastr.info(
          `状态栏风格已切换为${currentTheme === 'cafe' ? '☕ 咖啡风格' : '🎃 万圣风格'}`,
          '风格切换',
        );
      }
      await renderAllMessages();
    }));

    toastr.success('状态栏渲染脚本已加载', '✅ 加载成功');
  })();
});

// 卸载清理
$(window).on('pagehide', () => {
  console.info('[状态栏渲染] 脚本已卸载');
});
