import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'

// Rooms and apps open as dialogs over Home (see stores/kiosk.ts), so Home is the
// only route for now.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
})

export default router
