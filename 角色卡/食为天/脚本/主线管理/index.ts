/**
 * ═══════════════════════════════════════════════════════════════
 * 主线管理 —— 统一入口脚本
 * ═══════════════════════════════════════════════════════════════
 *
 * 本脚本根据角色卡开场白(swipe)的索引，自动完成以下操作：
 * 1. 切换世界书条目的启用/禁用状态（见 worldbook.ts）
 * 2. 挂载/卸载对应主线的脚本逻辑（见 quest*.ts）
 *
 * ─── 切换聊天窗口时的行为 ───
 * - 监听 CHAT_CHANGED 事件，聊天切换后自动 cleanup 当前主线 → 重新检测 swipe → 挂载新主线
 * - 酒馆助手的 eventOn 在脚本 iframe 卸载时会自动清理事件监听
 * - 但切换聊天不会卸载脚本 iframe，因此 CHAT_CHANGED 回调中必须手动 cleanup
 *
 * ─── 新增主线的步骤 ───
 * 1. 在本目录下新建 questN.ts，按 init/cleanup 模式导出 init() 函数
 *    - init() 内部用 eventOn() 注册 MVU 事件监听
 *    - 返回 cleanup 函数，调用后注销所有监听
 *    - 参考 quest1.ts / quest2.ts 的写法
 * 2. 在本文件底部 import 新模块
 * 3. 在 SWIPE_QUEST_MAP 中添加 swipe 索引 → 主线标识的映射
 * 4. 在 QUEST_INITIALIZERS 中添加 主线标识 → init() 函数的映射
 * 5. 在 worldbook.ts 的 SWIPE_ACTIONS 中配置对应世界书条目
 */

import { init as initQuest1 } from './quest1';
import { init as initQuest2 } from './quest2';
import { init as initQuest3 } from './quest3';
import { init as initQuest4 } from './quest4';
import { updateWorldBookEntries, showAllEntryUIDs } from './worldbook';

const LEADERBOARD_BUTTON_NAME = '主线一专用·排名榜';
const LEADERBOARD_BUTTON_COMMAND = '/sys compact=true <LeaderboardPlaceHolderImpl/>';

// ═══════════════════════════════════════
// 主线调度配置
// ═══════════════════════════════════════

/**
 * swipe 索引 → 主线标识映射。
 * null 表示该 swipe 没有需要启动的脚本逻辑（只切换世界书）。
 */
const SWIPE_QUEST_MAP: Record<number, string | null> = {
  0: 'quest1',   // 百城百味巡礼
  1: 'quest2',   // 星级逆袭
  2: 'quest3',   // 星辰厨房的传承
  3: 'quest4',   // 深渊厨房的低语
  4: null,       // 主线5
  5: null,       // 自由模式
};

/**
 * 主线标识 → 初始化函数映射。
 * 每个 init 函数返回 cleanup 函数。
 */
const QUEST_INITIALIZERS: Record<string, () => (() => void)> = {
  quest1: initQuest1,
  quest2: initQuest2,
  quest3: initQuest3,
  quest4: initQuest4,
};

// ═══════════════════════════════════════
// 运行时状态
// ═══════════════════════════════════════

/** 当前 swipe 索引 */
let currentSwipeIndex = -1;
/** 当前主线的 cleanup 函数 */
let currentCleanup: (() => void) | null = null;
/** swipe 轮询定时器 */
let swipeMonitorInterval: ReturnType<typeof setInterval> | null = null;
/** 初始化完成标记（抑制首次检测的重复通知） */
let isInitialized = false;

/**
 * 将当前开场白编号同步到聊天级变量，供 EJS 世界书条目读取。
 * 这不是 MVU 变量，不进入 stat_data，也不参与 schema 校验。
 */
async function syncCurrentSwipeVar(swipeIndex: number) {
  try {
    await triggerSlash(`/setvar key=当前开场白编号 as=number ${swipeIndex}`);
  } catch (error) {
    console.error('[主线管理] 同步当前开场白编号失败:', error);
  }
}

function ensureLeaderboardButton() {
  appendInexistentScriptButtons([{ name: LEADERBOARD_BUTTON_NAME, visible: false }]);
}

function updateLeaderboardButtonVisibility(swipeIndex: number) {
  updateScriptButtonsWith(buttons =>
    buttons.map(button =>
      button.name === LEADERBOARD_BUTTON_NAME
        ? { ...button, visible: swipeIndex === 0 }
        : button,
    ),
  );
}

// ═══════════════════════════════════════
// Swipe 检测
// ═══════════════════════════════════════

/**
 * 获取第一条消息当前选中的 swipe 索引
 */
function getCurrentSwipeIndex(): number {
  try {
    const messages = getChatMessages(0, { include_swipes: true });
    if (!messages || !messages[0] || !messages[0].swipes) {
      return -1;
    }
    return messages[0].swipe_id ?? 0;
  } catch (error) {
    console.error('[主线管理] 获取当前swipe索引时出错:', error);
    return -1;
  }
}

// ═══════════════════════════════════════
// 主线逻辑调度
// ═══════════════════════════════════════

/**
 * 根据 swipe 索引切换主线脚本逻辑
 */
function switchQuestModule(swipeIndex: number) {
  // 先清理上一个主线
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  // 查找新主线
  const questId = SWIPE_QUEST_MAP[swipeIndex] ?? null;
  if (questId && QUEST_INITIALIZERS[questId]) {
    currentCleanup = QUEST_INITIALIZERS[questId]();
    console.log(`[主线管理] 已切换到主线: ${questId} (swipe ${swipeIndex})`);
  } else {
    console.log(`[主线管理] swipe ${swipeIndex} 无需启动主线脚本`);
  }
}

// ═══════════════════════════════════════
// Swipe 变化监控
// ═══════════════════════════════════════

/**
 * 检查 swipe 是否发生变化，如有变化则执行切换
 */
async function monitorSwipeChanges() {
  try {
    const newSwipeIndex = getCurrentSwipeIndex();

    if (currentSwipeIndex !== newSwipeIndex && newSwipeIndex >= 0) {
      const oldIndex = currentSwipeIndex;
      currentSwipeIndex = newSwipeIndex;

      console.log(`[主线管理] 检测到swipe变化: ${oldIndex} → ${newSwipeIndex}`);

      // 0~5 的开场白编号写入聊天级变量，供变量列表等 EJS 条目稳定读取
      await syncCurrentSwipeVar(newSwipeIndex);

      if (isInitialized && oldIndex >= 0) {
        toastr.info(`开场白已切换到索引 ${newSwipeIndex}`, '自动检测');
      }

      // 1) 切换巡礼专属按钮
      updateLeaderboardButtonVisibility(newSwipeIndex);

      // 2) 更新世界书条目
      await updateWorldBookEntries(newSwipeIndex);

      // 3) 切换主线脚本逻辑
      switchQuestModule(newSwipeIndex);
    }
  } catch (error) {
    console.error('[主线管理] 监控swipe变化时发生错误:', error);
  }
}

/**
 * 启动 swipe 轮询监控
 */
function startSwipeMonitor() {
  stopSwipeMonitor();
  swipeMonitorInterval = setInterval(monitorSwipeChanges, 500);
  console.log('[主线管理] Swipe监控器已启动，每500ms检查一次');
}

/**
 * 停止 swipe 轮询监控
 */
function stopSwipeMonitor() {
  if (swipeMonitorInterval) {
    clearInterval(swipeMonitorInterval);
    swipeMonitorInterval = null;
  }
}

/**
 * 重置所有状态（切换聊天或卸载脚本时使用）
 */
function resetState() {
  // 清理当前主线逻辑
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  // 停止监控
  stopSwipeMonitor();
  updateLeaderboardButtonVisibility(-1);
  // 清空当前开场白编号，避免切换聊天后的短暂旧值残留
  void syncCurrentSwipeVar(-1);
  // 重置状态
  currentSwipeIndex = -1;
  isInitialized = false;
}

// ═══════════════════════════════════════
// 事件监听器
// ═══════════════════════════════════════

await waitGlobalInitialized('Mvu');

$(() => {
  void (async () => {
    console.log('[主线管理] 脚本已加载');
    toastr.success('主线管理脚本已激活', '脚本激活');

    ensureLeaderboardButton();
    eventOn(getButtonEvent(LEADERBOARD_BUTTON_NAME), () => {
      void triggerSlash(LEADERBOARD_BUTTON_COMMAND);
    });

    // 调试：输出世界书 UID 信息
    showAllEntryUIDs();

    // 监听 MESSAGE_SWIPED 事件（即时响应用户手动切换）
    eventOn(tavern_events.MESSAGE_SWIPED, (messageId: number) => {
      if (messageId === 0) {
        monitorSwipeChanges();
      }
    });

    // 监听 CHAT_CHANGED 事件（切换聊天窗口时重新初始化）
    eventOn(tavern_events.CHAT_CHANGED, () => {
      console.log('[主线管理] 检测到聊天切换，重新初始化...');
      resetState();
      // 延迟后重新检测（等聊天内容加载完成）
      setTimeout(() => {
        startSwipeMonitor();
        monitorSwipeChanges().then(() => {
          isInitialized = true;
        });
      }, 1000);
    });

    // 启动监控
    startSwipeMonitor();

    // 初始化检测（延迟确保聊天已加载）
    setTimeout(async () => {
      await monitorSwipeChanges();
      isInitialized = true;
    }, 1000);
  })();
});

// 脚本卸载清理
$(window).on('pagehide', () => {
  console.log('[主线管理] 脚本已卸载');
  resetState();
  toastr.info('主线管理脚本已停用。');
});
