<template>
  <div>
  <div v-if="auth.isLoggedIn && !auth.isEmailVerified" class="verify-banner">
    <span>Please verify your email to unlock all features.</span>
    <button class="banner-resend" :disabled="resending || resendCooldown > 0" @click="resendVerification">
      {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resending ? 'Sending…' : 'Resend email' }}
    </button>
  </div>
  <header class="navbar">
    <div class="container nav-inner">
      <RouterLink to="/" class="nav-logo">
        <span class="logo-icon">⬡</span>
        <span class="logo-text">FilmStocks</span>
      </RouterLink>

      <nav class="nav-links">
        <RouterLink to="/" class="nav-link nav-link-stocks">Stocks</RouterLink>
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
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import { useRouter } from 'vue-router';
import api from '../../services/api.js';

const auth   = useAuthStore();
const router = useRouter();

const resending     = ref(false);
const resendCooldown = ref(0);
let cooldownTimer   = null;

function handleLogout() {
  auth.logout();
  router.push('/');
}

async function resendVerification() {
  resending.value = true;
  try {
    await api.post('/auth/resend-verification');
    resendCooldown.value = 60;
    cooldownTimer = setInterval(() => {
      resendCooldown.value--;
      if (resendCooldown.value <= 0) clearInterval(cooldownTimer);
    }, 1000);
  } catch {
    // silently fail — user still sees the banner
  } finally {
    resending.value = false;
  }
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
.nav-link { color: var(--text-muted); font-size: 0.9rem; transition: color 0.15s; white-space: nowrap; }
.nav-link:hover, .nav-link.router-link-active { color: var(--text); }
.nav-user { font-size: 0.82rem; color: var(--text-muted); white-space: nowrap; }

@media (max-width: 540px) {
  .nav-links { gap: 0.6rem; }
  .nav-link-stocks { display: none; }
  .nav-user { display: none; }
}

.verify-banner {
  background: #1a1400;
  border-bottom: 1px solid #5a4200;
  padding: .45rem 1rem;
  display: flex; align-items: center; justify-content: center;
  gap: 1rem;
  font-size: .8rem; color: #c8a84b;
}
.banner-resend {
  background: none; border: 1px solid #5a4200;
  border-radius: 4px; padding: .2rem .6rem;
  font-size: .76rem; color: #c8a84b; cursor: pointer;
  transition: border-color .15s, color .15s;
}
.banner-resend:hover:not(:disabled) { border-color: #c8a84b; color: #e6c97a; }
.banner-resend:disabled { opacity: .4; cursor: default; }
</style>
