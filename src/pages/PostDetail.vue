<template>
  <div class="detail">
    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else-if="!post" class="not-found">
      <h1>{{ t('post.notFound') }}</h1>
      <RouterLink to="/blog">{{ t('post.backToBlog') }}</RouterLink>
    </div>

    <article v-else class="article">
      <PostCover :url="post.cover_url" />

      <div class="article-inner">
      <div class="top-row">
        <RouterLink class="back-link" to="/blog">{{ t('common.back') }}</RouterLink>

        <AppButton v-if="auth.isAdmin" class="edit-link" variant="float" :icon="editIcon" :label="t('post.edit')" :to="`/blog/${post.slug}/edit`" />
      </div>

      <header>
        <h1>{{ post.title }}</h1>

        <div class="meta">
          <span class="post-date">{{ displayDate }}</span>

          <span class="pill">{{ t('common.minRead', { n: readTime }) }}</span>

          <TagChip v-for="tag of post.tags" :key="tag.id" :tag="tag" />

          <span v-if="post.status === 'DRAFT'" class="draft-badge">{{ t('common.draft') }}</span>
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
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { getPostBySlug } from '@/services/posts'
import TagChip from '@/components/TagChip.vue'
import AppButton from '@/components/AppButton.vue'
import PostCover from '@/components/PostCover.vue'
import PostToc from '@/components/PostToc.vue'
import { renderMarkdownWithToc } from '@/lib/markdown'
import { readTimeMinutes } from '@/lib/readTime'
import { useAuthStore } from '@/stores/auth'
import { dateLocale } from '@/i18n'
import type { IPost } from '@/interfaces/post'
import editIcon from '@/assets/icons/edit.svg'

const props = defineProps<{ slug: string }>()

const { t, locale } = useI18n()
const auth = useAuthStore()

const post = ref<IPost | null>(null)
const loading = ref(true)
const error = ref('')

const rendered = computed(() => renderMarkdownWithToc(post.value?.body ?? ''))
const readTime = computed(() => (post.value ? readTimeMinutes(post.value.body) : 1))

const displayDate = computed(() => {
  if (!post.value) return ''

  const iso = post.value.published_at ?? post.value.updated_at

  return new Date(iso).toLocaleDateString(dateLocale(locale.value), {
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
    error.value = err instanceof Error ? err.message : t('post.loadFailed')
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

    .top-row {
      @apply flex items-center justify-between;

      .back-link {
        @apply font-mono text-sm font-bold text-slate-800;
      }
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

        }

        .draft-badge {
          @apply font-mono bg-slate-800 text-white px-2 py-0.5 rounded-full;
        }

      }

      .description {
        @apply text-[15px] leading-[1.75] text-slate-600;
      }
    }
  }
}
</style>
