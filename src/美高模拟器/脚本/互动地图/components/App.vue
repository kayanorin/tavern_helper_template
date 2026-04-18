<script setup lang="ts">
import MapPanel from './MapPanel.vue';
import { useMapStore } from '../store';

const store = useMapStore();

// ── 自定义 CSS 注入 ──────────────────────────────────
// 在 iframe 的 <head> 中创建 / 维护一个 <style> 元素
let styleEl: HTMLStyleElement | null = null;

onMounted(() => {
  styleEl = document.createElement('style');
  styleEl.id = 'imap-custom-style';
  document.head.appendChild(styleEl);
});

watchEffect(() => {
  if (styleEl) {
    styleEl.textContent = store.customCSS || '';
  }
});

onBeforeUnmount(() => {
  styleEl?.remove();
  styleEl = null;
});
</script>

<template>
  <MapPanel v-if="store.panelVisible" />
</template>
