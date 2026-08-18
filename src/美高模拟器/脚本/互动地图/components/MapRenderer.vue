<script setup lang="ts">
import { useMapStore } from '../store';
import type { Pin } from '../types';
import PinPopup from './PinPopup.vue';
import TravelMenu from './TravelMenu.vue';

const store = useMapStore();

// ── 缩放/平移状态 ────────────────────────────────────
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });
const transStart = reactive({ x: 0, y: 0 });

const containerRef = ref<HTMLElement | null>(null);
const imageLoaded = ref(false);
const imageError = ref(false);

// ── 图片实际渲染尺寸（用于精确定位 pin）──────────────
const imgNaturalW = ref(0);
const imgNaturalH = ref(0);
const canvasW = ref(0);
const canvasH = ref(0);
const canvasOffX = ref(0);
const canvasOffY = ref(0);

/** 根据容器尺寸和图片原始比例，计算 contain-fit 后的实际图片区域 */
function recalcCanvasLayout() {
  const el = containerRef.value;
  if (!el || !imgNaturalW.value || !imgNaturalH.value) return;

  const cw = el.clientWidth;
  const ch = el.clientHeight;
  const imgRatio = imgNaturalW.value / imgNaturalH.value;
  const containerRatio = cw / ch;

  if (imgRatio > containerRatio) {
    // 图片更宽 → 宽度撑满，高度有留白
    canvasW.value = cw;
    canvasH.value = cw / imgRatio;
  } else {
    // 图片更高 → 高度撑满，宽度有留白
    canvasH.value = ch;
    canvasW.value = ch * imgRatio;
  }
  canvasOffX.value = (cw - canvasW.value) / 2;
  canvasOffY.value = (ch - canvasH.value) / 2;
}

// ── 弹窗状态 ─────────────────────────────────────────
const selectedPin = ref<Pin | null>(null);
const showTravelMenu = ref(false);
const travelDestination = ref('');

const mapTransform = computed(() => `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`);

// canvas 的样式（精确匹配图片渲染区域）
const canvasStyle = computed(() => ({
  transform: mapTransform.value,
  width: canvasW.value ? canvasW.value + 'px' : '100%',
  height: canvasH.value ? canvasH.value + 'px' : '100%',
  left: canvasOffX.value ? canvasOffX.value + 'px' : '0',
  top: canvasOffY.value ? canvasOffY.value + 'px' : '0',
}));

// ── 缩放 ─────────────────────────────────────────────
function onWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.15 : 0.15;
  const newScale = Math.max(0.5, Math.min(3, scale.value + delta));
  // 以鼠标位置为中心缩放
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ratio = newScale / scale.value;
    translateX.value = mx - ratio * (mx - translateX.value);
    translateY.value = my - ratio * (my - translateY.value);
  }
  scale.value = newScale;
}

// ── 平移（鼠标） ─────────────────────────────────────
function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  isDragging.value = true;
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
  transStart.x = translateX.value;
  transStart.y = translateY.value;
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  translateX.value = transStart.x + (e.clientX - dragStart.x);
  translateY.value = transStart.y + (e.clientY - dragStart.y);
}

function onMouseUp() {
  isDragging.value = false;
}

// ── 平移（触摸） ─────────────────────────────────────
let lastTouchDist = 0;

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    isDragging.value = true;
    dragStart.x = e.touches[0].clientX;
    dragStart.y = e.touches[0].clientY;
    transStart.x = translateX.value;
    transStart.y = translateY.value;
  } else if (e.touches.length === 2) {
    isDragging.value = false;
    lastTouchDist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY,
    );
  }
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault();
  if (e.touches.length === 1 && isDragging.value) {
    translateX.value = transStart.x + (e.touches[0].clientX - dragStart.x);
    translateY.value = transStart.y + (e.touches[0].clientY - dragStart.y);
  } else if (e.touches.length === 2) {
    // 捏合缩放
    const dist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY,
    );
    if (lastTouchDist > 0) {
      const ratio = dist / lastTouchDist;
      scale.value = Math.max(0.5, Math.min(3, scale.value * ratio));
    }
    lastTouchDist = dist;
  }
}

function onTouchEnd() {
  isDragging.value = false;
  lastTouchDist = 0;
}

// ── 双击还原 ─────────────────────────────────────────
function onDblClick() {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
}

// ── Pin 点击 ─────────────────────────────────────────
function onPinClick(pin: Pin, e: Event) {
  e.stopPropagation();
  if (pin.type === 'portal' && pin.targetMapId) {
    resetView();
    store.navigateToMap(pin.targetMapId);
  } else {
    selectedPin.value = pin;
  }
}

function onTravelRequest(destination: string) {
  travelDestination.value = destination;
  selectedPin.value = null;
  showTravelMenu.value = true;
}

function closeTravelMenu() {
  showTravelMenu.value = false;
  travelDestination.value = '';
}

function resetView() {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
  imageLoaded.value = false;
  imageError.value = false;
  imgNaturalW.value = 0;
  imgNaturalH.value = 0;
}

// 当 currentMapId 变化时重置视图
watch(() => store.currentMapId, () => {
  resetView();
});

function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement;
  imgNaturalW.value = img.naturalWidth;
  imgNaturalH.value = img.naturalHeight;
  recalcCanvasLayout();
  imageLoaded.value = true;
}

function onImageError() {
  imageError.value = true;
  imageLoaded.value = true;
}

// 窗口 resize 时重新计算布局
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    recalcCanvasLayout();
  });
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

function pinIcon(type: string) {
  switch (type) {
    case 'portal': return '🌀';
    case 'building': return '🏢';
    default: return '📍';
  }
}
</script>

<template>
  <div
ref="containerRef" class="imap-renderer" :class="{ dragging: isDragging }" @wheel.prevent="onWheel"
    @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp"
    @touchstart.passive="onTouchStart" @touchmove.prevent="onTouchMove" @touchend="onTouchEnd"
    @dblclick="onDblClick">

    <!-- 加载提示 -->
    <div v-if="!imageLoaded && !imageError" class="imap-loading">
      <div class="imap-spinner" />
      <span>加载地图中...</span>
    </div>

    <!-- 错误提示 -->
    <div v-if="imageError" class="imap-error">
      <span>⚠️ 地图图片加载失败</span>
      <span class="imap-error-url">{{ store.currentImageUrl }}</span>
    </div>

    <!-- 地图图片 + 点位（canvas 精确匹配图片渲染区域） -->
    <div class="imap-canvas" :style="canvasStyle">
      <img
v-if="store.currentImageUrl" :src="store.currentImageUrl" class="imap-bg"
        :class="{ visible: imageLoaded && !imageError }" draggable="false" @load="onImageLoad" @error="onImageError" />

      <!-- 点位层 -->
      <template v-if="imageLoaded && !imageError">
        <div
v-for="pin in store.currentPins" :key="pin.id" class="imap-pin" :style="{
          left: pin.x + '%',
          top: pin.y + '%',
          '--pin-color': pin.color,
        }" :title="pin.name" @click="onPinClick(pin, $event)" @touchend.stop="onPinClick(pin, $event)">
          <span class="imap-pin-icon">{{ pinIcon(pin.type) }}</span>
          <span class="imap-pin-label">{{ pin.name }}</span>
          <span class="imap-pin-pulse" />
        </div>
      </template>
    </div>

    <!-- 缩放指示器 -->
    <div class="imap-zoom-indicator">{{ Math.round(scale * 100) }}%</div>
  </div>

  <!-- 点位详情弹窗 -->
  <PinPopup v-if="selectedPin" :pin="selectedPin" @close="selectedPin = null" @travel="onTravelRequest" />

  <!-- 出行菜单 -->
  <TravelMenu v-if="showTravelMenu" :destination="travelDestination" @close="closeTravelMenu" />
</template>

<style lang="scss" scoped>
.imap-renderer {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background: #111114;
  cursor: grab;
  user-select: none;

  &.dragging {
    cursor: grabbing;
  }
}

.imap-canvas {
  position: absolute;
  transform-origin: 0 0;
  transition: none;
}

.imap-bg {
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0;
  transition: opacity 0.3s ease;

  &.visible {
    opacity: 1;
  }
}

.imap-pin {
  position: absolute;
  transform: translate(-50%, -100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  transition: transform 0.15s ease;

  &:hover {
    transform: translate(-50%, -100%) scale(1.15);
    z-index: 20;

    .imap-pin-label {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

.imap-pin-icon {
  font-size: 22px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
  position: relative;
  z-index: 2;
}

.imap-pin-label {
  margin-top: 2px;
  font-size: 11px;
  color: #fff;
  background: rgba(0, 0, 0, 0.75);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.7;
  transform: translateY(-2px);
  transition: all 0.2s ease;
  border: 1px solid var(--pin-color, #e74c3c);
}

.imap-pin-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--pin-color, #e74c3c);
  opacity: 0.4;
  transform: translate(-50%, -50%);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }

  50% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

.imap-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  z-index: 30;
}

.imap-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(179, 139, 89, 0.2);
  border-top-color: #b38b59;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.imap-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #e57373;
  font-size: 14px;
  z-index: 30;
}

.imap-error-url {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  max-width: 80%;
  word-break: break-all;
  text-align: center;
}

.imap-zoom-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 25;
}
</style>
