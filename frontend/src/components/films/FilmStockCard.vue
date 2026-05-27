<template>
  <RouterLink :to="`/stock/${stock.id}`" class="film-card">
    <div class="film-cover" :style="stock.cover_image_url ? `background-image:url(${stock.cover_image_url})` : ''">
      <div class="film-cover-overlay" />
      <div v-if="!stock.cover_image_url" class="film-cover-placeholder">
        <span class="placeholder-iso mono">ISO {{ stock.iso || '—' }}</span>
      </div>
    </div>
    <div class="film-body">
      <div class="film-top">
        <span :class="['badge', typeBadge]">{{ typeLabel }}</span>
        <span class="film-iso mono">ISO {{ stock.iso || '?' }}</span>
      </div>
      <h3 class="film-name">{{ stock.name }}</h3>
      <p class="film-brand">{{ stock.brand }}</p>
      <p class="film-desc">{{ stock.description }}</p>
      <div class="film-stats">
        <span>{{ stock.photo_count }} photo{{ stock.photo_count !== 1 ? 's' : '' }}</span>
        <span>{{ stock.post_count }} post{{ stock.post_count !== 1 ? 's' : '' }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ stock: Object });

const typeLabel = computed(() => ({
  bw:             'B & W',
  color_negative: 'Color Neg',
  reversal:       'Reversal',
}[props.stock.type]));

const typeBadge = computed(() => ({
  bw:             'badge-bw',
  color_negative: 'badge-neg',
  reversal:       'badge-rev',
}[props.stock.type]));
</script>

<style scoped>
.film-card {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.18s;
  cursor: pointer;
}
.film-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}
.film-cover {
  height: 160px;
  background: var(--surface-2);
  background-size: cover;
  background-position: center;
  position: relative;
}
.film-cover-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 60%);
}
.film-cover-placeholder {
  position: absolute; inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder-iso { font-size: 0.85rem; color: var(--text-faint); }
.film-body { padding: 1rem 1.1rem 1.2rem; flex: 1; display: flex; flex-direction: column; gap: 0.35rem; }
.film-top  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.15rem; }
.film-iso  { font-size: 0.75rem; color: var(--text-faint); }
.film-name { font-size: 1.05rem; font-weight: 600; }
.film-brand{ font-size: 0.82rem; color: var(--text-muted); }
.film-desc { font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;
             display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }
.film-stats{ display: flex; gap: 1rem; font-size: 0.78rem; color: var(--text-faint); margin-top: 0.5rem; font-family: 'DM Mono', monospace; }
</style>
