<template>
  <form class="tag-form" @submit.prevent="submit">
    <input class="tag-name" v-model="name" type="text" :placeholder="t('tagForm.name')" maxlength="40" autocapitalize="none" spellcheck="false" />
    <input class="tag-description" v-model="description" type="text" :placeholder="t('tagForm.description')" />

    <div class="swatches" role="radiogroup" :aria-label="t('tagForm.color')">
      <button
        v-for="swatch of TAG_COLORS"
        :key="swatch.hex"
        class="swatch"
        :class="{ selected: swatch.hex.toLowerCase() === color.toLowerCase() }"
        type="button"
        role="radio"
        :aria-checked="swatch.hex.toLowerCase() === color.toLowerCase()"
        :aria-label="t(`tagColors.${swatch.key}`)"
        :title="t(`tagColors.${swatch.key}`)"
        :style="{ backgroundColor: swatch.hex }"
        @click="color = swatch.hex"
      ></button>
    </div>

    <p v-if="shownError" class="tag-form-error">{{ shownError }}</p>

    <div class="form-footer">
      <TagChip :tag="{ name: name || t('tagForm.preview'), color, description: null }" />

      <div class="buttons">
        <AppButton class="tag-cancel" variant="outlined" :icon="xIcon" :label="t('common.cancel')" :disabled="busy" @click="emit('cancel')" />
        <AppButton class="tag-submit" variant="filled" type="submit" :icon="checkIcon" :label="submitLabel || t('common.save')" :disabled="busy" />
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/components/AppButton.vue'
import TagChip from '@/components/TagChip.vue'
import { DEFAULT_TAG_COLOR, TAG_COLORS, finalTagName, normalizeTagName } from '@/lib/tag'
import checkIcon from '@/assets/icons/check.svg'
import xIcon from '@/assets/icons/x.svg'
import type { ITagInput } from '@/interfaces/tag'

const props = withDefaults(
  defineProps<{ initial?: ITagInput; submitLabel?: string; busy?: boolean; serverError?: string }>(),
  { submitLabel: '', busy: false, serverError: '' },
)

const emit = defineEmits<{ submit: [value: ITagInput]; cancel: [] }>()

const { t } = useI18n()

const name = ref(props.initial?.name ?? '')
const description = ref(props.initial?.description ?? '')
// An existing tag may carry a color from before the palette existed; it stays
// selected-less but valid until the user picks one.
const color = ref(props.initial?.color ?? DEFAULT_TAG_COLOR)
const error = ref('')

const shownError = computed(() => error.value || props.serverError)

// Names are lowercase and space-free at all times, so what is typed is what is saved.
watch(name, (value) => {
  const normalized = normalizeTagName(value)

  if (normalized !== value) name.value = normalized
})

function submit() {
  const finalName = finalTagName(name.value)

  if (!finalName) {
    error.value = t('tagForm.nameRequired')
    return
  }

  error.value = ''
  emit('submit', {
    name: finalName,
    description: description.value.trim() || null,
    color: color.value,
  })
}
</script>

<style lang="scss" scoped>
.tag-form {
  @apply w-full flex flex-col gap-3;

  input[type='text'] {
    @apply w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500;
  }

  .tag-name {
    @apply font-mono;
  }

  .swatches {
    // Two rows of seven (244px wide, so it fits any screen).
    @apply grid grid-cols-7 gap-2 w-fit;

    .swatch {
      @apply w-7 h-7 rounded-full border border-black/10 transition-transform hover:scale-110;

      &.selected {
        @apply ring-2 ring-offset-2 ring-slate-800;
      }
    }
  }

  .tag-form-error {
    @apply text-sm text-red-600;
  }

  .form-footer {
    @apply flex items-center justify-between gap-3;

    .buttons {
      @apply flex gap-2;
    }
  }
}
</style>
