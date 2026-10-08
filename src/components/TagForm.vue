<template>
  <form class="tag-form" @submit.prevent="submit">
    <input class="tag-name" v-model="name" type="text" placeholder="Tag name" maxlength="40" />
    <input class="tag-description" v-model="description" type="text" placeholder="Description (shown on hover)" />

    <div class="color-row">
      <input class="tag-color-picker" v-model="color" type="color" aria-label="Pick a color" />
      <input class="tag-color-hex" v-model="hexText" type="text" placeholder="#0369A1" maxlength="7" aria-label="Hex color" @input="onHexInput" />

      <TagChip :tag="{ name: name.trim() || 'Preview', color, description: null }" />
    </div>

    <p v-if="shownError" class="tag-form-error">{{ shownError }}</p>

    <div class="buttons">
      <button class="tag-submit" type="submit" :disabled="busy">{{ submitLabel }}</button>
      <button class="tag-cancel" type="button" :disabled="busy" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import TagChip from '@/components/TagChip.vue'
import { isHexColor } from '@/lib/tagColor'
import type { ITagInput } from '@/interfaces/tag'

const DEFAULT_COLOR = '#0369A1'

const props = withDefaults(
  defineProps<{ initial?: ITagInput; submitLabel?: string; busy?: boolean; serverError?: string }>(),
  { submitLabel: 'Save', busy: false, serverError: '' },
)

const emit = defineEmits<{ submit: [value: ITagInput]; cancel: [] }>()

const name = ref(props.initial?.name ?? '')
const description = ref(props.initial?.description ?? '')
const color = ref(props.initial?.color ?? DEFAULT_COLOR)
const hexText = ref(color.value)
const error = ref('')

const shownError = computed(() => error.value || props.serverError)

const withHash = (value: string) => (value.startsWith('#') ? value : `#${value}`)

// <input type="color"> only ever holds a valid value, so the picker is copied
// into the text field as is. The text field is copied back once it is a
// complete hex color, with or without the leading #.
watch(color, (value) => {
  hexText.value = value
})

function onHexInput() {
  const typed = withHash(hexText.value.trim())

  if (isHexColor(typed)) color.value = typed
}

function submit() {
  const typedColor = withHash(hexText.value.trim())

  if (!name.value.trim()) {
    error.value = 'A tag needs a name.'
    return
  }

  if (!isHexColor(typedColor)) {
    error.value = 'Color must be a hex value like #0369A1.'
    return
  }

  error.value = ''
  emit('submit', {
    name: name.value.trim(),
    description: description.value.trim() || null,
    color: typedColor,
  })
}
</script>

<style lang="scss" scoped>
.tag-form {
  @apply flex flex-col gap-3;

  input[type='text'] {
    @apply w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500;
  }

  .color-row {
    @apply flex items-center gap-3;

    .tag-color-picker {
      @apply w-9 h-9 p-0 border border-slate-300 rounded cursor-pointer bg-transparent;
    }

    .tag-color-hex {
      @apply w-28 font-mono;
    }
  }

  .tag-form-error {
    @apply text-sm text-red-600;
  }

  .buttons {
    @apply flex gap-2;

    button {
      @apply text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60;
    }

    .tag-submit {
      @apply border-slate-800 bg-slate-800 text-white hover:bg-slate-700;
    }

    .tag-cancel {
      @apply border-slate-300 text-slate-600 hover:border-slate-800;
    }
  }
}
</style>
