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
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  color: var(--c-charcoal);
}

.var-leaf {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px dotted var(--c-amber-light);
}

.var-key {
  font-weight: 600;
  color: var(--c-mahogany);
  min-width: 60px;
  flex-shrink: 0;
  font-family: var(--font-serif);
  font-size: 0.8rem;

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
    background: linear-gradient(135deg, var(--c-amber), var(--c-terracotta));
    color: #fff;
    padding: 1px 8px;
    border-radius: 10px;
    font-size: 0.78rem;
    font-weight: 600;
    display: inline-block;
    min-width: 28px;
    text-align: center;
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
  padding: 4px 0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.tag {
  background: var(--c-amber-light);
  color: var(--c-mahogany);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid var(--c-amber);
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.empty-hint {
  color: var(--c-brown-olive);
  font-style: italic;
  font-size: 0.78rem;
}

.var-branch {
  margin: 2px 0;

  &[open] > .branch-label {
    border-bottom: 1px solid var(--c-amber-light);
    margin-bottom: 6px;
  }
}

.branch-label {
  cursor: pointer;
  font-weight: 600;
  font-family: var(--font-serif);
  color: var(--c-mahogany);
  padding: 4px 0;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '▸';
    transition: transform 0.2s ease;
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
  background: var(--c-sage);
  color: #fff;
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 8px;
  font-family: var(--font-sans);
  font-weight: 600;
}

.branch-content {
  padding-left: 12px;
  border-left: 2px solid var(--c-amber-light);
  margin-left: 4px;
}

.record-card {
  background: #fff;
  border: 1px solid var(--c-amber-light);
  border-radius: 6px;
  margin-bottom: 6px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(92, 46, 30, 0.1);
  }
}

.record-header {
  background: linear-gradient(135deg, var(--c-parchment), var(--c-cream));
  padding: 5px 10px;
  font-weight: 600;
  font-family: var(--font-serif);
  color: var(--c-terracotta);
  font-size: 0.8rem;
  border-bottom: 1px solid var(--c-amber-light);
}

.record-body {
  padding: 6px 10px;
}
</style>
