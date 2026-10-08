<template>
  <div class="editor">
    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>

    <template v-else>
      <div class="topbar">
        <div class="topbar-inner">
          <RouterLink class="back-link" to="/blog">{{ t('common.back') }}</RouterLink>

          <div class="actions">
            <AppButton class="save-draft" variant="outlined" :icon="saveIcon" :label="t('editor.saveDraft')" :disabled="saving" @click="save('DRAFT')" />
            <AppButton v-if="!isPublished" class="publish" variant="filled" :icon="sendIcon" :label="t('editor.publish')" :disabled="saving" @click="save('PUBLISHED')" />
            <AppButton v-else class="unpublish" variant="filled" :icon="eyeOffIcon" :label="t('editor.unpublish')" :disabled="saving" @click="save('DRAFT')" />
            <AppButton v-if="isEditing" class="delete" variant="outlined" danger :icon="trashIcon" :label="t('editor.deletePost')" :disabled="saving" @click="askRemove" />
          </div>
        </div>
      </div>

      <div class="column">
        <PostCover :url="coverUrl">
          <div class="cover-actions">
            <AppButton class="cover-button" variant="float" :icon="uploadIcon" :label="coverLabel" @click="coverInput?.click()" />

            <AppButton v-if="coverUrl" class="cover-remove" variant="float" danger :icon="trashIcon" :label="t('editor.removeCover')" @click="removeCover" />

            <input ref="coverInput" class="cover-input" type="file" accept="image/*" hidden @change="onCoverSelected" />
          </div>
        </PostCover>

        <div class="column-inner">
        <p v-if="formError" class="form-error">{{ formError }}</p>

        <input class="title-input" v-model="title" type="text" :placeholder="t('editor.title')" />
        <input class="description-input" v-model="description" type="text" :placeholder="t('editor.description')" />

        <TagPicker v-model="tagIds" />

        <div class="tabs" role="tablist">
          <button
            class="tab-edit"
            role="tab"
            :aria-selected="mode === 'edit'"
            :class="{ active: mode === 'edit' }"
            @click="mode = 'edit'"
          >{{ t('editor.edit') }}</button>
          <button
            class="tab-preview"
            role="tab"
            :aria-selected="mode === 'preview'"
            :class="{ active: mode === 'preview' }"
            @click="mode = 'preview'"
          >{{ t('editor.preview') }}</button>
        </div>

        <!-- v-show keeps the textarea mounted so its cursor and undo history survive a toggle -->
        <textarea v-show="mode === 'edit'" class="body-input" v-model="body" :placeholder="t('editor.body')"></textarea>

        <!-- renderMarkdown sanitizes via DOMPurify before this reaches v-html -->
        <div v-if="mode === 'preview'" class="preview prose-post" v-html="preview"></div>
        </div>
      </div>
    </template>

    <ConfirmModal
      v-model:open="confirmingDelete"
      :title="t('editor.deleteTitle')"
      :message="t('editor.deleteMessage')"
      :busy="saving"
      :error="deleteError"
      @confirm="remove"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import {
  getPostBySlug,
  listSlugs,
  createPost,
  updatePost,
  deletePost,
  uploadCover,
} from '@/services/posts'
import TagPicker from '@/components/TagPicker.vue'
import AppButton from '@/components/AppButton.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import PostCover from '@/components/PostCover.vue'
import { renderMarkdown } from '@/lib/markdown'
import { uniqueSlug } from '@/lib/slug'
import type { PostStatus } from '@/interfaces/post'
import uploadIcon from '@/assets/icons/upload.svg'
import trashIcon from '@/assets/icons/trash.svg'
import saveIcon from '@/assets/icons/save.svg'
import sendIcon from '@/assets/icons/send.svg'
import eyeOffIcon from '@/assets/icons/eye-off.svg'

const props = defineProps<{ slug?: string }>()

const { t } = useI18n()
const router = useRouter()

const id = ref<string | null>(null)
const title = ref('')
const description = ref('')
const body = ref('')
const tagIds = ref<string[]>([])
const coverUrl = ref<string | null>(null)
const status = ref<PostStatus>('DRAFT')
const existingSlug = ref<string | null>(null)

const coverInput = ref<HTMLInputElement | null>(null)
const mode = ref<'edit' | 'preview'>('edit')
const loading = ref(true)
const saving = ref(false)
const formError = ref('')
const confirmingDelete = ref(false)
const deleteError = ref('')

const isEditing = computed(() => Boolean(props.slug))
const isPublished = computed(() => status.value === 'PUBLISHED')
const coverLabel = computed(() => (coverUrl.value ? t('editor.replaceCover') : t('editor.uploadCover')))
const preview = computed(() => renderMarkdown(body.value))

onMounted(async () => {
  try {
    if (props.slug) {
      const post = await getPostBySlug(props.slug)

      if (!post) {
        formError.value = t('editor.notFound')
      } else {
        id.value = post.id
        title.value = post.title
        description.value = post.description ?? ''
        body.value = post.body
        tagIds.value = post.tags.map((tag) => tag.id)
        coverUrl.value = post.cover_url
        status.value = post.status
        existingSlug.value = post.slug
      }
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : t('editor.loadFailed')
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
    formError.value = err instanceof Error ? err.message : t('editor.coverFailed')
  }
}

// Only clears the draft state: the file stays in storage and the post is
// updated with cover_url = null when saved.
function removeCover() {
  coverUrl.value = null
}

async function save(nextStatus: PostStatus) {
  if (!title.value.trim()) {
    formError.value = t('editor.titleRequired')
    return
  }

  saving.value = true
  formError.value = ''

  const base = {
    title: title.value.trim(),
    description: description.value.trim() || null,
    body: body.value,
    cover_url: coverUrl.value,
    tag_ids: tagIds.value,
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
    formError.value = err instanceof Error ? err.message : t('editor.saveFailed')
  } finally {
    saving.value = false
  }
}

function askRemove() {
  deleteError.value = ''
  confirmingDelete.value = true
}

// Runs from the modal's Delete. A failure stays in the modal so it is seen.
async function remove() {
  if (!id.value) return

  saving.value = true
  deleteError.value = ''

  try {
    await deletePost(id.value)
    router.push('/blog')
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : t('editor.deleteFailed')
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
    }
  }

  .column {
    @apply w-[calc(100%-2rem)] max-w-content mx-auto mt-8 mb-16 bg-white rounded-lg shadow-lg flex flex-col;

    .cover-actions {
      @apply absolute bottom-3 left-3 flex gap-2;
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
