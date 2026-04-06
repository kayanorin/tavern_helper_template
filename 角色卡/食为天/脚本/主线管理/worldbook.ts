/**
 * 世界书条目切换模块
 *
 * 根据 swipe 索引批量切换世界书条目的启用/禁用状态。
 * 由 主线管理/index.ts 在 swipe 变化时调用。
 */

// ═══════════════════════════════════════
// 世界书条目配置
// ═══════════════════════════════════════
//
// SWIPE_ACTIONS 定义了每个 swipe 切换时需要设置的世界书条目状态。
// 键是 swipe 的索引（从 0 开始），值是一个包含 UID 和状态的数组。
// UID 是世界书条目的唯一标识符，state 为 true 表示开启，false 表示关闭。
//
// 需要新增主线时：在此处添加对应 swipe 索引的世界书条目配置。

type WorldBookAction = { uid: number; state: boolean };

export const SWIPE_ACTIONS: Record<number, WorldBookAction[]> = {
  0: [
    { uid: 1, state: true },
    { uid: 2, state: false },
    { uid: 3, state: false },
    { uid: 4, state: false },
    { uid: 5, state: false },
    { uid: 29, state: true },   // 变量更新规则-主线1
    { uid: 30, state: true },   // 变量输出格式-主线1
    { uid: 31, state: true },   // 称号奖励概述-主线1
    { uid: 39, state: false },  // 裴清言设定-主线2
    { uid: 40, state: false },  // 变量更新规则-主线2
    { uid: 41, state: false },  // 变量输出格式-主线2
    { uid: 42, state: false },  // 变量更新规则-主线3
    { uid: 43, state: false },  // 变量输出格式-主线3
    { uid: 44, state: false },  // 变量更新规则-主线4
    { uid: 45, state: false },  // 变量输出格式-主线4
  ],
  1: [
    { uid: 1, state: false },
    { uid: 2, state: true },
    { uid: 3, state: false },
    { uid: 4, state: false },
    { uid: 5, state: false },
    { uid: 29, state: false },
    { uid: 30, state: false },
    { uid: 31, state: false },
    { uid: 39, state: true },   // 裴清言设定-主线2
    { uid: 40, state: true },   // 变量更新规则-主线2
    { uid: 41, state: true },   // 变量输出格式-主线2
    { uid: 42, state: false },
    { uid: 43, state: false },
    { uid: 44, state: false },
    { uid: 45, state: false },
  ],
  2: [
    { uid: 1, state: false },
    { uid: 2, state: false },
    { uid: 3, state: true },
    { uid: 4, state: false },
    { uid: 5, state: false },
    { uid: 29, state: false },
    { uid: 30, state: false },
    { uid: 31, state: false },
    { uid: 39, state: false },
    { uid: 40, state: false },
    { uid: 41, state: false },
    { uid: 42, state: true },   // 变量更新规则-主线3
    { uid: 43, state: true },   // 变量输出格式-主线3
    { uid: 44, state: false },
    { uid: 45, state: false },
  ],
  3: [
    { uid: 1, state: false },
    { uid: 2, state: false },
    { uid: 3, state: false },
    { uid: 4, state: true },
    { uid: 5, state: false },
    { uid: 29, state: false },
    { uid: 30, state: false },
    { uid: 31, state: false },
    { uid: 39, state: false },
    { uid: 40, state: false },
    { uid: 41, state: false },
    { uid: 42, state: false },
    { uid: 43, state: false },
    { uid: 44, state: true },   // 变量更新规则-主线4
    { uid: 45, state: true },   // 变量输出格式-主线4
  ],
  4: [
    { uid: 1, state: false },
    { uid: 2, state: false },
    { uid: 3, state: false },
    { uid: 4, state: false },
    { uid: 5, state: true },
    { uid: 29, state: false },
    { uid: 30, state: false },
    { uid: 31, state: false },
    { uid: 39, state: false },
    { uid: 40, state: false },
    { uid: 41, state: false },
    { uid: 42, state: false },
    { uid: 43, state: false },
    { uid: 44, state: false },
    { uid: 45, state: false },
  ],
  5: [
    { uid: 1, state: false },
    { uid: 2, state: false },
    { uid: 3, state: false },
    { uid: 4, state: false },
    { uid: 5, state: false },
    { uid: 29, state: false },
    { uid: 30, state: false },
    { uid: 31, state: false },
    { uid: 39, state: false },
    { uid: 40, state: false },
    { uid: 41, state: false },
    { uid: 42, state: false },
    { uid: 43, state: false },
    { uid: 44, state: false },
    { uid: 45, state: false },
  ],
};

// ═══════════════════════════════════════
// 世界书操作函数
// ═══════════════════════════════════════

/**
 * 根据 swipe 索引更新世界书条目的启用/禁用状态。
 */
export async function updateWorldBookEntries(swipeIndex: number) {
  console.log(`[主线管理] 准备更新世界书条目，swipe索引: ${swipeIndex}`);

  // 获取角色卡绑定的主要世界书
  const charWorldbooks = getCharWorldbookNames('current');
  // 智能推断世界书名称：首选 primary，其次 additional 的第一个，最后默认 '食为天'
  let lorebookName = charWorldbooks.primary;

  if (!lorebookName) {
    if (charWorldbooks.additional && charWorldbooks.additional.length > 0) {
      lorebookName = charWorldbooks.additional[0];
    } else {
      // 默认同名世界书
      lorebookName = '地梨蛇思是好吃';
    }
  }

  if (!lorebookName) {
    console.log('[主线管理] 当前角色卡没有绑定任何世界书，更新未执行');
    toastr.info('未找到绑定的世界书，条目更新未执行。');
    return;
  }

  // 检查是否有针对当前 swipe 索引的配置
  const actions = SWIPE_ACTIONS[swipeIndex];
  if (!actions || actions.length === 0) {
    console.log(`[主线管理] swipe索引 ${swipeIndex} 没有配置动作，更新未执行`);
    toastr.info(`swipe索引 ${swipeIndex} 没有配置动作，世界书条目更新未执行。`);
    return;
  }

  try {
    const currentEntries = await getWorldbook(lorebookName);

    const entriesToModify: { uid: number; enabled: boolean }[] = [];
    for (const action of actions) {
      const existingEntry = currentEntries.find(e => Number(e.uid) === Number(action.uid));
      if (existingEntry) {
        if (existingEntry.enabled !== action.state) {
          entriesToModify.push({
            uid: Number(existingEntry.uid),
            enabled: action.state,
          });
          console.log(
            `[主线管理] UID ${existingEntry.uid} (${existingEntry.name}) ` +
            `${existingEntry.enabled ? '开启→关闭' : '关闭→开启'}`,
          );
        }
      } else {
        console.warn(
          `[主线管理] 世界书 "${lorebookName}" 中未找到 UID ${action.uid}`,
        );
      }
    }

    if (entriesToModify.length > 0) {
      // 使用 updateWorldbookWith 批量更新条目
      await updateWorldbookWith(lorebookName, entries => {
        for (const mod of entriesToModify) {
          const entry = entries.find(e => Number(e.uid) === Number(mod.uid));
          if (entry) {
            entry.enabled = mod.enabled;
          }
        }
        return entries;
      });
      toastr.success(
        `世界书 "${lorebookName}" 中 ${entriesToModify.length} 个条目状态已更新。`,
        '更新成功',
      );
    } else {
      console.log('[主线管理] 所有目标条目的当前状态均无需更改');
    }
  } catch (error) {
    console.error('[主线管理] 处理世界书条目时发生错误:', error);
    toastr.error('处理世界书条目时出错，详情请查看控制台。');
  }
}

/**
 * 在控制台输出世界书所有条目的 UID 信息（调试辅助用）
 */
export async function showAllEntryUIDs() {
  const charWorldbooks = getCharWorldbookNames('current');
  let lorebookName = charWorldbooks.primary;
  
  if (!lorebookName) {
    if (charWorldbooks.additional && charWorldbooks.additional.length > 0) {
      lorebookName = charWorldbooks.additional[0];
    } else {
      lorebookName = '地梨蛇思是好吃';
    }
  }

  if (!lorebookName) {
    console.log('[主线管理] 当前角色卡没有绑定主要世界书');
    return;
  }

  try {
    const entries = await getWorldbook(lorebookName);
    if (!entries || entries.length === 0) {
      console.log(`[主线管理] 世界书"${lorebookName}"中没有条目`);
      return;
    }

    console.log(`======== 世界书"${lorebookName}"的所有条目UID ========`);
    entries.forEach(entry => {
      console.log(
        `UID: ${entry.uid}, 标题: ${entry.name}, 状态: ${entry.enabled ? '开启' : '关闭'}`,
      );
    });
    console.log(`======== 共 ${entries.length} 个条目 ========`);

    toastr.info(
      `已在控制台输出世界书"${lorebookName}"的${entries.length}个条目UID信息，请按F12查看。`,
    );
  } catch (error) {
    console.error('[主线管理] 获取世界书条目信息时发生错误:', error);
  }
}
