<script setup lang="ts">
import { useMapStore } from '../store';

const store = useMapStore();

const importMode = ref<'none' | 'url' | 'file'>('none');
const urlInput = ref('');
const isLoading = ref(false);
const errorMsg = ref('');

/** 从 URL 导入（支持普通 JSON URL 或 GitHub 仓库路径） */
async function importFromUrl() {
  if (!urlInput.value.trim()) return;
  isLoading.value = true;
  errorMsg.value = '';

  try {
    let fetchUrl = urlInput.value.trim();

    // 如果看起来像 GitHub 仓库路径 (e.g. kayanorin/SillyTavernimg/美高模拟器/地图)
    if (!fetchUrl.startsWith('http') && fetchUrl.includes('/')) {
      fetchUrl = `https://testingcf.jsdelivr.net/gh/${fetchUrl}/mappack.json`;
    }

    const resp = await fetch(fetchUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    store.installPack(data, fetchUrl);
    importMode.value = 'none';
    urlInput.value = '';
  } catch (e: any) {
    errorMsg.value = e.message || '导入失败';
  } finally {
    isLoading.value = false;
  }
}

/** 从文件导入 */
function onFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.[0]) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string);
      store.installPack(data, `(file: ${input.files![0].name})`);
      importMode.value = 'none';
      errorMsg.value = '';
    } catch (err: any) {
      errorMsg.value = err.message || '文件解析失败';
    }
    input.value = '';
  };
  reader.readAsText(input.files[0]);
}
</script>

<template>
  <div class="imap-manager">
    <h3 class="imap-manager-title">📦 地图包管理</h3>

    <!-- 已安装列表 -->
    <div class="imap-pack-list">
      <div v-for="(pack, i) in store.installedPacks" :key="i" class="imap-pack-item"
        :class="{ active: i === store.activePackIndex }">
        <div class="imap-pack-info">
          <span class="imap-pack-name">{{ pack.name }}</span>
          <span class="imap-pack-meta">v{{ pack.version }} · {{ pack.sourceUrl || '内置' }}</span>
        </div>
        <div class="imap-pack-actions">
          <button v-if="i !== store.activePackIndex" class="imap-btn imap-btn-sm" @click="store.switchPack(i)">
            使用
          </button>
          <span v-else class="imap-pack-badge">当前</span>
          <button v-if="store.installedPacks.length > 1" class="imap-btn imap-btn-sm imap-btn-danger"
            @click="store.removePack(i)">
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 导入区域 -->
    <div class="imap-import-section">
      <div v-if="importMode === 'none'" class="imap-import-buttons">
        <button class="imap-btn" @click="importMode = 'url'">🔗 从 URL 导入</button>
        <button class="imap-btn" @click="importMode = 'file'">📁 上传 JSON 文件</button>
      </div>

      <!-- URL 导入 -->
      <div v-if="importMode === 'url'" class="imap-import-form">
        <p class="imap-import-hint">
          支持：JSON URL、GitHub 仓库路径（如 <code>user/repo/path</code>）
        </p>
        <div class="imap-import-row">
          <input v-model="urlInput" class="imap-input" placeholder="粘贴 URL 或仓库路径"
            @keyup.enter="importFromUrl" />
          <button class="imap-btn imap-btn-primary" @click="importFromUrl" :disabled="isLoading || !urlInput.trim()">
            {{ isLoading ? '加载中...' : '导入' }}
          </button>
        </div>
        <button class="imap-btn imap-btn-ghost" @click="importMode = 'none'">取消</button>
      </div>

      <!-- 文件导入 -->
      <div v-if="importMode === 'file'" class="imap-import-form">
        <input type="file" accept=".json" @change="onFileUpload" />
        <button class="imap-btn imap-btn-ghost" @click="importMode = 'none'">取消</button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="imap-import-error">⚠️ {{ errorMsg }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.imap-manager {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.imap-manager-title {
  margin: 0;
  font-size: 16px;
  color: #fff;
  font-weight: 600;
}

.imap-pack-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.imap-pack-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  transition: all 0.15s;

  &.active {
    border-color: rgba(179, 139, 89, 0.3);
    background: rgba(179, 139, 89, 0.06);
  }
}

.imap-pack-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.imap-pack-name {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.imap-pack-meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.imap-pack-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

.imap-pack-badge {
  font-size: 11px;
  color: #b38b59;
  padding: 2px 8px;
  background: rgba(179, 139, 89, 0.12);
  border-radius: 10px;
}

.imap-import-section {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 12px;
}

.imap-import-buttons {
  display: flex;
  gap: 8px;
}

.imap-import-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.imap-import-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;

  code {
    background: rgba(255, 255, 255, 0.08);
    padding: 1px 4px;
    border-radius: 3px;
  }
}

.imap-import-row {
  display: flex;
  gap: 6px;
}

.imap-import-error {
  font-size: 13px;
  color: #e57373;
  margin-top: 4px;
}

.imap-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(179, 139, 89, 0.5);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }
}

.imap-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.imap-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.imap-btn-primary {
  background: linear-gradient(135deg, #b38b59, #9a7548);
  color: #fff;
  border: none;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #c99e68, #b38b59);
  }
}

.imap-btn-danger {
  color: #e57373;
  border-color: rgba(229, 115, 115, 0.2);

  &:hover {
    background: rgba(229, 115, 115, 0.1) !important;
  }
}

.imap-btn-ghost {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);

  &:hover {
    color: rgba(255, 255, 255, 0.7);
  }
}
</style>
