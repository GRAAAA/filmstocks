<template>
  <div v-if="loading" class="spinner" />

  <template v-else-if="stock">
    <div class="stock-hero" :class="`hero-${stock.type}`">
      <div class="hero-bg" v-if="stock.cover_image_url" :style="`background-image:url(${stock.cover_image_url})`" />
      <div class="hero-overlay" />
      <div class="container hero-content">
        <RouterLink to="/" class="back-link">← All stocks</RouterLink>
        <div class="hero-top">
          <span :class="['badge', typeBadge]">{{ typeLabel }}</span>
          <span v-if="stock.iso" class="mono iso-tag">ISO {{ stock.iso }}</span>
        </div>
        <h1>{{ stock.name }}</h1>
        <p class="hero-brand">{{ stock.brand }}</p>
        <p class="hero-desc">{{ stock.description }}</p>
        <div class="hero-stats">
          <span class="mono">{{ stock.photo_count }} photos</span>
          <span class="mono">{{ stock.post_count }} forum posts</span>
        </div>
      </div>
    </div>

    <div class="container">
      <!-- Tabs -->
      <div class="tabs">
        <button :class="['tab', { active: tab === 'photos' }]" @click="tab = 'photos'">Photos</button>
        <button :class="['tab', { active: tab === 'forum'  }]" @click="tab = 'forum'">Forum</button>
        <button v-if="auth.isAdmin" :class="['tab', { active: tab === 'edit' }]" @click="tab = 'edit'">Edit stock</button>
      </div>

      <!-- Photos tab -->
      <div v-if="tab === 'photos'">
        <div v-if="photosLoading" class="spinner" />
        <template v-else>
          <div v-if="photos.length" class="photo-feed">
            <PhotoCard
              v-for="photo in photos"
              :key="photo.id"
              :photo="photo"
              @deleted="onPhotoDeleted"
              @liked="onPhotoLiked"
            />
          </div>
          <div v-else class="empty-state">
            <p>No photos yet{{ auth.isLoggedIn ? '. Use the upload button to add the first one.' : '. Log in to upload.' }}</p>
          </div>
          <div v-if="photosPagination.hasMore" class="load-more-row">
            <button class="btn btn-ghost" type="button" :disabled="loadingMorePhotos" @click="loadMorePhotos">
              {{ loadingMorePhotos ? 'Loading...' : 'Load more photos' }}
            </button>
          </div>
        </template>
      </div>

      <!-- Forum tab -->
      <div v-if="tab === 'forum'">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem">
          <p class="text-muted" style="font-size:.9rem; color:var(--text-muted)">
            Discuss techniques, exposures, and everything {{ stock.name }}
          </p>
          <RouterLink v-if="auth.isLoggedIn" :to="`/stock/${stock.id}/forum`" class="btn btn-primary btn-sm">
            New post
          </RouterLink>
          <RouterLink v-else to="/login" class="btn btn-ghost btn-sm">Log in to post</RouterLink>
        </div>

        <div v-if="postsLoading" class="spinner" />
        <div v-else-if="posts.length" class="post-list">
          <ForumPostCard v-for="post in posts" :key="post.id" :post="post" />
        </div>
        <div v-else class="empty-state"><p>No forum posts yet.</p></div>
      </div>

      <!-- Admin edit tab -->
      <div v-if="tab === 'edit' && auth.isAdmin" class="edit-panel">
        <h3 style="margin-bottom:1.25rem">Edit film stock</h3>
        <form @submit.prevent="handleUpdate">
          <div class="form-group">
            <label>Name</label>
            <input v-model="editForm.name" required />
          </div>
          <div class="form-group">
            <label>Brand</label>
            <input v-model="editForm.brand" required />
          </div>
          <div class="form-group">
            <label>Type</label>
            <select v-model="editForm.type">
              <option value="bw">Black & White</option>
              <option value="color_negative">Color Negative</option>
              <option value="reversal">Reversal / Slide</option>
            </select>
          </div>
          <div class="form-group">
            <label>ISO</label>
            <input v-model.number="editForm.iso" type="number" min="1" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="editForm.description" rows="3" />
          </div>
          <div class="form-group">
            <label>Characteristics</label>
            <textarea v-model="editForm.characteristics" rows="2" />
          </div>
          <div class="form-group">
            <label>Cover image</label>
            <input type="file" accept="image/*" @change="e => coverFile = e.target.files[0]" style="padding:.4rem" />
          </div>
          <p v-if="editError" class="form-error">{{ editError }}</p>
          <div style="display:flex; gap:.75rem">
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save changes' }}</button>
            <button type="button" class="btn btn-danger" @click="handleDelete">Delete stock</button>
          </div>
        </form>
      </div>
    </div>

    <button
      v-if="auth.isLoggedIn && tab === 'photos'"
      class="upload-fab"
      type="button"
      title="Upload photo"
      aria-label="Upload photo"
      @click="uploadOpen = true"
    >
      +
    </button>

    <Teleport to="body">
      <div v-if="uploadOpen" class="upload-modal" @click.self="uploadOpen = false">
        <div class="upload-modal-panel">
          <button class="modal-close" type="button" aria-label="Close upload" @click="uploadOpen = false">x</button>
          <PhotoUpload :filmStockId="stock.id" @uploaded="onPhotoUploaded" />
        </div>
      </div>
    </Teleport>
  </template>

  <div v-else class="container empty-state"><p>Film stock not found.</p></div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { inject } from 'vue';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';
import PhotoCard from '../components/photos/PhotoCard.vue';
import PhotoUpload from '../components/photos/PhotoUpload.vue';
import ForumPostCard from '../components/forum/ForumPostCard.vue';

const route   = useRoute();
const router  = useRouter();
const auth    = useAuthStore();
const toast   = inject('showToast');

const stock         = ref(null);
const loading       = ref(true);
const photos        = ref([]);
const photosLoading = ref(false);
const loadingMorePhotos = ref(false);
const photosPagination = reactive({ page: 1, limit: 24, total: 0, hasMore: false });
const posts         = ref([]);
const postsLoading  = ref(false);
const tab           = ref('photos');
const uploadOpen    = ref(false);
const coverFile     = ref(null);
const saving        = ref(false);
const editError     = ref('');
const editForm      = reactive({});

const typeLabel = computed(() => ({ bw: 'B & W', color_negative: 'Color Neg', reversal: 'Reversal' }[stock.value?.type]));
const typeBadge = computed(() => ({ bw: 'badge-bw', color_negative: 'badge-neg', reversal: 'badge-rev' }[stock.value?.type]));

onMounted(async () => {
  await loadStock();
  await Promise.all([loadPhotos(), loadPosts()]);
});

async function loadStock() {
  loading.value = true;
  try {
    const { data } = await api.get(`/filmstocks/${route.params.id}`);
    stock.value = data;
    Object.assign(editForm, {
      name: data.name, brand: data.brand, type: data.type,
      iso: data.iso, description: data.description, characteristics: data.characteristics,
    });
  } finally {
    loading.value = false;
  }
}

async function loadPhotos() {
  photosLoading.value = true;
  try {
    photosPagination.page = 1;
    const { data } = await api.get(`/photos/filmstock/${route.params.id}`, {
      params: { page: photosPagination.page, limit: photosPagination.limit },
    });
    photos.value = data.data;
    Object.assign(photosPagination, data.pagination);
  } finally {
    photosLoading.value = false;
  }
}

async function loadMorePhotos() {
  loadingMorePhotos.value = true;
  try {
    const nextPage = photosPagination.page + 1;
    const { data } = await api.get(`/photos/filmstock/${route.params.id}`, {
      params: { page: nextPage, limit: photosPagination.limit },
    });
    photos.value.push(...data.data);
    Object.assign(photosPagination, data.pagination);
  } finally {
    loadingMorePhotos.value = false;
  }
}

async function loadPosts() {
  postsLoading.value = true;
  try {
    const { data } = await api.get(`/forum/filmstock/${route.params.id}/posts`);
    posts.value = data;
  } finally {
    postsLoading.value = false;
  }
}

function onPhotoUploaded(photo) {
  photos.value.unshift({ ...photo, liked_by_me: false, username: auth.user.username });
  stock.value.photo_count++;
  photosPagination.total++;
  uploadOpen.value = false;
}
function onPhotoDeleted(id) {
  photos.value = photos.value.filter(p => p.id !== id);
  stock.value.photo_count--;
  photosPagination.total = Math.max(photosPagination.total - 1, 0);
}
function onPhotoLiked({ id, liked }) {
  const p = photos.value.find(p => p.id === id);
  if (p) { p.liked_by_me = liked; p.likes_count += liked ? 1 : -1; }
}

async function handleUpdate() {
  saving.value = true; editError.value = '';
  try {
    const fd = new FormData();
    Object.entries(editForm).forEach(([k, v]) => v != null && fd.append(k, v));
    if (coverFile.value) fd.append('cover', coverFile.value);
    const { data } = await api.put(`/filmstocks/${stock.value.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    stock.value = { ...stock.value, ...data };
    toast('Stock updated');
  } catch (err) {
    editError.value = err.response?.data?.message || 'Update failed';
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!confirm(`Delete "${stock.value.name}"? This will remove all photos and forum posts.`)) return;
  try {
    await api.delete(`/filmstocks/${stock.value.id}`);
    toast('Film stock deleted');
    router.push('/');
  } catch (err) {
    toast(err.response?.data?.message || 'Delete failed', 'error');
  }
}
</script>

<style scoped>
.stock-hero {
  position: relative;
  min-height: 300px;
  display: flex;
  align-items: flex-end;
  margin-bottom: 0;
  overflow: hidden;
}
.hero-bw            { background: linear-gradient(135deg, #111 0%, #222 100%); }
.hero-color_negative{ background: linear-gradient(135deg, #1a0f07 0%, #2d1a0a 100%); }
.hero-reversal      { background: linear-gradient(135deg, #050e1a 0%, #0d1f35 100%); }
.hero-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
}
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.3) 100%);
}
.hero-content { position: relative; z-index: 1; padding-top: 3rem; padding-bottom: 2.5rem; }
.back-link { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem; display: inline-block; transition: color .15s; }
.back-link:hover { color: var(--text); }
.hero-top  { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.iso-tag   { font-size: 0.78rem; color: var(--text-faint); }
.hero-content h1 { font-size: 2.2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: .2rem; }
.hero-brand{ color: var(--text-muted); font-size: 1rem; margin-bottom: .6rem; }
.hero-desc { color: var(--text-muted); font-size: 0.9rem; max-width: 560px; margin-bottom: 1rem; }
.hero-stats{ display: flex; gap: 1.5rem; font-size: 0.8rem; color: var(--text-faint); }

.container { padding-top: 0; }
.tabs { margin-top: 2rem; }
.photo-feed { max-width: 1180px; display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 5rem; }
.post-list { display: flex; flex-direction: column; gap: 0.85rem; }
.edit-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1.75rem; max-width: 560px; }
.load-more-row { display:flex; justify-content:center; padding:2rem 0 3rem; }
.upload-fab {
  position: fixed;
  right: 1.4rem;
  bottom: 1.4rem;
  z-index: 80;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  border: 1px solid var(--border-hover);
  background: var(--text);
  color: var(--bg);
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 16px 40px rgba(0,0,0,.35);
}
.upload-fab:hover { background: #fff; }
.upload-modal {
  position: fixed;
  inset: 0;
  z-index: 220;
  background: rgba(0,0,0,.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}
.upload-modal-panel {
  position: relative;
  width: min(920px, 100%);
  max-height: calc(100vh - 2.5rem);
  overflow: auto;
}
.modal-close {
  position: absolute;
  top: .8rem;
  right: .9rem;
  z-index: 1;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.2rem;
}
.modal-close:hover { color: var(--text); border-color: var(--border-hover); }

@media (max-width: 720px) {
  .photo-feed { max-width: none; }
  .upload-fab { right: 1rem; bottom: 1rem; }
}
</style>
