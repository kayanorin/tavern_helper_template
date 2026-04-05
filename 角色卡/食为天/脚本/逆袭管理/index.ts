/**
 * 逆袭管理脚本
 *
 * 职责:
 * 1. 清单进度里程碑弹窗
 * 2. 神秘人线索自动计数
 */

await waitGlobalInitialized('Mvu');

// ═══════════════════════════════════════
// 清单进度里程碑弹窗
// ═══════════════════════════════════════

const 里程碑通知: Record<number, string> = {
  5: '📖 笔记本沙沙作响——你开始读懂宁述兰的字里行间了',
  10: '🍳 清单过半。曾经陌生的味道，开始有了归属感',
  15: '⭐ 你的舌头已经走得比大多数人更远',
  20: '🔑 清单上只剩最后一道——那张纸条上的料理',
  21: '🏆 笔记本的最后一页，终于可以合上了',
};

eventOn(
  Mvu.events.VARIABLE_UPDATE_ENDED,
  (new_variables, old_variables) => {
    const newCount: number =
      _.size(_.get(new_variables, 'stat_data.逆袭.清单进度') ?? {});
    const oldCount: number =
      _.size(_.get(old_variables, 'stat_data.逆袭.清单进度') ?? {});

    if (newCount > oldCount) {
      // 检查是否触发里程碑
      for (const [threshold, message] of _.entries(里程碑通知)) {
        const n = Number(threshold);
        if (oldCount < n && newCount >= n) {
          toastr.success(message, '清单里程碑', {
            timeOut: 8000,
            progressBar: true,
            positionClass: 'toast-top-center',
          });
        }
      }
    }
  },
);

// ═══════════════════════════════════════
// 神秘人线索自动计数
// ═══════════════════════════════════════

eventOn(
  Mvu.events.VARIABLE_UPDATE_ENDED,
  (new_variables, old_variables) => {
    let 线索增量 = 0;

    // A) 清单进度新增 && 任务段≥2
    const newProgress = _.get(new_variables, 'stat_data.逆袭.清单进度') ?? {};
    const oldProgress = _.get(old_variables, 'stat_data.逆袭.清单进度') ?? {};
    const newKeys = _.difference(
      Object.keys(newProgress),
      Object.keys(oldProgress),
    );
    for (const key of newKeys) {
      if ((newProgress[key]?.任务段 ?? 1) >= 2) {
        线索增量 += 1;
      }
    }

    // B) 突破事件新增
    const newBreakthroughs: string[] =
      _.get(new_variables, 'stat_data.逆袭.突破事件') ?? [];
    const oldBreakthroughs: string[] =
      _.get(old_variables, 'stat_data.逆袭.突破事件') ?? [];
    if (newBreakthroughs.length > oldBreakthroughs.length) {
      线索增量 += 1;
    }

    // C) 笔记本线索中新增"人脉"类型
    const newClues = _.get(new_variables, 'stat_data.逆袭.笔记本线索') ?? {};
    const oldClues = _.get(old_variables, 'stat_data.逆袭.笔记本线索') ?? {};
    const newClueKeys = _.difference(
      Object.keys(newClues),
      Object.keys(oldClues),
    );
    for (const key of newClueKeys) {
      if (newClues[key]?.类型 === '人脉') {
        线索增量 += 1;
      }
    }

    // 累加线索
    if (线索增量 > 0) {
      const old线索数: number =
        _.get(old_variables, 'stat_data.逆袭.$神秘人线索数') ?? 0;
      const new线索数 = old线索数 + 线索增量;
      _.set(new_variables, 'stat_data.逆袭.$神秘人线索数', new线索数);

      // 线索阶段变化弹窗
      if (old线索数 < 3 && new线索数 >= 3) {
        toastr.info(
          '💭 有人在暗中注视着你的旅途...',
          '直觉',
          { timeOut: 5000, progressBar: true },
        );
      }
      if (old线索数 < 6 && new线索数 >= 6) {
        toastr.info(
          '🔍 一个轮廓正在浮现——她是谁？',
          '疑问',
          { timeOut: 6000, progressBar: true },
        );
      }
      if (old线索数 < 9 && new线索数 >= 9) {
        toastr.warning(
          '🔍 所有线索都指向同一个人...',
          '真相',
          { timeOut: 8000, progressBar: true },
        );
      }
    }
  },
);
