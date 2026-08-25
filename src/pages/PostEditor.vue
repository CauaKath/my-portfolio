<template>
  <div class="editor">
    <div v-if="loading" class="loading">Loading…</div>

    <template v-else>
      <div class="editor-header">
        <h1>{{ isEditing ? 'Edit post' : 'New post' }}</h1>

        <div class="actions">
          <button class="save-draft" :disabled="saving" @click="save('DRAFT')">Save draft</button>
          <button v-if="!isPublished" class="publish" :disabled="saving" @click="save('PUBLISHED')">Publish</button>
          <button v-else class="unpublish" :disabled="saving" @click="save('DRAFT')">Unpublish</button>
          <button v-if="isEditing" class="delete" :disabled="saving" @click="remove">Delete</button>
        </div>
      </div>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <div class="fields">
        <input class="title-input" v-model="title" type="text" placeholder="Title" />
        <input class="description-input" v-model="description" type="text" placeholder="Short description" />
        <input class="tags-input" v-model="tagsRaw" type="text" placeholder="Tags, comma separated" />

        <div class="cover-field">
          <label>
            <span>{{ coverUrl ? 'Replace cover' : 'Upload cover' }}</span>
            <input type="file" accept="image/*" @change="onCoverSelected" />
          </label>
          <img v-if="coverUrl" :src="coverUrl" alt="Cover preview" />
        </div>
      </div>

      <div class="panes">
        <textarea class="body-input" v-model="body" placeholder="Write your post in markdown…"></textarea>
        <!-- renderMarkdown sanitizes via DOMPurify before this reaches v-html -->
        <div class="preview" v-html="preview"></div>
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

const loading = ref(true)
const saving = ref(false)
const formError = ref('')

const isEditing = computed(() => Boolean(props.slug))
const isPublished = computed(() => status.value === 'PUBLISHED')
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
  @apply bg-background min-h-[calc(100vh-100px-60px)] p-8 flex flex-col gap-6;

  .loading {
    @apply text-base text-gray_text text-center py-8;
  }

  .editor-header {
    @apply flex justify-between items-center flex-wrap gap-4;

    h1 {
      @apply text-2xl font-bold text-primary-default;
    }

    .actions {
      @apply flex gap-3 flex-wrap;

      button {
        @apply text-sm px-4 py-2 rounded-full disabled:opacity-60;
      }

      .save-draft {
        @apply border border-primary-default text-primary-default;
      }

      .publish, .unpublish {
        @apply bg-gradient-to-r from-register-from to-register-to text-white;
      }

      .delete {
        @apply border border-red-600 text-red-600;
      }
    }
  }

  .form-error {
    @apply text-sm text-red-600;
  }

  .fields {
    @apply flex flex-col gap-3;

    input[type='text'] {
      @apply w-full bg-white rounded-md px-4 py-3 outline-none text-primary-default;
    }

    .title-input {
      @apply text-xl font-bold;
    }

    .cover-field {
      @apply flex items-center gap-4;

      label {
        @apply text-sm text-primary-default border border-primary-default rounded-full px-4 py-2 cursor-pointer;

        input {
          @apply hidden;
        }
      }

      img {
        @apply h-16 w-28 object-cover rounded-md;
      }
    }
  }

  .panes {
    @apply flex gap-6 items-stretch flex-1;

    .body-input {
      @apply w-1/2 min-h-[60vh] bg-white rounded-md p-4 outline-none font-mono text-sm text-primary-default resize-none;
    }

    .preview {
      @apply w-1/2 min-h-[60vh] bg-white rounded-md p-4 overflow-y-auto;
    }
  }
}

@media screen and (max-width: 780px) {
  .editor .panes {
    @apply flex-col;

    .body-input, .preview {
      @apply w-full min-h-[40vh];
    }
  }
}

.preview :deep(h1) { @apply text-2xl font-bold text-primary-default mt-4 mb-2; }
.preview :deep(h2) { @apply text-xl font-bold text-primary-default mt-4 mb-2; }
.preview :deep(p) { @apply text-base text-primary-default my-2; }
.preview :deep(ul) { @apply list-disc pl-6 my-2; }
.preview :deep(ol) { @apply list-decimal pl-6 my-2; }
.preview :deep(a) { @apply text-register-to underline; }
.preview :deep(pre) { @apply rounded-md p-3 overflow-x-auto my-3; }
.preview :deep(img) { @apply max-w-full rounded-md my-2; }
</style>
