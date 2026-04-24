<script setup lang="ts">
import ViewerRoom from '@/components/ViewerRoom.vue'

const props = defineProps<{ hostId: string }>()
</script>

<template>
  <ViewerRoom :host-id="props.hostId" />
</template>
