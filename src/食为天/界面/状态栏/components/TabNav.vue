<template>
  <nav class="tabs">
    <button
      v-for="tab in props.tabs"
      :key="tab.id"
      class="tab-button"
      :class="{ active: model === tab.id }"
      :aria-expanded="model === tab.id"
      @click="toggleTab(tab.id)"
    >
      <span class="tab-icon">{{ tab.icon }}</span>
      {{ tab.label }}
    </button>
  </nav>
</template>

<script setup lang="ts">
const props = defineProps<{
  tabs: { id: string; label: string; icon?: string }[];
}>();

const model = defineModel<string | null>({ required: true });

function toggleTab(id: string) {
  model.value = model.value === id ? null : id;
}
</script>

<style lang="scss" scoped>
.tabs {
  display: flex;
  border-bottom: 2px solid var(--c-mahogany);
  background: linear-gradient(135deg, var(--c-mahogany), var(--c-terracotta));
  overflow-x: auto;
}

.tab-button {
  flex: 1;
  padding: 10px 8px;
  border: none;
  background: transparent;
  color: var(--c-amber-light);
  font-size: 0.85rem;
  font-weight: 600;
  font-family: var(--font-serif);
  cursor: pointer;
  transition: all 0.25s ease;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.tab-button:last-child {
  border-right: none;
}

.tab-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-button.active {
  background: var(--c-cream);
  color: var(--c-mahogany);
  position: relative;
  box-shadow: inset 0 -3px 0 var(--c-amber);
}

.tab-icon {
  margin-right: 4px;
  font-style: normal;
}
</style>
