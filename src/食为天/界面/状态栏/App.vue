<template>
  <details class="card" :open="detailsOpen" :data-expanded="isExpanded">
    <summary class="summary-strip" :aria-expanded="isExpanded" @click.prevent="toggleExpanded">
      <div class="summary-main">
        <span class="summary-icon">{{ currentView.icon }}</span>
        <div class="summary-copy">
          <span class="summary-label">{{ currentView.label }}</span>
          <span class="summary-hint">
            {{ isFlavorOnly ? '仅展示当前味阶' : '仅展示当前主线变量' }}
          </span>
        </div>
      </div>

      <div class="summary-meta">
        <span class="rank-badge">
          <span class="rank-tag">味阶</span>
          <span class="rank-value">{{ flavorRank }}</span>
        </span>
        <span class="chevron" aria-hidden="true">▾</span>
      </div>
    </summary>

    <div class="content-shell" :style="{ height: panelHeight }">
      <div ref="contentInnerRef" class="content-area">
        <transition name="fade" mode="out-in">
          <div :key="contentKey" class="content-panel">
            <GenericVarTree v-if="hasDisplayData" :data="displayData" />
            <div v-else class="empty-hint">当前还没有可展示的变量。</div>
          </div>
        </transition>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import GenericVarTree from './components/GenericVarTree.vue';
import { useDataStore } from './store';

type QuestKey = '巡礼' | '逆袭' | '传承' | '深渊';

type ViewConfig =
  | { mode: 'quest'; key: QuestKey; label: string; icon: string }
  | { mode: 'flavor'; label: string; icon: string };

const store = useDataStore();

const VIEW_BY_SWIPE: Record<number, ViewConfig> = {
  0: { mode: 'quest', key: '巡礼', label: '百城百味巡礼', icon: '🗺️' },
  1: { mode: 'quest', key: '逆袭', label: '星级逆袭', icon: '⭐' },
  2: { mode: 'quest', key: '传承', label: '星辰厨房的传承', icon: '🔥' },
  3: { mode: 'quest', key: '深渊', label: '深渊厨房的低语', icon: '🌑' },
  4: { mode: 'flavor', label: '世界餐桌的旅人', icon: '🌍' },
  5: { mode: 'flavor', label: '自由模式', icon: '🧭' },
};

const FALLBACK_VIEW: ViewConfig = {
  mode: 'flavor',
  label: '状态总览',
  icon: '📜',
};

const currentSwipeIndex = ref(-1);
const isExpanded = useLocalStorage('swt_status:expanded', true);
const detailsOpen = ref(isExpanded.value);
const contentInnerRef = ref<HTMLElement | null>(null);
const panelHeight = ref('0px');
const accordionDurationMs = 320;

const currentView = computed(() => VIEW_BY_SWIPE[currentSwipeIndex.value] ?? FALLBACK_VIEW);
const isFlavorOnly = computed(() => currentView.value.mode === 'flavor');
const flavorRank = computed(() => store.data.当前味阶 || '启蒙之舌·初');

const displayData = computed<Record<string, unknown>>(() => {
  if (currentView.value.mode === 'flavor') {
    return { 当前味阶: flavorRank.value };
  }

  const raw = (store.data as Record<string, unknown>)[currentView.value.key];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
});

const hasDisplayData = computed(() => Object.keys(displayData.value).length > 0);
const contentKey = computed(() => `${currentSwipeIndex.value}:${currentView.value.label}`);

function readSwipeFromChat(): number {
  try {
    const chat = (window as any).SillyTavern?.chat;
    const swipeId = Number(chat?.[0]?.swipe_id);
    if (Number.isFinite(swipeId) && swipeId >= 0) {
      return swipeId;
    }
  } catch (error) {
    console.warn('[状态栏] 读取当前开场白失败:', error);
  }

  try {
    const fallback = Number(
      (window as any).getvar?.('当前开场白编号', {
        scope: 'local',
        noCache: true,
        defaults: -1,
      }),
    );
    if (Number.isFinite(fallback) && fallback >= 0) {
      return fallback;
    }
  } catch (error) {
    console.warn('[状态栏] 读取回退开场白变量失败:', error);
  }

  return -1;
}

function syncCurrentSwipe() {
  currentSwipeIndex.value = readSwipeFromChat();
}

function syncAfterChatChange() {
  syncCurrentSwipe();
  window.setTimeout(syncCurrentSwipe, 120);
  window.setTimeout(syncCurrentSwipe, 600);
}

function measurePanelHeight() {
  return `${contentInnerRef.value?.scrollHeight ?? 0}px`;
}

function openPanel() {
  detailsOpen.value = true;
  nextTick(() => {
    panelHeight.value = '0px';
    requestAnimationFrame(() => {
      panelHeight.value = measurePanelHeight();
      isExpanded.value = true;
    });
  });
}

function closePanel() {
  panelHeight.value = measurePanelHeight();
  requestAnimationFrame(() => {
    panelHeight.value = '0px';
    isExpanded.value = false;
  });

  window.setTimeout(() => {
    if (!isExpanded.value) {
      detailsOpen.value = false;
    }
  }, accordionDurationMs);
}

function toggleExpanded() {
  if (isExpanded.value) {
    closePanel();
    return;
  }
  openPanel();
}

onMounted(() => {
  syncAfterChatChange();

  nextTick(() => {
    panelHeight.value = isExpanded.value ? measurePanelHeight() : '0px';
  });

  eventOn(tavern_events.MESSAGE_SWIPED, (messageId: number) => {
    if (messageId === 0) {
      syncCurrentSwipe();
    }
  });

  eventOn(tavern_events.CHAT_CHANGED, () => {
    syncAfterChatChange();
  });
});

watch(
  displayData,
  () => {
    nextTick(() => {
      if (detailsOpen.value) {
        panelHeight.value = measurePanelHeight();
      }
    });
  },
  { deep: true },
);
</script>

<style lang="scss" scoped>
.card {
  position: relative;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  border: 1px solid var(--c-panel-border);
  border-radius: 18px;
  background: var(--surface-linen);
  box-shadow:
    0 18px 34px var(--c-fabric-shadow),
    inset 0 1px 0 var(--c-panel-glow),
    inset 0 -1px 0 rgba(122, 92, 69, 0.14);
  color: var(--c-charcoal);
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1px dashed var(--c-stitch);
  border-radius: 12px;
  opacity: 0.75;
  pointer-events: none;
}

.summary-strip {
  position: relative;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 18px;
  cursor: pointer;
  user-select: none;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.45), transparent 42%),
    linear-gradient(135deg, rgba(255, 248, 239, 0.92), rgba(225, 208, 183, 0.9)),
    var(--surface-canvas);
  transition:
    background-position 0.22s ease,
    box-shadow 0.22s ease,
    filter 0.22s ease;
}

.summary-strip::-webkit-details-marker {
  display: none;
}

.summary-strip::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 8px;
  border-bottom: 1px dashed rgba(148, 112, 82, 0.45);
  pointer-events: none;
}

.card[open] > .summary-strip {
  box-shadow:
    inset 0 -1px 0 rgba(184, 137, 83, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.summary-strip:hover {
  background-position: 8px 0, 0 0, 0 0;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 10px 20px rgba(105, 78, 57, 0.08);
  filter: brightness(1.02);
}

.summary-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.summary-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0)),
    var(--surface-denim);
  color: #fffdf7;
  font-size: 1.02rem;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow:
    0 10px 20px rgba(66, 84, 58, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.summary-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.summary-label {
  font-family: var(--font-serif);
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--c-mahogany);
  letter-spacing: 0.4px;
}

.summary-hint {
  color: var(--c-ink-soft);
  font-size: 0.77rem;
}

.summary-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 7px 5px 11px;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.16)),
    var(--surface-canvas);
  border: 1px solid rgba(184, 137, 83, 0.45);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 4px 10px rgba(89, 64, 45, 0.08);
}

.rank-tag {
  font-size: 0.72rem;
  color: var(--c-ink-soft);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.rank-value {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
    linear-gradient(135deg, #b97b5e, #8d5f49);
  color: #fff8ec;
  font-family: var(--font-serif);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.6px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.chevron {
  color: var(--c-mahogany);
  font-size: 0.9rem;
  transition: transform 0.28s ease;
}

.card[open] .chevron {
  transform: rotate(180deg);
}

.content-shell {
  overflow: hidden;
  height: 0;
  transition:
    height 0.24s ease,
    opacity 0.24s ease;
  opacity: 0;
}

.card[data-expanded='true'] .content-shell {
  opacity: 1;
}

.content-area {
  min-height: 0;
  overflow: hidden;
  padding: 0 18px;
}

.content-panel {
  padding: 14px 0 18px;
}

.empty-hint {
  padding: 14px 0 6px;
  color: var(--c-ink-soft);
  font-size: 0.82rem;
  font-style: italic;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 560px) {
  .summary-strip {
    align-items: flex-start;
  }

  .summary-meta {
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  .rank-badge {
    max-width: 170px;
  }

  .rank-value {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
