/**
 * 传承管理模块 (主线3: 星辰厨房的传承)
 *
 * 职责:
 * 1. 碎片收集里程碑弹窗
 * 2. 阶段推进通知
 * 3. 碎片融汇通知（阶段3时）
 *
 * 由 主线管理/index.ts 按需加载，swipe 2 时启用。
 * 遵循 init/cleanup 模式：调用 init() 注册事件监听，返回 cleanup() 注销全部监听。
 */

// ═══════════════════════════════════════
// 碎片里程碑文案
// ═══════════════════════════════════════

const 碎片里程碑: Record<number, string> = {
  1: '🌟 第一块碎片……你以为你会做菜,现在才知道自己看到的只是冰面',
  3: '📖 碎片开始互相呼应——它们之间有某种联系',
  6: '🗺️ 你已经走了很远。每一块碎片都改变了你对烹饪的理解',
  9: '✨ 碎片的拼图渐渐清晰。现在，该是融汇成自己的路的时候了',
  12: '🏆 你手中的碎片,已经足够书写一个全新的章节',
};

// ═══════════════════════════════════════
// 阶段推进文案
// ═══════════════════════════════════════

const 阶段通知: Record<number, { title: string; message: string }> = {
  2: {
    title: '阶段推进',
    message: '🗺️ 学徒期结束——是时候离开麦穗城,去寻找散落在世间的碎片了',
  },
  3: {
    title: '阶段推进',
    message: '🔥 碎片已经足够多。矛盾的阐释,不同的声音——是时候走出自己的路了',
  },
};

// ═══════════════════════════════════════
// 模块入口
// ═══════════════════════════════════════

/**
 * 初始化传承管理模块。
 * 注册 MVU 变量更新事件监听器，返回 cleanup 函数。
 *
 * @returns cleanup 函数，调用后注销所有事件监听
 */
export function init(): () => void {
  // ─── 碎片收集里程碑弹窗 ───
  const sub1 = eventOn(
    Mvu.events.VARIABLE_UPDATE_ENDED,
    (new_variables: any, old_variables: any) => {
      const newCount: number =
        _.size(_.get(new_variables, 'stat_data.传承.碎片记录') ?? {});
      const oldCount: number =
        _.size(_.get(old_variables, 'stat_data.传承.碎片记录') ?? {});

      if (newCount > oldCount) {
        for (const [threshold, message] of _.entries(碎片里程碑)) {
          const n = Number(threshold);
          if (oldCount < n && newCount >= n) {
            toastr.success(message, '碎片收集', {
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
        _.get(new_variables, 'stat_data.传承.$当前阶段') ?? 1;
      const oldStage: number =
        _.get(old_variables, 'stat_data.传承.$当前阶段') ?? 1;

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

  // ─── 碎片融汇通知（阶段3时，新增融汇标记） ───
  const sub3 = eventOn(
    Mvu.events.VARIABLE_UPDATE_ENDED,
    (new_variables: any, old_variables: any) => {
      const stage: number =
        _.get(new_variables, 'stat_data.传承.$当前阶段') ?? 1;
      if (stage < 3) return;

      const newRecord = _.get(new_variables, 'stat_data.传承.碎片记录') ?? {};
      const oldRecord = _.get(old_variables, 'stat_data.传承.碎片记录') ?? {};

      for (const [name, data] of _.entries(newRecord)) {
        const newIntegrated = (data as any)?.已融汇 ?? false;
        const oldIntegrated = (oldRecord[name] as any)?.已融汇 ?? false;
        if (newIntegrated && !oldIntegrated) {
          toastr.info(
            `✨ 碎片「${name}」已融汇到你的烹饪之中`,
            '融汇完成',
            { timeOut: 6000, progressBar: true },
          );
        }
      }
    },
  );

  console.log('[主线管理] 传承管理模块已启动');

  return () => {
    sub1.stop();
    sub2.stop();
    sub3.stop();
    console.log('[主线管理] 传承管理模块已停止');
  };
}
