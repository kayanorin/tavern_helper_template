/**
 * 巡礼管理模块 (主线1: 百城百味巡礼)
 *
 * 职责:
 * 1. 里程碑称号解锁弹窗 + GMA风格通知
 * 2. NPC生命周期管理（入场/离场/退赛/回归）
 * 3. NPC随机评分事件（随楼层增加触发）
 *
 * 由 主线管理/index.ts 按需加载，swipe 0 时启用。
 * 遵循 init/cleanup 模式：调用 init() 注册事件监听，返回 cleanup() 注销全部监听。
 */

// ═══════════════════════════════════════
// 配置项
// ═══════════════════════════════════════

/** NPC随机评分触发概率 (0~1) */
const NPC_SCORE_PROBABILITY = 0.3;
/** NPC单次加分上限 */
const NPC_SCORE_MAX_PER_EVENT = 8;
/** NPC单次加分下限 */
const NPC_SCORE_MIN_PER_EVENT = 1;
/** 随机选中NPC数量范围 */
const NPC_SELECT_MIN = 1;
const NPC_SELECT_MAX = 3;
/** 玩家发表食评时，额外给NPC加分的数量范围 */
const NPC_ON_REVIEW_SELECT_MIN = 2;
const NPC_ON_REVIEW_SELECT_MAX = 4;
const NPC_ON_REVIEW_SCORE_MIN = 3;
const NPC_ON_REVIEW_SCORE_MAX = 12;
/** NPC"活跃"判定——离场楼层与当前楼层差值在此范围内仍视为近期活跃 */
const NPC_RECENT_FLOOR_RANGE = 10;

// ═══════════════════════════════════════
// GMA通知文案
// ═══════════════════════════════════════

const GMA_NOTICES: Record<string, string> = {
  初味行者: '🎉 GMA系统通知：欢迎踏上巡礼之旅！已获得「初味行者」认证',
  十城漫步: '📖 GMA系统通知：已认证「十城漫步」，解锁《味觉游记》官方发布平台权限',
  百味巡礼者: '🏅 GMA系统通知：已认证「百味巡礼者」，参与活动餐厅消费享9折优惠',
  味觉探索家: '🔬 GMA系统通知：已认证「味觉探索家」，解锁GMA内部资料库权限',
  百城半程: '⭐ GMA系统通知：已认证「百城半程」，获得城市之味推荐优先权',
  品鉴大师: '👑 GMA系统通知：已认证「品鉴大师」，永久VIP待遇 + 年度稀有香料礼盒',
  味觉传奇: '🌟 GMA系统通知：已认证「味觉传奇」，获得GMA特别嘉奖',
  百城百味・完: '🏆 GMA系统通知：恭喜完成百城百味巡礼！获得最高荣誉「百城见证者」',
};

// ═══════════════════════════════════════
// 内部工具函数
// ═══════════════════════════════════════

/**
 * 给指定NPC加分并记录历史
 */
function applyNPCScore(
  variables: any,
  npcName: string,
  delta: number,
  floor: number,
) {
  const basePath = `stat_data.$NPC榜单.${npcName}`;
  const currentScore: number = _.get(variables, `${basePath}.评分`) ?? 0;
  _.set(variables, `${basePath}.评分`, currentScore + delta);

  const history: any[] = _.get(variables, `${basePath}.评分历史`) ?? [];
  history.push({ 变化: delta, 楼层: floor });
  // schema 的 transform 会限制为 20 条，这里做预处理
  _.set(variables, `${basePath}.评分历史`, _.takeRight(history, 20));
}

// ═══════════════════════════════════════
// 模块入口
// ═══════════════════════════════════════

/**
 * 初始化巡礼管理模块。
 * 注册 MVU 变量更新事件监听器，返回 cleanup 函数。
 *
 * @returns cleanup 函数，调用后注销所有事件监听
 */
export function init(): () => void {
  /** 记录上次处理的楼层ID，避免NPC评分重复触发 */
  let lastProcessedFloor = -1;

  // ─── 里程碑称号弹窗 ───
  const sub1 = eventOn(
    Mvu.events.VARIABLE_UPDATE_ENDED,
    (new_variables: any, old_variables: any) => {
      const newTitles: string[] =
        _.get(new_variables, 'stat_data.巡礼.称号') ?? [];
      const oldTitles: string[] =
        _.get(old_variables, 'stat_data.巡礼.称号') ?? [];

      const added = _.difference(newTitles, oldTitles);
      for (const title of added) {
        if (GMA_NOTICES[title]) {
          toastr.success(GMA_NOTICES[title], '里程碑达成', {
            timeOut: 10000,
            progressBar: true,
            positionClass: 'toast-top-center',
          });
        } else {
          toastr.info(`✨ 恭喜获得称号「${title}」！`, '称号解锁', {
            timeOut: 6000,
            progressBar: true,
          });
        }
      }
    },
  );

  // ─── NPC 生命周期管理 ───
  const sub2 = eventOn(
    Mvu.events.VARIABLE_UPDATE_ENDED,
    (new_variables: any, old_variables: any) => {
      const currentFloor = getLastMessageId();
      const newInScene: string[] =
        _.get(new_variables, 'stat_data.巡礼.在场角色') ?? [];
      const oldInScene: string[] =
        _.get(old_variables, 'stat_data.巡礼.在场角色') ?? [];
      const retireList: string[] =
        _.get(new_variables, 'stat_data.巡礼.退赛NPC') ?? [];
      const npcBoard: Record<string, any> =
        _.get(new_variables, 'stat_data.$NPC榜单') ?? {};

      // A) 新NPC入场
      const entered = _.difference(newInScene, oldInScene);
      for (const name of entered) {
        if (!npcBoard[name]) {
          _.set(new_variables, `stat_data.$NPC榜单.${name}`, {
            评分: 0,
            离场楼层: 0,
            评分历史: [],
          });
        } else if (npcBoard[name].离场楼层 > 0) {
          _.set(
            new_variables,
            `stat_data.$NPC榜单.${name}.离场楼层`,
            0,
          );
        }
      }

      // B) NPC临时离场
      const left = _.difference(oldInScene, newInScene);
      for (const name of left) {
        if (!retireList.includes(name) && npcBoard[name]) {
          _.set(
            new_variables,
            `stat_data.$NPC榜单.${name}.离场楼层`,
            currentFloor,
          );
        }
      }

      // C) NPC退赛 → 删除数据 + 清空退赛标记
      if (retireList.length > 0) {
        for (const name of retireList) {
          _.unset(new_variables, `stat_data.$NPC榜单.${name}`);
        }
        _.set(new_variables, 'stat_data.巡礼.退赛NPC', []);
      }
    },
  );

  // ─── NPC 随机评分事件 ───
  const sub3 = eventOn(
    Mvu.events.VARIABLE_UPDATE_ENDED,
    (new_variables: any, old_variables: any) => {
      const currentFloor = getLastMessageId();

      // 避免同一楼层重复触发
      if (currentFloor <= lastProcessedFloor) return;
      lastProcessedFloor = currentFloor;

      const npcBoard: Record<string, any> =
        _.get(new_variables, 'stat_data.$NPC榜单') ?? {};
      const npcNames = Object.keys(npcBoard);
      if (npcNames.length === 0) return;

      // 筛选活跃NPC
      const activeNPCs = npcNames.filter(name => {
        const 离场 = npcBoard[name].离场楼层 ?? 0;
        return 离场 === 0 || currentFloor - 离场 <= NPC_RECENT_FLOOR_RANGE;
      });
      if (activeNPCs.length === 0) return;

      // 检测玩家是否刚发表了新食评
      const oldReviews = _.get(old_variables, 'stat_data.巡礼.品鉴记录') ?? {};
      const newReviews = _.get(new_variables, 'stat_data.巡礼.品鉴记录') ?? {};
      const hasNewReview = _.size(newReviews) > _.size(oldReviews);

      if (hasNewReview) {
        // 玩家发表食评 → 同期竞争加分
        const count = _.random(NPC_ON_REVIEW_SELECT_MIN, NPC_ON_REVIEW_SELECT_MAX);
        const selected = _.sampleSize(activeNPCs, Math.min(count, activeNPCs.length));
        for (const name of selected) {
          const delta = _.random(NPC_ON_REVIEW_SCORE_MIN, NPC_ON_REVIEW_SCORE_MAX);
          applyNPCScore(new_variables, name, delta, currentFloor);
        }
      } else if (Math.random() < NPC_SCORE_PROBABILITY) {
        // 常规随机事件
        const count = _.random(NPC_SELECT_MIN, NPC_SELECT_MAX);
        const selected = _.sampleSize(activeNPCs, Math.min(count, activeNPCs.length));
        for (const name of selected) {
          const delta = _.random(NPC_SCORE_MIN_PER_EVENT, NPC_SCORE_MAX_PER_EVENT);
          applyNPCScore(new_variables, name, delta, currentFloor);
        }
      }
    },
  );

  console.log('[主线管理] 巡礼管理模块已启动');

  return () => {
    sub1.stop();
    sub2.stop();
    sub3.stop();
    console.log('[主线管理] 巡礼管理模块已停止');
  };
}
