<template>
  <div class="container labs-page">
    <div class="page-header">
      <h1>Film Labs</h1>
      <p>Find labs worldwide, compare scans, and request updates.</p>
    </div>

    <section class="lab-map" aria-label="Worldwide lab map">
      <div
        v-for="lab in mappedLabs"
        :key="lab.id"
        class="map-pin"
        :class="{ active: selectedLab?.id === lab.id }"
        :style="{ left: `${lngToX(lab.longitude)}%`, top: `${latToY(lab.latitude)}%` }"
        :title="lab.name"
        @click="selectedLab = lab"
      />
      <div class="map-empty" v-if="!mappedLabs.length">Add coordinates to show labs on the map.</div>
    </section>

    <section v-if="auth.isAdmin" class="lab-form">
      <h2>Add lab</h2>
      <div class="form-grid">
        <input v-model.trim="newLab.name" placeholder="Lab name" />
        <input v-model.trim="newLab.city" placeholder="City" />
        <input v-model.trim="newLab.country" placeholder="Country" />
        <input v-model.number="newLab.latitude" type="number" step="0.000001" placeholder="Latitude" />
        <input v-model.number="newLab.longitude" type="number" step="0.000001" placeholder="Longitude" />
        <input v-model.trim="newLab.opening_hours" placeholder="Opening hours" />
        <input v-model.trim="newLab.website_url" placeholder="Website" />
        <button class="btn btn-primary" type="button" :disabled="creating || !newLab.name" @click="createLab">
          {{ creating ? 'Adding...' : 'Add lab' }}
        </button>
      </div>
    </section>

    <section v-else-if="auth.isLoggedIn" class="lab-form">
      <h2>Request a lab change</h2>
      <div class="form-grid">
        <select v-model="requestForm.request_type">
          <option value="add">Add lab</option>
          <option value="update">Update lab</option>
          <option value="delete">Delete lab</option>
        </select>
        <select v-if="requestForm.request_type !== 'add'" v-model="requestForm.lab_id">
          <option value="">Select lab</option>
          <option v-for="lab in labs" :key="lab.id" :value="lab.id">{{ lab.name }}</option>
        </select>
        <input v-if="requestForm.request_type !== 'delete'" v-model.trim="requestForm.name" placeholder="Lab name" />
        <input v-if="requestForm.request_type !== 'delete'" v-model.trim="requestForm.city" placeholder="City" />
        <input v-if="requestForm.request_type !== 'delete'" v-model.trim="requestForm.country" placeholder="Country" />
        <input v-if="requestForm.request_type !== 'delete'" v-model.number="requestForm.latitude" type="number" step="0.000001" placeholder="Latitude" />
        <input v-if="requestForm.request_type !== 'delete'" v-model.number="requestForm.longitude" type="number" step="0.000001" placeholder="Longitude" />
        <input v-if="requestForm.request_type !== 'delete'" v-model.trim="requestForm.opening_hours" placeholder="Opening hours" />
        <input v-if="requestForm.request_type !== 'delete'" v-model.trim="requestForm.website_url" placeholder="Website" />
        <input v-model.trim="requestForm.note" placeholder="Reason / details" />
        <button class="btn btn-primary" type="button" :disabled="requesting" @click="requestLabChange">
          {{ requesting ? 'Sending...' : 'Send request' }}
        </button>
      </div>
    </section>

    <section v-if="auth.isAdmin && requests.length" class="requests-panel">
      <h2>Pending requests</h2>
      <article v-for="request in requests" :key="request.id" class="request-card">
        <div>
          <strong>{{ request.request_type }}</strong>
          <span>{{ request.username }} · {{ request.lab_name || request.name || 'New lab' }}</span>
          <p>{{ request.note || request.opening_hours || request.website_url || 'No note' }}</p>
        </div>
        <div class="request-actions">
          <button type="button" @click="resolveRequest(request, 'approve')">Approve</button>
          <button type="button" @click="resolveRequest(request, 'reject')">Reject</button>
        </div>
      </article>
    </section>

    <div v-if="loading" class="spinner" />
    <div v-else class="labs-grid">
      <article v-for="lab in labs" :key="lab.id" class="lab-card" :class="{ selected: selectedLab?.id === lab.id }">
        <div class="lab-main">
          <h2>{{ lab.name }}</h2>
          <p>{{ [lab.city, lab.country].filter(Boolean).join(', ') || 'Worldwide' }}</p>
          <p v-if="lab.opening_hours">Hours: {{ lab.opening_hours }}</p>
          <p v-if="lab.latitude && lab.longitude" class="mono">{{ Number(lab.latitude).toFixed(4) }}, {{ Number(lab.longitude).toFixed(4) }}</p>
          <a v-if="lab.website_url" :href="lab.website_url" target="_blank" rel="noreferrer">Website</a>
        </div>
        <div class="lab-rating">
          <strong>{{ Number(lab.average_rating || 0).toFixed(1) }}</strong>
          <span>{{ lab.review_count }} reviews</span>
          <button v-if="auth.isAdmin" class="delete-lab" type="button" @click="deleteLab(lab)">Delete</button>
        </div>
        <form v-if="auth.isLoggedIn" class="review-form" @submit.prevent="reviewLab(lab)">
          <select v-model="reviews[lab.id].rating">
            <option v-for="n in 5" :key="n" :value="n">{{ n }} stars</option>
          </select>
          <input v-model.trim="reviews[lab.id].comment" placeholder="Comment on scans, turnaround, service..." />
          <button type="submit">Review</button>
        </form>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const labs = ref([]);
const requests = ref([]);
const selectedLab = ref(null);
const loading = ref(true);
const creating = ref(false);
const requesting = ref(false);
const newLab = reactive({ name: '', city: '', country: '', latitude: '', longitude: '', opening_hours: '', website_url: '' });
const requestForm = reactive({ request_type: 'add', lab_id: '', name: '', city: '', country: '', latitude: '', longitude: '', opening_hours: '', website_url: '', note: '' });
const reviews = reactive({});

const mappedLabs = computed(() => labs.value.filter(lab => Number.isFinite(Number(lab.latitude)) && Number.isFinite(Number(lab.longitude))));

onMounted(async () => {
  await loadLabs();
  if (auth.isAdmin) await loadRequests();
});

async function loadLabs() {
  loading.value = true;
  try {
    const { data } = await api.get('/labs');
    labs.value = data;
    selectedLab.value ||= mappedLabs.value[0] || null;
    for (const lab of labs.value) reviews[lab.id] ||= { rating: 5, comment: '' };
  } finally {
    loading.value = false;
  }
}

async function loadRequests() {
  const { data } = await api.get('/admin/lab-requests');
  requests.value = data;
}

async function createLab() {
  creating.value = true;
  try {
    await api.post('/labs', normalizePayload(newLab));
    Object.assign(newLab, { name: '', city: '', country: '', latitude: '', longitude: '', opening_hours: '', website_url: '' });
    await loadLabs();
  } finally {
    creating.value = false;
  }
}

async function requestLabChange() {
  requesting.value = true;
  try {
    await api.post('/lab-requests', normalizePayload(requestForm));
    Object.assign(requestForm, { request_type: 'add', lab_id: '', name: '', city: '', country: '', latitude: '', longitude: '', opening_hours: '', website_url: '', note: '' });
  } finally {
    requesting.value = false;
  }
}

async function resolveRequest(request, action) {
  await api.post(`/admin/lab-requests/${request.id}/${action}`);
  await Promise.all([loadLabs(), loadRequests()]);
}

async function deleteLab(lab) {
  if (!confirm(`Delete ${lab.name}?`)) return;
  await api.delete(`/labs/${lab.id}`);
  await loadLabs();
}

async function reviewLab(lab) {
  await api.post(`/labs/${lab.id}/reviews`, reviews[lab.id]);
  reviews[lab.id] = { rating: 5, comment: '' };
  await loadLabs();
}

function normalizePayload(source) {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value === '' ? null : value]));
}

function lngToX(lng) {
  return ((Number(lng) + 180) / 360) * 100;
}

function latToY(lat) {
  return ((90 - Number(lat)) / 180) * 100;
}
</script>

<style scoped>
.labs-page { padding-top:2rem; padding-bottom:3rem; }
.lab-map {
  position:relative; height:360px; border:1px solid var(--border); border-radius:8px; overflow:hidden; margin-bottom:1rem;
  background:
    linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px),
    radial-gradient(circle at 25% 35%, rgba(255,255,255,.12), transparent 18%),
    radial-gradient(circle at 70% 45%, rgba(255,255,255,.1), transparent 22%),
    #101010;
  background-size: 40px 40px, 40px 40px, 100% 100%, 100% 100%, auto;
}
.map-pin { position:absolute; width:14px; height:14px; border-radius:50%; background:var(--text); border:2px solid var(--bg); transform:translate(-50%, -50%); cursor:pointer; box-shadow:0 0 0 6px rgba(255,255,255,.08); }
.map-pin.active { background:var(--accent); }
.map-empty { position:absolute; inset:0; display:grid; place-items:center; color:var(--text-faint); }
.lab-form, .requests-panel { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; margin-bottom:1rem; }
.lab-form h2, .requests-panel h2 { font-size:1rem; margin-bottom:.85rem; }
.form-grid { display:grid; grid-template-columns:repeat(4, 1fr) auto; gap:.65rem; }
.form-grid input, .form-grid select, .review-form input, .review-form select {
  background:var(--bg); border:1px solid var(--border); border-radius:6px; color:var(--text); padding:.65rem .75rem;
}
.requests-panel { display:grid; gap:.75rem; }
.request-card { display:flex; justify-content:space-between; gap:1rem; border-top:1px solid var(--border); padding-top:.75rem; }
.request-card span, .request-card p { display:block; color:var(--text-muted); font-size:.86rem; margin-top:.2rem; }
.request-actions { display:flex; gap:.5rem; align-items:start; }
.request-actions button, .review-form button, .delete-lab { border:1px solid var(--border); background:var(--bg); color:var(--text); border-radius:6px; padding:.55rem .8rem; cursor:pointer; }
.labs-grid { display:grid; gap:.9rem; }
.lab-card { display:grid; grid-template-columns:1fr auto; gap:1rem; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; }
.lab-card.selected { border-color:var(--border-hover); }
.lab-main h2 { font-size:1.05rem; margin-bottom:.2rem; }
.lab-main p, .lab-main a, .lab-rating span { color:var(--text-muted); font-size:.86rem; }
.lab-rating { text-align:right; }
.lab-rating strong { display:block; font-size:1.4rem; }
.delete-lab { margin-top:.6rem; color:var(--danger); }
.review-form { grid-column:1 / -1; display:grid; grid-template-columns:120px 1fr auto; gap:.6rem; }
@media (max-width: 820px) {
  .lab-map { height:260px; }
  .form-grid, .lab-card, .review-form { grid-template-columns:1fr; }
  .lab-rating { text-align:left; }
  .request-card { flex-direction:column; }
}
</style>
