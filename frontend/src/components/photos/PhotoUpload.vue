<template>
  <div class="upload-panel">
    <h3 class="upload-heading">Upload a photo</h3>
    <form @submit.prevent="handleSubmit">
      <div class="upload-steps" role="tablist" aria-label="Upload steps">
        <button type="button" :class="{ active: step === 1 }" @click="step = 1">1. Placement</button>
        <button type="button" :class="{ active: step === 2 }" :disabled="!file" @click="step = 2">2. Details</button>
      </div>

      <section v-if="step === 1" class="upload-step">
        <div
          class="drop-zone"
          :class="{ dragging, 'has-file': previewUrl }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
          @click="fileInput.click()"
        >
          <div v-if="previewUrl" class="drop-preview-frame" :style="framePreviewStyle">
            <img :src="previewUrl" class="drop-preview" alt="Selected photo preview" />
          </div>
          <div v-else class="drop-hint">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" opacity=".4">
              <path d="M19 7v3h-2V7h-3V5h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h-5zM5 19l3-4 2 3 3-4 4 5H5z"/>
            </svg>
            <p>Click or drag an image here</p>
            <span>JPG, PNG, WebP up to 10 MB</span>
          </div>
          <input ref="fileInput" type="file" accept="image/*" class="file-input" @change="onFileChange" />
        </div>

        <div class="frame-designer">
          <div class="frame-designer-head">
            <div>
              <h4>Gallery frame</h4>
              <p>Place the image, then shape the border and space around it.</p>
            </div>
            <button type="button" class="reset-frame-btn" @click.stop="resetFrame">Reset</button>
          </div>

          <div class="frame-layout">
            <div class="placement-panel">
              <label>Image placement</label>
              <div class="placement-grid">
                <button
                  v-for="position in imagePositions"
                  :key="position.value"
                  type="button"
                  :class="{ active: form.frameImagePosition === position.value }"
                  :title="position.label"
                  @click.stop="form.frameImagePosition = position.value"
                />
              </div>
            </div>

            <div class="frame-controls">
              <div class="form-group">
                <label>Background</label>
                <div class="swatches">
                  <button
                    v-for="color in backgroundSwatches"
                    :key="color"
                    type="button"
                    :class="['swatch', { active: form.frameBackgroundColor === color }]"
                    :style="{ backgroundColor: color }"
                    :title="color"
                    @click.stop="form.frameBackgroundColor = color"
                  />
                  <input v-model="form.frameBackgroundColor" type="color" class="color-input" title="Custom background" />
                </div>
              </div>
              <div class="form-group">
                <label>Border</label>
                <div class="swatches">
                  <button
                    v-for="color in borderSwatches"
                    :key="color"
                    type="button"
                    :class="['swatch', { active: form.frameBorderColor === color }]"
                    :style="{ backgroundColor: color }"
                    :title="color"
                    @click.stop="form.frameBorderColor = color"
                  />
                  <input v-model="form.frameBorderColor" type="color" class="color-input" title="Custom border" />
                </div>
              </div>
              <div class="form-group">
                <label>Gap</label>
                <div class="stepper">
                  <button type="button" @click.stop="adjustFrame('frameGapPx', -4)">-</button>
                  <strong>{{ form.frameGapPx }}px</strong>
                  <button type="button" @click.stop="adjustFrame('frameGapPx', 4)">+</button>
                </div>
              </div>
              <div class="form-group">
                <label>Border width</label>
                <div class="stepper">
                  <button type="button" @click.stop="adjustFrame('frameBorderWidthPx', -1)">-</button>
                  <strong>{{ form.frameBorderWidthPx }}px</strong>
                  <button type="button" @click.stop="adjustFrame('frameBorderWidthPx', 1)">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button type="button" class="btn btn-primary step-next" :disabled="!file" @click="step = 2">
          Continue to details
        </button>
      </section>

      <section v-else class="upload-step">
        <div class="detail-preview">
          <div class="detail-preview-frame" :style="framePreviewStyle">
            <img v-if="previewUrl" :src="previewUrl" class="drop-preview" alt="Selected photo preview" />
          </div>
          <button type="button" @click="step = 1">Edit placement</button>
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
            <label>Camera make</label>
            <input v-model="form.cameraMake" type="text" placeholder="e.g. Nikon, Canon, Leica" maxlength="100" />
          </div>
          <div class="form-group">
            <label>Camera model</label>
            <input v-model="form.cameraModel" type="text" placeholder="e.g. FM2, AE-1, M6" maxlength="100" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Lens</label>
            <input v-model="form.lensModel" type="text" placeholder="e.g. 50mm f/1.4 Nikkor" maxlength="100" />
          </div>
          <div class="form-group">
            <label>Focal length (mm)</label>
            <input v-model.number="form.focalLengthMm" type="number" min="1" max="2000" placeholder="e.g. 50" />
          </div>
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
      </section>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button v-if="step === 2" type="submit" class="btn btn-primary" :disabled="!file || uploading" style="width:100%">
        {{ uploading ? 'Uploading…' : 'Upload photo' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
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
const step       = ref(1);
const defaultFrame = {
  frameBackgroundColor: '#ffffff',
  frameGapPx: 24,
  frameBorderWidthPx: 0,
  frameBorderColor: '#111111',
  frameImagePosition: 'center center',
};
const backgroundSwatches = ['#ffffff', '#f5f0e6', '#e8e8e8', '#111111'];
const borderSwatches = ['#111111', '#ffffff', '#b9a16b', '#8b2f2f'];
const imagePositions = [
  { value: 'left top', label: 'Top left' },
  { value: 'center top', label: 'Top center' },
  { value: 'right top', label: 'Top right' },
  { value: 'left center', label: 'Center left' },
  { value: 'center center', label: 'Center' },
  { value: 'right center', label: 'Center right' },
  { value: 'left bottom', label: 'Bottom left' },
  { value: 'center bottom', label: 'Bottom center' },
  { value: 'right bottom', label: 'Bottom right' },
];
const form = reactive({
  title: '',
  description: '',
  cameraMake: '',
  cameraModel: '',
  lensModel: '',
  focalLengthMm: '',
  scannerModel: '',
  labId: '',
  ...defaultFrame,
});

const framePreviewStyle = computed(() => ({
  backgroundColor: form.frameBackgroundColor,
  padding: `${form.frameGapPx}px`,
  border: `${form.frameBorderWidthPx}px solid ${form.frameBorderColor}`,
  justifyContent: frameAlignment.value.justifyContent,
  alignItems: frameAlignment.value.alignItems,
}));
const frameAlignment = computed(() => {
  const [horizontal = 'center', vertical = 'center'] = String(form.frameImagePosition).split(' ');
  return {
    justifyContent: ({ left: 'flex-start', center: 'center', right: 'flex-end' })[horizontal] || 'center',
    alignItems: ({ top: 'flex-start', center: 'center', bottom: 'flex-end' })[vertical] || 'center',
  };
});

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
    if (form.cameraMake)    fd.append('cameraMake', form.cameraMake);
    if (form.cameraModel)   fd.append('cameraModel', form.cameraModel);
    if (form.lensModel)     fd.append('lensModel', form.lensModel);
    if (form.focalLengthMm) fd.append('focalLengthMm', form.focalLengthMm);
    if (form.scannerModel)  fd.append('scannerModel', form.scannerModel);
    if (form.labId)         fd.append('labId', form.labId);
    if (form.title)       fd.append('title', form.title);
    if (form.description) fd.append('description', form.description);
    fd.append('frameBackgroundColor', form.frameBackgroundColor);
    fd.append('frameGapPx', form.frameGapPx);
    fd.append('frameBorderWidthPx', form.frameBorderWidthPx);
    fd.append('frameBorderColor', form.frameBorderColor);
    fd.append('frameImagePosition', form.frameImagePosition);

    const { data } = await api.post('/photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    emit('uploaded', data);
    file.value = null;
    previewUrl.value = null;
    form.title = '';
    form.description = '';
    form.cameraMake = '';
    form.cameraModel = '';
    form.lensModel = '';
    form.focalLengthMm = '';
    form.scannerModel = '';
    form.labId = '';
    resetFrame();
    step.value = 1;
    fileInput.value.value = '';
    toast('Photo uploaded!');
  } catch (err) {
    error.value = err.response?.data?.message || 'Upload failed';
  } finally {
    uploading.value = false;
  }
}

function resetFrame() {
  Object.assign(form, defaultFrame);
}

function adjustFrame(field, amount) {
  const limits = {
    frameGapPx: [0, 80],
    frameBorderWidthPx: [0, 24],
  };
  const [min, max] = limits[field];
  form[field] = Math.min(Math.max(Number(form[field] || 0) + amount, min), max);
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
.upload-steps {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: .5rem;
  margin-bottom: 1rem;
}
.upload-steps button {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--text-muted);
  padding: .65rem .75rem;
  font-size: .86rem;
}
.upload-steps button.active {
  color: var(--text);
  border-color: var(--border-hover);
  background: var(--surface-3);
}
.upload-steps button:disabled {
  opacity: .45;
  cursor: default;
}
.upload-step {
  display: grid;
  gap: 1rem;
}
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
  background: #0f0f0f;
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
.drop-preview-frame {
  max-width: 100%;
  max-height: 100%;
  display: flex;
  min-width: min(100%, 320px);
  min-height: min(100%, 220px);
  box-shadow: 0 14px 40px rgba(0,0,0,.32);
}
.drop-preview-frame .drop-preview {
  max-width: 100%;
  max-height: 380px;
  width: auto;
  height: auto;
}
.file-input { display: none; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.frame-designer {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.2rem;
  background: var(--surface-2);
}
.frame-layout {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}
.placement-panel {
  display: grid;
  gap: .55rem;
}
.placement-panel label {
  font-size: .85rem;
  color: var(--text-muted);
  font-weight: 500;
}
.placement-grid {
  display: grid;
  grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(3, 44px);
  gap: .38rem;
}
.placement-grid button {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  position: relative;
}
.placement-grid button::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--text-faint);
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
}
.placement-grid button.active {
  border-color: var(--text);
  background: var(--surface-3);
}
.placement-grid button.active::before {
  background: var(--text);
}
.frame-designer-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}
.frame-designer h4 {
  font-size: .95rem;
  font-weight: 600;
}
.frame-designer p {
  color: var(--text-muted);
  font-size: .8rem;
  margin-top: .1rem;
}
.reset-frame-btn {
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: .32rem .65rem;
  font-size: .78rem;
}
.reset-frame-btn:hover {
  color: var(--text);
  border-color: var(--border-hover);
}
.frame-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .95rem 1rem;
}
.frame-controls .form-group {
  margin-bottom: 0;
}
.swatches {
  display: flex;
  gap: .45rem;
  align-items: center;
}
.swatch,
.color-input {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid var(--border-hover);
  padding: 0;
  flex: 0 0 auto;
}
.swatch.active {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}
.color-input {
  overflow: hidden;
  background: transparent;
}
.stepper {
  display: grid;
  grid-template-columns: 38px minmax(54px, 1fr) 38px;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg);
}
.stepper button {
  height: 38px;
  color: var(--text);
  background: var(--surface-3);
  font-size: 1rem;
}
.stepper strong {
  text-align: center;
  font-size: .86rem;
}
.step-next {
  width: 100%;
  justify-content: center;
}
.detail-preview {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: .85rem;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: .75rem;
  background: var(--surface-2);
}
.detail-preview-frame {
  height: 88px;
  display: flex;
  box-shadow: 0 10px 28px rgba(0,0,0,.25);
  overflow: hidden;
}
.detail-preview-frame img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}
.detail-preview button {
  justify-self: start;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: .45rem .7rem;
}

@media (max-width: 720px) {
  .upload-panel { padding: 1rem; }
  .drop-zone {
    min-height: 180px;
    aspect-ratio: 4 / 3;
  }
  .form-row { grid-template-columns:1fr; gap:0; }
  .frame-layout { grid-template-columns:1fr; }
  .frame-controls { grid-template-columns:1fr; }
  .detail-preview { grid-template-columns:1fr; }
}
</style>
