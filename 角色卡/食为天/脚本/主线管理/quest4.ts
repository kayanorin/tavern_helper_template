/**
 * 深渊管理模块 (主线4: 深渊厨房的低语)
 *
 * 职责:
 * 1. 验证记录里程碑弹窗
 * 2. 阶段推进通知
 * 3. GMA关注度自动累加（脚本管理的$变量）
 * 4. GMA关注度阈值警告
 *
 * 由 主线管理/index.ts 按需加载，swipe 3 时启用。
 * 遵循 init/cleanup 模式：调用 init() 注册事件监听，返回 cleanup() 注销全部监听。
 */

// ═══════════════════════════════════════
// 配置项
// ═══════════════════════════════════════

/** 各管制级别验证对GMA关注度的增量 */
const GMA_DELTA_BY_LEVEL: Record<string, number> = {
  C: 5,
  B: 10,
  A: 15,
  S: 20,
};
/** 复现技法对GMA关注度的增量 */
const GMA_DELTA_REPRODUCE = 15;

// ═══════════════════════════════════════
// 验证里程碑文案
// ═══════════════════════════════════════

const 验证里程碑: Record<number, string> = {
  1: '🔍 第一次验证……被禁止的东西,有时候确实好吃',
  3: '⚗️ 你在禁区的边缘走得越来越远。好奇心是最危险的调味料',
  5: '🌑 黑市开始认真对待你了——你不再是过客',
  7: '⚡ 你掌握的东西已经足以动摇某些人的信心',
  10: '🏴 你现在站的位置，已经没有回头路了',
};

// ═══════════════════════════════════════
// 阶段推进文案
// ═══════════════════════════════════════

const 阶段通知: Record<number, { title: string; message: string }> = {
  2: {
    title: '阶段推进',
    message: '⚔️ 质疑期结束——是时候用行动挑战那些你认为不合理的规矩了',
  },
  3: {
    title: '阶段推进',
    message: '⚖️ 你已经走到了分岔路口。推翻、融入、还是另辟蹊径？',
  },
};

// ═══════════════════════════════════════
// GMA关注度阈值通知
// ═══════════════════════════════════════

const GMA_THRESHOLDS: { value: number; message: string; type: 'info' | 'warning' | 'error' }[] = [
  { value: 20, message: '📋 有人在留意你最近的活动...', type: 'info' },
  { value: 40, message: '👁️ GMA开始关注你了。小心行事', type: 'info' },
  { value: 60, message: '🔍 GMA调查员出现在你常去的地方。你被盯上了', type: 'warning' },
  { value: 80, message: '🚨 GMA已启动正式调查程序。你的每一步都在被记录', type: 'error' },
];

// ═══════════════════════════════════════
// 模块入口
// ═══════════════════════════════════════

/**
 * 初始化深渊管理模块。
 * 注册 MVU 变量更新事件监听器，返回 cleanup 函数。
 *
 * @returns cleanup 函数，调用后注销所有事件监听
 */
export function init(): () => void {
  // ─── 验证记录里程碑弹窗 ───
  const sub1 = eventOn(
    Mvu.events.VARIABLE_UPDATE_ENDED,
    (new_variables: any, old_variables: any) => {
      const newCount: number =
        _.size(_.get(new_variables, 'stat_data.深渊.验证记录') ?? {});
      const oldCount: number =
        _.size(_.get(old_variables, 'stat_data.深渊.验证记录') ?? {});

      if (newCount > oldCount) {
        for (const [threshold, message] of _.entries(验证里程碑)) {
          const n = Number(threshold);
          if (oldCount < n && newCount >= n) {
            toastr.success(message, '禁忌验证', {
              timeOut: 8000,
              progressBar: true,
              positionClass: 'toast-top-center',
            });
          }
        }
      }
    },
  );

  // ─── 阶段推进通知 ───
  const sub2 = eventOn(
    Mvu.events.VARIABLE_UPDATE_ENDED,
    (new_variables: any, old_variables: any) => {
      const newStage: number =
        _.get(new_variables, 'stat_data.深渊.$当前阶段') ?? 1;
      const oldStage: number =
        _.get(old_variables, 'stat_data.深渊.$当前阶段') ?? 1;

      if (newStage > oldStage) {
        const notice = 阶段通知[newStage];
        if (notice) {
          toastr.warning(notice.message, notice.title, {
            timeOut: 10000,
            progressBar: true,
            positionClass: 'toast-top-center',
          });
        }
      }
    },
  );

  // ─── GMA关注度自动累加 ───
  const sub3 = eventOn(
    Mvu.events.VARIABLE_UPDATE_ENDED,
    (new_variables: any, old_variables: any) => {
      let gmaDelta = 0;

      // A) 新增验证记录 → 按管制级别加分
      const newVerifications = _.get(new_variables, 'stat_data.深渊.验证记录') ?? {};
      const oldVerifications = _.get(old_variables, 'stat_data.深渊.验证记录') ?? {};
      const newKeys = _.difference(
        Object.keys(newVerifications),
        Object.keys(oldVerifications),
      );
      for (const key of newKeys) {
        const level = newVerifications[key]?.GMA管制级别 ?? 'C';
        gmaDelta += GMA_DELTA_BY_LEVEL[level] ?? 5;
      }

      // B) 新增复现技法
      const newTechniques: string[] =
        _.get(new_variables, 'stat_data.深渊.复现技法') ?? [];
      const oldTechniques: string[] =
        _.get(old_variables, 'stat_data.深渊.复现技法') ?? [];
      const addedTechniques = newTechniques.length - oldTechniques.length;
      if (addedTechniques > 0) {
        gmaDelta += addedTechniques * GMA_DELTA_REPRODUCE;
      }

      // 累加GMA关注度
      if (gmaDelta > 0) {
        const oldGMA: number =
          _.get(old_variables, 'stat_data.深渊.$GMA关注度') ?? 0;
        const newGMA = Math.min(oldGMA + gmaDelta, 100);
        _.set(new_variables, 'stat_data.深渊.$GMA关注度', newGMA);

        // 阈值通知
        for (const threshold of GMA_THRESHOLDS) {
          if (oldGMA < threshold.value && newGMA >= threshold.value) {
            if (threshold.type === 'error') {
              toastr.error(threshold.message, 'GMA警告', {
                timeOut: 10000,
                progressBar: true,
                positionClass: 'toast-top-center',
              });
            } else if (threshold.type === 'warning') {
              toastr.warning(threshold.message, 'GMA态度变化', {
                timeOut: 8000,
                progressBar: true,
              });
            } else {
              toastr.info(threshold.message, 'GMA动向', {
                timeOut: 6000,
                progressBar: true,
              });
            }
          }
        }
      }
    },
  );

  console.log('[主线管理] 深渊管理模块已启动');

  return () => {
    sub1.stop();
    sub2.stop();
    sub3.stop();
    console.log('[主线管理] 深渊管理模块已停止');
  };
}
