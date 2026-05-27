<template>
  <div class="container">
    <div v-if="loading" class="spinner" />

    <template v-else-if="post">
      <div class="page-header">
        <RouterLink :to="`/stock/${post.film_stock_id}/forum`" class="back-link">
          ← {{ post.film_stock_name }} forum
        </RouterLink>
        <div class="post-meta">
          <span :class="['badge', typeBadge]">{{ typeLabel }}</span>
          <span class="mono author">{{ post.username }}</span>
          <span class="date">{{ formatDate(post.created_at) }}</span>
        </div>
        <h1>{{ post.title }}</h1>
      </div>

      <!-- Original post body -->
      <div class="post-body">
        <p>{{ post.content }}</p>
        <div v-if="canModify(post.user_id)" class="post-actions">
          <button class="btn btn-ghost btn-sm" @click="editingPost = true">Edit</button>
          <button class="btn btn-danger btn-sm" @click="deletePost">Delete post</button>
        </div>
      </div>

      <!-- Edit post -->
      <div v-if="editingPost" class="reply-box">
        <h4>Edit post</h4>
        <div class="form-group" style="margin-top:.75rem">
          <label>Title</label>
          <input v-model="editPostForm.title" />
        </div>
        <div class="form-group">
          <label>Content</label>
          <textarea v-model="editPostForm.content" rows="5" />
        </div>
        <div style="display:flex;gap:.5rem">
          <button class="btn btn-primary btn-sm" @click="savePost">Save</button>
          <button class="btn btn-ghost btn-sm" @click="editingPost = false">Cancel</button>
        </div>
      </div>

      <!-- Replies -->
      <div class="replies-section">
        <h3 class="replies-heading">{{ replyCount }} {{ replyCount === 1 ? 'reply' : 'replies' }}</h3>

        <div v-if="threadedReplies.length" class="replies-list">
          <ReplyThread
            v-for="reply in threadedReplies"
            :key="reply.id"
            :reply="reply"
            @reply="submitNestedReply"
            @edit="saveReply"
            @delete="deleteReply"
          />
        </div>

        <div v-else class="empty-state" style="padding:2rem 0">
          <p>No replies yet{{ auth.isLoggedIn ? ' — be the first to respond.' : '' }}</p>
        </div>
      </div>

      <!-- Reply form -->
      <div v-if="auth.isLoggedIn" class="reply-box">
        <h4>Add a reply</h4>
        <form @submit.prevent="submitReply">
          <div class="form-group" style="margin-top:.75rem">
            <textarea v-model="replyContent" rows="4" placeholder="Share your thoughts…" required />
          </div>
          <p v-if="replyError" class="form-error">{{ replyError }}</p>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Posting...' : 'Reply' }}
          </button>
        </form>
      </div>
      <div v-else class="login-nudge">
        <RouterLink to="/login" class="accent-link">Log in</RouterLink> to reply.
      </div>
    </template>

    <div v-else class="empty-state"><p>Post not found.</p></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { inject } from 'vue';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';
import ReplyThread from '../components/forum/ReplyThread.vue';

const route  = useRoute();
const router = useRouter();
const auth   = useAuthStore();
const toast  = inject('showToast');

const post       = ref(null);
const loading    = ref(true);
const submitting = ref(false);
const replyContent = ref('');
const replyError   = ref('');
const editingPost  = ref(false);
const editPostForm = reactive({ title: '', content: '' });

const typeLabel = computed(() => ({ bw: 'B & W', color_negative: 'Color Neg', reversal: 'Reversal' }[post.value?.film_stock_type]));
const typeBadge = computed(() => ({ bw: 'badge-bw', color_negative: 'badge-neg', reversal: 'badge-rev' }[post.value?.film_stock_type]));
const replyCount = computed(() => post.value?.replies?.length || 0);
const threadedReplies = computed(() => buildReplyTree(post.value?.replies || []));

const canModify = (userId) => auth.isLoggedIn && (auth.isAdmin || auth.user?.id === userId);

function formatDate(str) {
  return new Date(str).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function buildReplyTree(replies) {
  const byId = new Map(replies.map(reply => [reply.id, { ...reply, children: [] }]));
  const roots = [];

  byId.forEach(reply => {
    if (reply.parent_reply_id && byId.has(reply.parent_reply_id)) {
      byId.get(reply.parent_reply_id).children.push(reply);
    } else {
      roots.push(reply);
    }
  });

  return roots;
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/forum/posts/${route.params.postId}`);
    post.value = data;
    editPostForm.title   = data.title;
    editPostForm.content = data.content;
  } finally {
    loading.value = false;
  }
});

async function submitReply() {
  submitting.value = true; replyError.value = '';
  try {
    const { data } = await api.post(`/forum/posts/${post.value.id}/replies`, { content: replyContent.value });
    post.value.replies.push(data);
    replyContent.value = '';
    toast('Reply posted!');
  } catch (err) {
    replyError.value = err.response?.data?.message || 'Failed to post reply';
  } finally {
    submitting.value = false;
  }
}

async function submitNestedReply({ parent, content, done, fail }) {
  try {
    const { data } = await api.post(`/forum/posts/${post.value.id}/replies`, {
      content,
      parentReplyId: parent.id,
    });
    post.value.replies.push(data);
    toast('Reply posted!');
    done();
  } catch (err) {
    fail(err.response?.data?.message || 'Failed to post reply');
  }
}

async function savePost() {
  try {
    const { data } = await api.put(`/forum/posts/${post.value.id}`, editPostForm);
    post.value.title   = data.title;
    post.value.content = data.content;
    editingPost.value  = false;
    toast('Post updated');
  } catch { toast('Update failed', 'error'); }
}

async function deletePost() {
  if (!confirm('Delete this post and all replies?')) return;
  try {
    await api.delete(`/forum/posts/${post.value.id}`);
    toast('Post deleted');
    router.push(`/stock/${post.value.film_stock_id}/forum`);
  } catch { toast('Delete failed', 'error'); }
}

async function saveReply({ reply, content, done }) {
  try {
    await api.put(`/forum/replies/${reply.id}`, { content });
    const target = post.value.replies.find(r => r.id === reply.id);
    if (target) target.content = content;
    done();
    toast('Reply updated');
  } catch { toast('Update failed', 'error'); }
}

async function deleteReply(reply) {
  if (!confirm('Delete this reply?')) return;
  try {
    await api.delete(`/forum/replies/${reply.id}`);
    const removeIds = collectReplyIds(reply);
    post.value.replies = post.value.replies.filter(r => !removeIds.has(r.id));
    toast('Reply deleted');
  } catch { toast('Delete failed', 'error'); }
}

function collectReplyIds(reply) {
  const ids = new Set([reply.id]);
  (reply.children || []).forEach(child => {
    collectReplyIds(child).forEach(id => ids.add(id));
  });
  return ids;
}
</script>

<style scoped>
.back-link { font-size:.82rem; color:var(--text-muted); display:inline-block; margin-bottom:.75rem; transition: color .15s; }
.back-link:hover { color:var(--text); }
.post-meta { display:flex; align-items:center; gap:.75rem; margin-bottom:.6rem; }
.author { font-size:.82rem; color:var(--text-muted); }
.date   { font-size:.78rem; color:var(--text-faint); }
.page-header h1 { font-size:1.8rem; }

.post-body {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 1.5rem; margin-bottom: 2rem;
  white-space: pre-wrap; line-height: 1.7; font-size: .95rem;
}
.post-actions { display:flex; gap:.5rem; margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border); }

.replies-section { margin-bottom: 2rem; }
.replies-heading  { font-size:1rem; font-weight:600; margin-bottom:1rem; color:var(--text-muted); }
.replies-list { display:flex; flex-direction:column; gap:.85rem; }

.reply-box {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 1.5rem; margin-bottom: 2rem;
}
.reply-box h4 { font-size:.95rem; font-weight:600; }

.login-nudge { color:var(--text-muted); font-size:.9rem; padding:1rem 0; }
.accent-link { color:var(--text); }
</style>
