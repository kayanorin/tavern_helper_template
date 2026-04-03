// ══════════════════════════════════════════════════════════════════════════════
// 小剧场渲染 - 烹饪游戏（交互式烹饪游戏）
// 从「今天吃点啥」移植，适配「食为天」世界观
// ══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────────
// 常量
// ──────────────────────────────────────────────────────────────────────────────

const WORLDBOOK_NAME = '地梨蛇思是好吃';
const COOKING_REGEX = /<cooking>([\s\S]*?)<\/cooking>/g;
const RENDERED_CLASS = 'cooking-game-rendered';

// 火候区间（百分比）
const HEAT_ZONES = {
  RAW: { min: 0, max: 35 },
  PERFECT: { min: 35, max: 70 },
  BURNT: { min: 70, max: 100 },
};

// 火候偏移评价（RAW / BURNT 时附加的趣味提示）
const HEAT_TIPS = {
  RAW: [
    '还是夹生的…食材在哭泣',
    '这…还能听到食材的心跳',
    '差点意思，再来一把火吧',
    '冰冰凉凉，透心儿凉',
    '食材：「我还没准备好！」',
  ],
  BURNT: [
    '烧焦了…但也许这就是碳的艺术？',
    '黑色料理诞生了！',
    '焦香四溢…咳咳咳',
    '消防队已在路上',
    '恭喜解锁隐藏结局：炭烤一切',
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// 解析器
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 解析 <cooking> 标签内容，返回结构化数据
 * 宽容解析：字段缺失用默认值填充，中英文冒号均可
 */
function parseCookingData(rawText) {
  const lines = rawText.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const data = {
    mode: '普通',
    ingredients: [],
    methods: [],
    dishes: [],
  };

  for (const line of lines) {
    // 匹配 key：value 或 key:value（中英文冒号均可）
    const sepIdx = line.search(/[:：]/);
    if (sepIdx === -1) continue;

    const key = line.slice(0, sepIdx).trim();
    const value = line.slice(sepIdx + 1).trim();

    switch (key) {
      case '模式':
        data.mode = value.includes('黑暗') ? '黑暗' : '普通';
        break;
      case '食材':
        data.ingredients = parseIngredients(value);
        break;
      case '烹饪方法':
        data.methods = value.split(/[,，]/).map(m => m.trim()).filter(Boolean);
        break;
      case '菜品':
        data.dishes = parseDishes(value);
        break;
    }
  }

  return data;
}

/**
 * 解析食材字符串
 * 输入: "🍎苹果，🍖排骨，🌶️辣椒"
 * 输出: [{ emoji: '🍎', name: '苹果' }, ...]
 */
function parseIngredients(str) {
  return str.split(/[,，]/).map(item => {
    item = item.trim();
    if (!item) return null;

    // 尝试提取 emoji 前缀
    // emoji 可能是多字节组合（如 🌶️），用正则匹配
    const emojiMatch = item.match(/^(\p{Emoji_Presentation}[\u{FE0F}\u{200D}\p{Emoji_Component}]*)/u);
    if (emojiMatch && emojiMatch[1]) {
      return {
        emoji: emojiMatch[1],
        name: item.slice(emojiMatch[1].length).trim() || item,
      };
    }
    return { emoji: '❓', name: item };
  }).filter(Boolean);
}

/**
 * 解析菜品字符串
 * 输入: "苹果炖排骨=🍖🍎|苹果+排骨|炖|⭐⭐⭐|酸甜软烂；辣椒煎排骨=🌶️🍖|辣椒+排骨|煎|⭐⭐|香辣"
 * 输出: [{ name, emoji, ingredients[], method, rating, review }, ...]
 */
function parseDishes(str) {
  // 用中文分号分隔各道菜
  return str.split(/[;；]/).map(dishStr => {
    dishStr = dishStr.trim();
    if (!dishStr) return null;

    // 用 = 分隔菜名和属性
    const eqIdx = dishStr.indexOf('=');
    if (eqIdx === -1) {
      return { name: dishStr, emoji: '🍽️', ingredients: [], method: '', rating: '⭐', review: '未知的味道' };
    }

    const name = dishStr.slice(0, eqIdx).trim();
    const propsStr = dishStr.slice(eqIdx + 1).trim();
    const props = propsStr.split('|').map(p => p.trim());

    return {
      name: name || '神秘料理',
      emoji: props[0] || '🍽️',
      ingredients: (props[1] || '').split('+').map(i => i.trim()).filter(Boolean),
      method: props[2] || '',
      rating: props[3] || '⭐',
      review: props[4] || '别有一番风味',
    };
  }).filter(Boolean);
}

// ──────────────────────────────────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────────────────────────────────

/** 随机选取数组中的一项 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 计算火候区间 */
function getHeatZone(percent) {
  if (percent < HEAT_ZONES.PERFECT.min) return 'RAW';
  if (percent <= HEAT_ZONES.PERFECT.max) return 'PERFECT';
  return 'BURNT';
}

/** 根据火候调整评级 */
function adjustRating(originalRating, heatZone) {
  if (heatZone === 'PERFECT') return originalRating;
  const starCount = (originalRating.match(/⭐/g) || []).length;
  const adjusted = Math.max(1, starCount - 1);
  return '⭐'.repeat(adjusted);
}

/** 根据火候调整点评 */
function adjustReview(originalReview, heatZone) {
  if (heatZone === 'PERFECT') return originalReview;
  const tip = randomPick(HEAT_TIPS[heatZone]);
  return tip;
}

/** 生成唯一ID */
let _cookingIdCounter = 0;
function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${_cookingIdCounter++}`;
}

/**
 * 规范化食材名称：去掉括号内修饰文字（中英文括号均支持）
 * 例："功能饮料（森林浆果味）" → "功能饮料"
 * 例："鸡蛋(散养)" → "鸡蛋"
 */
function normalizeIngredientName(name) {
  return name.replace(/[（(][^）)]*[）)]/g, '').trim();
}

/**
 * 模糊匹配两个食材名称
 * 1. 先规范化（去括号修饰）
 * 2. 完全相等，或互相包含（"功能饮料" 包含于 "功能饮料（森林浆果味）"）
 */
function fuzzyIngredientMatch(nameA, nameB) {
  const a = normalizeIngredientName(nameA);
  const b = normalizeIngredientName(nameB);
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * 模糊匹配两个食材集合（双向一对一匹配）
 * 要求数量一致，且每个元素都能找到唯一对应
 */
function fuzzyIngredientsSetMatch(setA, setB) {
  if (setA.length !== setB.length) return false;
  const usedB = new Set();
  for (const a of setA) {
    let found = false;
    for (let i = 0; i < setB.length; i++) {
      if (!usedB.has(i) && fuzzyIngredientMatch(a, setB[i])) {
        usedB.add(i);
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// CSS 主题样式
// ══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────────
// 普通模式（温暖烹饪风格）
// ──────────────────────────────────────────────────────────────────────────────
const normalThemeCSS = `<style>
  @import url("https://fontsapi.zeoseven.com/243/main/result.css");

  .ck-game-wrapper.ck-normal {
    --ck-primary: #D4764E;
    --ck-secondary: #E8A87C;
    --ck-accent: #A45A52;
    --ck-bg: #FDF5E6;
    --ck-card-bg: rgba(253, 245, 230, 0.95);
    --ck-text: #5C4B3B;
    --ck-text-light: #8B7355;
    --ck-border: rgba(212, 118, 78, 0.3);
    --ck-shadow: rgba(92, 75, 59, 0.15);
    --ck-heat-raw: #5B9BD5;
    --ck-heat-perfect: #70AD47;
    --ck-heat-burnt: #E84B3C;
    --ck-ingredient-bg: #FFF8EE;
    --ck-ingredient-border: #F0D5B8;
    --ck-ingredient-selected: #D4764E;
    --ck-board-bg: rgba(244, 228, 200, 0.6);
    font-family: "寒蝉半圆体", sans-serif;
    color: var(--ck-text);
  }

  .ck-game-wrapper {
    max-width: min(580px, 100%);
    margin: 20px auto;
    padding: 8px;
    position: relative;
  }

  /* 主容器 */
  .ck-main-card {
    background: var(--ck-card-bg);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1.5px solid var(--ck-border);
    border-radius: 24px;
    box-shadow: 0 12px 40px var(--ck-shadow);
    padding: 0;
    overflow: hidden;
  }

  /* 标题栏 */
  .ck-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px;
    border-bottom: 1px dashed var(--ck-border);
    cursor: default;
  }
  .ck-header-emoji { font-size: 1.8em; }
  .ck-header-title {
    font-size: 1.3em;
    font-weight: bold;
    letter-spacing: 3px;
    color: var(--ck-accent);
    text-shadow: 1px 1px 0 #fff;
  }

  /* ── 阶段区域通用 ── */
  .ck-phase {
    padding: 18px 20px;
    border-bottom: 1px dashed var(--ck-border);
  }
  .ck-phase:last-child { border-bottom: none; }
  .ck-phase-title {
    font-weight: bold;
    color: var(--ck-accent);
    margin-bottom: 14px;
    font-size: 1.05em;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── 食材卡片区 ── */
  .ck-ingredients-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }
  .ck-ingredient-card {
    background: var(--ck-ingredient-bg);
    border: 2px solid var(--ck-ingredient-border);
    border-radius: 16px;
    padding: 12px 16px;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 80px;
    user-select: none;
    position: relative;
  }
  .ck-ingredient-card:hover {
    border-color: var(--ck-primary);
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(212, 118, 78, 0.2);
  }
  .ck-ingredient-card.selected {
    border-color: var(--ck-ingredient-selected);
    background: rgba(212, 118, 78, 0.1);
    box-shadow: 0 0 0 3px rgba(212, 118, 78, 0.15);
  }
  .ck-ingredient-card.selected::after {
    content: '✓';
    position: absolute;
    top: -6px; right: -6px;
    background: var(--ck-primary);
    color: #fff;
    width: 20px; height: 20px;
    border-radius: 50%;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }
  .ck-ingredient-emoji { font-size: 2em; display: block; margin-bottom: 4px; }
  .ck-ingredient-name { font-size: 0.9em; font-weight: 600; color: var(--ck-text); }

  /* ── 砧板/组合区 ── */
  .ck-board {
    background: var(--ck-board-bg);
    border: 1.5px dashed var(--ck-border);
    border-radius: 16px;
    padding: 16px;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .ck-board-label {
    color: var(--ck-text-light);
    font-size: 0.9em;
  }
  .ck-board-items {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  .ck-board-chip {
    background: var(--ck-primary);
    color: #fff;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.9em;
    display: flex;
    align-items: center;
    gap: 4px;
    animation: ck-chip-in 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  }
  @keyframes ck-chip-in {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  /* 烹饪方法按钮 */
  .ck-methods {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 6px;
  }
  .ck-method-btn {
    background: var(--ck-bg);
    border: 2px solid var(--ck-secondary);
    border-radius: 12px;
    padding: 8px 18px;
    font-size: 0.95em;
    font-weight: 600;
    color: var(--ck-text);
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .ck-method-btn:hover {
    background: var(--ck-primary);
    color: #fff;
    border-color: var(--ck-primary);
    transform: scale(1.05);
  }
  .ck-method-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  /* ── 火候进度条 ── */
  .ck-heat-section {
    text-align: center;
  }
  .ck-heat-bar-container {
    position: relative;
    height: 32px;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    margin: 12px 0;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.15);
  }
  .ck-heat-zone {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75em;
    font-weight: bold;
    color: rgba(255,255,255,0.8);
    position: relative;
  }
  .ck-heat-zone.raw {
    width: 35%;
    background: linear-gradient(90deg, #4A9BD9, #5BA8E0);
  }
  .ck-heat-zone.perfect {
    width: 35%;
    background: linear-gradient(90deg, #5CB85C, #70C070);
  }
  .ck-heat-zone.burnt {
    width: 30%;
    background: linear-gradient(90deg, #E85C4A, #D94430);
  }

  .ck-heat-slider {
    position: absolute;
    top: 0;
    width: 4px;
    height: 100%;
    background: #fff;
    box-shadow: 0 0 8px rgba(0,0,0,0.4), 0 0 2px #fff;
    z-index: 10;
    transition: none;
    border-radius: 2px;
  }
  .ck-heat-slider::before {
    content: '▼';
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 14px;
    color: var(--ck-accent);
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  .ck-stop-btn {
    background: linear-gradient(135deg, var(--ck-primary), var(--ck-accent));
    color: #fff;
    border: none;
    border-radius: 14px;
    padding: 12px 36px;
    font-size: 1.1em;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 15px rgba(212, 118, 78, 0.4);
    font-family: inherit;
    letter-spacing: 2px;
  }
  .ck-stop-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(212, 118, 78, 0.5);
  }
  .ck-stop-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .ck-heat-label {
    font-size: 0.85em;
    color: var(--ck-text-light);
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
  }

  /* ── 成品展示区 ── */
  .ck-result-card {
    background: var(--ck-ingredient-bg);
    border: 2px solid var(--ck-ingredient-border);
    border-radius: 18px;
    padding: 20px;
    text-align: center;
    animation: ck-result-in 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  }
  @keyframes ck-result-in {
    from { transform: scale(0.8) translateY(20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }
  .ck-result-emoji { font-size: 3em; margin-bottom: 8px; }
  .ck-result-name {
    font-size: 1.3em;
    font-weight: bold;
    color: var(--ck-accent);
    margin-bottom: 6px;
  }
  .ck-result-rating { font-size: 1.4em; margin: 8px 0; }
  .ck-result-heat-tag {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 10px;
    font-size: 0.8em;
    font-weight: bold;
    margin-bottom: 8px;
  }
  .ck-result-heat-tag.raw {
    background: rgba(90, 155, 213, 0.15);
    color: #4A8BC2;
  }
  .ck-result-heat-tag.perfect {
    background: rgba(92, 184, 92, 0.15);
    color: #4CAF50;
  }
  .ck-result-heat-tag.burnt {
    background: rgba(232, 75, 60, 0.15);
    color: #D94430;
  }
  .ck-result-review {
    font-size: 0.95em;
    color: var(--ck-text-light);
    line-height: 1.6;
    margin-top: 8px;
    font-style: italic;
  }

  /* 再来一次按钮 */
  .ck-retry-btn {
    background: var(--ck-bg);
    border: 2px solid var(--ck-secondary);
    border-radius: 12px;
    padding: 8px 24px;
    font-size: 0.9em;
    font-weight: 600;
    color: var(--ck-text);
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 12px;
    font-family: inherit;
  }
  .ck-retry-btn:hover {
    background: var(--ck-primary);
    color: #fff;
    border-color: var(--ck-primary);
  }

  /* 火焰动画 */
  .ck-fire-anim {
    font-size: 1.5em;
    animation: ck-fire-bounce 0.4s infinite alternate;
  }
  @keyframes ck-fire-bounce {
    from { transform: translateY(0) scale(1); }
    to { transform: translateY(-3px) scale(1.1); }
  }

  /* ── 竖屏/窄屏适配 ── */
  @media(max-width:520px){
    .ck-game-wrapper{padding:4px;margin:12px auto}
    .ck-main-card{border-radius:18px}
    .ck-header{padding:12px 14px;gap:8px}
    .ck-header-emoji{font-size:1.4em}
    .ck-header-title{font-size:1.08em;letter-spacing:2px}
    .ck-phase{padding:12px 14px}
    .ck-phase-title{font-size:.95em;margin-bottom:10px;gap:6px}
    .ck-ingredients-grid{gap:7px}
    .ck-ingredient-card{padding:8px 10px;min-width:68px;border-radius:12px}
    .ck-ingredient-emoji{font-size:1.6em;margin-bottom:2px}
    .ck-ingredient-name{font-size:.82em}
    .ck-ingredient-card.selected::after{width:16px;height:16px;font-size:10px;top:-4px;right:-4px}
    .ck-board{padding:10px;min-height:60px;gap:8px;border-radius:12px}
    .ck-board-label{font-size:.82em}
    .ck-board-items{gap:6px}
    .ck-board-chip{padding:4px 10px;font-size:.82em;border-radius:16px}
    .ck-methods{gap:6px;margin-top:4px}
    .ck-method-btn{padding:6px 14px;font-size:.88em;border-radius:10px}
    .ck-heat-bar-container{height:26px;margin:8px 0}
    .ck-heat-zone{font-size:.68em}
    .ck-heat-label{font-size:.78em;margin-top:6px}
    .ck-stop-btn{padding:9px 28px;font-size:.95em;border-radius:12px}
    .ck-result-card{padding:14px;border-radius:14px}
    .ck-result-emoji{font-size:2.4em;margin-bottom:6px}
    .ck-result-name{font-size:1.1em}
    .ck-result-rating{font-size:1.2em;margin:6px 0}
    .ck-result-heat-tag{font-size:.74em;padding:2px 10px}
    .ck-result-review{font-size:.88em}
    .ck-retry-btn{padding:6px 18px;font-size:.84em;margin-top:8px}
  }
  @media(max-width:380px){
    .ck-phase{padding:10px 10px}
    .ck-header{padding:10px 10px}
    .ck-ingredient-card{padding:6px 8px;min-width:60px}
    .ck-ingredient-emoji{font-size:1.4em}
    .ck-ingredient-name{font-size:.76em}
    .ck-stop-btn{padding:8px 22px;font-size:.88em}
  }

  /* 隐藏状态 */
  .ck-hidden { display: none !important; }
</style>`;

// ──────────────────────────────────────────────────────────────────────────────
// 黑暗模式（妖异料理风格）
// ──────────────────────────────────────────────────────────────────────────────
const darkThemeCSS = `<style>
  @import url("https://fontsapi.zeoseven.com/381/main/result.css");
  @import url("https://fontsapi.zeoseven.com/324/main/result.css");

  .ck-game-wrapper.ck-dark {
    --ck-primary: #885D9D;
    --ck-secondary: #EF9B59;
    --ck-accent: #FEE785;
    --ck-bg: #1E0411;
    --ck-card-bg: rgba(76, 64, 85, 0.95);
    --ck-text: #FEE785;
    --ck-text-light: #C9B06B;
    --ck-border: rgba(136, 93, 157, 0.5);
    --ck-shadow: rgba(0, 0, 0, 0.5);
    --ck-heat-raw: #5B9BD5;
    --ck-heat-perfect: #70AD47;
    --ck-heat-burnt: #E84B3C;
    --ck-ingredient-bg: rgba(34, 6, 48, 0.3);
    --ck-ingredient-border: rgba(239, 155, 89, 0.4);
    --ck-ingredient-selected: #EF9B59;
    --ck-board-bg: rgba(34, 6, 48, 0.25);
    font-family: "NanoWoodHei Mono", sans-serif;
    color: var(--ck-text);
  }
  .ck-game-wrapper.ck-dark .ck-header-title {
    font-family: "XiangcuiZeroHei-2.0", sans-serif;
    color: var(--ck-accent);
    text-shadow: 0 0 10px rgba(239, 155, 89, 0.3);
  }
  .ck-game-wrapper.ck-dark .ck-main-card {
    border-color: var(--ck-primary);
    box-shadow: 0 15px 50px var(--ck-shadow);
  }
  .ck-game-wrapper.ck-dark .ck-ingredient-card:hover {
    border-color: var(--ck-secondary);
    box-shadow: 0 6px 20px rgba(239, 155, 89, 0.2);
  }
  .ck-game-wrapper.ck-dark .ck-ingredient-card.selected {
    border-color: var(--ck-secondary);
    background: rgba(239, 155, 89, 0.1);
    box-shadow: 0 0 0 3px rgba(239, 155, 89, 0.15);
  }
  .ck-game-wrapper.ck-dark .ck-ingredient-card.selected::after {
    background: var(--ck-secondary);
  }
  .ck-game-wrapper.ck-dark .ck-ingredient-name { color: var(--ck-text); }
  .ck-game-wrapper.ck-dark .ck-board-chip {
    background: var(--ck-secondary);
    color: var(--ck-bg);
  }
  .ck-game-wrapper.ck-dark .ck-method-btn {
    background: rgba(34, 6, 48, 0.3);
    border-color: var(--ck-primary);
    color: var(--ck-text);
  }
  .ck-game-wrapper.ck-dark .ck-method-btn:hover {
    background: var(--ck-primary);
    border-color: var(--ck-primary);
    color: #fff;
  }
  .ck-game-wrapper.ck-dark .ck-stop-btn {
    background: linear-gradient(135deg, var(--ck-primary), var(--ck-secondary));
    box-shadow: 0 4px 15px rgba(136, 93, 157, 0.4);
  }
  .ck-game-wrapper.ck-dark .ck-stop-btn:hover {
    box-shadow: 0 6px 20px rgba(136, 93, 157, 0.5);
  }
  .ck-game-wrapper.ck-dark .ck-heat-slider::before { color: var(--ck-accent); }
  .ck-game-wrapper.ck-dark .ck-result-card {
    background: rgba(34, 6, 48, 0.3);
    border-color: var(--ck-primary);
  }
  .ck-game-wrapper.ck-dark .ck-result-name { color: var(--ck-accent); }
  .ck-game-wrapper.ck-dark .ck-retry-btn {
    background: rgba(34, 6, 48, 0.3);
    border-color: var(--ck-primary);
    color: var(--ck-text);
  }
  .ck-game-wrapper.ck-dark .ck-retry-btn:hover {
    background: var(--ck-primary);
    color: #fff;
  }
  .ck-game-wrapper.ck-dark .ck-phase-title { color: var(--ck-secondary); }
</style>`;

// ══════════════════════════════════════════════════════════════════════════════
// HTML 构建
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 构建做饭小游戏的完整HTML
 * @param {object} data - 解析后的烹饪数据
 * @param {string} themeMode - 'normal' | 'dark'
 * @returns {string} HTML字符串
 */
function buildGameHTML(data, themeMode) {
  const gameId = uniqueId('ck');
  const themeClass = themeMode === 'dark' ? 'ck-dark' : 'ck-normal';
  const headerEmoji = themeMode === 'dark' ? '🧪' : '🍳';
  const headerTitle = themeMode === 'dark' ? '黑暗料理实验室' : '味阶烹饪';
  const css = themeMode === 'dark' ? normalThemeCSS + darkThemeCSS : normalThemeCSS;

  // 食材卡片
  const ingredientCards = data.ingredients.map((ing, idx) => `
    <div class="ck-ingredient-card" data-game-id="${gameId}" data-ing-idx="${idx}" data-ing-name="${ing.name}">
      <span class="ck-ingredient-emoji">${ing.emoji}</span>
      <span class="ck-ingredient-name">${ing.name}</span>
    </div>
  `).join('');

  // 烹饪方法按钮
  const methodButtons = data.methods.map(method => `
    <button class="ck-method-btn" data-game-id="${gameId}" data-method="${method}" disabled>${method}</button>
  `).join('');

  return `<div class="${RENDERED_CLASS} ck-game-wrapper ${themeClass}" data-game-id="${gameId}">
  ${css}
  <cooking>
    <div class="ck-main-card">
      <!-- 标题栏 -->
      <div class="ck-header">
        <span class="ck-header-emoji">${headerEmoji}</span>
        <span class="ck-header-title">${headerTitle}</span>
      </div>

      <!-- Phase 1: 食材选择 -->
      <div class="ck-phase ck-phase-ingredients" data-game-id="${gameId}">
        <div class="ck-phase-title">🥘 选择食材</div>
        <div class="ck-ingredients-grid">
          ${ingredientCards}
        </div>
      </div>

      <!-- Phase 2: 砧板/操作台 -->
      <div class="ck-phase ck-phase-board" data-game-id="${gameId}">
        <div class="ck-phase-title">🔪 操作台</div>
        <div class="ck-board" data-game-id="${gameId}">
          <div class="ck-board-label">点击上方食材加入砧板</div>
          <div class="ck-board-items" data-game-id="${gameId}"></div>
        </div>
        <div class="ck-methods" data-game-id="${gameId}">
          ${methodButtons}
        </div>
      </div>

      <!-- Phase 3: 火候控制 -->
      <div class="ck-phase ck-phase-heat ck-hidden" data-game-id="${gameId}">
        <div class="ck-phase-title"><span class="ck-fire-anim">🔥</span> 火候控制</div>
        <div class="ck-heat-section">
          <div class="ck-heat-bar-container" data-game-id="${gameId}">
            <div class="ck-heat-zone raw">RAW</div>
            <div class="ck-heat-zone perfect">PERFECT</div>
            <div class="ck-heat-zone burnt">BURNT</div>
            <div class="ck-heat-slider" data-game-id="${gameId}" style="left: 0%;"></div>
          </div>
          <div class="ck-heat-label">
            <span>🧊 生</span>
            <span>✨ 完美</span>
            <span>💀 焦</span>
          </div>
          <button class="ck-stop-btn" data-game-id="${gameId}">🔥 停火！</button>
        </div>
      </div>

      <!-- Phase 4: 成品展示 -->
      <div class="ck-phase ck-phase-result ck-hidden" data-game-id="${gameId}">
        <div class="ck-phase-title">🍽️ 成品</div>
        <div class="ck-result-area" data-game-id="${gameId}"></div>
      </div>
    </div>
  </cooking>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 游戏交互逻辑
// ══════════════════════════════════════════════════════════════════════════════

/** 存储每个游戏实例的状态 */
const gameStates = new Map();

/**
 * 初始化游戏实例的交互事件
 * @param {jQuery} $wrapper - 游戏容器的 jQuery 对象
 * @param {object} data - 解析后的烹饪数据
 */
function initGameInteractions($wrapper, data) {
  const gameId = $wrapper.attr('data-game-id');
  if (!gameId) return;

  // 初始化游戏状态
  const state = {
    selectedIngredients: new Set(),
    selectedMethod: null,
    heatPercent: 0,
    heatTimer: null,
    heatDirection: 1,
    isHeatRunning: false,
    data: data,
  };
  gameStates.set(gameId, state);

  // ── 食材点击事件 ──
  $wrapper.find('.ck-ingredient-card').on('click', function () {
    const $card = $(this);
    const ingName = $card.attr('data-ing-name');

    if (state.selectedIngredients.has(ingName)) {
      state.selectedIngredients.delete(ingName);
      $card.removeClass('selected');
    } else {
      state.selectedIngredients.add(ingName);
      $card.addClass('selected');
    }

    updateBoard($wrapper, state);
  });

  // ── 烹饪方法点击事件 ──
  $wrapper.find('.ck-method-btn').on('click', function () {
    const method = $(this).attr('data-method');
    state.selectedMethod = method;
    startHeatPhase($wrapper, state);
  });

  // ── 停火按钮事件 ──
  $wrapper.find('.ck-stop-btn').on('click', function () {
    stopHeat($wrapper, state);
  });
}

/**
 * 更新砧板显示和烹饪方法按钮状态
 */
function updateBoard($wrapper, state) {
  const $boardItems = $wrapper.find('.ck-board-items');
  const $boardLabel = $wrapper.find('.ck-board-label');
  const $methods = $wrapper.find('.ck-method-btn');

  // 更新砧板内容
  $boardItems.empty();
  const selected = Array.from(state.selectedIngredients);

  if (selected.length === 0) {
    $boardLabel.text('点击上方食材加入砧板');
    $boardLabel.show();
  } else {
    $boardLabel.hide();
    selected.forEach(name => {
      const ing = state.data.ingredients.find(i => i.name === name);
      const emoji = ing ? ing.emoji : '❓';
      $boardItems.append(`<div class="ck-board-chip">${emoji} ${name}</div>`);
    });
  }

  // 启用/禁用烹饪方法按钮（需要至少选择1个食材）
  $methods.prop('disabled', selected.length === 0);
}

/**
 * 启动火候控制阶段
 */
function startHeatPhase($wrapper, state) {
  // 显示火候阶段
  $wrapper.find('.ck-phase-heat').removeClass('ck-hidden');

  // 禁用食材和方法选择
  $wrapper.find('.ck-ingredient-card').css('pointer-events', 'none').css('opacity', '0.6');
  $wrapper.find('.ck-method-btn').prop('disabled', true).css('opacity', '0.6');

  // 高亮选中的方法
  $wrapper.find(`.ck-method-btn[data-method="${state.selectedMethod}"]`)
    .css({ 'opacity': '1', 'background': 'var(--ck-primary)', 'color': '#fff', 'border-color': 'var(--ck-primary)' });

  // 启动滑块动画
  state.heatPercent = 0;
  state.heatDirection = 1;
  state.isHeatRunning = true;

  const $slider = $wrapper.find('.ck-heat-slider');
  const speed = 0.8; // 每帧移动的百分比

  state.heatTimer = setInterval(() => {
    state.heatPercent += speed * state.heatDirection;

    // 反弹逻辑
    if (state.heatPercent >= 100) {
      state.heatPercent = 100;
      state.heatDirection = -1;
    } else if (state.heatPercent <= 0) {
      state.heatPercent = 0;
      state.heatDirection = 1;
    }

    $slider.css('left', state.heatPercent + '%');
  }, 30);
}

/**
 * 停火 - 停止滑块并显示结果
 */
function stopHeat($wrapper, state) {
  if (!state.isHeatRunning) return;
  state.isHeatRunning = false;

  // 停止动画
  clearInterval(state.heatTimer);
  state.heatTimer = null;

  // 禁用停火按钮
  $wrapper.find('.ck-stop-btn').prop('disabled', true).text('已停火');

  // 计算火候
  const heatZone = getHeatZone(state.heatPercent);
  const heatLabel = { RAW: '🧊 生', PERFECT: '✨ 完美', BURNT: '💀 焦' }[heatZone];

  // 匹配菜品
  const selectedNames = Array.from(state.selectedIngredients);
  const dish = matchDish(state.data.dishes, selectedNames, state.selectedMethod);

  // 调整评级和点评
  const finalRating = adjustRating(dish.rating, heatZone);
  const finalReview = adjustReview(dish.review, heatZone);

  // 显示结果
  showResult($wrapper, {
    name: dish.name,
    emoji: dish.emoji,
    rating: finalRating,
    review: finalReview,
    heatZone: heatZone,
    heatLabel: heatLabel,
  }, state);
}

/**
 * 匹配菜品：根据选中的食材和烹饪方法查找对应菜品
 * 多级匹配策略（由严到宽）：
 *   1. 精确食材 + 精确方法
 *   2. 模糊食材 + 精确方法
 *   3. 模糊食材（忽略方法）
 *   4. 无匹配 → 默认"未知物"
 */
function matchDish(dishes, selectedNames, selectedMethod) {
  const sortedSelected = [...selectedNames].sort().join('+');

  // Level 1: 精确食材 + 精确方法
  for (const dish of dishes) {
    const sortedDish = [...dish.ingredients].sort().join('+');
    if (sortedSelected === sortedDish && dish.method === selectedMethod) {
      return dish;
    }
  }

  // Level 2: 模糊食材 + 精确方法
  for (const dish of dishes) {
    if (fuzzyIngredientsSetMatch(selectedNames, dish.ingredients) && dish.method === selectedMethod) {
      return dish;
    }
  }

  // Level 3: 精确食材（忽略方法）
  for (const dish of dishes) {
    const sortedDish = [...dish.ingredients].sort().join('+');
    if (sortedSelected === sortedDish) {
      return {
        ...dish,
        review: `用${selectedMethod}的方式来做…也不是不行？`,
        rating: '⭐',
      };
    }
  }

  // Level 4: 模糊食材（忽略方法）
  for (const dish of dishes) {
    if (fuzzyIngredientsSetMatch(selectedNames, dish.ingredients)) {
      return {
        ...dish,
        review: `用${selectedMethod}的方式来做…也不是不行？`,
        rating: '⭐',
      };
    }
  }

  // 完全无匹配
  return {
    name: '未知物体',
    emoji: '❓',
    ingredients: selectedNames,
    method: selectedMethod,
    rating: '⭐',
    review: '未知的味道，或许这就是冒险的代价…',
  };
}

/**
 * 显示烹饪结果
 */
function showResult($wrapper, result, state) {
  $wrapper.find('.ck-phase-result').removeClass('ck-hidden');
  const $resultArea = $wrapper.find('.ck-result-area');
  const zoneClass = result.heatZone.toLowerCase();

  $resultArea.html(`
    <div class="ck-result-card">
      <div class="ck-result-emoji">${result.emoji}</div>
      <div class="ck-result-name">${result.name}</div>
      <div class="ck-result-heat-tag ${zoneClass}">${result.heatLabel}</div>
      <div class="ck-result-rating">${result.rating}</div>
      <div class="ck-result-review">「${result.review}」</div>
      <button class="ck-retry-btn" data-game-id="${$wrapper.attr('data-game-id')}">🔄 再来一次</button>
    </div>
  `);

  // 再来一次按钮
  $resultArea.find('.ck-retry-btn').on('click', function () {
    resetGame($wrapper, state);
  });

  // 滚动到结果区域
  const resultEl = $resultArea[0];
  if (resultEl) {
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * 重置游戏到初始状态
 */
function resetGame($wrapper, state) {
  // 清除定时器
  if (state.heatTimer) {
    clearInterval(state.heatTimer);
    state.heatTimer = null;
  }

  // 重置状态
  state.selectedIngredients.clear();
  state.selectedMethod = null;
  state.heatPercent = 0;
  state.isHeatRunning = false;

  // 重置UI
  $wrapper.find('.ck-ingredient-card')
    .removeClass('selected')
    .css({ 'pointer-events': '', 'opacity': '' });

  $wrapper.find('.ck-method-btn')
    .prop('disabled', true)
    .css({ 'opacity': '', 'background': '', 'color': '', 'border-color': '' });

  $wrapper.find('.ck-phase-heat').addClass('ck-hidden');
  $wrapper.find('.ck-phase-result').addClass('ck-hidden');
  $wrapper.find('.ck-heat-slider').css('left', '0%');
  $wrapper.find('.ck-stop-btn').prop('disabled', false).text('🔥 停火！');
  $wrapper.find('.ck-result-area').empty();

  updateBoard($wrapper, state);
}

// ══════════════════════════════════════════════════════════════════════════════
// 主题判断（基于 <cooking> 标签中的「模式」字段）
// ══════════════════════════════════════════════════════════════════════════════

let currentCookingTheme = 'normal';

/**
 * 食为天没有世界书级别的黑暗/普通切换，
 * 所以主题直接由每条消息的 <cooking> 模式字段决定。
 * 这里提供一个全局默认值，renderCookingGame 中会按消息覆盖。
 */
function detectThemeFromData(data) {
  if (!data) return 'normal';
  return data.mode === '黑暗' ? 'dark' : 'normal';
}

// ══════════════════════════════════════════════════════════════════════════════
// 渲染逻辑
// ══════════════════════════════════════════════════════════════════════════════

async function renderCookingGame(message_id) {
  try {
    const messages = getChatMessages(message_id);
    if (!messages || messages.length === 0) return;

    const message = messages[0].message;

    // 使用非全局正则做单次匹配
    const match = message.match(/<cooking>([\s\S]*?)<\/cooking>/);
    if (!match) return;

    const rawContent = match[1];
    const data = parseCookingData(rawContent);

    // 必须至少有食材才渲染
    if (data.ingredients.length === 0) return;

    // 食为天：主题由每条消息的模式字段决定
    const themeForThis = detectThemeFromData(data);
    const html = buildGameHTML(data, themeForThis);

    const $mes_text = retrieveDisplayedMessage(message_id);
    if (!$mes_text || $mes_text.length === 0) return;

    // 移除已有的渲染结果
    $mes_text.find(`.${RENDERED_CLASS}`).remove();

    // 追加新的渲染结果
    $mes_text.append(html);

    // 获取刚追加的 wrapper 并初始化交互
    const $wrapper = $mes_text.find(`.${RENDERED_CLASS}`).last();
    initGameInteractions($wrapper, data);

    console.info(`[烹饪游戏] 楼层 ${message_id} 已渲染 (${themeForThis})`);
  } catch (error) {
    console.error(`[烹饪游戏] 渲染楼层 ${message_id} 失败:`, error);
  }
}

async function renderAllCookingGames() {
  // 先清理所有游戏实例的定时器
  for (const [, state] of gameStates) {
    if (state.heatTimer) {
      clearInterval(state.heatTimer);
    }
  }
  gameStates.clear();

  $('#chat', window.parent.document)
    .children(".mes[is_user='false'][is_system='false']")
    .each((_index, node) => {
      const mesId = node.getAttribute('mesid');
      if (mesId !== null) {
        renderCookingGame(Number(mesId));
      }
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// 初始化与事件监听
// ══════════════════════════════════════════════════════════════════════════════

$(() => {
  errorCatched(async () => {
    console.info('[烹饪游戏] 脚本加载中...');

    // 初始渲染所有消息（主题由每条消息自行决定）
    await renderAllCookingGames();

    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, errorCatched(renderCookingGame));
    eventOn(tavern_events.MESSAGE_UPDATED, errorCatched(renderCookingGame));
    eventOn(tavern_events.MESSAGE_SWIPED, errorCatched(renderCookingGame));
    eventOn(tavern_events.MESSAGE_DELETED, errorCatched(renderAllCookingGames));

    toastr.success('烹饪游戏渲染脚本已加载', '✅ 加载成功');
  })();
});

// 卸载清理
$(window).on('pagehide', () => {
  // 清理所有游戏实例的定时器
  for (const [, state] of gameStates) {
    if (state.heatTimer) {
      clearInterval(state.heatTimer);
    }
  }
  gameStates.clear();
  console.info('[烹饪游戏] 脚本已卸载');
});
