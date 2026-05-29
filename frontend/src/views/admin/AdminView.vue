<template>
  <div class="container">
    <div class="page-header">
      <h1>Admin panel</h1>
      <p>Manage users, film stocks, and content.</p>
    </div>

    <div class="admin-tabs">
      <div class="tabs">
        <button :class="['tab', { active: tab === 'stocks' }]"  @click="tab = 'stocks'">Film Stocks</button>
        <button :class="['tab', { active: tab === 'users'  }]"  @click="tab = 'users'">Users</button>
        <button :class="['tab', { active: tab === 'storage' }]" @click="tab = 'storage'">Storage</button>
        <button :class="['tab', { active: tab === 'add'    }]"  @click="tab = 'add'">Add Stock</button>
      </div>
    </div>

    <!-- Film stocks list -->
    <div v-if="tab === 'stocks'">
      <div v-if="stocksLoading" class="spinner" />
      <table v-else class="admin-table">
        <thead><tr>
          <th>Name</th><th>Brand</th><th>Type</th><th>ISO</th><th>Photos</th><th>Posts</th><th></th>
        </tr></thead>
        <tbody>
          <tr v-for="s in stocks" :key="s.id">
            <td><RouterLink :to="`/stock/${s.id}`" class="accent-link">{{ s.name }}</RouterLink></td>
            <td>{{ s.brand }}</td>
            <td><span :class="['badge', typeBadge(s.type)]">{{ typeLabel(s.type) }}</span></td>
            <td class="mono">{{ s.iso || '—' }}</td>
            <td class="mono">{{ s.photo_count }}</td>
            <td class="mono">{{ s.post_count }}</td>
            <td>
              <RouterLink :to="`/stock/${s.id}`" class="btn btn-ghost btn-sm">Edit</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Users list -->
    <div v-if="tab === 'users'">
      <div v-if="usersLoading" class="spinner" />
      <table v-else class="admin-table">
        <thead><tr>
          <th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th></th>
        </tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="mono">{{ u.username }}</td>
            <td>{{ u.email }}</td>
            <td>
              <select :value="u.role" @change="e => changeRole(u, e.target.value)" class="role-select">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </td>
            <td class="date">{{ formatDate(u.created_at) }}</td>
            <td>
              <button class="btn btn-danger btn-sm" @click="deleteUser(u)" :disabled="u.id === auth.user.id">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Storage status -->
    <div v-if="tab === 'storage'">
      <div v-if="storageLoading" class="spinner" />
      <p v-else-if="storageError" class="form-error">{{ storageError }}</p>
      <div v-else class="storage-panel">
        <div class="storage-meter">
          <div>
            <p class="metric-label">Storage used</p>
            <strong>{{ formatBytes(storage.storage_size_bytes) }}</strong>
            <span>of {{ formatBytes(storage.storage_limit_bytes) }}</span>
          </div>
          <div class="meter-track" aria-hidden="true">
            <div class="meter-fill" :style="{ width: `${storage.storage_used_percent}%` }" />
          </div>
        </div>

        <div class="metric-grid">
          <div class="metric">
            <p class="metric-label">Original uploads</p>
            <strong>{{ formatBytes(storage.original_size_bytes) }}</strong>
          </div>
          <div class="metric">
            <p class="metric-label">Optimized display</p>
            <strong>{{ formatBytes(storage.optimized_size_bytes) }}</strong>
          </div>
          <div class="metric">
            <p class="metric-label">Saved</p>
            <strong>{{ formatBytes(storage.storage_saved_bytes) }}</strong>
          </div>
          <div class="metric">
            <p class="metric-label">Compression</p>
            <strong>{{ storage.original_size_bytes ? formatPercent(1 - storage.compression_ratio) : '0.0%' }}</strong>
          </div>
          <div class="metric">
            <p class="metric-label">Photos</p>
            <strong>{{ storage.photo_count }}</strong>
          </div>
          <div class="metric">
            <p class="metric-label">Variants</p>
            <strong>{{ storage.variant_count }}</strong>
          </div>
          <div class="metric">
            <p class="metric-label">Unique hashes</p>
            <strong>{{ storage.unique_hash_count }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Add film stock -->
    <div v-if="tab === 'add'" class="add-panel">
      <h3 style="margin-bottom:1.25rem">Add a new film stock</h3>
      <form @submit.prevent="handleAdd">
        <div class="form-row">
          <div class="form-group">
            <label>Name *</label>
            <input v-model="addForm.name" required placeholder="e.g. Tri-X 400" />
          </div>
          <div class="form-group">
            <label>Brand *</label>
            <input v-model="addForm.brand" required placeholder="e.g. Kodak" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type *</label>
            <select v-model="addForm.type">
              <option value="bw">Black & White</option>
              <option value="color_negative">Color Negative</option>
              <option value="reversal">Reversal / Slide</option>
            </select>
          </div>
          <div class="form-group">
            <label>ISO</label>
            <input v-model.number="addForm.iso" type="number" min="1" placeholder="e.g. 400" />
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="addForm.description" rows="3" placeholder="What makes this film special?" />
        </div>
        <div class="form-group">
          <label>Characteristics</label>
          <textarea v-model="addForm.characteristics" rows="2" placeholder="Grain, contrast, tonality…" />
        </div>
        <div class="form-group">
          <label>Cover image</label>
          <input type="file" accept="image/*" @change="e => addCover = e.target.files[0]" style="padding:.4rem" />
        </div>
        <p v-if="addError" class="form-error">{{ addError }}</p>
        <button type="submit" class="btn btn-primary" :disabled="adding">
          {{ adding ? 'Adding…' : 'Add film stock' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { inject } from 'vue';
import api from '../../services/api.js';
import { useAuthStore } from '../../stores/auth.js';

const auth  = useAuthStore();
const toast = inject('showToast');

const tab          = ref('stocks');
const stocks       = ref([]);
const users        = ref([]);
const storage      = ref({
  photo_count: 0,
  variant_count: 0,
  unique_hash_count: 0,
  original_size_bytes: 0,
  optimized_size_bytes: 0,
  storage_size_bytes: 0,
  storage_saved_bytes: 0,
  storage_limit_bytes: 10737418240,
  storage_used_percent: 0,
  compression_ratio: 0,
});
const stocksLoading = ref(false);
const usersLoading  = ref(false);
const storageLoading = ref(false);
const storageError = ref('');
const adding       = ref(false);
const addError     = ref('');
const addCover     = ref(null);
const addForm      = reactive({ name: '', brand: '', type: 'bw', iso: null, description: '', characteristics: '' });

const typeLabel = t => ({ bw: 'B&W', color_negative: 'Color Neg', reversal: 'Reversal' }[t]);
const typeBadge = t => ({ bw: 'badge-bw', color_negative: 'badge-neg', reversal: 'badge-rev' }[t]);
const formatDate = s => new Date(s).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
const formatPercent = n => `${Math.max(n * 100, 0).toFixed(1)}%`;
const formatBytes = bytes => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unit = units.shift();
  while (size >= 1024 && units.length) {
    size /= 1024;
    unit = units.shift();
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${unit}`;
};

onMounted(async () => {
  stocksLoading.value = true;
  usersLoading.value  = true;
  storageLoading.value = true;
  const [stocksResult, usersResult, storageResult] = await Promise.allSettled([
    api.get('/filmstocks'),
    api.get('/admin/users'),
    api.get('/admin/storage'),
  ]);

  if (stocksResult.status === 'fulfilled') stocks.value = stocksResult.value.data;
  else toast?.('Film stocks failed to load', 'error');

  if (usersResult.status === 'fulfilled') users.value = usersResult.value.data;
  else toast?.('Users failed to load', 'error');

  if (storageResult.status === 'fulfilled') {
    storage.value = storageResult.value.data;
    storageError.value = '';
  } else {
    storageError.value = storageResult.reason?.response?.data?.message || 'Storage metrics failed to load';
  }

  stocksLoading.value = false;
  usersLoading.value  = false;
  storageLoading.value = false;
});

async function changeRole(u, role) {
  try {
    await api.put(`/admin/users/${u.id}/role`, { role });
    u.role = role;
    toast(`${u.username} is now ${role}`);
  } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
}

async function deleteUser(u) {
  if (!confirm(`Delete user "${u.username}"? This removes all their content.`)) return;
  try {
    await api.delete(`/admin/users/${u.id}`);
    users.value = users.value.filter(x => x.id !== u.id);
    toast('User deleted');
  } catch { toast('Delete failed', 'error'); }
}

async function handleAdd() {
  adding.value = true; addError.value = '';
  try {
    const fd = new FormData();
    Object.entries(addForm).forEach(([k, v]) => v != null && v !== '' && fd.append(k, v));
    if (addCover.value) fd.append('cover', addCover.value);
    const { data } = await api.post('/filmstocks', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    stocks.value.unshift({ ...data, photo_count: 0, post_count: 0 });
    Object.assign(addForm, { name: '', brand: '', type: 'bw', iso: null, description: '', characteristics: '' });
    addCover.value = null;
    toast('Film stock added!');
    tab.value = 'stocks';
  } catch (err) {
    const errs = err.response?.data?.errors;
    addError.value = errs ? errs[0].msg : (err.response?.data?.message || 'Failed');
  } finally {
    adding.value = false;
  }
}
</script>

<style scoped>
.admin-table { width:100%; border-collapse:collapse; font-size:.88rem; }
.admin-table th { text-align:left; padding:.6rem .85rem; color:var(--text-faint); font-weight:500; border-bottom:1px solid var(--border); }
.admin-table td { padding:.65rem .85rem; border-bottom:1px solid var(--border); vertical-align:middle; }
.admin-table tr:last-child td { border-bottom:none; }
.mono { font-family:'DM Mono',monospace; font-size:.82rem; }
.date { font-size:.78rem; color:var(--text-faint); }
.accent-link { color:var(--accent); }
.role-select { width:auto; padding:.2rem .5rem; font-size:.82rem; }

.add-panel { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:1.75rem; max-width:620px; }
.form-row  { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }

.storage-panel { display:grid; gap:1rem; }
.storage-meter { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1.2rem; display:grid; gap:1rem; }
.storage-meter strong { font-size:1.65rem; margin-right:.35rem; }
.storage-meter span { color:var(--text-faint); }
.meter-track { height:.65rem; background:var(--surface-muted); border-radius:999px; overflow:hidden; }
.meter-fill { height:100%; background:var(--accent); border-radius:999px; transition:width .2s ease; }
.metric-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:.75rem; }
.metric { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; }
.metric-label { margin:0 0 .45rem; color:var(--text-faint); font-size:.78rem; }
.metric strong { font-size:1.1rem; }
</style>
