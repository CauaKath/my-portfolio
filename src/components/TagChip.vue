<template>
  <span class="tag-chip" :style="{ backgroundColor: tag.color, color: textColor }" :title="tag.description ?? undefined">
    {{ tag.name }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { readableTextColor } from '@/lib/tagColor'
import type { ITag } from '@/interfaces/tag'

const props = defineProps<{ tag: Pick<ITag, 'name' | 'color' | 'description'> }>()

const textColor = computed(() => readableTextColor(props.tag.color))
</script>

<style lang="scss" scoped>
.tag-chip {
  @apply inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs whitespace-nowrap;
}
</style>
