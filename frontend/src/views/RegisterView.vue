<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">⬡ FilmStocks</div>
      <h2>Join the community</h2>
      <p class="auth-sub">Share your film photos and discuss analog photography.</p>

      <GoogleSignInButton @success="handleGoogle" @error="error = $event" />
      <div class="auth-divider"><span>or</span></div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Username</label>
          <input v-model="form.username" type="text" placeholder="yourname" autocomplete="username"
                 minlength="3" maxlength="50" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" placeholder="Min. 8 chars, 1 uppercase, 1 number"
                 autocomplete="new-password" required />
        </div>
        <div class="form-group">
          <label>Confirm password</label>
          <input v-model="form.confirm" type="password" placeholder="••••••••" autocomplete="new-password" required />
          <p v-if="form.confirm && form.password !== form.confirm" class="form-error">Passwords do not match</p>
        </div>

        <div class="password-rules">
          <span :class="{ met: form.password.length >= 8 }">✓ 8+ characters</span>
          <span :class="{ met: /[A-Z]/.test(form.password) }">✓ Uppercase letter</span>
          <span :class="{ met: /[0-9]/.test(form.password) }">✓ Number</span>
        </div>

        <p v-if="error" class="form-error" style="margin-bottom:.75rem">{{ error }}</p>

        <button type="submit" class="btn btn-primary" style="width:100%"
                :disabled="loading || form.password !== form.confirm">
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="auth-footer">
        Already have an account?
        <RouterLink to="/login" class="accent-link">Log in</RouterLink>
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
const form    = reactive({ username: '', email: '', password: '', confirm: '' });

async function handleRegister() {
  if (form.password !== form.confirm) return;
  loading.value = true; error.value = '';
  try {
    await auth.register(form.username, form.email, form.password);
    router.push('/');
  } catch (err) {
    const errs = err.response?.data?.errors;
    error.value = errs ? errs[0].msg : (err.response?.data?.message || 'Registration failed');
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
.auth-footer { text-align: center; font-size: .85rem; color: var(--text-muted); margin-top: 1.25rem; }
.accent-link { color: var(--accent); }
.auth-divider {
  display:flex; align-items:center; gap:.75rem;
  color:var(--text-faint); font-size:.78rem;
  margin:1.15rem 0;
}
.auth-divider::before, .auth-divider::after {
  content:""; height:1px; background:var(--border); flex:1;
}

.password-rules {
  display: flex; gap: .75rem; flex-wrap: wrap;
  margin-bottom: 1rem;
}
.password-rules span {
  font-size: .75rem; color: var(--text-faint); font-family: 'Space Mono', monospace;
  transition: color .15s;
}
.password-rules span.met { color: #81c784; }
</style>
