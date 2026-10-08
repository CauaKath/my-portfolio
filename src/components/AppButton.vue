<template>
  <component
    :is="to ? RouterLink : 'button'"
    v-bind="to ? { to } : { type, disabled }"
    class="app-button"
    :class="[variant, size, { danger, 'icon-only': iconOnly }]"
    :title="iconOnly ? label : undefined"
    :aria-label="iconOnly ? label : undefined"
    :style="style"
  >
    <span v-if="icon" class="app-button-icon" aria-hidden="true"></span>
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { RouterLink } from 'vue-router'

// One look for every button in the project, modelled on shadcn/ui's Button.
//
//   variant   soft (default): the button color as text on a faint tint of the
//             same color, like shadcn's "secondary"
//             filled: solid background in the button color, white text
//             outlined: border and text in the button color, no fill
//             text: only the text/icon, no background or border
//             float: white, borderless, with a shadow so it looks raised above
//             the content
//   size      sm (32px) | md (36px, default) | lg (40px)
//   color     any CSS color; defaults to the `action` navy-blue from tailwind.config.js. `danger` is shorthand for red.
//             On a dark surface set --btn-color on a parent instead.
//   icon      URL of a single-colour SVG; drawn as a mask in the text color so
//             it follows the variant, the color and the hover state
//   label     required for an icon-only button: becomes its title/aria-label
//   to        renders a RouterLink instead of a <button>
const props = withDefaults(
  defineProps<{
    variant?: 'soft' | 'filled' | 'outlined' | 'text' | 'float'
    size?: 'sm' | 'md' | 'lg'
    color?: string
    icon?: string
    label?: string
    to?: string
    danger?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { variant: 'soft', size: 'md', danger: false, disabled: false, type: 'button' },
)

const slots = useSlots()

const iconOnly = computed(() => Boolean(props.icon) && !slots.default)

if (import.meta.env.DEV && iconOnly.value && !props.label) {
  console.warn('AppButton: an icon-only button needs a `label` for assistive technology.')
}

const style = computed(() => {
  const styles: Record<string, string> = {}

  if (props.color) styles['--btn-color'] = props.color
  if (props.icon) {
    styles['--btn-icon'] = `url("${props.icon}")`
  }

  return styles
})
</script>

<style lang="scss" scoped>
.app-button {
  @apply inline-flex items-center justify-center gap-2 rounded-full border font-mono font-bold uppercase tracking-wide
    whitespace-nowrap cursor-pointer select-none transition-colors
    disabled:opacity-60 disabled:cursor-not-allowed;

  // Everything below is driven by --btn-color, so a parent can recolor a
  // button for a dark surface without fighting specificity.
  color: var(--btn-color, theme('colors.action'));
  border-color: transparent;

  // Sizes. Icon-only buttons are square: width follows height.
  &.sm {
    @apply h-8 px-3 text-xs;

    &.icon-only {
      @apply w-8 px-0;
    }

    .app-button-icon {
      @apply w-3.5 h-3.5;
    }
  }

  &.md {
    @apply h-9 px-4 text-xs;

    &.icon-only {
      @apply w-9 px-0;
    }
  }

  &.lg {
    @apply h-10 px-4 text-sm;

    &.icon-only {
      @apply w-10 px-0;
    }
  }

  .app-button-icon {
    @apply w-4 h-4 shrink-0 bg-current;
    mask-image: var(--btn-icon);
    -webkit-mask-image: var(--btn-icon);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
  }

  &.soft {
    background-color: color-mix(in srgb, var(--btn-color, theme('colors.action')) 22%, transparent);

    &:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--btn-color, theme('colors.action')) 32%, transparent);
    }
  }

  &.filled {
    background-color: var(--btn-color, theme('colors.action'));
    color: #ffffff;

    // A dark button cannot get visibly darker, but it can be shaded lighter.
    &:hover:not(:disabled) {
      background-image: linear-gradient(rgb(255 255 255 / 0.16), rgb(255 255 255 / 0.16));
    }
  }

  &.outlined {
    border-color: currentColor;

    &:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--btn-color, theme('colors.action')) 10%, transparent);
    }
  }

  &.text {
    &:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--btn-color, theme('colors.action')) 10%, transparent);
    }
  }

  &.float {
    background-color: #ffffff;
    box-shadow: 0 4px 12px rgb(15 23 42 / 0.18), 0 1px 3px rgb(15 23 42 / 0.12);

    &:hover:not(:disabled) {
      background-image: linear-gradient(rgb(15 23 42 / 0.07), rgb(15 23 42 / 0.07));
      box-shadow: 0 6px 16px rgb(15 23 42 / 0.22), 0 1px 3px rgb(15 23 42 / 0.12);
    }
  }

  &.danger {
    --btn-color: #dc2626;
  }
}
</style>
