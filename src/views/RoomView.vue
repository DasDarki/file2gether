<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import HostRoom from '@/components/HostRoom.vue'
import ViewerRoom from '@/components/ViewerRoom.vue'

const props = defineProps<{ hostId: string }>()
const route = useRoute()

const isHost = computed(() => route.query.host === '1')
</script>

<template>
  <HostRoom v-if="isHost" :host-id="props.hostId" />
  <ViewerRoom v-else :host-id="props.hostId" />
</template>
