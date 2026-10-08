<template>
  <div class="detail">
    <div v-if="loading" class="loading">Loading…</div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else-if="!post" class="not-found">
      <h1>Post not found</h1>
      <RouterLink to="/blog">Back to the blog</RouterLink>
    </div>

    <article v-else class="article">
      <PostCover :url="post.cover_url" />

      <div class="article-inner">
      <RouterLink class="back-link" to="/blog">← Blog</RouterLink>

      <header>
        <h1>{{ post.title }}</h1>

        <div class="meta">
          <span class="post-date">{{ displayDate }}</span>

          <span class="pill">
            <span>{{ readTime }} min read</span>
            <template v-for="tag of post.tags" :key="tag">
              <span class="divider"></span>
              <span>#{{ tag }}</span>
            </template>
          </span>

          <span v-if="post.status === 'DRAFT'" class="draft-badge">DRAFT</span>

          <RouterLink v-if="auth.isAdmin" class="edit-link" :to="`/blog/${post.slug}/edit`">
            Edit
          </RouterLink>
        </div>

        <p v-if="post.description" class="description">{{ post.description }}</p>
      </header>

      <!-- renderMarkdown runs its output through DOMPurify; see src/lib/markdown.ts -->
      <div class="post-body prose-post" v-html="rendered.html"></div>
      </div>
    </article>

    <PostToc v-if="post" :items="rendered.toc" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import { getPostBySlug } from '@/services/posts'
import PostCover from '@/components/PostCover.vue'
import PostToc from '@/components/PostToc.vue'
import { renderMarkdownWithToc } from '@/lib/markdown'
import { readTimeMinutes } from '@/lib/readTime'
import { useAuthStore } from '@/stores/auth'
import type { IPost } from '@/interfaces/post'

const props = defineProps<{ slug: string }>()

const auth = useAuthStore()

const post = ref<IPost | null>(null)
const loading = ref(true)
const error = ref('')

const rendered = computed(() => renderMarkdownWithToc(post.value?.body ?? ''))
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
  @apply bg-background min-h-[calc(100vh-100px-60px)] py-16 px-4 flex justify-center;

  .loading, .error, .not-found {
    @apply text-base text-slate-500 text-center py-8;
  }

  .error {
    @apply text-red-600;
  }

  .article {
    @apply w-full max-w-content bg-white rounded-lg shadow-lg flex flex-col;

    .article-inner {
      @apply p-8 flex flex-col gap-6;
    }

    .back-link {
      @apply font-mono text-sm font-bold text-slate-800 w-fit;
    }

    header {
      @apply flex flex-col gap-4;

      h1 {
        @apply text-2xl font-bold text-slate-800 leading-snug;
      }

      .meta {
        @apply flex items-center flex-wrap gap-3 text-xs;

        .post-date {
          @apply font-mono text-slate-500;
        }

        .pill {
          @apply inline-flex items-center gap-2 border border-slate-200 rounded-full px-3 py-1 font-mono text-slate-500;

          .divider {
            @apply w-px h-3 bg-slate-200;
          }
        }

        .draft-badge {
          @apply bg-slate-800 text-white px-2 py-0.5 rounded-full;
        }

        .edit-link {
          @apply text-slate-500 underline underline-offset-2;
        }
      }

      .description {
        @apply text-[15px] leading-[1.75] text-slate-600;
      }
    }
  }
}
</style>
