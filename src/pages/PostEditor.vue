<template>
  <div class="editor">
    <div v-if="loading" class="loading">Loading…</div>

    <template v-else>
      <div class="topbar">
        <div class="topbar-inner">
          <RouterLink class="back-link" to="/blog">← Blog</RouterLink>

          <div class="actions">
            <button class="save-draft" :disabled="saving" @click="save('DRAFT')">Save draft</button>
            <button v-if="!isPublished" class="publish" :disabled="saving" @click="save('PUBLISHED')">Publish</button>
            <button v-else class="unpublish" :disabled="saving" @click="save('DRAFT')">Unpublish</button>
            <button v-if="isEditing" class="delete" :disabled="saving" @click="remove">Delete</button>
          </div>
        </div>
      </div>

      <div class="column">
        <PostCover :url="coverUrl">
          <div class="cover-actions">
            <label class="cover-button" :title="coverLabel" :aria-label="coverLabel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <input type="file" accept="image/*" @change="onCoverSelected" />
            </label>

            <button v-if="coverUrl" class="cover-remove" type="button" title="Remove cover" aria-label="Remove cover" @click="removeCover">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </PostCover>

        <div class="column-inner">
        <p v-if="formError" class="form-error">{{ formError }}</p>

        <input class="title-input" v-model="title" type="text" placeholder="Title" />
        <input class="description-input" v-model="description" type="text" placeholder="Short description" />

        <input class="tags-input" v-model="tagsRaw" type="text" placeholder="Tags, comma separated" />

        <div class="tabs" role="tablist">
          <button
            class="tab-edit"
            role="tab"
            :aria-selected="mode === 'edit'"
            :class="{ active: mode === 'edit' }"
            @click="mode = 'edit'"
          >Edit</button>
          <button
            class="tab-preview"
            role="tab"
            :aria-selected="mode === 'preview'"
            :class="{ active: mode === 'preview' }"
            @click="mode = 'preview'"
          >Preview</button>
        </div>

        <!-- v-show keeps the textarea mounted so its cursor and undo history survive a toggle -->
        <textarea v-show="mode === 'edit'" class="body-input" v-model="body" placeholder="Write your post in markdown…"></textarea>

        <!-- renderMarkdown sanitizes via DOMPurify before this reaches v-html -->
        <div v-if="mode === 'preview'" class="preview prose-post" v-html="preview"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import {
  getPostBySlug,
  listSlugs,
  createPost,
  updatePost,
  deletePost,
  uploadCover,
} from '@/services/posts'
import PostCover from '@/components/PostCover.vue'
import { renderMarkdown } from '@/lib/markdown'
import { uniqueSlug } from '@/lib/slug'
import type { PostStatus } from '@/interfaces/post'

const props = defineProps<{ slug?: string }>()

const router = useRouter()

const id = ref<string | null>(null)
const title = ref('')
const description = ref('')
const body = ref('')
const tagsRaw = ref('')
const coverUrl = ref<string | null>(null)
const status = ref<PostStatus>('DRAFT')
const existingSlug = ref<string | null>(null)

const mode = ref<'edit' | 'preview'>('edit')
const loading = ref(true)
const saving = ref(false)
const formError = ref('')

const isEditing = computed(() => Boolean(props.slug))
const isPublished = computed(() => status.value === 'PUBLISHED')
const coverLabel = computed(() => (coverUrl.value ? 'Replace cover' : 'Upload cover'))
const preview = computed(() => renderMarkdown(body.value))

const tags = computed(() => {
  const seen = new Set<string>()

  return tagsRaw.value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag || seen.has(tag)) return false
      seen.add(tag)
      return true
    })
})

onMounted(async () => {
  try {
    if (props.slug) {
      const post = await getPostBySlug(props.slug)

      if (!post) {
        formError.value = 'Post not found.'
      } else {
        id.value = post.id
        title.value = post.title
        description.value = post.description ?? ''
        body.value = post.body
        tagsRaw.value = post.tags.join(', ')
        coverUrl.value = post.cover_url
        status.value = post.status
        existingSlug.value = post.slug
      }
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Could not load the post.'
  } finally {
    loading.value = false
  }
})

async function onCoverSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file) return

  formError.value = ''

  try {
    coverUrl.value = await uploadCover(file)
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Cover upload failed.'
  }
}

// Only clears the draft state: the file stays in storage and the post is
// updated with cover_url = null when saved.
function removeCover() {
  coverUrl.value = null
}

async function save(nextStatus: PostStatus) {
  if (!title.value.trim()) {
    formError.value = 'A title is required.'
    return
  }

  saving.value = true
  formError.value = ''

  const base = {
    title: title.value.trim(),
    description: description.value.trim() || null,
    body: body.value,
    cover_url: coverUrl.value,
    tags: tags.value,
    status: nextStatus,
  }

  try {
    if (id.value) {
      // The slug of a published post is frozen by a database trigger, and
      // changing a live URL is undesirable anyway, so it is never resent.
      await updatePost(id.value, base)
      router.push(`/blog/${existingSlug.value}`)
    } else {
      const taken = await listSlugs()
      const created = await createPost({ ...base, slug: uniqueSlug(base.title, taken) })
      router.push(`/blog/${created.slug}`)
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!id.value) return
  if (!window.confirm('Delete this post permanently?')) return

  saving.value = true

  try {
    await deletePost(id.value)
    router.push('/blog')
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Delete failed.'
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.editor {
  @apply bg-background min-h-[calc(100vh-100px-60px)];

  .loading {
    @apply text-base text-slate-500 text-center py-8;
  }

  .topbar {
    @apply sticky top-[100px] z-10 bg-white border-b-[1px] border-light_border;

    .topbar-inner {
      @apply max-w-content-padded mx-auto px-4 py-3 flex items-center justify-between gap-4;
    }

    .back-link {
      @apply font-mono text-sm font-bold text-slate-800;
    }

    .actions {
      @apply flex gap-2;

      button {
        @apply text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60;
      }

      .save-draft {
        @apply border-slate-300 text-slate-600 hover:border-slate-800 hover:text-slate-800;
      }

      .publish, .unpublish {
        @apply border-slate-800 bg-slate-800 text-white hover:bg-slate-700;
      }

      .delete {
        @apply border-red-200 text-red-600 hover:border-red-600;
      }
    }
  }

  .column {
    @apply w-[calc(100%-2rem)] max-w-content mx-auto mt-8 mb-16 bg-white rounded-lg shadow-lg flex flex-col;

    .cover-actions {
      @apply absolute bottom-3 left-3 flex gap-2;

      .cover-button, .cover-remove {
        @apply flex items-center justify-center w-8 h-8 bg-white/90 rounded-full shadow cursor-pointer hover:bg-white;

        svg {
          @apply w-4 h-4;
        }
      }

      .cover-button {
        @apply text-slate-800;

        input {
          @apply hidden;
        }
      }

      .cover-remove {
        @apply text-red-600;
      }
    }

    .column-inner {
      @apply p-8 flex flex-col gap-4;
    }

    .form-error {
      @apply text-sm text-red-600;
    }

    input[type='text'] {
      @apply w-full bg-transparent outline-none placeholder:text-slate-400;
    }

    .title-input {
      @apply text-2xl font-bold text-slate-800 leading-snug;
    }

    .description-input {
      @apply text-[15px] leading-[1.75] text-slate-600;
    }

    .tags-input {
      @apply font-mono text-xs text-slate-500 border border-slate-300 rounded-full px-3 py-1.5 focus:border-slate-500;
    }

    .tabs {
      @apply flex gap-4 border-b border-slate-300 mt-4;

      button {
        @apply text-sm text-slate-400 pb-2 -mb-px border-b-2 border-transparent;

        &.active {
          @apply text-slate-800 border-slate-800 font-medium;
        }
      }
    }

    .body-input {
      @apply w-full min-h-[60vh] outline-none resize-y font-mono text-[13px] leading-relaxed text-slate-700 placeholder:text-slate-400;
    }

    .preview {
      @apply min-h-[60vh];
    }
  }
}

// The navbar is 60px tall on small screens, so the sticky bar sits lower.
@media screen and (max-width: 780px) {
  .editor .topbar {
    @apply top-[60px];
  }
}
</style>
