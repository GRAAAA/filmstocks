<template>
  <RouterLink :to="`/stock/${post.film_stock_id}/forum/${post.id}`" class="post-card">
    <div class="post-top">
      <div class="post-author">
        <span class="mono author-name">{{ post.username }}</span>
        <span class="post-date">{{ formatDate(post.created_at) }}</span>
      </div>
      <span class="reply-count mono">{{ post.reply_count }} repl{{ post.reply_count !== 1 ? 'ies' : 'y' }}</span>
    </div>
    <h4 class="post-title">{{ post.title }}</h4>
    <p class="post-preview">{{ post.content }}</p>
  </RouterLink>
</template>

<script setup>
defineProps({ post: Object });

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
</script>

<style scoped>
.post-card {
  display: block;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem 1.1rem;
  transition: border-color 0.15s;
  cursor: pointer;
}
.post-card:hover { border-color: var(--border-hover); }
.post-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.post-author { display: flex; align-items: center; gap: 0.75rem; }
.author-name { font-size: 0.8rem; color: var(--accent); }
.post-date   { font-size: 0.75rem; color: var(--text-faint); }
.reply-count { font-size: 0.75rem; color: var(--text-faint); }
.post-title  { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.3rem; }
.post-preview{
  font-size: 0.83rem; color: var(--text-muted); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
</style>
