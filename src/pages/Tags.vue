<template>
  <div class="tags-page">
    <div class="tags-card">
      <RouterLink class="back-link" to="/blog">{{ t('common.back') }}</RouterLink>

      <div class="page-header">
        <h1>{{ t('tags.title') }}</h1>
        <AppButton v-if="!creating" class="new-tag" :icon="plusIcon" @click="startCreating">{{ t('tags.new') }}</AppButton>
      </div>

      <p v-if="error" class="page-error">{{ error }}</p>

      <div v-if="creating" class="create-box">
        <TagForm :submit-label="t('tags.create')" :busy="busy" :server-error="formError" @submit="create" @cancel="creating = false" />
      </div>

      <p v-if="loading" class="status">{{ t('common.loading') }}</p>
      <p v-else-if="!tags.length" class="status">{{ t('tags.empty') }}</p>

      <ul v-else class="tag-list">
        <li v-for="tag of tags" :key="tag.id" class="tag-row">
          <TagForm
            v-if="editingId === tag.id"
            :submit-label="t('common.save')"
            :initial="{ name: tag.name, description: tag.description, color: tag.color }"
            :busy="busy"
            :server-error="formError"
            @submit="(input) => save(tag.id, input)"
            @cancel="editingId = null"
          />

          <template v-else>
            <TagChip :tag="tag" />
            <span class="description">{{ tag.description ?? '' }}</span>
            <span class="count">{{ t('tags.count', tag.post_count) }}</span>

            <div class="row-actions">
              <AppButton class="edit-tag" variant="text" :icon="editIcon" :label="t('tags.editTag', { name: tag.name })" :disabled="busy" @click="startEditing(tag.id)" />
              <AppButton class="delete-tag" variant="text" danger :icon="trashIcon" :label="t('tags.deleteTag', { name: tag.name })" :disabled="busy" @click="remove(tag)" />
            </div>
          </template>
        </li>
      </ul>
    </div>

    <ConfirmModal
      v-model:open="deleteOpen"
      :title="t('tags.deleteTitle')"
      :busy="deleteBusy"
      :error="deleteError"
      @confirm="confirmDelete"
    >
      <template v-if="deleting">
        <i18n-t keypath="tags.deletePrompt" tag="span">
          <template #name><strong>{{ deleting.name }}</strong></template>
        </i18n-t>
        {{ usageText(deleting) }}
      </template>
    </ConfirmModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import TagChip from '@/components/TagChip.vue'
import TagForm from '@/components/TagForm.vue'
import { listTagsWithCount, createTag, updateTag, deleteTag } from '@/services/tags'
import plusIcon from '@/assets/icons/plus.svg'
import editIcon from '@/assets/icons/edit.svg'
import trashIcon from '@/assets/icons/trash.svg'
import type { ITagInput, ITagWithCount } from '@/interfaces/tag'

const { t } = useI18n()

const tags = ref<ITagWithCount[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const formError = ref('')
const creating = ref(false)
const editingId = ref<string | null>(null)
// `deleting` is kept after the modal closes so its text does not blank out
// during the fade-out; `deleteOpen` is what actually shows it.
const deleting = ref<ITagWithCount | null>(null)
const deleteOpen = ref(false)
const deleteBusy = ref(false)
const deleteError = ref('')

async function load() {
  try {
    tags.value = await listTagsWithCount()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('tags.loadFailed')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function startCreating() {
  formError.value = ''
  editingId.value = null
  creating.value = true
}

function startEditing(id: string) {
  formError.value = ''
  creating.value = false
  editingId.value = id
}

// Runs a write, then refreshes the list (which also refreshes post counts).
// A failure stays on the open form so the input is not lost.
async function run(action: () => Promise<void>, onDone: () => void) {
  busy.value = true
  formError.value = ''
  error.value = ''

  try {
    await action()
    await load()
    onDone()
  } catch (err) {
    formError.value = err instanceof Error ? err.message : t('tags.failed')
  } finally {
    busy.value = false
  }
}

function create(input: ITagInput) {
  return run(() => createTag(input).then(() => undefined), () => { creating.value = false })
}

function save(id: string, input: ITagInput) {
  return run(() => updateTag(id, input).then(() => undefined), () => { editingId.value = null })
}

function usageText(tag: ITagWithCount) {
  if (!tag.post_count) return t('tags.unused')

  return t('tags.usage', tag.post_count)
}

// Opens the confirmation; nothing is deleted until the modal's Delete is pressed.
function remove(tag: ITagWithCount) {
  deleteError.value = ''
  deleting.value = tag
  deleteOpen.value = true
}

// A failure keeps the modal open and shows the error in it, instead of
// closing it and leaving the message somewhere the user may not look.
async function confirmDelete() {
  const tag = deleting.value

  if (!tag) return

  deleteBusy.value = true
  deleteError.value = ''

  try {
    await deleteTag(tag.id)
    await load()
    deleteOpen.value = false
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : t('tags.deleteFailed')
  } finally {
    deleteBusy.value = false
  }
}
</script>

<style lang="scss" scoped>
.tags-page {
  @apply bg-background min-h-[calc(100vh-100px-60px)] py-16 px-4 flex justify-center;

  .tags-card {
    @apply w-full max-w-content h-fit bg-white rounded-lg shadow-lg p-8 flex flex-col gap-6;

    .back-link {
      @apply font-mono text-sm font-bold text-slate-800 w-fit;
    }

    .page-header {
      @apply flex items-center justify-between;

      h1 {
        @apply text-2xl font-bold text-slate-800;
      }
    }

    .page-error {
      @apply text-sm text-red-600;
    }

    .create-box {
      @apply border border-slate-200 rounded-md p-4;
    }

    .status {
      @apply text-sm text-slate-500;
    }

    .tag-list {
      @apply flex flex-col divide-y divide-slate-200;

      .tag-row {
        @apply flex items-center gap-4 py-3;

        .description {
          @apply flex-1 min-w-0 truncate text-sm text-slate-500;
        }

        .count {
          @apply shrink-0 font-mono text-xs text-slate-400;
        }

        .row-actions {
          @apply flex shrink-0 gap-1;
        }
      }
    }
  }
}
</style>
