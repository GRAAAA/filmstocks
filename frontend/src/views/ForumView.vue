<template>
  <div class="container">
    <div class="page-header">
      <RouterLink :to="`/stock/${stockId}`" class="back-link">← Back to {{ stockName }}</RouterLink>
      <h1>Forum</h1>
      <p v-if="stockName">{{ stockName }} — community discussion</p>
    </div>

    <div class="forum-layout">
      <!-- New post form -->
      <div v-if="auth.isLoggedIn" class="new-post-panel">
        <h3>Start a new discussion</h3>
        <form @submit.prevent="submitPost">
          <div class="form-group">
            <label>Title</label>
            <input v-model="form.title" placeholder="What's on your mind?" maxlength="200" required />
          </div>
          <div class="form-group">
            <label>Content</label>
            <textarea v-model="form.content" rows="5" placeholder="Share your experience, ask a question…" required />
          </div>
          <p v-if="error" class="form-error">{{ error }}</p>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Posting…' : 'Post' }}
          </button>
        </form>
      </div>
      <div v-else class="login-nudge">
        <p>
          <RouterLink to="/login" class="accent-link">Log in</RouterLink> or
          <RouterLink to="/register" class="accent-link">sign up</RouterLink>
          to post in the forum.
        </p>
      </div>

      <!-- Posts list -->
      <div class="posts-section">
        <div v-if="loading" class="spinner" />
        <div v-else-if="posts.length" class="post-list">
          <ForumPostCard v-for="post in posts" :key="post.id" :post="post" />
        </div>
        <div v-else class="empty-state"><p>No posts yet — start the conversation!</p></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { inject } from 'vue';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';
import ForumPostCard from '../components/forum/ForumPostCard.vue';

const route     = useRoute();
const auth      = useAuthStore();
const toast     = inject('showToast');
const stockId   = route.params.id;
const stockName = ref('');
const posts     = ref([]);
const loading   = ref(true);
const submitting = ref(false);
const error     = ref('');
const form      = reactive({ title: '', content: '' });

onMounted(async () => {
  const [stockRes, postsRes] = await Promise.all([
    api.get(`/filmstocks/${stockId}`),
    api.get(`/forum/filmstock/${stockId}/posts`),
  ]);
  stockName.value = stockRes.data.name;
  posts.value     = postsRes.data;
  loading.value   = false;
});

async function submitPost() {
  submitting.value = true; error.value = '';
  try {
    const { data } = await api.post('/forum/posts', {
      filmStockId: stockId,
      title:   form.title,
      content: form.content,
    });
    posts.value.unshift({ ...data, username: auth.user.username, reply_count: 0 });
    form.title = ''; form.content = '';
    toast('Post created!');
  } catch (err) {
    const errs = err.response?.data?.errors;
    error.value = errs ? errs[0].msg : (err.response?.data?.message || 'Failed to post');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.back-link { font-size: 0.82rem; color: var(--text-muted); display: inline-block; margin-bottom: 0.75rem; transition: color .15s; }
.back-link:hover { color: var(--text); }
.forum-layout { display: grid; gap: 2rem; grid-template-columns: 1fr; }
@media(min-width: 900px) { .forum-layout { grid-template-columns: 360px 1fr; align-items: start; } }

.new-post-panel, .login-nudge {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 1.5rem;
}
.new-post-panel h3 { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }
.login-nudge { color: var(--text-muted); font-size: 0.9rem; }
.accent-link { color: var(--text); }
.post-list { display: flex; flex-direction: column; gap: 0.85rem; }
</style>
