<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">⬡ FilmStocks</div>
      <h2>Welcome back</h2>
      <p class="auth-sub">Log in to upload photos and join the community.</p>

      <GoogleSignInButton @success="handleGoogle" @error="error = $event" />
      <div class="auth-divider"><span>or</span></div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" placeholder="••••••••" autocomplete="current-password" required />
        </div>

        <p v-if="error" class="form-error" style="margin-bottom:.75rem">{{ error }}</p>

        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? 'Logging in…' : 'Log in' }}
        </button>
      </form>

      <p class="auth-footer">
        No account?
        <RouterLink to="/register" class="accent-link">Sign up</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import GoogleSignInButton from '../components/auth/GoogleSignInButton.vue';

const auth   = useAuthStore();
const router = useRouter();
const loading = ref(false);
const error   = ref('');
const form    = reactive({ email: '', password: '' });

async function handleLogin() {
  loading.value = true; error.value = '';
  try {
    await auth.login(form.email, form.password);
    router.push('/');
  } catch (err) {
    error.value = err.response?.data?.message || 'Login failed';
  } finally {
    loading.value = false;
  }
}

async function handleGoogle(credential) {
  loading.value = true; error.value = '';
  try {
    await auth.loginWithGoogle(credential);
    router.push('/');
  } catch (err) {
    error.value = err.response?.data?.message || 'Google sign-in failed';
  } finally {
    loading.value = false;
  }
}
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
.auth-logo { font-size: 1.1rem; font-weight: 700; color: var(--accent); margin-bottom: 1.5rem; }
.auth-card h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: .35rem; }
.auth-sub  { color: var(--text-muted); font-size: .88rem; margin-bottom: 1.75rem; }
.auth-divider {
  display:flex; align-items:center; gap:.75rem;
  color:var(--text-faint); font-size:.78rem;
  margin:1.15rem 0;
}
.auth-divider::before, .auth-divider::after {
  content:""; height:1px; background:var(--border); flex:1;
}
.auth-footer { text-align: center; font-size: .85rem; color: var(--text-muted); margin-top: 1.25rem; }
.accent-link { color: var(--accent); }
</style>
