<template>
  <div class="leaderboard-card">
    <!-- 标题栏 -->
    <div class="board-header">
      <div class="header-left">
        <span class="trophy-icon">🏆</span>
        <span class="board-title">百城百味 · 品鉴排名</span>
      </div>
      <div class="header-right">
        <span class="contestant-count">{{ sortedEntries.length }} 位参赛者</span>
      </div>
    </div>

    <!-- 排序控制 -->
    <div class="sort-bar">
      <button
        v-for="opt in sortOptions"
        :key="opt.id"
        class="sort-btn"
        :class="{ active: currentSort === opt.id }"
        @click="toggleSort(opt.id)"
      >
        {{ opt.label }}
        <span v-if="currentSort === opt.id" class="sort-arrow">
          {{ sortAsc ? '↑' : '↓' }}
        </span>
      </button>
    </div>

    <!-- 排名列表 -->
    <div v-if="sortedEntries.length > 0" class="entries-list">
      <TransitionGroup name="list">
        <div
          v-for="(entry, index) in sortedEntries"
          :key="entry.name"
          class="entry-row"
          :class="{
            'rank-gold': index === 0,
            'rank-silver': index === 1,
            'rank-bronze': index === 2,
            'is-inactive': entry.离场楼层 > 0,
          }"
        >
          <!-- 排名号 -->
          <div class="rank-col">
            <span v-if="index < 3" class="medal">
              {{ ['🥇', '🥈', '🥉'][index] }}
            </span>
            <span v-else class="rank-num">#{{ index + 1 }}</span>
          </div>

          <!-- 名称 -->
          <div class="name-col">
            <span class="npc-name">{{ entry.name }}</span>
            <span v-if="entry.离场楼层 > 0" class="status-badge inactive">已离场</span>
            <span v-else class="status-badge active">活跃中</span>
          </div>

          <!-- 评分 -->
          <div class="score-col">
            <span class="score-value">{{ entry.评分 }}</span>
            <span class="score-label">pts</span>
          </div>

          <!-- 趋势 -->
          <div class="trend-col">
            <span v-if="entry.recentDelta > 0" class="trend up">+{{ entry.recentDelta }}</span>
            <span v-else-if="entry.recentDelta < 0" class="trend down">{{ entry.recentDelta }}</span>
            <span v-else class="trend neutral">—</span>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <span class="empty-icon">🍽️</span>
      <p>尚无参赛者数据</p>
      <p class="empty-hint">NPC在场后将自动加入排名</p>
    </div>

    <!-- 玩家信息 -->
    <div class="player-section">
      <div class="player-row">
        <span class="player-label">📖 已品鉴城市</span>
        <span class="player-value">{{ store.data.巡礼._品鉴总数 ?? 0 }}</span>
      </div>
      <div class="player-row">
        <span class="player-label">⭐ 玩家总评分</span>
        <span class="player-value highlight">{{ store.data.巡礼._总评分 ?? 0 }}</span>
      </div>
      <div class="player-row">
        <span class="player-label">🎖️ 当前阶段</span>
        <span class="player-value">{{ store.data.巡礼._阶段描述 ?? '初见' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from './store';

const store = useDataStore();

type SortField = 'score' | 'name';

const sortOptions: { id: SortField; label: string }[] = [
  { id: 'score', label: '积分' },
  { id: 'name', label: '名称' },
];

const currentSort = useLocalStorage<SortField>('swt_leaderboard:sort', 'score');
const sortAsc = useLocalStorage<boolean>('swt_leaderboard:asc', false);

function toggleSort(field: SortField) {
  if (currentSort.value === field) {
    sortAsc.value = !sortAsc.value;
  } else {
    currentSort.value = field;
    sortAsc.value = field === 'name'; // 名称默认升序，积分默认降序
  }
}

interface LeaderboardEntry {
  name: string;
  评分: number;
  离场楼层: number;
  recentDelta: number;
}

const sortedEntries = computed<LeaderboardEntry[]>(() => {
  const board = (store.data as any).$NPC榜单 as Record<string, any> | undefined;
  if (!board) return [];

  const entries: LeaderboardEntry[] = Object.entries(board).map(([name, data]) => {
    const history = data.评分历史 ?? [];
    // 最近3次加分之和作为趋势
    const recent = _.takeRight(history, 3);
    const recentDelta = _.sumBy(recent, (h: any) => h.变化 ?? 0);
    return {
      name,
      评分: data.评分 ?? 0,
      离场楼层: data.离场楼层 ?? 0,
      recentDelta,
    };
  });

  const sorted = _.orderBy(
    entries,
    currentSort.value === 'score' ? ['评分'] : ['name'],
    [sortAsc.value ? 'asc' : 'desc'],
  );

  return sorted;
});
</script>

<style lang="scss" scoped>
.leaderboard-card {
  position: relative;
  width: 100%;
  max-width: 520px;
  background: var(--surface-linen);
  border: 1px solid var(--c-panel-border);
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    0 20px 36px var(--c-fabric-shadow),
    inset 0 1px 0 var(--c-panel-glow),
    inset 0 -1px 0 rgba(122, 92, 69, 0.14);
  font-family: var(--font-sans);
  margin: 0 auto;
}

.leaderboard-card::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1px dashed var(--c-stitch);
  border-radius: 12px;
  opacity: 0.78;
  pointer-events: none;
}

/* ─── 标题 ─── */
.board-header {
  position: relative;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.35), transparent 40%),
    linear-gradient(135deg, rgba(255, 248, 239, 0.92), rgba(225, 208, 183, 0.92)),
    var(--surface-canvas);
  padding: 16px 18px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px dashed rgba(148, 112, 82, 0.34);
}

.board-header::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 6px;
  border-bottom: 1px dashed rgba(148, 112, 82, 0.3);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trophy-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0)),
    var(--surface-denim);
  color: #fffef8;
  font-size: 1rem;
  box-shadow:
    0 10px 18px rgba(66, 84, 58, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.board-title {
  color: var(--c-mahogany);
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.06em;
}

.contestant-count {
  color: var(--c-ink-soft);
  font-size: 0.78rem;
  padding: 5px 10px;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0.12)),
    var(--surface-canvas);
  border: 1px solid rgba(184, 137, 83, 0.24);
}

/* ─── 排序栏 ─── */
.sort-bar {
  display: flex;
  padding: 10px 14px 8px;
  gap: 8px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.08)),
    var(--surface-linen);
  border-bottom: 1px solid rgba(184, 137, 83, 0.16);
}

.sort-btn {
  padding: 6px 14px;
  border: 1px dashed rgba(148, 112, 82, 0.38);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08)),
    var(--surface-canvas);
  color: var(--c-ink-soft);
  font-size: 0.78rem;
  font-family: var(--font-sans);
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    filter 0.22s ease,
    background-position 0.22s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.03);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      0 8px 14px rgba(92, 46, 30, 0.08);
    color: var(--c-mahogany);
  }

  &:active {
    transform: translateY(1px);
  }

  &.active {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      linear-gradient(135deg, #bb8e5f, #9a6b52);
    color: #fffaf1;
    font-weight: 600;
    border-color: rgba(154, 107, 82, 0.62);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.18),
      0 10px 18px rgba(92, 46, 30, 0.12);
  }
}

.sort-arrow {
  font-weight: 700;
  font-size: 0.85rem;
}

/* ─── 排名列表 ─── */
.entries-list {
  padding: 8px 10px 6px;
}

.entry-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  margin-bottom: 8px;
  border: 1px solid rgba(184, 137, 83, 0.14);
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.1)),
    var(--surface-canvas);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.52),
    0 6px 14px rgba(92, 46, 30, 0.05);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    filter 0.22s ease,
    background-position 0.22s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.025);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.66),
      0 14px 24px rgba(92, 46, 30, 0.09);
  }

  &:last-child {
    margin-bottom: 0;
  }

  &.is-inactive {
    opacity: 0.72;
  }

  &.rank-gold {
    background:
      linear-gradient(90deg, rgba(207, 171, 100, 0.22), transparent 55%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.1)),
      var(--surface-canvas);
  }

  &.rank-silver {
    background:
      linear-gradient(90deg, rgba(185, 176, 164, 0.2), transparent 55%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.1)),
      var(--surface-canvas);
  }

  &.rank-bronze {
    background:
      linear-gradient(90deg, rgba(183, 128, 94, 0.22), transparent 55%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.1)),
      var(--surface-canvas);
  }
}

.rank-col {
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.medal {
  font-size: 1.18rem;
}

.rank-num {
  font-weight: 600;
  color: var(--c-ink-soft);
  font-size: 0.85rem;
}

.name-col {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.npc-name {
  font-weight: 600;
  font-family: var(--font-serif);
  color: var(--c-charcoal);
  font-size: 0.92rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
  flex-shrink: 0;
  border: 1px dashed rgba(255, 255, 255, 0.26);

  &.active {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
      var(--surface-denim);
    color: #fffef8;
  }

  &.inactive {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0)),
      linear-gradient(135deg, #bca894, #a69380);
    color: #fffaf3;
  }
}

.score-col {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-right: 10px;
}

.score-value {
  font-weight: 700;
  font-size: 1.08rem;
  color: var(--c-terracotta);
  font-variant-numeric: tabular-nums;
}

.score-label {
  font-size: 0.65rem;
  color: var(--c-brown-olive);
  text-transform: uppercase;
}

.trend-col {
  width: 50px;
  text-align: right;
  flex-shrink: 0;
}

.trend {
  font-size: 0.78rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;

  &.up {
    color: #6f8867;
  }

  &.down {
    color: #b26452;
  }

  &.neutral {
    color: var(--c-ink-soft);
    font-weight: 400;
  }
}

/* ─── 空状态 ─── */
.empty-state {
  padding: 34px 20px;
  text-align: center;
  color: var(--c-ink-soft);
}

.empty-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 0.78rem;
  color: var(--c-inactive);
  margin-top: 6px;
}

/* ─── 玩家信息 ─── */
.player-section {
  border-top: 1px dashed rgba(148, 112, 82, 0.34);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.08)),
    var(--surface-canvas);
  padding: 12px 14px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  padding: 7px 10px;
  border-radius: 12px;
  background: rgba(255, 252, 246, 0.36);
  border: 1px solid rgba(184, 137, 83, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.player-label {
  color: var(--c-ink-soft);
  font-weight: 600;
}

.player-value {
  font-weight: 700;
  color: var(--c-charcoal);
  font-family: var(--font-serif);

  &.highlight {
    color: var(--c-terracotta);
    font-size: 0.98rem;
  }
}

/* ─── 动画 ─── */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.24s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.list-leave-active {
  position: absolute;
}

/* ─── 响应式 ─── */
@media (max-width: 480px) {
  .board-header {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }

  .player-section {
    flex-direction: column;
  }
}
</style>
