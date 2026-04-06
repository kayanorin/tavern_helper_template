<template>
  <div class="var-tree">
    <template v-for="(value, key) in filteredEntries" :key="key">
      <!-- 跳过 $ 前缀变量（脚本私有）-->
      <div v-if="isLeaf(value)" class="var-leaf">
        <span class="var-key" :class="{ computed: isComputed(key as string) }">
          {{ formatKey(key as string) }}
        </span>
        <span v-if="typeof value === 'number'" class="var-value number">
          <span class="num-badge">{{ value }}</span>
        </span>
        <span v-else-if="typeof value === 'boolean'" class="var-value bool">
          {{ value ? '✓' : '✗' }}
        </span>
        <span v-else class="var-value string">{{ value }}</span>
      </div>

      <div v-else-if="Array.isArray(value)" class="var-array">
        <span class="var-key" :class="{ computed: isComputed(key as string) }">
          {{ formatKey(key as string) }}
        </span>
        <div class="tag-list">
          <span v-for="(item, i) in value" :key="i" class="tag">{{ item }}</span>
          <span v-if="value.length === 0" class="empty-hint">暂无</span>
        </div>
      </div>

      <details v-else class="var-branch" :open="depth < 1">
        <summary class="branch-label" :class="{ computed: isComputed(key as string) }">
          {{ formatKey(key as string) }}
          <span v-if="objectSize(value) > 0" class="count-badge">{{ objectSize(value) }}</span>
        </summary>
        <div class="branch-content">
          <!-- 如果子项全为简单对象（如品鉴记录），用表格展示 -->
          <template v-if="isRecordOfObjects(value)">
            <div v-for="(subVal, subKey) in value" :key="subKey" class="record-card">
              <div class="record-header">{{ subKey }}</div>
              <div class="record-body">
                <GenericVarTree :data="subVal" :depth="depth + 2" />
              </div>
            </div>
          </template>
          <template v-else>
            <GenericVarTree :data="value" :depth="depth + 1" />
          </template>
        </div>
      </details>
    </template>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';

const props = withDefaults(defineProps<{
  data: any;
  depth?: number;
}>(), { depth: 0 });

const filteredEntries = computed(() => {
  if (!props.data || typeof props.data !== 'object') return {};
  return _.omitBy(props.data, (_v, k) => k.startsWith('$'));
});

function isLeaf(val: any): boolean {
  return val === null || val === undefined || typeof val !== 'object';
}

function isComputed(key: string): boolean {
  return key.startsWith('_');
}

function formatKey(key: string): string {
  if (key.startsWith('_')) return key.slice(1);
  return key;
}

function objectSize(val: any): number {
  if (Array.isArray(val)) return val.length;
  if (typeof val === 'object' && val !== null) return Object.keys(val).length;
  return 0;
}

function isRecordOfObjects(val: any): boolean {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
  const values = Object.values(val);
  if (values.length === 0) return false;
  return values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v));
}
</script>

<style lang="scss" scoped>
.var-tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  color: var(--c-charcoal);
}

.var-leaf {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid rgba(184, 137, 83, 0.16);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.12)),
    var(--surface-canvas);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 5px 10px rgba(89, 64, 45, 0.04);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    filter 0.22s ease;
}

.var-leaf:hover {
  transform: translateY(-1px);
  filter: brightness(1.02);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    0 10px 18px rgba(89, 64, 45, 0.08);
}

.var-key {
  font-weight: 600;
  color: var(--c-mahogany);
  min-width: 72px;
  flex-shrink: 0;
  font-family: var(--font-serif);
  font-size: 0.82rem;

  &.computed {
    color: var(--c-brown-olive);
    font-weight: 400;
    font-style: italic;

    &::before {
      content: '⟐ ';
      font-size: 0.7rem;
    }
  }
}

.var-value {
  flex: 1;
  word-break: break-word;

  &.number .num-badge {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      linear-gradient(135deg, var(--c-amber), var(--c-terracotta));
    color: #fffaf2;
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    display: inline-block;
    min-width: 28px;
    text-align: center;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26);
  }

  &.bool {
    font-weight: 700;
    font-size: 0.9rem;
  }

  &.string {
    color: var(--c-charcoal);
  }
}

.var-array {
  padding: 8px 10px 10px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.1)),
    var(--surface-canvas);
  border: 1px solid rgba(184, 137, 83, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.tag {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0)),
    rgba(216, 190, 151, 0.6);
  color: var(--c-mahogany);
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px dashed rgba(148, 112, 82, 0.42);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    filter 0.22s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.03);
    box-shadow: 0 6px 12px rgba(89, 64, 45, 0.08);
  }
}

.empty-hint {
  color: var(--c-brown-olive);
  font-style: italic;
  font-size: 0.78rem;
}

.var-branch {
  margin: 4px 0;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08)),
    var(--surface-canvas);
  border: 1px solid rgba(184, 137, 83, 0.18);
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.52),
    0 6px 12px rgba(89, 64, 45, 0.05);

  &[open] > .branch-label {
    border-bottom: 1px dashed rgba(148, 112, 82, 0.34);
  }
}

.branch-label {
  cursor: pointer;
  font-weight: 600;
  font-family: var(--font-serif);
  color: var(--c-mahogany);
  padding: 9px 12px;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition:
    background-position 0.22s ease,
    filter 0.22s ease;

  &:hover {
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.22), transparent 60%);
    filter: brightness(1.03);
  }

  &::before {
    content: '▸';
    transition: transform 0.22s ease;
    display: inline-block;
    font-size: 0.7rem;
  }

  &.computed {
    color: var(--c-brown-olive);
    font-weight: 400;
  }
}

details[open] > .branch-label::before {
  transform: rotate(90deg);
}

.count-badge {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
    var(--surface-denim);
  color: #fffef8;
  font-size: 0.65rem;
  padding: 2px 7px;
  border-radius: 999px;
  font-family: var(--font-sans);
  font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.branch-content {
  padding: 10px 10px 10px 16px;
  border-left: 2px dashed rgba(184, 137, 83, 0.34);
  margin-left: 10px;
}

.record-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0.14)),
    var(--surface-linen);
  border: 1px solid rgba(184, 137, 83, 0.22);
  border-radius: 12px;
  margin-bottom: 8px;
  overflow: hidden;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    filter 0.22s ease;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.015);
    box-shadow: 0 10px 18px rgba(92, 46, 30, 0.08);
  }
}

.record-header {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.28), transparent 75%),
    var(--surface-canvas);
  padding: 7px 12px;
  font-weight: 600;
  font-family: var(--font-serif);
  color: var(--c-terracotta);
  font-size: 0.8rem;
  border-bottom: 1px dashed rgba(148, 112, 82, 0.32);
}

.record-body {
  padding: 8px 12px 10px;
}
</style>
