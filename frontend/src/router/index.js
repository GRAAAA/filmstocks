import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  { path: '/',                        component: () => import('../views/HomeView.vue') },
  { path: '/stock/:id',               component: () => import('../views/FilmStockView.vue') },
  { path: '/stock/:id/forum',         component: () => import('../views/ForumView.vue') },
  { path: '/stock/:stockId/forum/:postId', component: () => import('../views/ForumPostView.vue') },
  { path: '/me',                       component: () => import('../views/MyPageView.vue'), meta: { requiresAuth: true } },
  { path: '/login',                   component: () => import('../views/LoginView.vue'),    meta: { guestOnly: true } },
  { path: '/register',                component: () => import('../views/RegisterView.vue'), meta: { guestOnly: true } },
  { path: '/admin',                   component: () => import('../views/admin/AdminView.vue'), meta: { requiresAdmin: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn)  return '/login';
  if (to.meta.requiresAdmin && !auth.isAdmin)    return '/';
  if (to.meta.guestOnly    && auth.isLoggedIn)   return '/';
});

export default router;
