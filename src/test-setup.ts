import { config } from '@vue/test-utils'

import { i18n, setLocale } from '@/i18n'

// Every component reads its text through vue-i18n, so every mounted test needs
// the plugin. Tests assert on the English copy.
setLocale('en')
config.global.plugins = [i18n]
