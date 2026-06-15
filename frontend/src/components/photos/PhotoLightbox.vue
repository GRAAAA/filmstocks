<template>
  <Teleport to="body">
    <div class="lb-overlay" @click.self="$emit('close')">
      <button class="lb-close" @click="$emit('close')" aria-label="Close">✕</button>

      <button v-if="total > 1" class="lb-nav lb-prev" :disabled="idx === 0" @click="prev" aria-label="Previous photo">‹</button>
      <button v-if="total > 1" class="lb-nav lb-next" :disabled="idx === total - 1" @click="next" aria-label="Next photo">›</button>

      <div class="lb-inner">
        <!-- Image -->
        <div class="lb-photo-side">
          <div class="lb-frame" :style="frameStyle">
            <img :src="photo.image_large_url || photo.image_url" :alt="photo.title || 'film photo'" decoding="async" />
          </div>
          <p v-if="total > 1" class="lb-counter mono">{{ idx + 1 }} / {{ total }}</p>
        </div>

        <!-- Info panel -->
        <aside class="lb-panel">
          <div class="lb-panel-header">
            <div>
              <span class="lb-user mono">{{ photo.username }}</span>
              <span class="lb-date">{{ formatDate(photo.created_at) }}</span>
            </div>
            <button
              :class="['lb-like', { liked: photo.liked_by_me }]"
              :disabled="!auth.isLoggedIn || liking"
              :title="auth.isLoggedIn ? '' : 'Log in to like'"
              @click="handleLike"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              {{ photo.likes_count }}
            </button>
          </div>

          <div class="lb-caption">
            <p v-if="photo.title" class="lb-title">{{ photo.title }}</p>
            <p v-if="photo.description" class="lb-desc">{{ photo.description }}</p>
          </div>

          <div v-if="hasMeta" class="lb-meta">
            <span v-if="photo.camera_make || photo.camera_model">
              {{ [photo.camera_make, photo.camera_model].filter(Boolean).join(' ') }}
            </span>
            <span v-if="photo.lens_model || photo.focal_length_mm">
              {{ [photo.lens_model, photo.focal_length_mm ? `${photo.focal_length_mm}mm` : null].filter(Boolean).join(' · ') }}
            </span>
            <span v-if="photo.scanner_model">{{ photo.scanner_model }}</span>
            <span v-if="photo.lab_name">{{ photo.lab_name }}</span>
          </div>

          <div class="lb-comments">
            <p class="lb-comments-label">Comments</p>
            <div v-if="commentsLoading" class="mini-spinner" />
            <div v-else-if="comments.length" class="lb-comment-list">
              <div v-for="c in comments" :key="c.id" class="lb-comment">
                <span class="lb-comment-user">{{ c.username }}</span>
                <span class="lb-comment-text">{{ c.content }}</span>
              </div>
            </div>
            <p v-else class="lb-muted">No comments yet.</p>
            <form v-if="auth.isLoggedIn" class="lb-comment-form" @submit.prevent="submitComment">
              <input v-model.trim="commentText" placeholder="Add a comment…" maxlength="1000" />
              <button type="submit" :disabled="!commentText || commenting">Post</button>
            </form>
            <p v-else class="lb-muted lb-login-hint">
              <RouterLink to="/login">Log in</RouterLink> to comment
            </p>
          </div>
        </aside>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const props = defineProps({
  photos: { type: Array, required: true },
  initialIndex: { type: Number, default: 0 },
});
const emit = defineEmits(['close', 'liked']);

const auth = useAuthStore();
const idx  = ref(props.initialIndex);
const total = computed(() => props.photos.length);
const photo = computed(() => props.photos[idx.value] || props.photos[0]);

const liking       = ref(false);
const comments     = ref([]);
const commentsLoading = ref(false);
const commentText  = ref('');
const commenting   = ref(false);

const hasMeta = computed(() =>
  photo.value.camera_make || photo.value.camera_model ||
  photo.value.lens_model  || photo.value.focal_length_mm ||
  photo.value.scanner_model || photo.value.lab_name
);

const frameStyle = computed(() => {
  const p = photo.value;
  const gap = Math.min(Math.max(Number(p.frame_gap_px || 0), 0), 80);
  const bw  = Math.min(Math.max(Number(p.frame_border_width_px || 0), 0), 24);
  const hasFrame = gap > 0 || bw > 0;
  return {
    backgroundColor: p.frame_background_color || (hasFrame ? '#ffffff' : 'transparent'),
    padding: `${gap}px`,
    border: bw > 0 ? `${bw}px solid ${p.frame_border_color || '#111111'}` : 'none',
  };
});

watch(photo, loadComments, { immediate: true });

async function loadComments() {
  comments.value = [];
  commentText.value = '';
  commentsLoading.value = true;
  try {
    const { data } = await api.get(`/photos/${photo.value.id}/comments`);
    comments.value = data;
  } catch {
    comments.value = [];
  } finally {
    commentsLoading.value = false;
  }
}

function prev() { if (idx.value > 0) idx.value--; }
function next() { if (idx.value < total.value - 1) idx.value++; }

function onKey(e) {
  if (e.key === 'Escape')     emit('close');
  if (e.key === 'ArrowLeft')  prev();
  if (e.key === 'ArrowRight') next();
}

onMounted(() => {
  document.body.style.overflow = 'hidden';
  window.addEventListener('keydown', onKey);
});
onUnmounted(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onKey);
});

async function handleLike() {
  if (liking.value) return;
  liking.value = true;
  try {
    const { data } = await api.post(`/photos/${photo.value.id}/like`);
    emit('liked', { id: photo.value.id, liked: data.liked });
  } finally {
    liking.value = false;
  }
}

async function submitComment() {
  if (!commentText.value || commenting.value) return;
  commenting.value = true;
  try {
    const { data } = await api.post(`/photos/${photo.value.id}/comments`, { content: commentText.value });
    comments.value.push(data);
    commentText.value = '';
  } finally {
    commenting.value = false;
  }
}

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>

<style scoped>
.lb-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0, 0, 0, 0.94);
  display: flex; align-items: center; justify-content: center;
}

.lb-close {
  position: absolute; top: 1rem; right: 1.25rem; z-index: 10;
  background: none; border: none; color: rgba(255,255,255,.5);
  font-size: 1.3rem; cursor: pointer; line-height: 1; padding: .5rem;
  transition: color .15s;
}
.lb-close:hover { color: #fff; }

.lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.7); font-size: 2rem; line-height: 1;
  width: 3rem; height: 3rem; border-radius: 50%; cursor: pointer;
  transition: background .15s, color .15s;
  display: flex; align-items: center; justify-content: center;
}
.lb-nav:hover:not(:disabled) { background: rgba(255,255,255,.18); color: #fff; }
.lb-nav:disabled { opacity: .25; cursor: default; }
.lb-prev { left: 1rem; }
.lb-next { right: 1rem; }

.lb-inner {
  display: grid;
  grid-template-columns: 1fr 320px;
  width: min(1200px, 100vw - 8rem);
  height: min(88vh, 900px);
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 10px;
  overflow: hidden;
}

/* Photo side */
.lb-photo-side {
  background: #050505;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 1.5rem;
  min-height: 0;
}
.lb-frame {
  max-width: 100%; max-height: calc(88vh - 5rem);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 24px 60px rgba(0,0,0,.4);
}
.lb-frame img {
  max-width: 100%; max-height: calc(88vh - 7rem);
  object-fit: contain; display: block;
}
.lb-counter {
  margin-top: .75rem; font-size: .72rem;
  color: rgba(255,255,255,.3); text-align: center;
}

/* Panel */
.lb-panel {
  border-left: 1px solid rgba(255,255,255,.07);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.lb-panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem; border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}
.lb-user { font-size: .78rem; color: var(--text); display: block; }
.lb-date { font-size: .7rem; color: var(--text-faint); display: block; margin-top: .1rem; }

.lb-like {
  display: flex; align-items: center; gap: .3rem;
  background: none; border: 1px solid rgba(255,255,255,.1);
  border-radius: 20px; padding: .35rem .65rem;
  font-size: .78rem; color: rgba(255,255,255,.45); cursor: pointer;
  transition: color .15s, border-color .15s;
}
.lb-like:hover:not(:disabled) { color: #e87070; border-color: rgba(232,112,112,.3); }
.lb-like.liked { color: #e87070; border-color: rgba(232,112,112,.35); }
.lb-like:disabled { opacity: .4; cursor: default; }

.lb-caption {
  padding: .85rem 1rem; border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}
.lb-title { font-weight: 600; color: var(--text); margin: 0 0 .3rem; font-size: .9rem; }
.lb-desc  { color: var(--text-muted); font-size: .83rem; margin: 0; line-height: 1.5; }

.lb-meta {
  display: flex; flex-wrap: wrap; gap: .35rem;
  padding: .75rem 1rem; border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}
.lb-meta span {
  border: 1px solid rgba(255,255,255,.1); border-radius: 4px;
  padding: .18rem .45rem; color: var(--text-faint); font-size: .73rem;
}

.lb-comments {
  flex: 1; overflow-y: auto; padding: .85rem 1rem;
  display: flex; flex-direction: column; gap: .5rem;
}
.lb-comments-label { font-weight: 600; font-size: .82rem; color: var(--text); margin: 0; }
.lb-muted { color: var(--text-faint); font-size: .8rem; margin: 0; }
.lb-login-hint a { color: var(--accent); }

.lb-comment-list { display: flex; flex-direction: column; gap: .55rem; }
.lb-comment { font-size: .82rem; line-height: 1.45; }
.lb-comment-user { color: var(--text); font-weight: 600; margin-right: .35rem; }
.lb-comment-text { color: var(--text-muted); }

.lb-comment-form { display: flex; gap: .4rem; margin-top: .25rem; }
.lb-comment-form input {
  flex: 1; min-width: 0;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  border-radius: 5px; color: var(--text); padding: .42rem .55rem;
  font-size: .8rem;
}
.lb-comment-form input:focus { outline: none; border-color: rgba(255,255,255,.2); }
.lb-comment-form button {
  background: none; border: none; color: var(--text); cursor: pointer;
  font-size: .8rem; padding: .3rem .4rem; opacity: .7;
}
.lb-comment-form button:hover { opacity: 1; }
.lb-comment-form button:disabled { opacity: .3; cursor: default; }

.mini-spinner {
  width: 1.2rem; height: 1.2rem;
  border: 2px solid rgba(255,255,255,.1);
  border-top-color: rgba(255,255,255,.35);
  border-radius: 50%;
  animation: spin .7s linear infinite;
  margin: .5rem 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 800px) {
  .lb-inner {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    width: 100vw; height: 100dvh;
    border-radius: 0; border: none;
  }
  .lb-photo-side { padding: 1rem; max-height: 55dvh; }
  .lb-frame img  { max-height: calc(55dvh - 4rem); }
  .lb-panel { border-left: none; border-top: 1px solid rgba(255,255,255,.07); }
  .lb-nav { display: none; }
}
</style>
