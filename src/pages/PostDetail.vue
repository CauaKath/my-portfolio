<template>
  <div class="detail">
    <div v-if="loading" class="loading">Loading…</div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else-if="!post" class="not-found">
      <h1>Post not found</h1>
      <RouterLink to="/blog">Back to the blog</RouterLink>
    </div>

    <article v-else class="article">
      <div v-if="post.cover_url" class="cover" :style="{ backgroundImage: `url('${post.cover_url}')` }"></div>

      <header>
        <span class="post-date">
          {{ displayDate }} • {{ readTime }} min read
          <span v-if="post.status === 'DRAFT'" class="draft-badge">DRAFT</span>
        </span>

        <h1>{{ post.title }}</h1>
        <p v-if="post.description">{{ post.description }}</p>

        <div class="tags">
          <span v-for="tag of post.tags" :key="tag">#{{ tag }}</span>
        </div>

        <RouterLink v-if="auth.isAdmin" class="edit-link" :to="`/blog/${post.slug}/edit`">
          Edit this post
        </RouterLink>
      </header>

      <!-- renderMarkdown runs its output through DOMPurify; see src/lib/markdown.ts -->
      <div class="post-body" v-html="renderedBody"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import { getPostBySlug } from '@/services/posts'
import { renderMarkdown } from '@/lib/markdown'
import { readTimeMinutes } from '@/lib/readTime'
import { useAuthStore } from '@/stores/auth'
import type { IPost } from '@/interfaces/post'

const props = defineProps<{ slug: string }>()

const auth = useAuthStore()

const post = ref<IPost | null>(null)
const loading = ref(true)
const error = ref('')

const renderedBody = computed(() => (post.value ? renderMarkdown(post.value.body) : ''))
const readTime = computed(() => (post.value ? readTimeMinutes(post.value.body) : 1))

const displayDate = computed(() => {
  if (!post.value) return ''

  const iso = post.value.published_at ?? post.value.updated_at

  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
})

onMounted(async () => {
  try {
    // An unknown slug and a draft belonging to someone else are
    // indistinguishable here, which is the correct behaviour: RLS returns no
    // row either way, so a draft's existence never leaks.
    post.value = await getPostBySlug(props.slug)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load this post.'
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.detail {
  @apply bg-background min-h-[calc(100vh-100px-60px)] py-16 flex justify-center;

  .loading, .error, .not-found {
    @apply text-base text-gray_text text-center py-8;
  }

  .error {
    @apply text-red-600;
  }

  .article {
    @apply w-[80%] max-w-3xl bg-white rounded-md p-8 flex flex-col gap-6;

    .cover {
      @apply w-full h-[300px] rounded-md bg-center bg-cover;
    }

    header {
      @apply flex flex-col gap-3;

      .post-date {
        @apply text-sm bg-gradient-to-r from-register-from to-register-to inline-block text-transparent bg-clip-text;
      }

      .draft-badge {
        @apply ml-2 bg-primary-default text-white text-xs px-2 py-0.5 rounded;
      }

      h1 {
        @apply text-4xl font-bold text-primary-default;
      }

      p {
        @apply text-base text-gray_text;
      }

      .tags {
        @apply flex gap-2 text-sm text-primary-default;

        span {
          @apply border-2 border-primary-default px-2 py-1 rounded-md;
        }
      }

      .edit-link {
        @apply text-sm text-gray_text underline w-fit;
      }
    }
  }
}

// v-html content carries no scope attribute, so these rules need :deep to
// reach the rendered markdown.
.post-body :deep(h1) { @apply text-3xl font-bold text-primary-default mt-6 mb-2; }
.post-body :deep(h2) { @apply text-2xl font-bold text-primary-default mt-6 mb-2; }
.post-body :deep(h3) { @apply text-xl font-bold text-primary-default mt-4 mb-2; }
.post-body :deep(p) { @apply text-base text-primary-default my-3 leading-relaxed; }
.post-body :deep(ul) { @apply list-disc pl-6 my-3; }
.post-body :deep(ol) { @apply list-decimal pl-6 my-3; }
.post-body :deep(a) { @apply text-register-to underline; }
.post-body :deep(blockquote) { @apply border-l-4 border-light_border pl-4 italic text-gray_text my-4; }
.post-body :deep(pre) { @apply rounded-md p-4 overflow-x-auto my-4; }
.post-body :deep(code) { @apply text-sm; }
.post-body :deep(img) { @apply max-w-full rounded-md my-4; }
.post-body :deep(table) { @apply w-full border-collapse my-4; }
.post-body :deep(th), .post-body :deep(td) { @apply border border-light_border px-3 py-2 text-sm; }
</style>
