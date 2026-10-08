<template>
  <div class="post" :class="type" aria-hidden="true">
    <SkeletonBlock class="post-image" :class="type" />

    <div class="post-content" :class="type">
      <div class="post-main">
        <div class="post-texts">
          <SkeletonBlock class="h-4 w-28" />
          <SkeletonBlock class="h-6 w-3/4" />

          <div class="flex flex-col gap-2">
            <SkeletonBlock class="h-3 w-full" />
            <SkeletonBlock class="h-3 w-5/6" />
          </div>
        </div>
      </div>

      <div class="post-tags" :class="type">
        <SkeletonBlock class="h-6 w-14 rounded-full" />
        <SkeletonBlock class="h-6 w-20 rounded-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Reuses BlogPost's own (global) classes so a skeleton has exactly the
// dimensions of the card it stands in for.
import SkeletonBlock from '@/components/SkeletonBlock.vue'

withDefaults(defineProps<{ type?: 'default' | 'most-recent' | 'other-recent' }>(), { type: 'default' })
</script>
