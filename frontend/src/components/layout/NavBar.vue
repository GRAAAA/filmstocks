<template>
  <header class="navbar">
    <div class="container nav-inner">
      <RouterLink to="/" class="nav-logo">
        <span class="logo-icon">⬡</span>
        <span class="logo-text">FilmStocks</span>
      </RouterLink>

      <nav class="nav-links">
        <RouterLink to="/" class="nav-link">Stocks</RouterLink>
        <RouterLink to="/labs" class="nav-link">Labs</RouterLink>
        <template v-if="auth.isLoggedIn">
          <RouterLink to="/me" class="nav-link">My Page</RouterLink>
          <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-link">Admin</RouterLink>
          <span class="nav-user mono">{{ auth.user.username }}</span>
          <button class="btn btn-ghost btn-sm" @click="handleLogout">Log out</button>
        </template>
        <template v-else>
          <RouterLink to="/login"    class="nav-link">Log in</RouterLink>
          <RouterLink to="/register" class="btn btn-primary btn-sm">Sign up</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth.js';
import { useRouter } from 'vue-router';

const auth   = useAuthStore();
const router = useRouter();

function handleLogout() {
  auth.logout();
  router.push('/');
}
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(12, 12, 12, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}
.logo-icon { color: var(--text); font-size: 1.2rem; }
.logo-text { color: var(--text); }
.nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.nav-link { color: var(--text-muted); font-size: 0.9rem; transition: color 0.15s; }
.nav-link:hover, .nav-link.router-link-active { color: var(--text); }
.nav-user { font-size: 0.82rem; color: var(--text-muted); }
</style>
