<template>
  <div class="photo-card">
    <div class="photo-img-wrap" @click="lightboxOpen = true">
      <img
        :src="photo.image_thumb_url || photo.image_medium_url || photo.image_url"
        :srcset="srcset"
        sizes="(max-width: 680px) 100vw, 320px"
        :alt="photo.title || 'film photo'"
        loading="lazy"
        decoding="async"
      />
    </div>
    <div class="photo-footer">
      <div class="photo-meta">
        <span class="photo-user mono">{{ photo.username }}</span>
        <span class="photo-date">{{ formatDate(photo.created_at) }}</span>
      </div>
      <div class="photo-actions">
        <button
          :class="['like-btn', { liked: photo.liked_by_me }]"
          @click="handleLike"
          :disabled="!auth.isLoggedIn || liking"
          :title="auth.isLoggedIn ? (photo.liked_by_me ? 'Unlike' : 'Like') : 'Log in to like'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          {{ photo.likes_count }}
        </button>
        <button
          v-if="canDelete"
          class="delete-btn"
          @click="handleDelete"
          title="Delete photo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>
    <p v-if="photo.title" class="photo-title">{{ photo.title }}</p>

    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="lightboxOpen" class="lightbox" @click.self="lightboxOpen = false">
        <button class="lightbox-close" @click="lightboxOpen = false">✕</button>
        <img :src="photo.image_large_url || photo.image_url" :alt="photo.title" decoding="async" />
        <p v-if="photo.title" class="lightbox-caption">{{ photo.title }}</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const props  = defineProps({ photo: Object });
const emit   = defineEmits(['deleted', 'liked']);
const auth   = useAuthStore();
const toast  = inject('showToast');
const liking = ref(false);
const lightboxOpen = ref(false);

const canDelete = computed(() =>
  auth.isLoggedIn && (auth.isAdmin || auth.user?.id === props.photo.user_id)
);
const srcset = computed(() => [
  props.photo.image_thumb_url && `${props.photo.image_thumb_url} 420w`,
  props.photo.image_medium_url && `${props.photo.image_medium_url} 1200w`,
].filter(Boolean).join(', '));

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function handleLike() {
  if (liking.value) return;
  liking.value = true;
  try {
    const { data } = await api.post(`/photos/${props.photo.id}/like`);
    emit('liked', { id: props.photo.id, liked: data.liked });
  } catch {
    toast('Failed to update like', 'error');
  } finally {
    liking.value = false;
  }
}

async function handleDelete() {
  if (!confirm('Delete this photo?')) return;
  try {
    await api.delete(`/photos/${props.photo.id}`);
    emit('deleted', props.photo.id);
    toast('Photo deleted');
  } catch {
    toast('Failed to delete photo', 'error');
  }
}
</script>

<style scoped>
.photo-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.photo-img-wrap { aspect-ratio: 3/2; overflow: hidden; cursor: zoom-in; }
.photo-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; display: block; }
.photo-card:hover .photo-img-wrap img { transform: scale(1.03); }
.photo-footer { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; }
.photo-meta   { display: flex; flex-direction: column; gap: 0.1rem; }
.photo-user   { font-size: 0.78rem; color: var(--text-muted); }
.photo-date   { font-size: 0.72rem; color: var(--text-faint); }
.photo-actions{ display: flex; gap: 0.5rem; align-items: center; }
.photo-title  { font-size: 0.82rem; color: var(--text-muted); padding: 0 0.85rem 0.7rem; }

.like-btn {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.8rem; color: var(--text-muted);
  background: none; border: none; cursor: pointer;
  padding: 0.3rem 0.5rem; border-radius: 5px;
  transition: color 0.15s, background 0.15s;
}
.like-btn:hover:not(:disabled) { color: #e87070; background: rgba(232,112,112,.08); }
.like-btn.liked { color: #e87070; }
.like-btn:disabled { cursor: default; opacity: 0.5; }

.delete-btn {
  display: flex; align-items: center;
  background: none; border: none; cursor: pointer;
  color: var(--text-faint); padding: 0.3rem 0.4rem; border-radius: 5px;
  transition: color 0.15s, background 0.15s;
}
.delete-btn:hover { color: var(--danger); background: rgba(192,57,43,.08); }

/* Lightbox */
.lightbox {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,.92);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2rem;
}
.lightbox img { max-width: 90vw; max-height: 82vh; object-fit: contain; border-radius: 6px; }
.lightbox-caption { margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem; }
.lightbox-close {
  position: absolute; top: 1.2rem; right: 1.5rem;
  background: none; border: none; color: var(--text-muted);
  font-size: 1.4rem; cursor: pointer; line-height: 1;
}
.lightbox-close:hover { color: var(--text); }
</style>
