<template>
  <article class="reply-thread" :style="{ '--depth': depth }">
    <div class="reply-card">
      <div class="reply-meta">
        <span class="mono author">{{ reply.username }}</span>
        <span class="date">{{ formatDate(reply.created_at) }}</span>
      </div>

      <p v-if="!isEditing" class="reply-content">{{ reply.content }}</p>
      <div v-else class="inline-edit">
        <textarea v-model="draft" rows="3" />
        <div class="action-row">
          <button class="btn btn-primary btn-sm" @click="saveEdit">Save</button>
          <button class="btn btn-ghost btn-sm" @click="cancelEdit">Cancel</button>
        </div>
      </div>

      <div class="reply-actions">
        <button v-if="auth.isLoggedIn" class="text-btn" @click="isReplying = !isReplying">
          {{ isReplying ? 'Cancel' : 'Reply' }}
        </button>
        <template v-if="canModify">
          <button class="text-btn" @click="startEdit">Edit</button>
          <button class="text-btn danger" @click="$emit('delete', reply)">Delete</button>
        </template>
      </div>

      <form v-if="isReplying" class="nested-form" @submit.prevent="submitNestedReply">
        <textarea v-model="nestedContent" rows="3" placeholder="Reply to this comment..." required />
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="btn btn-primary btn-sm" :disabled="submitting">
          {{ submitting ? 'Posting...' : 'Post reply' }}
        </button>
      </form>
    </div>

    <div v-if="reply.children?.length" class="children">
      <ReplyThread
        v-for="child in reply.children"
        :key="child.id"
        :reply="child"
        :depth="Math.min(depth + 1, 4)"
        @reply="$emit('reply', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useAuthStore } from '../../stores/auth.js';

const props = defineProps({
  reply: { type: Object, required: true },
  depth: { type: Number, default: 0 },
});
const emit = defineEmits(['reply', 'edit', 'delete']);
const auth = useAuthStore();

const isEditing = ref(false);
const isReplying = ref(false);
const submitting = ref(false);
const draft = ref(props.reply.content);
const nestedContent = ref('');
const error = ref('');

const canModify = computed(() =>
  auth.isLoggedIn && (auth.isAdmin || auth.user?.id === props.reply.user_id)
);

function formatDate(str) {
  return new Date(str).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function startEdit() {
  draft.value = props.reply.content;
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  draft.value = props.reply.content;
}

function saveEdit() {
  emit('edit', { reply: props.reply, content: draft.value, done: () => { isEditing.value = false; } });
}

async function submitNestedReply() {
  submitting.value = true;
  error.value = '';
  emit('reply', {
    parent: props.reply,
    content: nestedContent.value,
    done: () => {
      nestedContent.value = '';
      isReplying.value = false;
      submitting.value = false;
    },
    fail: message => {
      error.value = message;
      submitting.value = false;
    },
  });
}
</script>

<style scoped>
.reply-thread {
  margin-left: calc(var(--depth) * 1.2rem);
}
.reply-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem 1.1rem;
}
.reply-meta { display:flex; align-items:center; gap:.75rem; margin-bottom:.6rem; }
.author { font-size:.82rem; color:var(--text); }
.date { font-size:.78rem; color:var(--text-faint); }
.reply-content { font-size:.9rem; line-height:1.7; white-space:pre-wrap; }
.reply-actions, .action-row { display:flex; gap:.7rem; align-items:center; margin-top:.75rem; }
.text-btn { color:var(--text-muted); font-size:.82rem; font-weight:600; }
.text-btn:hover { color:var(--text); }
.text-btn.danger:hover { color:var(--danger); }
.inline-edit textarea, .nested-form textarea { width:100%; margin-top:.25rem; }
.nested-form {
  border-top: 1px solid var(--border);
  margin-top: .9rem;
  padding-top: .9rem;
}
.nested-form .btn { margin-top:.55rem; }
.children {
  display:flex;
  flex-direction:column;
  gap:.75rem;
  margin-top:.75rem;
  border-left:1px solid var(--border);
  padding-left:.75rem;
}
@media (max-width: 680px) {
  .reply-thread { margin-left: 0; }
  .children { padding-left: .55rem; }
}
</style>
