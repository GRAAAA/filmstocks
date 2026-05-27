<template>
  <div class="container">
    <div v-if="loading" class="spinner" />

    <template v-else>
      <div class="page-header profile-header">
        <div>
          <p class="profile-kicker mono">My page</p>
          <h1>{{ profile.user.username }}</h1>
          <p>Review your uploaded shots and forum replies.</p>
        </div>
        <div class="profile-stats">
          <div>
            <strong>{{ profile.stats.photos }}</strong>
            <span>Shots</span>
          </div>
          <div>
            <strong>{{ profile.stats.replies }}</strong>
            <span>Replies</span>
          </div>
          <div>
            <strong>{{ profile.stats.likes }}</strong>
            <span>Likes</span>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button :class="['tab', { active: tab === 'shots' }]" @click="tab = 'shots'">My Shots</button>
        <button :class="['tab', { active: tab === 'replies' }]" @click="tab = 'replies'">My Replies</button>
      </div>

      <section v-if="tab === 'shots'">
        <div v-if="profile.photos.length" class="grid-photos">
          <PhotoCard
            v-for="photo in profile.photos"
            :key="photo.id"
            :photo="photo"
            @deleted="onPhotoDeleted"
            @liked="onPhotoLiked"
          />
        </div>
        <div v-else class="empty-state">
          <p>You have not uploaded any shots yet.</p>
          <RouterLink to="/" class="btn btn-primary">Browse film stocks</RouterLink>
        </div>
      </section>

      <section v-if="tab === 'replies'" class="reply-history">
        <RouterLink
          v-for="reply in profile.replies"
          :key="reply.id"
          :to="`/stock/${reply.film_stock_id}/forum/${reply.post_id}`"
          class="history-card"
        >
          <div class="history-meta">
            <span class="mono">{{ reply.film_stock_name }}</span>
            <span>{{ formatDate(reply.created_at) }}</span>
          </div>
          <h3>{{ reply.post_title }}</h3>
          <p v-if="reply.parent_username" class="parent-context">
            Replying to {{ reply.parent_username }}: {{ reply.parent_content }}
          </p>
          <p>{{ reply.content }}</p>
        </RouterLink>

        <div v-if="!profile.replies.length" class="empty-state">
          <p>You have not replied to any forum discussions yet.</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import api from '../services/api.js';
import PhotoCard from '../components/photos/PhotoCard.vue';

const loading = ref(true);
const tab = ref('shots');
const profile = ref({ user: {}, stats: { photos: 0, replies: 0, likes: 0 }, photos: [], replies: [] });

onMounted(async () => {
  try {
    const { data } = await api.get('/profile/me');
    profile.value = data;
  } finally {
    loading.value = false;
  }
});

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function onPhotoDeleted(id) {
  const photo = profile.value.photos.find(item => item.id === id);
  profile.value.photos = profile.value.photos.filter(item => item.id !== id);
  profile.value.stats.photos = profile.value.photos.length;
  profile.value.stats.likes -= Number(photo?.likes_count || 0);
}

function onPhotoLiked({ id, liked }) {
  const photo = profile.value.photos.find(item => item.id === id);
  if (photo) {
    photo.liked_by_me = liked;
    photo.likes_count += liked ? 1 : -1;
    profile.value.stats.likes += liked ? 1 : -1;
  }
}
</script>

<style scoped>
.profile-header {
  display:flex;
  justify-content:space-between;
  gap:1.5rem;
  align-items:end;
}
.profile-kicker {
  color: var(--text-faint);
  font-size: .78rem;
  text-transform: uppercase;
}
.profile-stats {
  display:grid;
  grid-template-columns: repeat(3, minmax(86px, 1fr));
  gap:.75rem;
}
.profile-stats div {
  border:1px solid var(--border);
  border-radius:8px;
  padding:.8rem .9rem;
  background:var(--surface);
}
.profile-stats strong {
  display:block;
  font-size:1.35rem;
  line-height:1;
}
.profile-stats span {
  display:block;
  margin-top:.35rem;
  color:var(--text-muted);
  font-size:.78rem;
}
.reply-history {
  display:flex;
  flex-direction:column;
  gap:.85rem;
  padding-bottom:3rem;
}
.history-card {
  border:1px solid var(--border);
  border-radius:8px;
  background:var(--surface);
  padding:1rem 1.1rem;
  transition:border-color .15s, transform .15s;
}
.history-card:hover {
  border-color:var(--border-hover);
  transform:translateY(-1px);
}
.history-card h3 {
  font-size:1rem;
  margin:.35rem 0 .45rem;
}
.history-card p {
  color:var(--text-muted);
  font-size:.9rem;
  line-height:1.6;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
.history-meta {
  display:flex;
  justify-content:space-between;
  gap:1rem;
  color:var(--text-faint);
  font-size:.78rem;
}
.parent-context {
  color:var(--text-faint) !important;
  margin-bottom:.35rem;
}
@media (max-width: 760px) {
  .profile-header {
    flex-direction:column;
    align-items:stretch;
  }
  .profile-stats {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
