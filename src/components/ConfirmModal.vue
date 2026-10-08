<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="open" class="confirm-backdrop" @mousedown.self="dismiss">
        <div
          ref="dialog"
          class="confirm-dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="bodyId"
          @keydown.tab="trapFocus"
        >
          <h2 :id="titleId" class="confirm-title">{{ title }}</h2>

          <div :id="bodyId" class="confirm-body">
            <slot>{{ message }}</slot>
          </div>

          <p v-if="error" class="confirm-error" role="alert">{{ error }}</p>

          <div class="confirm-actions">
            <AppButton ref="cancelButton" class="confirm-cancel" variant="outlined" :disabled="busy" @click="dismiss">
              {{ cancelLabel }}
            </AppButton>

            <AppButton class="confirm-ok" variant="filled" :danger="danger" :disabled="busy" @click="emit('confirm')">
              {{ confirmLabel }}
            </AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
// Module scope, so every instance gets its own ids for aria-labelledby.
let nextId = 0
</script>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

import AppButton from '@/components/AppButton.vue'

// A confirmation dialog for destructive actions. The parent owns the state:
//   v-model:open   whether it is showing
//   @confirm       the user chose the action; the parent runs it, then closes
//   @cancel        Cancel, Esc or a click on the backdrop
// While `busy` the dialog cannot be dismissed, so a request in flight is not
// abandoned by accident. `error` shows a failure without closing the dialog.
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    busy?: boolean
    error?: string
  }>(),
  { message: '', confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true, busy: false, error: '' },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const uid = nextId++
const titleId = `confirm-title-${uid}`
const bodyId = `confirm-body-${uid}`

const dialog = ref<HTMLElement | null>(null)
const cancelButton = ref<InstanceType<typeof AppButton> | null>(null)

let previouslyFocused: HTMLElement | null = null
let previousOverflow = ''

function dismiss() {
  if (props.busy) return

  open.value = false
  emit('cancel')
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') dismiss()
}

// Keeps Tab inside the dialog while it is open.
function trapFocus(event: KeyboardEvent) {
  const focusable = dialog.value?.querySelectorAll<HTMLElement>('button:not([disabled])')

  if (!focusable?.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function lock() {
  previouslyFocused = document.activeElement as HTMLElement | null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onWindowKeydown)

  // Cancel, not the destructive button, takes focus: Enter must not delete.
  nextTick(() => (cancelButton.value?.$el as HTMLElement | undefined)?.focus())
}

function unlock() {
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', onWindowKeydown)
  previouslyFocused?.focus?.()
  previouslyFocused = null
}

watch(open, (isOpen, wasOpen) => {
  if (isOpen) lock()
  else if (wasOpen) unlock()
}, { immediate: true })

onBeforeUnmount(() => {
  if (open.value) unlock()
})
</script>

<style lang="scss" scoped>
.confirm-backdrop {
  @apply fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-default/50;

  .confirm-dialog {
    @apply w-full max-w-[420px] bg-white rounded-lg shadow-lg p-6 flex flex-col gap-4;

    .confirm-title {
      @apply text-lg font-bold text-slate-800;
    }

    .confirm-body {
      @apply text-sm leading-relaxed text-slate-600;

      :deep(strong) {
        @apply text-slate-800 font-semibold;
      }
    }

    .confirm-error {
      @apply text-sm text-red-600;
    }

    .confirm-actions {
      @apply flex justify-end gap-2 pt-2;
    }
  }
}

.confirm-enter-active, .confirm-leave-active {
  transition: opacity 0.15s ease;

  .confirm-dialog {
    transition: transform 0.15s ease;
  }
}

.confirm-enter-from, .confirm-leave-to {
  opacity: 0;

  .confirm-dialog {
    transform: scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  .confirm-enter-active, .confirm-leave-active, .confirm-enter-active .confirm-dialog, .confirm-leave-active .confirm-dialog {
    transition: none;
  }
}
</style>
