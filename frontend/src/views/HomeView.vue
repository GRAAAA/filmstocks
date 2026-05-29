<template>
  <!-- Full-screen hero -->
  <section v-if="!auth.isLoggedIn" class="hero" ref="heroEl">
    <div class="grain" />
    <div class="filmstrip top">
      <span v-for="n in 18" :key="n" class="perf" />
    </div>
    <div class="filmstrip bottom">
      <span v-for="n in 18" :key="n" class="perf" />
    </div>

    <div class="hero-inner">
      <p class="hero-eyebrow mono">analog photography community</p>
      <h1 class="hero-title">
        Every shot lives<br />in the film.
      </h1>
      <p class="hero-sub">
        Browse photos by the stock they were captured on.<br />
        Discover, share, and discuss analog photography.
      </p>
      <div class="hero-cta">
        <button class="btn btn-primary hero-btn" @click="scrollToStocks">Explore stocks</button>
        <RouterLink v-if="!auth.isLoggedIn" to="/register" class="btn btn-ghost hero-btn">Join the community</RouterLink>
      </div>
    </div>

    <button class="scroll-hint" @click="scrollToStocks" aria-label="Scroll down">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 5v14M5 12l7 7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </section>

  <!-- Stocks grid -->
  <div class="container stocks-page" ref="stocksEl">
    <div v-if="loading" class="spinner" style="margin-top:4rem" />

    <template v-else>
      <section class="discovery-panel" aria-label="Film stock discovery tools">
        <div class="discovery-copy">
          <span class="badge badge-discovery">Find your look</span>
          <h2>Choose film with real community context.</h2>
          <p>Search by stock, brand, ISO, or character before jumping into photos and discussion.</p>
        </div>

        <div class="discovery-controls">
          <label class="search-field">
            <span class="control-label">Search</span>
            <input
              v-model.trim="filters.query"
              type="search"
              placeholder="Try Kodak, 400, grain, portrait..."
            />
          </label>

          <div class="filter-grid">
            <label>
              <span class="control-label">Type</span>
              <select v-model="filters.type">
                <option value="all">All types</option>
                <option value="bw">Black & White</option>
                <option value="color_negative">Color Negative</option>
                <option value="reversal">Reversal / Slide</option>
              </select>
            </label>

            <label>
              <span class="control-label">Brand</span>
              <select v-model="filters.brand">
                <option value="all">All brands</option>
                <option v-for="brand in brands" :key="brand" :value="brand">{{ brand }}</option>
              </select>
            </label>

            <label>
              <span class="control-label">ISO</span>
              <select v-model="filters.iso">
                <option value="all">Any ISO</option>
                <option value="low">Low speed, 50-125</option>
                <option value="medium">Medium speed, 200-400</option>
                <option value="high">High speed, 800+</option>
              </select>
            </label>
          </div>

          <div class="result-row">
            <span class="mono">{{ filteredStocks.length }} of {{ allStocks.length }} stocks shown</span>
            <button v-if="hasActiveFilters" class="clear-btn" type="button" @click="clearFilters">
              Clear filters
            </button>
          </div>
        </div>
      </section>

      <section v-for="section in sections" :key="section.type" class="section">
        <div class="section-header">
          <span :class="['badge', section.badge]">{{ section.label }}</span>
          <span class="section-count mono">{{ section.stocks.length }} stocks</span>
        </div>
        <p class="section-desc">{{ section.desc }}</p>
        <div class="stocks-grid">
          <FilmStockCard v-for="stock in section.stocks" :key="stock.id" :stock="stock" />
        </div>
      </section>

      <div v-if="allStocks.length === 0" class="empty-state">
        <p>{{ loadError || 'No film stocks yet. An admin will add some soon.' }}</p>
      </div>
      <div v-else-if="filteredStocks.length === 0" class="empty-state">
        <p>No film stocks match those filters.</p>
        <button class="btn btn-ghost" type="button" @click="clearFilters">Show all stocks</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';
import FilmStockCard from '../components/films/FilmStockCard.vue';

const auth      = useAuthStore();
const allStocks = ref([]);
const loading   = ref(true);
const stocksEl  = ref(null);
const loadError = ref('');
const filters   = reactive({ query: '', type: 'all', brand: 'all', iso: 'all' });

onMounted(async () => {
  try {
    const { data } = await api.get('/filmstocks');
    allStocks.value = normalizeStockList(data);
    if (!allStocks.value.length && !Array.isArray(data)) {
      loadError.value = 'Could not load film stocks. Check that the deployed API URL is configured.';
    }
  } catch {
    allStocks.value = [];
    loadError.value = 'Could not load film stocks. Check that the backend API is deployed and reachable.';
  } finally {
    loading.value = false;
  }
});

const stockList = computed(() => Array.isArray(allStocks.value) ? allStocks.value : []);
const brands = computed(() => [...new Set(stockList.value.map(stock => stock.brand).filter(Boolean))].sort());

const filteredStocks = computed(() => {
  const query = filters.query.toLowerCase();

  return stockList.value.filter(stock => {
    const matchesQuery = !query || [
      stock.name,
      stock.brand,
      stock.type,
      stock.iso?.toString(),
      stock.description,
      stock.characteristics,
    ].some(value => value?.toLowerCase().includes(query));

    const matchesType = filters.type === 'all' || stock.type === filters.type;
    const matchesBrand = filters.brand === 'all' || stock.brand === filters.brand;
    const matchesIso = filters.iso === 'all' || isoGroup(stock.iso) === filters.iso;

    return matchesQuery && matchesType && matchesBrand && matchesIso;
  });
});

const hasActiveFilters = computed(() => (
  filters.query || filters.type !== 'all' || filters.brand !== 'all' || filters.iso !== 'all'
));

const sections = computed(() => [
  {
    type: 'bw', badge: 'badge-bw', label: 'Black & White',
    desc: 'The timeless art of tonal photography — from silky smooth to gloriously grainy.',
    stocks: filteredStocks.value.filter(s => s.type === 'bw'),
  },
  {
    type: 'color_negative', badge: 'badge-neg', label: 'Color Negative',
    desc: 'C-41 color film — the most forgiving format, from warm Kodak hues to cool Fuji tones.',
    stocks: filteredStocks.value.filter(s => s.type === 'color_negative'),
  },
  {
    type: 'reversal', badge: 'badge-rev', label: 'Reversal / Slide',
    desc: 'E-6 transparency film — punchy, saturated, demanding. The professional\'s choice.',
    stocks: filteredStocks.value.filter(s => s.type === 'reversal'),
  },
].filter(s => s.stocks.length > 0));

function scrollToStocks() {
  stocksEl.value?.scrollIntoView({ behavior: 'smooth' });
}

function isoGroup(iso) {
  if (!iso) return '';
  if (iso <= 125) return 'low';
  if (iso <= 400) return 'medium';
  return 'high';
}

function clearFilters() {
  Object.assign(filters, { query: '', type: 'all', brand: 'all', iso: 'all' });
}

function normalizeStockList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
</script>

<style scoped>
/* ── Hero ──────────────────────────────────────────────── */
.hero {
  position: relative;
  height: calc(100vh - 60px);
  min-height: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg);
}

/* Film grain overlay */
.grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.55;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  mix-blend-mode: overlay;
}

/* Film strip perforations */
.filmstrip {
  position: absolute;
  left: 0; right: 0;
  height: 42px;
  display: flex;
  align-items: center;
  gap: 0;
  background: #111;
  border-top: 1px solid #222;
  border-bottom: 1px solid #222;
}
.filmstrip.top    { top: 0; }
.filmstrip.bottom { bottom: 0; }

.perf {
  flex: 1;
  height: 22px;
  max-width: 28px;
  border-radius: 4px;
  background: var(--bg);
  margin: 0 6px;
  opacity: 0.9;
}

/* Hero content */
.hero-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 0 1.5rem;
  max-width: 720px;
}

.hero-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.hero-title {
  font-size: clamp(2.8rem, 6vw, 5rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  color: var(--text);
}

.hero-sub {
  font-size: clamp(0.95rem, 1.8vw, 1.1rem);
  color: var(--text-muted);
  line-height: 1.7;
  margin-bottom: 2.5rem;
}

.hero-cta {
  display: flex;
  gap: 0.85rem;
  justify-content: center;
  flex-wrap: wrap;
}

.hero-btn {
  padding: 0.75rem 1.75rem;
  font-size: 0.95rem;
}

/* Scroll indicator */
.scroll-hint {
  position: absolute;
  bottom: 58px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--text-faint);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  animation: bounce 2.4s ease-in-out infinite;
  transition: color 0.15s;
  z-index: 1;
}
.scroll-hint:hover { color: var(--text); }

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%       { transform: translateX(-50%) translateY(6px); }
}

/* ── Stocks grid ───────────────────────────────────────── */
.stocks-page { padding-top: 3.5rem; padding-bottom: 4rem; }

.discovery-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(320px, 1.15fr);
  gap: 1.5rem;
  align-items: start;
  padding: 1.5rem 0 2.75rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2.75rem;
}

.discovery-copy h2 {
  font-size: clamp(1.6rem, 3vw, 2.35rem);
  line-height: 1.15;
  font-weight: 650;
  margin: 0.9rem 0 0.65rem;
  max-width: 520px;
}

.discovery-copy p {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.65;
  max-width: 500px;
}

.badge-discovery {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border-hover);
}

.discovery-controls {
  display: grid;
  gap: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
}

.control-label {
  display: block;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 2rem;
  color: var(--text-faint);
  font-size: 0.78rem;
}

.clear-btn {
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 600;
}

.clear-btn:hover { color: #fff; }

.section { margin-bottom: 3.5rem; }
.section-header {
  display: flex; align-items: center; gap: 1rem;
  margin-bottom: 0.5rem;
}
.section-count { font-size: 0.78rem; color: var(--text-faint); }
.section-desc  { color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.2rem; }
.stocks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 1.25rem;
}

@media (max-width: 820px) {
  .discovery-panel {
    grid-template-columns: 1fr;
    padding-top: 0.5rem;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .result-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
