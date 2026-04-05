<template>
  <div class="card">
    <!-- 头部：味阶 + 当前主线提示 -->
    <div class="header-strip">
      <div class="flavor-rank">
        <span class="rank-icon">🍳</span>
        <span class="rank-label">味阶</span>
        <span class="rank-value">{{ store.data.当前味阶 }}</span>
      </div>
    </div>

    <TabNav v-model="active_tab" :tabs="tabs" />

    <div v-if="active_tab" class="content-area">
      <transition name="fade" mode="out-in">
        <div :key="active_tab" class="tab-pane">
          <GenericVarTree :data="tabData" />
        </div>
      </transition>
    </div>

    <div v-else class="collapsed-hint">
      <span>点击标签查看详情</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import GenericVarTree from './components/GenericVarTree.vue';
import TabNav from './components/TabNav.vue';
import { useDataStore } from './store';

const store = useDataStore();

const tabs = [
  { id: '巡礼', label: '百城巡礼', icon: '🗺️' },
  { id: '逆袭', label: '星级逆袭', icon: '⭐' },
  { id: '传承', label: '星辰传承', icon: '🔥' },
  { id: '深渊', label: '深渊低语', icon: '🌑' },
];

const active_tab = useLocalStorage<string | null>('swt_status:active_tab', null);

const tabData = computed(() => {
  if (!active_tab.value) return {};
  const raw = (store.data as any)[active_tab.value];
  if (!raw || typeof raw !== 'object') return {};
  return raw;
});
</script>

<style lang="scss" scoped>
.card {
  width: 100%;
  max-width: 720px;
  background: var(--c-cream);
  border: 2px solid var(--c-mahogany);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(92, 46, 30, 0.12);
  display: flex;
  flex-direction: column;
  font-family: var(--font-sans);
  color: var(--c-charcoal);
  font-size: 13px;
  line-height: 1.4;
  margin: 0 auto;
  overflow: hidden;
}

.header-strip {
  background: linear-gradient(135deg, var(--c-parchment) 0%, var(--c-amber-light) 100%);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--c-amber);
}

.flavor-rank {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-icon {
  font-size: 1.2rem;
}

.rank-label {
  font-family: var(--font-serif);
  font-weight: 600;
  color: var(--c-brown-olive);
  font-size: 0.82rem;
}

.rank-value {
  background: linear-gradient(135deg, var(--c-terracotta), var(--c-mahogany));
  color: var(--c-amber-light);
  padding: 3px 12px;
  border-radius: 14px;
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 1px;
}

.content-area {
  padding: 14px;
  min-height: 0;
}

.collapsed-hint {
  padding: 16px;
  text-align: center;
  color: var(--c-brown-olive);
  font-style: italic;
  font-size: 0.82rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
