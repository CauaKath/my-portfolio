import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import WIP from '../pages/WIP.vue'
import Blog from '../pages/Blog.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/blog',
      name: 'blog',
      component: Blog
    },
    {
      path: '/wip',
      name: 'wip',
      component: WIP
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/wip'
    }
  ],
})

export default router
