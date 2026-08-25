<template>
  <RouterLink class="post" :class="type" :to="`/blog/${post.slug}`">
    <div class="post-image" :class="type" :style="coverStyle"></div>

    <div class="post-content" :class="type">
      <div class="post-main">
        <div class="post-texts">
          <span class="post-date">
            {{ displayDate }} • {{ readTime }} min read
            <span v-if="post.status === 'DRAFT'" class="draft-badge">DRAFT</span>
          </span>
          <span class="post-title">{{ post.title }}</span>
          <span class="post-description">{{ post.description ?? '' }}</span>
        </div>
      </div>

      <div class="post-tags" :class="type">
        <span v-for="tag of post.tags" :key="tag">#{{ tag }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { readTimeMinutes } from '@/lib/readTime'
import type { IPost } from '@/interfaces/post'
import defaultBanner from '@/assets/banner.jpg'

const props = withDefaults(
  defineProps<{
    post: IPost
    type?: 'default' | 'most-recent' | 'other-recent'
  }>(),
  { type: 'default' },
)

const readTime = computed(() => readTimeMinutes(props.post.body))

const coverStyle = computed(() => ({
  backgroundImage: `url('${props.post.cover_url ?? defaultBanner}')`,
}))

// Drafts have no published_at, so fall back to when they were last touched.
const displayDate = computed(() => {
  const iso = props.post.published_at ?? props.post.updated_at

  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})
</script>

<style lang="scss">
.post {
  @apply
    flex
    rounded-md
    h-full
    w-full;

    &.most-recent {
      @apply
        flex-col;
    }

    &.default {
      @apply
        flex-col;
    }

  .post-image {
    @apply
      w-full
      bg-center
      bg-cover;

    &.most-recent {
      @apply
        h-[300px]
        rounded-t-md;
    }

    &.default {
      @apply
        h-[140px]
        rounded-md;
    }

    &.other-recent {
      @apply
        rounded-l-md;
    }
  }

  .post-content {
    @apply
      w-full
      h-full
      flex
      flex-col
      bg-white
      p-4;

      &.most-recent, &.default {
        @apply
          rounded-b-md;
      }

      &.other-recent {
        @apply
          rounded-r-md;
      }

    .post-main {
      @apply
        w-full
        h-full
        flex
        items-start;

      .post-texts {
        @apply
          w-full
          h-full
          text-sm
          flex
          flex-col
          gap-2;

        .post-date {
          @apply
            bg-gradient-to-r from-register-from to-register-to
            inline-block
            text-transparent
            bg-clip-text;
        }

        .draft-badge {
          @apply
            ml-2
            bg-primary-default
            text-white
            text-xs
            px-2
            py-0.5
            rounded;
        }

        .post-title {
          @apply
            text-xl
            text-primary-default
            font-bold;
        }

        .post-description {
          @apply
            h-[80px]
            text-gray_text;
        }
      }

      img {
        @apply
          w-6
          h-6;
      }
    }

    .post-tags {
      @apply
        text-sm
        text-primary-default
        flex
        gap-2;

      >span {
        @apply
          border-2
          border-primary-default
          px-2
          py-1
          rounded-md;
      }
    }
  }
}
</style>