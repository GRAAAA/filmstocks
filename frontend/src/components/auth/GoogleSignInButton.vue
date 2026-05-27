<template>
  <div class="google-auth">
    <div ref="buttonEl" class="google-button" />
    <button
      v-if="!clientId"
      class="btn btn-ghost google-fallback"
      type="button"
      disabled
    >
      Google sign-in is not configured
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const emit = defineEmits(['success', 'error']);
const buttonEl = ref(null);
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

onMounted(() => {
  if (!clientId) return;
  loadGoogleScript()
    .then(() => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: response => emit('success', response.credential),
      });
      window.google.accounts.id.renderButton(buttonEl.value, {
        theme: 'outline',
        size: 'large',
        width: buttonEl.value?.offsetWidth || 320,
        text: 'continue_with',
        shape: 'rectangular',
      });
    })
    .catch(() => emit('error', 'Google sign-in failed to load'));
});

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
</script>

<style scoped>
.google-auth { width: 100%; }
.google-button { min-height: 44px; }
.google-fallback {
  width: 100%;
  justify-content: center;
}
</style>
