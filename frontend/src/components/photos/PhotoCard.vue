<template>
  <div class="photo-card">
    <div class="photo-img-wrap" :class="{ framed: hasFrame }" @click="emit('open-lightbox', photo)">
      <div class="photo-frame" :style="photoFrameStyle">
        <img
          :src="photo.image_medium_url || photo.image_large_url || photo.image_url"
          :srcset="srcset"
          sizes="(max-width: 760px) 100vw, 760px"
          :alt="photo.title || 'film photo'"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>

    <aside class="photo-side">
      <div class="photo-header">
        <div>
          <span class="photo-user mono">{{ photo.username }}</span>
          <span class="photo-date">{{ formatDate(photo.created_at) }}</span>
        </div>
      </div>

      <div class="photo-caption">
        <p v-if="photo.title"><strong>{{ photo.title }}</strong></p>
        <p v-if="photo.description">{{ photo.description }}</p>
        <p v-if="!photo.title && !photo.description" class="caption-muted">No caption yet.</p>
        <p v-if="photo.camera_make || photo.camera_model || photo.lens_model || photo.focal_length_mm || photo.scanner_model || photo.lab_name" class="scan-meta">
          <span v-if="photo.camera_make || photo.camera_model">{{ [photo.camera_make, photo.camera_model].filter(Boolean).join(' ') }}</span>
          <span v-if="photo.lens_model || photo.focal_length_mm">{{ [photo.lens_model, photo.focal_length_mm ? `${photo.focal_length_mm}mm` : null].filter(Boolean).join(' · ') }}</span>
          <span v-if="photo.scanner_model">{{ photo.scanner_model }}</span>
          <span v-if="photo.lab_name">{{ photo.lab_name }}</span>
        </p>
      </div>

      <div class="comments-preview">
        <p class="comments-title">Comments</p>
        <div v-if="comments.length" class="comment-list">
          <p v-for="comment in comments" :key="comment.id">
            <strong>{{ comment.username }}</strong> {{ comment.content }}
          </p>
        </div>
        <p v-else class="caption-muted">No comments yet.</p>
        <form v-if="auth.isLoggedIn" class="comment-form" @submit.prevent="submitComment">
          <input v-model.trim="commentText" placeholder="Add a comment..." maxlength="1000" />
          <button type="submit" :disabled="!commentText || commenting">Post</button>
        </form>
      </div>

      <div class="photo-footer">
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
          <button class="comment-btn" type="button" @click="emit('open-lightbox', photo)" title="View photo">
            View
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
    </aside>

  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const props  = defineProps({ photo: Object });
const emit   = defineEmits(['deleted', 'liked', 'open-lightbox']);
const auth   = useAuthStore();
const toast  = inject('showToast');
const liking = ref(false);
const comments = ref([]);
const commentText = ref('');
const commenting = ref(false);

onMounted(loadComments);

const canDelete = computed(() =>
  auth.isLoggedIn && (auth.isAdmin || auth.user?.id === props.photo.user_id)
);
const hasFrame = computed(() =>
  Number(props.photo.frame_gap_px || 0) > 0 || Number(props.photo.frame_border_width_px || 0) > 0
);
const photoFrameStyle = computed(() => ({
  backgroundColor: props.photo.frame_background_color || (hasFrame.value ? '#ffffff' : 'transparent'),
  padding: `${clampNumber(props.photo.frame_gap_px, 0, 80)}px`,
  border: `${clampNumber(props.photo.frame_border_width_px, 0, 24)}px solid ${props.photo.frame_border_color || '#111111'}`,
  justifyContent: frameAlignment.value.justifyContent,
  alignItems: frameAlignment.value.alignItems,
}));
const frameAlignment = computed(() => {
  const [horizontal = 'center', vertical = 'center'] = String(props.photo.frame_image_position || 'center center').split(' ');
  return {
    justifyContent: ({ left: 'flex-start', center: 'center', right: 'flex-end' })[horizontal] || 'center',
    alignItems: ({ top: 'flex-start', center: 'center', bottom: 'flex-end' })[vertical] || 'center',
  };
});
const srcset = computed(() => [
  props.photo.image_thumb_url && `${props.photo.image_thumb_url} 420w`,
  props.photo.image_medium_url && `${props.photo.image_medium_url} 1200w`,
].filter(Boolean).join(', '));

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

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

async function loadComments() {
  try {
    const { data } = await api.get(`/photos/${props.photo.id}/comments`);
    comments.value = data;
  } catch {
    comments.value = [];
  }
}

async function submitComment() {
  if (!commentText.value || commenting.value) return;
  commenting.value = true;
  try {
    const { data } = await api.post(`/photos/${props.photo.id}/comments`, { content: commentText.value });
    comments.value.push(data);
    commentText.value = '';
  } catch {
    toast('Failed to add comment', 'error');
  } finally {
    commenting.value = false;
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
.photo-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
}
.photo-side { display: flex; flex-direction: column; min-height: 100%; border-left: 1px solid var(--border); }
.photo-header { display: flex; align-items: center; justify-content: space-between; padding: .9rem 1rem; border-bottom: 1px solid var(--border); }
.photo-header > div { display: flex; flex-direction: column; gap: .15rem; }
.photo-img-wrap { background: #050505; cursor: zoom-in; display: flex; align-items: center; justify-content: center; padding: 0; }
.photo-img-wrap.framed { padding: clamp(.75rem, 2vw, 1.4rem); }
.photo-frame {
  max-width: 100%;
  max-height: 78vh;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18px 45px rgba(0,0,0,.26);
}
.photo-frame img { max-width: 100%; width: auto; height: auto; max-height: calc(78vh - 2rem); object-fit: contain; display: block; }
.photo-footer { margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding: .75rem 1rem; border-top: 1px solid var(--border); }
.photo-user   { font-size: 0.8rem; color: var(--text); }
.photo-date   { font-size: 0.72rem; color: var(--text-faint); }
.photo-actions{ display: flex; gap: 0.5rem; align-items: center; }
.photo-caption { padding: 1rem; display: grid; gap: .3rem; }
.photo-caption p { margin: 0; font-size: .9rem; color: var(--text-muted); line-height: 1.45; }
.photo-caption strong { color: var(--text); }
.caption-muted { color: var(--text-faint) !important; }
.scan-meta { display:flex; gap:.45rem; flex-wrap:wrap; margin-top:.45rem !important; }
.scan-meta span { border:1px solid var(--border); border-radius:4px; padding:.18rem .45rem; color:var(--text-faint); font-size:.75rem; }
.comments-preview { margin: 0 1rem 1rem; padding-top: 1rem; border-top: 1px solid var(--border); display: grid; gap: .35rem; }
.comments-preview p { margin: 0; font-size: .84rem; line-height: 1.45; }
.comments-title { color: var(--text); font-weight: 600; }
.comment-list { display:grid; gap:.45rem; max-height:180px; overflow:auto; padding-right:.2rem; }
.comment-list strong { color:var(--text); }
.comment-form { display:flex; gap:.45rem; margin-top:.55rem; }
.comment-form input { flex:1; min-width:0; background:var(--bg); border:1px solid var(--border); border-radius:5px; color:var(--text); padding:.45rem .55rem; font-size:.82rem; }
.comment-form button { border:0; background:transparent; color:var(--text); cursor:pointer; font-size:.82rem; padding:.3rem; }
.comment-form button:disabled { opacity:.45; cursor:default; }

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
.comment-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: .8rem;
  padding: .3rem .5rem;
  border-radius: 5px;
}
.comment-btn:hover { color: var(--text); background: rgba(255,255,255,.06); }

.delete-btn {
  display: flex; align-items: center;
  background: none; border: none; cursor: pointer;
  color: var(--text-faint); padding: 0.3rem 0.4rem; border-radius: 5px;
  transition: color 0.15s, background 0.15s;
}
.delete-btn:hover { color: var(--danger); background: rgba(192,57,43,.08); }


@media (max-width: 900px) {
  .photo-card { grid-template-columns: 1fr; }
  .photo-side { border-left: none; border-top: 1px solid var(--border); }
  .photo-img-wrap img { max-height: none; }
}
</style>
