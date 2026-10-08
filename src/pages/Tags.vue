<template>
  <div class="tags-page">
    <div class="card">
      <RouterLink class="back-link" to="/blog">← Blog</RouterLink>

      <div class="page-header">
        <h1>Tags</h1>
        <button v-if="!creating" class="new-tag" @click="startCreating">+ New tag</button>
      </div>

      <p v-if="error" class="page-error">{{ error }}</p>

      <div v-if="creating" class="create-box">
        <TagForm submit-label="Create tag" :busy="busy" :server-error="formError" @submit="create" @cancel="creating = false" />
      </div>

      <p v-if="loading" class="status">Loading…</p>
      <p v-else-if="!tags.length" class="status">No tags yet.</p>

      <ul v-else class="tag-list">
        <li v-for="tag of tags" :key="tag.id" class="tag-row">
          <TagForm
            v-if="editingId === tag.id"
            submit-label="Save"
            :initial="{ name: tag.name, description: tag.description, color: tag.color }"
            :busy="busy"
            :server-error="formError"
            @submit="(input) => save(tag.id, input)"
            @cancel="editingId = null"
          />

          <template v-else>
            <TagChip :tag="tag" />
            <span class="description">{{ tag.description ?? '' }}</span>
            <span class="count">{{ tag.post_count }} {{ tag.post_count === 1 ? 'post' : 'posts' }}</span>

            <div class="row-actions">
              <button class="edit-tag" :disabled="busy" @click="startEditing(tag.id)">Edit</button>
              <button class="delete-tag" :disabled="busy" @click="remove(tag)">Delete</button>
            </div>
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import TagChip from '@/components/TagChip.vue'
import TagForm from '@/components/TagForm.vue'
import { listTagsWithCount, createTag, updateTag, deleteTag } from '@/services/tags'
import type { ITagInput, ITagWithCount } from '@/interfaces/tag'

const tags = ref<ITagWithCount[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const formError = ref('')
const creating = ref(false)
const editingId = ref<string | null>(null)

async function load() {
  try {
    tags.value = await listTagsWithCount()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load tags.'
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
    formError.value = err instanceof Error ? err.message : 'Something went wrong.'
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

function remove(tag: ITagWithCount) {
  const usage = tag.post_count
    ? `It will be removed from ${tag.post_count} ${tag.post_count === 1 ? 'post' : 'posts'}.`
    : 'No post uses it.'

  if (!window.confirm(`Delete the tag "${tag.name}"? ${usage}`)) return

  return run(() => deleteTag(tag.id), () => undefined)
}
</script>

<style lang="scss" scoped>
.tags-page {
  @apply bg-background min-h-[calc(100vh-100px-60px)] py-16 px-4 flex justify-center;

  .card {
    @apply w-full max-w-content h-fit bg-white rounded-lg shadow-lg p-8 flex flex-col gap-6;

    .back-link {
      @apply font-mono text-sm font-bold text-slate-800 w-fit;
    }

    .page-header {
      @apply flex items-center justify-between;

      h1 {
        @apply text-2xl font-bold text-slate-800;
      }

      .new-tag {
        @apply text-xs px-3 py-1.5 rounded-full border border-slate-800 bg-slate-800 text-white hover:bg-slate-700;
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
          @apply flex shrink-0 gap-3 text-xs;

          button {
            @apply text-slate-500 underline underline-offset-2 hover:text-slate-800 disabled:opacity-60;
          }

          .delete-tag {
            @apply text-red-600 hover:text-red-800;
          }
        }
      }
    }
  }
}
</style>
