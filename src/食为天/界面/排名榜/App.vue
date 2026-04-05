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
  width: 100%;
  max-width: 520px;
  background: var(--c-cream);
  border: 2px solid var(--c-mahogany);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(92, 46, 30, 0.15);
  font-family: var(--font-sans);
  margin: 0 auto;
}

/* ─── 标题 ─── */
.board-header {
  background: linear-gradient(135deg, var(--c-mahogany), var(--c-terracotta));
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trophy-icon {
  font-size: 1.4rem;
}

.board-title {
  color: var(--c-amber-light);
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 1px;
}

.contestant-count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
}

/* ─── 排序栏 ─── */
.sort-bar {
  display: flex;
  padding: 8px 12px;
  gap: 6px;
  background: var(--c-parchment);
  border-bottom: 1px solid var(--c-amber-light);
}

.sort-btn {
  padding: 4px 12px;
  border: 1px solid var(--c-amber);
  border-radius: 14px;
  background: transparent;
  color: var(--c-brown-olive);
  font-size: 0.78rem;
  font-family: var(--font-sans);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: var(--c-amber-light);
    color: var(--c-mahogany);
  }

  &.active {
    background: var(--c-amber);
    color: #fff;
    font-weight: 600;
    border-color: var(--c-amber);
  }
}

.sort-arrow {
  font-weight: 700;
  font-size: 0.85rem;
}

/* ─── 排名列表 ─── */
.entries-list {
  padding: 6px 0;
}

.entry-row {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(212, 168, 73, 0.15);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(212, 168, 73, 0.08);
  }

  &:last-child {
    border-bottom: none;
  }

  &.is-inactive {
    opacity: 0.6;
  }

  &.rank-gold {
    background: linear-gradient(90deg, rgba(255, 215, 0, 0.08) 0%, transparent 60%);
  }

  &.rank-silver {
    background: linear-gradient(90deg, rgba(192, 192, 192, 0.08) 0%, transparent 60%);
  }

  &.rank-bronze {
    background: linear-gradient(90deg, rgba(205, 127, 50, 0.08) 0%, transparent 60%);
  }
}

.rank-col {
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.medal {
  font-size: 1.3rem;
}

.rank-num {
  font-weight: 600;
  color: var(--c-brown-olive);
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
  font-size: 0.88rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  font-size: 0.6rem;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
  flex-shrink: 0;

  &.active {
    background: var(--c-sage);
    color: #fff;
  }

  &.inactive {
    background: var(--c-inactive);
    color: #fff;
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
  font-size: 1.05rem;
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
    color: #4caf50;
  }

  &.down {
    color: #e53935;
  }

  &.neutral {
    color: var(--c-brown-olive);
    font-weight: 400;
  }
}

/* ─── 空状态 ─── */
.empty-state {
  padding: 30px;
  text-align: center;
  color: var(--c-brown-olive);
}

.empty-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 0.78rem;
  color: var(--c-inactive);
  margin-top: 4px;
}

/* ─── 玩家信息 ─── */
.player-section {
  border-top: 2px solid var(--c-amber);
  background: linear-gradient(135deg, var(--c-parchment), var(--c-cream));
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
}

.player-label {
  color: var(--c-brown-olive);
  font-weight: 500;
}

.player-value {
  font-weight: 700;
  color: var(--c-charcoal);
  font-family: var(--font-serif);

  &.highlight {
    color: var(--c-terracotta);
    font-size: 0.95rem;
  }
}

/* ─── 动画 ─── */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
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
