<template>
  <div class="tag-picker">
    <div class="selected">
      <span v-for="tag of selectedTags" :key="tag.id" class="selected-tag">
        <TagChip :tag="tag" />
        <button class="remove-tag" type="button" :aria-label="`Remove ${tag.name}`" @click="remove(tag.id)">×</button>
      </span>

      <div class="add-wrap">
        <button class="add-tag" type="button" aria-haspopup="listbox" :aria-expanded="open" @click="open = !open">
          + Tag
        </button>

        <div v-if="open" class="menu" role="listbox">
          <button v-for="tag of available" :key="tag.id" class="menu-tag" type="button" role="option" @click="add(tag.id)">
            <TagChip :tag="tag" />
          </button>

          <p v-if="!available.length" class="menu-empty">{{ tags.length ? 'All tags selected' : 'No tags yet' }}</p>

          <button class="new-tag" type="button" @click="startCreating">+ New tag</button>
        </div>
      </div>
    </div>

    <p v-if="loadError" class="picker-error">{{ loadError }}</p>

    <div v-if="creating" class="create-box">
      <TagForm submit-label="Create tag" :busy="busy" :server-error="createError" @submit="create" @cancel="creating = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import TagChip from '@/components/TagChip.vue'
import TagForm from '@/components/TagForm.vue'
import { listTags, createTag } from '@/services/tags'
import type { ITag, ITagInput } from '@/interfaces/tag'

// The ids of the selected tags. Ids rather than objects: that is what a post
// stores, and it keeps this component the only owner of the tag list.
const model = defineModel<string[]>({ default: () => [] })

const tags = ref<ITag[]>([])
const open = ref(false)
const creating = ref(false)
const busy = ref(false)
const loadError = ref('')
const createError = ref('')

const selectedTags = computed(() =>
  model.value.map((id) => tags.value.find((tag) => tag.id === id)).filter((tag): tag is ITag => Boolean(tag)),
)
const available = computed(() => tags.value.filter((tag) => !model.value.includes(tag.id)))

onMounted(async () => {
  try {
    tags.value = await listTags()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Could not load tags.'
  }
})

function add(id: string) {
  model.value = [...model.value, id]
  open.value = false
}

function remove(id: string) {
  model.value = model.value.filter((selected) => selected !== id)
}

function startCreating() {
  open.value = false
  createError.value = ''
  creating.value = true
}

async function create(input: ITagInput) {
  busy.value = true
  createError.value = ''

  try {
    const tag = await createTag(input)

    tags.value = [...tags.value, tag].sort((a, b) => a.name.localeCompare(b.name))
    model.value = [...model.value, tag.id]
    creating.value = false
  } catch (err) {
    createError.value = err instanceof Error ? err.message : 'Could not create the tag.'
  } finally {
    busy.value = false
  }
}
</script>

<style lang="scss" scoped>
.tag-picker {
  @apply flex flex-col gap-3;

  .selected {
    @apply flex flex-wrap items-center gap-2;

    .selected-tag {
      @apply inline-flex items-center gap-1;

      .remove-tag {
        @apply text-slate-400 hover:text-slate-800 text-sm leading-none;
      }
    }

    .add-wrap {
      @apply relative;

      .add-tag {
        @apply font-mono text-xs text-slate-500 border border-slate-300 rounded-full px-3 py-1 hover:border-slate-500;
      }

      .menu {
        @apply absolute left-0 top-full mt-2 z-20 w-56 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg p-2 flex flex-col gap-1;

        .menu-tag {
          @apply flex rounded px-2 py-1 text-left hover:bg-slate-100;
        }

        .menu-empty {
          @apply px-2 py-1 text-xs text-slate-400;
        }

        .new-tag {
          @apply mt-1 border-t border-slate-200 px-2 pt-2 text-left text-xs text-slate-600 hover:text-slate-800;
        }
      }
    }
  }

  .picker-error {
    @apply text-sm text-red-600;
  }

  .create-box {
    @apply border border-slate-200 rounded-md p-4;
  }
}
</style>
