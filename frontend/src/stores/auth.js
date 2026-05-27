import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null);
  const user  = ref(JSON.parse(localStorage.getItem('user') || 'null'));

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin    = computed(() => user.value?.role === 'admin');

  function persist(t, u) {
    token.value = t;
    user.value  = u;
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.token, data.user);
  }

  async function register(username, email, password) {
    const { data } = await api.post('/auth/register', { username, email, password });
    persist(data.token, data.user);
  }

  function logout() {
    token.value = null;
    user.value  = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function refreshUser() {
    if (!token.value) return;
    const { data } = await api.get('/auth/me');
    user.value = data;
    localStorage.setItem('user', JSON.stringify(data));
  }

  return { token, user, isLoggedIn, isAdmin, login, register, logout, refreshUser };
});
