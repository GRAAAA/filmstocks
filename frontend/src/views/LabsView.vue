<template>
  <div class="container labs-page">
    <div class="page-header">
      <h1>Film Labs</h1>
      <p>Find labs worldwide, compare scans, and leave ratings.</p>
    </div>

    <form v-if="auth.isLoggedIn" class="lab-form" @submit.prevent="createLab">
      <input v-model.trim="newLab.name" placeholder="Lab name" required />
      <input v-model.trim="newLab.city" placeholder="City" />
      <input v-model.trim="newLab.country" placeholder="Country" />
      <input v-model.trim="newLab.website_url" placeholder="Website" />
      <button class="btn btn-primary" type="submit" :disabled="creating">{{ creating ? 'Adding...' : 'Add lab' }}</button>
    </form>

    <div v-if="loading" class="spinner" />
    <div v-else class="labs-grid">
      <article v-for="lab in labs" :key="lab.id" class="lab-card">
        <div class="lab-main">
          <h2>{{ lab.name }}</h2>
          <p>{{ [lab.city, lab.country].filter(Boolean).join(', ') || 'Worldwide' }}</p>
          <a v-if="lab.website_url" :href="lab.website_url" target="_blank" rel="noreferrer">Website</a>
        </div>
        <div class="lab-rating">
          <strong>{{ Number(lab.average_rating || 0).toFixed(1) }}</strong>
          <span>{{ lab.review_count }} reviews</span>
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
import { reactive, ref, onMounted } from 'vue';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const labs = ref([]);
const loading = ref(true);
const creating = ref(false);
const newLab = reactive({ name: '', city: '', country: '', website_url: '' });
const reviews = reactive({});

onMounted(loadLabs);

async function loadLabs() {
  loading.value = true;
  try {
    const { data } = await api.get('/labs');
    labs.value = data;
    for (const lab of labs.value) {
      reviews[lab.id] ||= { rating: 5, comment: '' };
    }
  } finally {
    loading.value = false;
  }
}

async function createLab() {
  creating.value = true;
  try {
    await api.post('/labs', newLab);
    Object.assign(newLab, { name: '', city: '', country: '', website_url: '' });
    await loadLabs();
  } finally {
    creating.value = false;
  }
}

async function reviewLab(lab) {
  await api.post(`/labs/${lab.id}/reviews`, reviews[lab.id]);
  reviews[lab.id] = { rating: 5, comment: '' };
  await loadLabs();
}
</script>

<style scoped>
.labs-page { padding-top:2rem; }
.lab-form { display:grid; grid-template-columns:1.2fr 1fr 1fr 1.2fr auto; gap:.75rem; margin-bottom:1.5rem; }
.lab-form input, .review-form input, .review-form select {
  background:var(--surface); border:1px solid var(--border); border-radius:6px; color:var(--text); padding:.65rem .75rem;
}
.labs-grid { display:grid; gap:.9rem; }
.lab-card { display:grid; grid-template-columns:1fr auto; gap:1rem; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; }
.lab-main h2 { font-size:1.05rem; margin-bottom:.2rem; }
.lab-main p, .lab-main a, .lab-rating span { color:var(--text-muted); font-size:.86rem; }
.lab-rating { text-align:right; }
.lab-rating strong { display:block; font-size:1.4rem; }
.review-form { grid-column:1 / -1; display:grid; grid-template-columns:120px 1fr auto; gap:.6rem; }
.review-form button { border:1px solid var(--border); background:var(--bg); color:var(--text); border-radius:6px; padding:.55rem .8rem; cursor:pointer; }
@media (max-width: 760px) {
  .lab-form, .lab-card, .review-form { grid-template-columns:1fr; }
  .lab-rating { text-align:left; }
}
</style>
