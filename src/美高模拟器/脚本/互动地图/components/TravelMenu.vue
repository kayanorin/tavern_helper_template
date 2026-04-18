<script setup lang="ts">
import { useMapStore } from '../store';

const props = defineProps<{ destination: string }>();
const emit = defineEmits<{ close: [] }>();

const store = useMapStore();

/** 自由探索模式：入口没有预设目的地 */
const isFreeExplore = computed(() => !props.destination.trim());

// ── 出行流程步骤 ─────────────────────────────────────
type Step = 'confirm' | 'companion' | 'activity';
const step = ref<Step>('confirm');

// ── 出行数据 ─────────────────────────────────────────
const meetNPC = ref(false);
const npcName = ref('');
const isAlone = ref(true);
const companionName = ref('');
const customDestination = ref(props.destination || '');

const activities = ['闲逛', '吃饭', '喝酒', '约会', '睡觉', '做爱'];
const customActivity = ref('');

/** 最终使用的目的地（已 trim） */
const finalDestination = computed(() => (customDestination.value || props.destination).trim());

/** 目的地是否已填写（用于禁用按钮） */
const hasDestination = computed(() => finalDestination.value.length > 0);

// ── 流程控制 ─────────────────────────────────────────
function goAlone() {
  if (!hasDestination.value) return;
  isAlone.value = true;
  step.value = 'activity';
}

function goWithCompanion() {
  if (!hasDestination.value) return;
  isAlone.value = false;
  step.value = 'companion';
}

function confirmCompanion() {
  if (!companionName.value.trim()) return;
  step.value = 'activity';
}

function finalizeTravel(activity: string) {
  if (!activity.trim() || !hasDestination.value) return;

  const dest = finalDestination.value;
  const userPlaceholder = '{{user}}';

  let text = '';
  if (isAlone.value) {
    text += `${userPlaceholder} 决定独自前往 ${dest}`;
  } else {
    text += `${userPlaceholder} 邀请 ${companionName.value} 前往 ${dest}`;
  }

  if (meetNPC.value && npcName.value.trim()) {
    text += `，并在那里遇见 ${npcName.value}`;
  }

  text += `。活动内容：${activity}。`;

  const command = `<request:${text}>`;
  store.sendTravelCommand(command);
  emit('close');
}
</script>

<template>
  <div class="imap-overlay" @click="emit('close')">
    <div class="imap-travel" @click.stop>
      <div class="imap-travel-header">
        <h3>{{ isFreeExplore ? '✨ 自由探索' : '🚀 出行' }}</h3>
        <button class="imap-travel-close" @click="emit('close')">✕</button>
      </div>

      <div class="imap-travel-body">
        <!-- Step 1: 确认目的地 + NPC 遭遇 -->
        <template v-if="step === 'confirm'">
          <!-- 有预设目的地时显示 -->
          <div v-if="!isFreeExplore" class="imap-travel-dest">
            目的地：<strong>{{ customDestination || destination }}</strong>
          </div>
          <!-- 自由探索模式提示 -->
          <div v-else class="imap-travel-hint">
            预设地图里没有想去的地方？直接输入你想去的目的地。
          </div>

          <!-- 自定义目的地 -->
          <div class="imap-travel-field">
            <input
v-model="customDestination" class="imap-input"
              :placeholder="isFreeExplore ? '输入目的地（必填）' : '修改目的地（可选）'"
              :class="{ 'imap-input-required': isFreeExplore && !hasDestination }" autofocus />
          </div>

          <!-- NPC 遭遇 -->
          <div class="imap-travel-field">
            <label class="imap-checkbox-label">
              <input v-model="meetNPC" type="checkbox" />
              <span>是否要遇见 NPC?</span>
            </label>
            <input
v-if="meetNPC" v-model="npcName" class="imap-input" placeholder="输入 NPC 名字"
              style="margin-top: 6px" />
          </div>

          <div class="imap-travel-actions">
            <button class="imap-btn imap-btn-primary" :disabled="!hasDestination" @click="goAlone">
              👤 独自前往
            </button>
            <button class="imap-btn imap-btn-secondary" :disabled="!hasDestination" @click="goWithCompanion">
              👥 邀请某人一起
            </button>
          </div>
          <p v-if="!hasDestination" class="imap-travel-warning">请先填写目的地</p>
        </template>

        <!-- Step 2: 同伴输入 -->
        <template v-if="step === 'companion'">
          <p class="imap-travel-label">和谁一起去？</p>
          <div class="imap-travel-field">
            <input
v-model="companionName" class="imap-input" placeholder="输入角色姓名"
              @keyup.enter="confirmCompanion" />
          </div>
          <div class="imap-travel-actions">
            <button class="imap-btn imap-btn-primary" :disabled="!companionName.trim()" @click="confirmCompanion">
              下一步
            </button>
            <button class="imap-btn imap-btn-ghost" @click="step = 'confirm'">返回</button>
          </div>
        </template>

        <!-- Step 3: 活动选择 -->
        <template v-if="step === 'activity'">
          <p class="imap-travel-label">在目的地做什么？</p>
          <div class="imap-activity-grid">
            <button v-for="act in activities" :key="act" class="imap-activity-btn" @click="finalizeTravel(act)">
              {{ act }}
            </button>
          </div>
          <div class="imap-travel-custom">
            <input
v-model="customActivity" class="imap-input" placeholder="自定义活动（如：看电影）"
              @keyup.enter="finalizeTravel(customActivity)" />
            <button
class="imap-btn imap-btn-primary" :disabled="!customActivity.trim()"
              @click="finalizeTravel(customActivity)">
              确定
            </button>
          </div>
          <div class="imap-travel-actions" style="margin-top: 8px">
            <button class="imap-btn imap-btn-ghost" @click="step = 'confirm'">重选目的地</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.imap-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 110;
  backdrop-filter: blur(2px);
}

.imap-travel {
  background: #222228;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  width: min(400px, 88vw);
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  animation: popupIn 0.2s ease-out;
}

@keyframes popupIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.imap-travel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  h3 {
    margin: 0;
    font-size: 16px;
    color: #fff;
  }
}

.imap-travel-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }
}

.imap-travel-body {
  padding: 16px;
  overflow-y: auto;
}

.imap-travel-dest {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 12px;

  strong {
    color: #b38b59;
  }
}

.imap-travel-hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.55;
  margin-bottom: 12px;
  padding: 8px 10px;
  background: rgba(179, 139, 89, 0.08);
  border-left: 2px solid rgba(179, 139, 89, 0.5);
  border-radius: 4px;
}

.imap-travel-warning {
  margin: 6px 0 0;
  font-size: 12px;
  color: #f39c12;
  text-align: center;
}

.imap-travel-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 10px;
}

.imap-travel-field {
  margin-bottom: 12px;
}

.imap-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(179, 139, 89, 0.5);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }
}

.imap-input-required {
  border-color: rgba(243, 156, 18, 0.4);
  background: rgba(243, 156, 18, 0.06);

  &:focus {
    border-color: rgba(243, 156, 18, 0.7);
  }
}

.imap-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);

  input[type='checkbox'] {
    accent-color: #b38b59;
  }
}

.imap-travel-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 4px;
}

.imap-activity-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.imap-activity-btn {
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(179, 139, 89, 0.15);
    border-color: rgba(179, 139, 89, 0.3);
    color: #c9a96a;
  }
}

.imap-travel-custom {
  display: flex;
  gap: 6px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  .imap-input {
    flex: 1;
  }
}

.imap-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  white-space: nowrap;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.imap-btn-primary {
  background: linear-gradient(135deg, #b38b59, #9a7548);
  color: #fff;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #c99e68, #b38b59);
  }
}

.imap-btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

.imap-btn-ghost {
  background: none;
  color: rgba(255, 255, 255, 0.4);

  &:hover {
    color: rgba(255, 255, 255, 0.7);
  }
}
</style>
