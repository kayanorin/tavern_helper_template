// ============================================================================
// 互动地图 —— Pinia Store (状态管理 + 持久化)
// ============================================================================
import { defaultMapPack } from './defaultPack';
import { type InstalledPack, type MapLayer, type Pin, MapPackSchema, StoreStateSchema } from './types';

const LOREBOOK_NAME = '美高模拟器';

export const useMapStore = defineStore('interactiveMap', () => {
  // ── 状态 ────────────────────────────────────────────
  const installedPacks = ref<InstalledPack[]>([]);
  const activePackIndex = ref(0);
  const currentMapId = ref('');
  const mapHistory = ref<string[]>([]);
  const panelVisible = ref(false);

  // 出行设置（来自世界书条目）
  const shouldSendDirectly = ref(true);

  // ── Getters ─────────────────────────────────────────
  const activePack = computed(() => installedPacks.value[activePackIndex.value] ?? null);

  const currentMap = computed<MapLayer | null>(() => {
    if (!activePack.value) return null;
    return activePack.value.data.maps[currentMapId.value] ?? null;
  });

  const currentPins = computed<Pin[]>(() => currentMap.value?.pins ?? []);

  const canGoBack = computed(() => mapHistory.value.length > 0);

  /** 面包屑路径: [overview, central_stem, ...] → 用于导航 */
  const breadcrumbs = computed(() => {
    if (!activePack.value) return [];
    const crumbs: { id: string; name: string }[] = [];
    // 从 history 构建
    for (const id of mapHistory.value) {
      const map = activePack.value.data.maps[id];
      if (map) crumbs.push({ id, name: map.name });
    }
    // 当前
    const cur = activePack.value.data.maps[currentMapId.value];
    if (cur) crumbs.push({ id: currentMapId.value, name: cur.name });
    return crumbs;
  });

  /** 当前地图背景图完整 URL */
  const currentImageUrl = computed(() => {
    if (!activePack.value || !currentMap.value) return '';
    const base = activePack.value.data.baseUrl.replace(/\/$/, '');
    return `${base}/${encodeURIComponent(currentMap.value.image)}`;
  });

  // ── Actions ─────────────────────────────────────────

  /** 从脚本变量加载状态；若无数据则注入默认地图包 */
  function init() {
    const raw = getVariables({ type: 'script' });
    const parsed = StoreStateSchema.parse(raw);

    if (parsed.installed_packs.length === 0) {
      // 注入默认地图包
      parsed.installed_packs.push({
        name: defaultMapPack.name,
        version: defaultMapPack.version,
        sourceUrl: '(built-in)',
        data: defaultMapPack,
      });
      parsed.active_pack_index = 0;
      parsed.current_map_id = defaultMapPack.defaultMapId;
    }

    installedPacks.value = parsed.installed_packs;
    activePackIndex.value = parsed.active_pack_index;
    currentMapId.value = parsed.current_map_id || activePack.value?.data.defaultMapId || '';
    mapHistory.value = parsed.map_history;
  }

  /** 持久化到脚本变量 */
  function persist() {
    replaceVariables(
      klona({
        installed_packs: installedPacks.value,
        active_pack_index: activePackIndex.value,
        current_map_id: currentMapId.value,
        map_history: mapHistory.value,
      }),
      { type: 'script' },
    );
  }

  /** 导航到子地图 */
  function navigateToMap(mapId: string) {
    if (!activePack.value?.data.maps[mapId]) {
      console.warn(`[互动地图] 地图 ID "${mapId}" 不存在`);
      return;
    }
    mapHistory.value.push(currentMapId.value);
    currentMapId.value = mapId;
    persist();
  }

  /** 返回上一层 */
  function goBack() {
    if (mapHistory.value.length === 0) return;
    currentMapId.value = mapHistory.value.pop()!;
    persist();
  }

  /** 跳转到面包屑中某一层 */
  function navigateToBreadcrumb(index: number) {
    const target = breadcrumbs.value[index];
    if (!target) return;
    // 截断 history 到 index
    mapHistory.value = mapHistory.value.slice(0, index);
    currentMapId.value = target.id;
    persist();
  }

  /** 安装新地图包 */
  function installPack(jsonData: unknown, sourceUrl: string = '') {
    const result = MapPackSchema.safeParse(jsonData);
    if (!result.success) {
      const errMsg = z.prettifyError(result.error);
      throw new Error(`地图包格式无效:\n${errMsg}`);
    }
    const pack = result.data;
    installedPacks.value.push({
      name: pack.name,
      version: pack.version,
      sourceUrl,
      data: pack,
    });
    persist();
    return pack;
  }

  /** 切换活跃地图包 */
  function switchPack(index: number) {
    if (index < 0 || index >= installedPacks.value.length) return;
    activePackIndex.value = index;
    mapHistory.value = [];
    currentMapId.value = installedPacks.value[index].data.defaultMapId;
    persist();
  }

  /** 删除地图包 */
  function removePack(index: number) {
    if (installedPacks.value.length <= 1) return; // 至少保留一个
    installedPacks.value.splice(index, 1);
    if (activePackIndex.value >= installedPacks.value.length) {
      activePackIndex.value = installedPacks.value.length - 1;
    }
    mapHistory.value = [];
    currentMapId.value = activePack.value?.data.defaultMapId ?? '';
    persist();
  }

  /** 切换面板显隐 */
  function togglePanel() {
    panelVisible.value = !panelVisible.value;
  }

  // ── 世界书联动 ──────────────────────────────────────

  /** 读取世界书设置条目 */
  async function loadWorldbookSettings() {
    try {
      const entries = await getWorldbook(LOREBOOK_NAME);
      // 读取「设置-开启则直接发送」
      const sendEntry = entries.find(e => e.name === '设置-开启则直接发送，关闭则填在输入框');
      if (sendEntry) {
        shouldSendDirectly.value = sendEntry.enabled;
      }
    } catch (e) {
      console.warn('[互动地图] 读取世界书设置失败', e);
    }
  }

  /** 关闭世界书中的「生成地图规则」条目 */
  async function disableTextMapRule() {
    try {
      await updateWorldbookWith(LOREBOOK_NAME, entries =>
        entries.map(e => (e.name === '生成地图规则' ? { ...e, enabled: false } : e)),
      );
      console.info('[互动地图] 已自动关闭「生成地图规则」世界书条目');
    } catch (e) {
      console.warn('[互动地图] 关闭「生成地图规则」失败', e);
    }
  }

  /** 生成出行指令 */
  function sendTravelCommand(command: string) {
    if (shouldSendDirectly.value) {
      triggerSlash(`/send ${command} || /trigger`);
    } else {
      triggerSlash(`/setinput ${command}`);
    }
    panelVisible.value = false;
  }

  return {
    // state
    installedPacks,
    activePackIndex,
    currentMapId,
    mapHistory,
    panelVisible,
    shouldSendDirectly,
    // getters
    activePack,
    currentMap,
    currentPins,
    canGoBack,
    breadcrumbs,
    currentImageUrl,
    // actions
    init,
    persist,
    navigateToMap,
    goBack,
    navigateToBreadcrumb,
    installPack,
    switchPack,
    removePack,
    togglePanel,
    loadWorldbookSettings,
    disableTextMapRule,
    sendTravelCommand,
  };
});
