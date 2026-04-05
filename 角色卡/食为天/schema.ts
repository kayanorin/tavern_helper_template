export const Schema = z.object({
  巡礼: z
    .object({
      $当前阶段: z.coerce
        .number()
        .transform(v => _.clamp(Math.floor(v), 1, 3))
        .prefault(1),

      当前城市: z.string().prefault('待出发'),
      当前大区: z.string().prefault('待确定'),

      // 核心品鉴记录：一城一评，城市名作key天然去重
      品鉴记录: z
        .record(
          z.string().describe('城市名'),
          z.object({
            大区: z.string(),
            评测摘要: z.string().prefault(''),
            城市分: z.coerce
              .number()
              .transform(v => _.clamp(v, 0, 10))
              .prefault(0),
          }),
        )
        .prefault({}),

      // AI维护：当前场景中与巡礼竞争相关的NPC
      在场角色: z.array(z.string()).prefault([]),
      // AI维护：明确退出巡礼的NPC（一次性标记，脚本处理后清除）
      退赛NPC: z.array(z.string()).prefault([]),

      称号: z.array(z.string()).prefault([]),

      // 专题品鉴系列
      专题品鉴: z
        .record(
          z.string().describe('专题名'),
          z.object({
            已完成: z.array(z.string()).prefault([]),
            目标数: z.coerce.number().prefault(10),
          }),
        )
        .prefault({}),

      声望: z.coerce.number().prefault(0),
    })
    .transform(data => {
      // ═══ 自动计算区 ═══

      const _品鉴总数 = _.size(data.品鉴记录);

      // 玩家总评分 = 所有城市分之和
      const _总评分 = _(data.品鉴记录)
        .values()
        .sumBy(r => r.城市分);

      // 各大区品鉴城市数
      const _大区进度 = _(data.品鉴记录)
        .values()
        .groupBy('大区')
        .mapValues(cities => cities.length)
        .value() as Record<string, number>;

      // 阶段自动推进（不回退）
      let $当前阶段 = data.$当前阶段;
      if (_品鉴总数 >= 20 && $当前阶段 < 3) $当前阶段 = 3;
      else if (_品鉴总数 >= 8 && $当前阶段 < 2) $当前阶段 = 2;

      // ═══ 自动称号 ═══
      const 自动称号: string[] = [];

      // 里程碑称号
      const 里程碑表: [number, string][] = [
        [3, '初味行者'],
        [6, '十城漫步'],
        [12, '百味巡礼者'],
        [18, '味觉探索家'],
        [24, '百城半程'],
        [30, '品鉴大师'],
        [34, '味觉传奇'],
        [36, '百城百味・完'],
      ];
      for (const [阈值, 称号名] of 里程碑表) {
        if (_品鉴总数 >= 阈值) 自动称号.push(称号名);
      }

      // 大区完成称号（≥5城）
      for (const [区名, 数量] of _.entries(_大区进度)) {
        if (数量 >= 5) 自动称号.push(`${区名}品鉴家`);
      }

      // 专题完成称号
      for (const [专题名, 专题] of _.entries(data.专题品鉴)) {
        if (专题.已完成.length >= 专题.目标数) {
          自动称号.push(`${专题名}达人`);
        }
      }

      // 合并：自动称号在前，手动称号在后，去重
      const 称号 = _.uniq([
        ...自动称号,
        ...data.称号.filter(t => !自动称号.includes(t)),
      ]);

      const _阶段描述 =
        $当前阶段 === 1 ? '初见' : $当前阶段 === 2 ? '深入' : '回响';

      return {
        ...data,
        $当前阶段,
        称号,
        _品鉴总数,
        _总评分,
        _大区进度,
        _阶段描述,
      };
    }),

  // $前缀 → 对AI完全隐藏，由脚本全权管理
  $NPC榜单: z
    .record(
      z.string().describe('NPC名'),
      z.object({
        评分: z.coerce.number().prefault(0),
        // 0 = 当前活跃；>0 = 离场时的楼层号
        离场楼层: z.coerce.number().prefault(0),
        评分历史: z
          .array(
            z.object({
              变化: z.coerce.number(),
              楼层: z.coerce.number(),
            }),
          )
          .prefault([])
          .transform(h => _.takeRight(h, 20)),
      }),
    )
    .prefault({}),

  // ═══ 主线2: 星级逆袭 ═══
  逆袭: z
    .object({
      $当前任务: z.coerce
        .number()
        .transform(v => _.clamp(Math.floor(v), 1, 3))
        .prefault(1),

      // 21道料理清单进度，料理名作key
      清单进度: z
        .record(
          z.string().describe('料理名'),
          z.object({
            食材类别: z.string().prefault(''),
            任务段: z.coerce
              .number()
              .transform(v => _.clamp(v, 1, 3))
              .prefault(1),
            品尝摘要: z.string().prefault(''),
          }),
        )
        .prefault({}),

      // 模糊经济等级
      经济状态: z
        .enum(['赤贫', '拮据', '温饱', '小康', '富裕'])
        .prefault('赤贫'),

      // 笔记本资源
      笔记本线索: z
        .record(
          z.string().describe('线索名'),
          z.object({
            类型: z.enum(['食材渠道', '人脉', '食谱', '产地笔记']),
            已使用: z.boolean().prefault(false),
          }),
        )
        .prefault({}),

      // 味阶成长
      当前味阶: z.string().prefault('启蒙之舌·初'),

      // 阶级突破记录
      突破事件: z.array(z.string()).prefault([]),

      // 脚本管理：神秘人线索计数
      $神秘人线索数: z.coerce.number().prefault(0),
    })
    .transform(data => {
      const _清单完成数 = _.size(data.清单进度);
      const _任务一完成 = _(data.清单进度)
        .values()
        .filter(r => r.任务段 === 1)
        .size();
      const _任务二完成 = _(data.清单进度)
        .values()
        .filter(r => r.任务段 === 2)
        .size();
      const _任务三完成 = _(data.清单进度)
        .values()
        .filter(r => r.任务段 === 3)
        .size();

      // 阶段自动推进（不回退）
      let $当前任务 = data.$当前任务;
      if (_任务一完成 >= 7 && $当前任务 < 2) $当前任务 = 2;
      if (_任务二完成 >= 7 && $当前任务 < 3) $当前任务 = 3;

      const _任务描述 =
        $当前任务 === 1
          ? '经济的门槛'
          : $当前任务 === 2
            ? '阶级的围墙'
            : '时间与命运的壁垒';

      return {
        ...data,
        $当前任务,
        _清单完成数,
        _任务一完成,
        _任务二完成,
        _任务三完成,
        _任务描述,
      };
    }),
});

export type Schema = z.output<typeof Schema>;
