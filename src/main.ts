import './assets/global.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())

// Resolve the session before the first route renders, so the navbar and the
// admin guard do not flicker between logged-out and logged-in.
useAuthStore()
  .init()
  .finally(() => {
    app.use(i18n)
    app.use(router)
    app.mount('#app')
  })
