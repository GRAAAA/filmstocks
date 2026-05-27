<template>
  <NavBar />
  <main>
    <RouterView />
  </main>
  <Teleport to="body">
    <div v-if="toast.visible" :class="['toast', `toast-${toast.type}`]">
      {{ toast.message }}
    </div>
  </Teleport>
</template>

<script setup>
import { reactive } from 'vue';
import NavBar from './components/layout/NavBar.vue';

const toast = reactive({ visible: false, message: '', type: 'success' });

let toastTimer = null;

function showToast(message, type = 'success') {
  toast.message = message;
  toast.type    = type;
  toast.visible = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.visible = false; }, 3000);
}

// Provide globally so any component can use it
import { provide } from 'vue';
provide('showToast', showToast);
</script>
