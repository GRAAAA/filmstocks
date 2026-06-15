<template>
  <div class="auth-page">
    <div class="auth-card verify-card">
      <div class="auth-logo">⬡ FilmStocks</div>

      <div v-if="state === 'loading'" class="spinner" />

      <template v-else-if="state === 'success'">
        <div class="state-icon success-icon">✓</div>
        <h2>Email verified</h2>
        <p class="auth-sub">Your account is now fully active. Welcome to FilmStocks.</p>
        <RouterLink to="/" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:1rem;">
          Start exploring
        </RouterLink>
      </template>

      <template v-else-if="state === 'already'">
        <div class="state-icon">✓</div>
        <h2>Already verified</h2>
        <p class="auth-sub">This email address has already been confirmed.</p>
        <RouterLink to="/" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:1rem;">
          Go to FilmStocks
        </RouterLink>
      </template>

      <template v-else-if="state === 'expired'">
        <div class="state-icon error-icon">⏱</div>
        <h2>Link expired</h2>
        <p class="auth-sub">This verification link has expired. Request a new one from your profile.</p>
        <RouterLink to="/" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:1rem;">
          Go to FilmStocks
        </RouterLink>
      </template>

      <template v-else>
        <div class="state-icon error-icon">✕</div>
        <h2>Invalid link</h2>
        <p class="auth-sub">{{ errorMsg || 'This verification link is not valid or has already been used.' }}</p>
        <RouterLink to="/" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:1rem;">
          Go to FilmStocks
        </RouterLink>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

const route    = useRoute();
const auth     = useAuthStore();
const state    = ref('loading');
const errorMsg = ref('');

onMounted(async () => {
  const token = route.query.token;
  if (!token) { state.value = 'error'; return; }

  try {
    const { data } = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    if (data.alreadyVerified) {
      state.value = 'already';
    } else {
      state.value = 'success';
      // Update the stored user so the banner disappears immediately
      if (auth.user) {
        auth.user.email_verified = true;
        localStorage.setItem('user', JSON.stringify(auth.user));
      }
    }
  } catch (err) {
    const data = err.response?.data || {};
    if (data.expired) {
      state.value = 'expired';
    } else {
      state.value = 'error';
      errorMsg.value = data.message || '';
    }
  }
});
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 60px);
  display: flex; align-items: center; justify-content: center;
  padding: 2rem;
}
.auth-card {
  width: 100%; max-width: 400px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 2.25rem;
}
.verify-card { text-align: center; }
.auth-logo { font-size: 1.1rem; font-weight: 700; color: var(--accent); margin-bottom: 1.5rem; }
.auth-card h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: .35rem; }
.auth-sub { color: var(--text-muted); font-size: .88rem; margin-bottom: 1rem; }
.state-icon { font-size: 2.5rem; margin-bottom: 1rem; color: var(--text-muted); }
.success-icon { color: #81c784; }
.error-icon { color: var(--danger); }
.spinner {
  width: 2rem; height: 2rem;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin: 2rem auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
