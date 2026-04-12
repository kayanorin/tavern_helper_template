<script setup lang="ts">
import MapPanel from './MapPanel.vue';
import { useMapStore } from '../store';

const store = useMapStore();
</script>

<template>
  <MapPanel v-if="store.panelVisible" />
</template>
