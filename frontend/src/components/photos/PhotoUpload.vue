<template>
  <div class="upload-panel">
    <h3 class="upload-heading">Upload a photo</h3>
    <form @submit.prevent="handleSubmit">
      <div
        class="drop-zone"
        :class="{ dragging, 'has-file': previewUrl }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
        @click="fileInput.click()"
      >
        <img v-if="previewUrl" :src="previewUrl" class="drop-preview" alt="Selected photo preview" />
        <div v-else class="drop-hint">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" opacity=".4">
            <path d="M19 7v3h-2V7h-3V5h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h-5zM5 19l3-4 2 3 3-4 4 5H5z"/>
          </svg>
          <p>Click or drag an image here</p>
          <span>JPG, PNG, WebP up to 10 MB</span>
        </div>
        <input ref="fileInput" type="file" accept="image/*" class="file-input" @change="onFileChange" />
      </div>

      <div class="form-group" style="margin-top:1rem">
        <label>Title (optional)</label>
        <input v-model="form.title" type="text" placeholder="e.g. Morning light on Tri-X" maxlength="200" />
      </div>
      <div class="form-group">
        <label>Description (optional)</label>
        <textarea v-model="form.description" rows="3" placeholder="Camera, lens, exposure info..." maxlength="1000" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Scanner</label>
          <select v-model="form.scannerModel">
            <option value="">Unknown / not sure</option>
            <option value="Frontier">Frontier</option>
            <option value="Noritsu">Noritsu</option>
            <option value="Drum scan">Drum scan</option>
            <option value="DSLR scan">DSLR scan</option>
            <option value="Flatbed">Flatbed</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Film lab</label>
          <select v-model="form.labId">
            <option value="">No lab selected</option>
            <option v-for="lab in labs" :key="lab.id" :value="lab.id">
              {{ lab.name }}{{ lab.city ? `, ${lab.city}` : '' }}
            </option>
          </select>
        </div>
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button type="submit" class="btn btn-primary" :disabled="!file || uploading" style="width:100%">
        {{ uploading ? 'Uploading…' : 'Upload photo' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { inject } from 'vue';
import api from '../../services/api.js';

const props = defineProps({ filmStockId: [Number, String] });
const emit  = defineEmits(['uploaded']);
const toast = inject('showToast');

const file       = ref(null);
const previewUrl = ref(null);
const fileInput  = ref(null);
const dragging   = ref(false);
const uploading  = ref(false);
const error      = ref('');
const labs       = ref([]);
const form       = reactive({ title: '', description: '', scannerModel: '', labId: '' });

onMounted(async () => {
  try {
    const { data } = await api.get('/labs');
    labs.value = data;
  } catch {
    labs.value = [];
  }
});

function setFile(f) {
  if (!f || !f.type.startsWith('image/')) { error.value = 'Please select an image file.'; return; }
  file.value = f;
  error.value = '';
  previewUrl.value = URL.createObjectURL(f);
}
function onFileChange(e) { setFile(e.target.files[0]); }
function onDrop(e) { dragging.value = false; setFile(e.dataTransfer.files[0]); }

async function handleSubmit() {
  if (!file.value) return;
  uploading.value = true;
  error.value = '';
  try {
    const optimizedFile = await optimizeImage(file.value);
    const fd = new FormData();
    fd.append('image', optimizedFile);
    fd.append('filmStockId', props.filmStockId);
    fd.append('originalSizeBytes', file.value.size);
    if (form.scannerModel) fd.append('scannerModel', form.scannerModel);
    if (form.labId)        fd.append('labId', form.labId);
    if (form.title)       fd.append('title', form.title);
    if (form.description) fd.append('description', form.description);

    const { data } = await api.post('/photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    emit('uploaded', data);
    file.value = null;
    previewUrl.value = null;
    form.title = '';
    form.description = '';
    form.scannerModel = '';
    form.labId = '';
    fileInput.value.value = '';
    toast('Photo uploaded!');
  } catch (err) {
    error.value = err.response?.data?.message || 'Upload failed';
  } finally {
    uploading.value = false;
  }
}

async function optimizeImage(sourceFile) {
  if (sourceFile.type === 'image/gif') return sourceFile;

  const bitmap = await createImageBitmap(sourceFile);
  const maxWidth = 2000;
  const scale = Math.min(maxWidth / bitmap.width, 1);
  const width = Math.max(Math.round(bitmap.width * scale), 1);
  const height = Math.max(Math.round(bitmap.height * scale), 1);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.78));
  if (!blob || blob.size >= sourceFile.size) return sourceFile;

  const baseName = sourceFile.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${baseName}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}
</script>

<style scoped>
.upload-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.5rem;
  max-width: 920px;
}
.upload-heading { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }
.drop-zone {
  border: 2px dashed var(--border);
  border-radius: 8px;
  min-height: 220px;
  max-height: 460px;
  aspect-ratio: 16 / 9;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s;
  overflow: hidden;
  position: relative;
}
.drop-zone.dragging, .drop-zone:hover { border-color: var(--accent); }
.drop-zone.has-file {
  border-style: solid;
}
.drop-hint { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; color: var(--text-muted); text-align: center; padding: 1.5rem; }
.drop-hint p { font-size: 0.9rem; }
.drop-hint span { font-size: 0.78rem; color: var(--text-faint); }
.drop-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.file-input { display: none; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }

@media (max-width: 720px) {
  .upload-panel { padding: 1rem; }
  .drop-zone {
    min-height: 180px;
    aspect-ratio: 4 / 3;
  }
  .form-row { grid-template-columns:1fr; gap:0; }
}
</style>
