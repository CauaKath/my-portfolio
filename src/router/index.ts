import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import WIP from '../pages/WIP.vue'
import Resume from '../pages/Resume.vue'
import Blog from '../pages/Blog.vue'
import PostDetail from '../pages/PostDetail.vue'
import PostEditor from '../pages/PostEditor.vue'
import Login from '../pages/Login.vue'
import Tags from '../pages/Tags.vue'

import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/resume', name: 'resume', component: Resume },
    { path: '/blog', name: 'blog', component: Blog },
    // Must precede /blog/:slug, otherwise "new" matches as a slug.
    { path: '/blog/new', name: 'post-new', component: PostEditor, meta: { requiresAdmin: true } },
    { path: '/blog/:slug', name: 'post-detail', component: PostDetail, props: true },
    { path: '/blog/:slug/edit', name: 'post-edit', component: PostEditor, props: true, meta: { requiresAdmin: true } },
    { path: '/tags', name: 'tags', component: Tags, meta: { requiresAdmin: true } },
    { path: '/login', name: 'login', component: Login },
    { path: '/wip', name: 'wip', component: WIP },
    { path: '/:pathMatch(.*)*', redirect: '/wip' },
  ],
})

// UX only. This guard keeps a non-admin from staring at an editor whose every
// save would be rejected; it is not an access control. RLS is.
router.beforeEach(async (to) => {
  if (!to.meta.requiresAdmin) return true

  const auth = useAuthStore()
  if (!auth.ready) await auth.init()

  return auth.isAdmin ? true : { name: 'login' }
})

export default router
