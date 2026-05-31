<template>
  <div class="container labs-page">
    <div class="page-header">
      <h1>Film Labs</h1>
      <p>Find labs worldwide, compare scans, and request updates.</p>
    </div>

    <section class="location-tools">
      <form class="area-search" @submit.prevent="searchArea">
        <input v-model.trim="areaQuery" placeholder="Search city, neighborhood, or address" />
        <button class="btn btn-primary" type="submit" :disabled="mapLoading || !areaQuery">
          Search area
        </button>
      </form>
      <div class="location-actions">
        <button class="btn btn-primary" type="button" :disabled="locating" @click="useCurrentLocation">
          {{ locating ? 'Locating...' : 'Use my location' }}
        </button>
        <select v-model.number="radiusKm">
          <option :value="25">25 km</option>
          <option :value="50">50 km</option>
          <option :value="100">100 km</option>
          <option :value="250">250 km</option>
          <option :value="0">Any distance</option>
        </select>
        <button type="button" :disabled="!activeLocation" @click="clearLocation">Show all</button>
      </div>
      <p v-if="locationError" class="location-error">{{ locationError }}</p>
    </section>

    <section class="lab-map" aria-label="Film lab map">
      <div ref="mapEl" class="map-canvas" />
      <div class="map-empty" v-if="mapLoading">Loading map...</div>
      <div class="map-empty" v-else-if="mapError">{{ mapError }}</div>
      <div class="map-empty" v-else-if="!mappedLabs.length && !mappedGoogleLabs.length">Search an area or use your location to show labs.</div>
    </section>

    <section v-if="googleMapsApiKey" class="google-panel">
      <div class="google-panel-head">
        <div>
          <h2>Google lab discovery</h2>
          <p>{{ activeLocation ? 'Showing film labs Google can find near the selected area.' : 'Search an area to discover existing film labs from Google Places.' }}</p>
        </div>
        <button type="button" :disabled="!activeLocation || googleSearching" @click="searchGoogleLabs">
          {{ googleSearching ? 'Searching...' : 'Find film labs' }}
        </button>
      </div>
      <div v-if="visibleGoogleLabs.length" class="google-results">
        <article v-for="lab in visibleGoogleLabs" :key="lab.place_id" class="google-card">
          <div>
            <span class="source-chip">Google</span>
            <h3>{{ lab.name }}</h3>
            <p>{{ lab.formatted_address || lab.vicinity || 'Address unavailable' }}</p>
            <p>{{ lab.category }} · {{ statusLabel(lab.operational_status) }}</p>
            <p v-if="lab.distance_km != null">{{ formatDistance(lab.distance_km) }} away</p>
            <a v-if="safeHttpUrl(lab.google_maps_url)" :href="safeHttpUrl(lab.google_maps_url)" target="_blank" rel="noreferrer">Open in Google Maps</a>
          </div>
          <div class="google-meta">
            <strong>{{ lab.rating ? Number(lab.rating).toFixed(1) : '—' }}</strong>
            <span>{{ lab.user_ratings_total || 0 }} Google reviews</span>
            <button v-if="auth.isLoggedIn" type="button" @click="requestGoogleLab(lab)">
              {{ auth.isAdmin ? 'Use result' : 'Request add' }}
            </button>
          </div>
        </article>
      </div>
      <p v-else-if="activeLocation && !googleSearching" class="google-empty">No Google lab results yet for this area.</p>
    </section>
    <section v-else class="google-panel">
      <h2>Google Maps setup needed</h2>
      <p>Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to the frontend env file to enable Google Maps and Places discovery.</p>
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
        <input v-model="newLab.date_opened" type="date" />
        <select v-model="newLab.operational_status">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
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
        <input v-if="requestForm.request_type !== 'delete'" v-model="requestForm.date_opened" type="date" />
        <select v-if="requestForm.request_type !== 'delete'" v-model="requestForm.operational_status">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
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
      <h2 class="saved-heading">Saved labs</h2>
      <article v-for="lab in visibleLabs" :key="lab.id" class="lab-card" :class="{ selected: selectedLab?.id === lab.id }">
        <div class="lab-main">
          <h2>{{ lab.name }}</h2>
          <p>{{ [lab.city, lab.country].filter(Boolean).join(', ') || 'Worldwide' }}</p>
          <p class="lab-status" :class="`status-${lab.operational_status || 'unknown'}`">{{ statusLabel(lab.operational_status) }}</p>
          <p v-if="lab.opening_hours">Hours: {{ lab.opening_hours }}</p>
          <p v-if="lab.date_opened">Opened: {{ formatDate(lab.date_opened) }}</p>
          <p v-if="lab.distance_km != null">{{ formatDistance(lab.distance_km) }} away</p>
          <p v-if="lab.latitude && lab.longitude" class="mono">{{ Number(lab.latitude).toFixed(4) }}, {{ Number(lab.longitude).toFixed(4) }}</p>
          <a v-if="safeHttpUrl(lab.website_url)" :href="safeHttpUrl(lab.website_url)" target="_blank" rel="noreferrer">Website</a>
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
import { computed, nextTick, reactive, ref, onMounted, watch } from 'vue';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const labs = ref([]);
const requests = ref([]);
const googleLabs = ref([]);
const selectedLab = ref(null);
const loading = ref(true);
const creating = ref(false);
const requesting = ref(false);
const locating = ref(false);
const googleSearching = ref(false);
const locationError = ref('');
const mapEl = ref(null);
const mapLoading = ref(true);
const mapError = ref('');
const map = ref(null);
const markers = ref(null);
const userMarker = ref(null);
const activeLocation = ref(null);
const radiusKm = ref(100);
const areaQuery = ref('');
const newLab = reactive(emptyLabForm());
const requestForm = reactive(emptyRequestForm());
const reviews = reactive({});
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const mapProvider = ref(googleMapsApiKey ? 'google' : 'leaflet');

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'temporarily_closed', label: 'Temporarily closed' },
  { value: 'closed', label: 'Closed' },
  { value: 'unknown', label: 'Unknown' },
];

const labsWithDistance = computed(() => labs.value.map(lab => {
  const distanceKm = activeLocation.value && hasCoordinates(lab)
    ? distanceBetweenKm(activeLocation.value.latitude, activeLocation.value.longitude, lab.latitude, lab.longitude)
    : null;
  return { ...lab, distance_km: distanceKm };
}));

const visibleLabs = computed(() => {
  const list = labsWithDistance.value.filter(lab => radiusKm.value === 0 || lab.distance_km == null || lab.distance_km <= radiusKm.value);
  return [...list].sort((a, b) => {
    if (a.distance_km == null && b.distance_km == null) return String(a.name).localeCompare(String(b.name));
    if (a.distance_km == null) return 1;
    if (b.distance_km == null) return -1;
    return a.distance_km - b.distance_km;
  });
});

const mappedLabs = computed(() => visibleLabs.value.filter(hasCoordinates));
const visibleGoogleLabs = computed(() => {
  const list = googleLabs.value.map(lab => {
    const distanceKm = activeLocation.value && hasCoordinates(lab)
      ? distanceBetweenKm(activeLocation.value.latitude, activeLocation.value.longitude, lab.latitude, lab.longitude)
      : null;
    return { ...lab, distance_km: distanceKm };
  }).filter(lab => radiusKm.value === 0 || lab.distance_km == null || lab.distance_km <= radiusKm.value);

  return [...list].sort((a, b) => {
    if (a.distance_km == null && b.distance_km == null) return String(a.name).localeCompare(String(b.name));
    if (a.distance_km == null) return 1;
    if (b.distance_km == null) return -1;
    return a.distance_km - b.distance_km;
  });
});
const mappedGoogleLabs = computed(() => visibleGoogleLabs.value.filter(hasCoordinates));

onMounted(async () => {
  await Promise.all([loadLabs(), initMap()]);
  if (auth.isAdmin) await loadRequests();
});

watch([mappedLabs, mappedGoogleLabs, selectedLab, activeLocation], () => {
  renderMapMarkers();
}, { deep: true });

async function loadLabs() {
  loading.value = true;
  try {
    const { data } = await api.get('/labs');
    labs.value = data;
    selectedLab.value ||= mappedLabs.value[0] || null;
    for (const lab of labs.value) reviews[lab.id] ||= { rating: 5, comment: '' };
    renderMapMarkers();
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
    Object.assign(newLab, emptyLabForm());
    await loadLabs();
  } finally {
    creating.value = false;
  }
}

async function requestLabChange() {
  requesting.value = true;
  try {
    await api.post('/lab-requests', normalizePayload(requestForm));
    Object.assign(requestForm, emptyRequestForm());
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

async function initMap() {
  try {
    await nextTick();
    if (!mapEl.value || map.value) return;
    if (googleMapsApiKey) {
      await loadGoogleMaps();
      const google = window.google;
      map.value = new google.maps.Map(mapEl.value, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      markers.value = [];
      mapLoading.value = false;
      renderMapMarkers();
      return;
    }

    await loadLeaflet();
    const L = window.L;
    map.value = L.map(mapEl.value, { scrollWheelZoom: false }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map.value);
    markers.value = L.layerGroup().addTo(map.value);
    mapLoading.value = false;
    renderMapMarkers();
  } catch (err) {
    mapLoading.value = false;
    mapError.value = 'Map could not load. Labs are still listed below.';
  }
}

function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places`;
    script.dataset.googleMaps = 'true';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadLeaflet() {
  if (window.L) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-leaflet]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.dataset.leaflet = 'true';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function renderMapMarkers() {
  if (mapProvider.value === 'google') {
    renderGoogleMapMarkers();
    return;
  }
  if (!map.value || !markers.value || !window.L) return;
  const L = window.L;
  markers.value.clearLayers();

  const bounds = [];
  for (const lab of mappedLabs.value) {
    const latLng = [Number(lab.latitude), Number(lab.longitude)];
    bounds.push(latLng);
    L.marker(latLng)
      .addTo(markers.value)
      .bindPopup(`<strong>${escapeHtml(lab.name)}</strong><br>${escapeHtml([lab.city, lab.country].filter(Boolean).join(', '))}<br>${Number(lab.average_rating || 0).toFixed(1)} stars`)
      .on('click', () => { selectedLab.value = lab; });
  }

  if (activeLocation.value) {
    const latLng = [Number(activeLocation.value.latitude), Number(activeLocation.value.longitude)];
    bounds.push(latLng);
    userMarker.value = L.circleMarker(latLng, {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#4f8cff',
      fillOpacity: 0.9,
    }).addTo(markers.value).bindPopup('Selected location');
  }

  if (bounds.length > 1) map.value.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
  else if (bounds.length === 1) map.value.setView(bounds[0], activeLocation.value ? 11 : 4);
}

function renderGoogleMapMarkers() {
  if (!map.value || !window.google?.maps) return;
  const google = window.google;
  markers.value?.forEach(marker => marker.setMap(null));
  markers.value = [];

  const bounds = new google.maps.LatLngBounds();
  let hasBounds = false;

  for (const lab of mappedLabs.value) {
    const position = { lat: Number(lab.latitude), lng: Number(lab.longitude) };
    bounds.extend(position);
    hasBounds = true;
    const marker = new google.maps.Marker({
      map: map.value,
      position,
      title: lab.name,
      label: { text: 'S', color: '#111111' },
    });
    const info = new google.maps.InfoWindow({
      content: `<strong>${escapeHtml(lab.name)}</strong><br>${escapeHtml([lab.city, lab.country].filter(Boolean).join(', '))}<br>Saved lab`,
    });
    marker.addListener('click', () => {
      selectedLab.value = lab;
      info.open({ anchor: marker, map: map.value });
    });
    markers.value.push(marker);
  }

  for (const lab of mappedGoogleLabs.value) {
    const position = { lat: Number(lab.latitude), lng: Number(lab.longitude) };
    bounds.extend(position);
    hasBounds = true;
    const marker = new google.maps.Marker({
      map: map.value,
      position,
      title: lab.name,
      label: { text: 'G', color: '#111111' },
    });
    const info = new google.maps.InfoWindow({
      content: `<strong>${escapeHtml(lab.name)}</strong><br>${escapeHtml(lab.formatted_address || lab.vicinity || '')}<br>${escapeHtml(lab.category)}`,
    });
    marker.addListener('click', () => info.open({ anchor: marker, map: map.value }));
    markers.value.push(marker);
  }

  if (activeLocation.value) {
    const position = { lat: Number(activeLocation.value.latitude), lng: Number(activeLocation.value.longitude) };
    bounds.extend(position);
    hasBounds = true;
    const marker = new google.maps.Marker({
      map: map.value,
      position,
      title: 'Selected location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#4f8cff',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8,
      },
    });
    markers.value.push(marker);
  }

  if (hasBounds) map.value.fitBounds(bounds, 42);
}

function useCurrentLocation() {
  locationError.value = '';
  if (!navigator.geolocation) {
    locationError.value = 'Location is not supported by this browser.';
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    position => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      activeLocation.value = coords;
      areaQuery.value = 'Current location';
      locating.value = false;
      searchGoogleLabs();
    },
    () => {
      locationError.value = 'Could not access your location.';
      locating.value = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

async function searchArea() {
  locationError.value = '';
  if (!googleMapsApiKey || !window.google?.maps) {
    locationError.value = 'Google Maps API key is needed to search by area.';
    return;
  }
  if (!areaQuery.value) return;
  const geocoder = new window.google.maps.Geocoder();
  try {
    const { results } = await geocoder.geocode({ address: areaQuery.value });
    const location = results?.[0]?.geometry?.location;
    if (!location) {
      locationError.value = 'No matching area found.';
      return;
    }
    activeLocation.value = {
      latitude: location.lat(),
      longitude: location.lng(),
    };
    await searchGoogleLabs();
  } catch {
    locationError.value = 'Area search failed. Check the Google Maps API key and billing setup.';
  }
}

async function searchGoogleLabs() {
  if (!googleMapsApiKey || !window.google?.maps?.places || !map.value || !activeLocation.value) return;
  googleSearching.value = true;
  locationError.value = '';
  try {
    const center = new window.google.maps.LatLng(activeLocation.value.latitude, activeLocation.value.longitude);
    const radius = radiusKm.value === 0 ? 50000 : Math.min(radiusKm.value * 1000, 50000);
    const terms = ['film lab', 'film developing', 'photo lab', 'photo processing'];
    const resultSets = await Promise.all(terms.map(term => searchGooglePlaces(term, center, radius)));
    const byPlaceId = new Map();
    for (const result of resultSets.flat()) {
      if (!result.place_id || byPlaceId.has(result.place_id)) continue;
      byPlaceId.set(result.place_id, formatGoogleLab(result));
    }
    googleLabs.value = [...byPlaceId.values()];
  } catch {
    locationError.value = 'Google lab search failed.';
  } finally {
    googleSearching.value = false;
  }
}

function searchGooglePlaces(term, location, radius) {
  const service = new window.google.maps.places.PlacesService(map.value);
  return new Promise(resolve => {
    service.textSearch({
      query: areaQuery.value && areaQuery.value !== 'Current location'
        ? `${term} in ${areaQuery.value}`
        : term,
      location,
      radius,
    }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) resolve(results || []);
      else resolve([]);
    });
  });
}

function formatGoogleLab(place) {
  const location = place.geometry?.location;
  const status = place.business_status === 'OPERATIONAL'
    ? 'open'
    : place.business_status === 'CLOSED_TEMPORARILY'
      ? 'temporarily_closed'
      : place.business_status === 'CLOSED_PERMANENTLY'
        ? 'closed'
        : 'unknown';
  return {
    place_id: place.place_id,
    name: place.name,
    formatted_address: place.formatted_address,
    vicinity: place.vicinity,
    latitude: location?.lat(),
    longitude: location?.lng(),
    rating: place.rating,
    user_ratings_total: place.user_ratings_total,
    operational_status: status,
    category: categorizeGoogleLab(place),
    google_maps_url: place.place_id ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || 'Film lab')}&query_place_id=${place.place_id}` : '',
  };
}

function categorizeGoogleLab(place) {
  const text = `${place.name || ''} ${(place.types || []).join(' ')}`.toLowerCase();
  if (text.includes('develop') || text.includes('film')) return 'Film developing';
  if (text.includes('scan') || text.includes('photo')) return 'Photo lab';
  if (text.includes('print')) return 'Printing';
  return 'Lab / photography service';
}

function requestGoogleLab(lab) {
  const payload = {
    name: lab.name || '',
    city: '',
    country: '',
    latitude: lab.latitude || '',
    longitude: lab.longitude || '',
    opening_hours: '',
    date_opened: '',
    operational_status: lab.operational_status || 'unknown',
    website_url: lab.google_maps_url || '',
  };
  if (auth.isAdmin) {
    Object.assign(newLab, payload);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  Object.assign(requestForm, {
    request_type: 'add',
    lab_id: '',
    ...payload,
    note: `Found via Google Places: ${lab.formatted_address || lab.vicinity || ''}`,
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearLocation() {
  activeLocation.value = null;
  areaQuery.value = '';
  googleLabs.value = [];
}

function hasCoordinates(lab) {
  return Number.isFinite(Number(lab.latitude)) && Number.isFinite(Number(lab.longitude));
}

function distanceBetweenKm(latA, lngA, latB, lngB) {
  const toRad = value => Number(value) * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(latB) - toRad(latA);
  const dLng = toRad(lngB) - toRad(lngA);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function statusLabel(value) {
  return statusOptions.find(option => option.value === value)?.label || 'Unknown';
}

function emptyLabForm() {
  return { name: '', city: '', country: '', latitude: '', longitude: '', opening_hours: '', date_opened: '', operational_status: 'open', website_url: '' };
}

function emptyRequestForm() {
  return { request_type: 'add', lab_id: '', name: '', city: '', country: '', latitude: '', longitude: '', opening_hours: '', date_opened: '', operational_status: 'open', website_url: '', note: '' };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}
</script>

<style scoped>
.labs-page { padding-top:2rem; padding-bottom:3rem; }
.location-tools {
  display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:1rem; align-items:center;
  background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; margin-bottom:1rem;
}
.area-search, .location-actions { display:flex; gap:.6rem; align-items:center; flex-wrap:wrap; }
.area-search input { min-width:min(360px, 100%); flex:1; }
.location-actions button, .location-actions select {
  background:var(--bg); border:1px solid var(--border); border-radius:6px; color:var(--text); padding:.65rem .75rem;
}
.location-error { color:var(--danger); font-size:.86rem; }
.lab-map {
  position:relative; height:360px; border:1px solid var(--border); border-radius:8px; overflow:hidden; margin-bottom:1rem;
  background:#101010;
}
.map-canvas { position:absolute; inset:0; z-index:1; }
.map-empty { position:absolute; inset:0; z-index:2; display:grid; place-items:center; color:var(--text-faint); background:rgba(16,16,16,.72); pointer-events:none; }
.lab-form, .requests-panel, .google-panel { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; margin-bottom:1rem; }
.lab-form h2, .requests-panel h2, .google-panel h2 { font-size:1rem; margin-bottom:.85rem; }
.google-panel p { color:var(--text-muted); font-size:.86rem; }
.google-panel code { color:var(--text); }
.google-panel-head { display:flex; justify-content:space-between; gap:1rem; align-items:start; margin-bottom:.85rem; }
.google-panel-head button, .google-meta button {
  border:1px solid var(--border); background:var(--bg); color:var(--text); border-radius:6px; padding:.55rem .8rem; cursor:pointer;
}
.google-panel-head button:disabled { opacity:.45; cursor:default; }
.google-results { display:grid; gap:.75rem; }
.google-card {
  display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:1rem;
  border-top:1px solid var(--border); padding-top:.75rem;
}
.google-card h3 { font-size:1rem; margin:.25rem 0; }
.source-chip {
  display:inline-flex; width:max-content; border:1px solid var(--border-hover); border-radius:999px; padding:.12rem .45rem;
  color:var(--text-muted); font-size:.72rem; font-family:'DM Mono', monospace;
}
.google-meta { text-align:right; display:grid; gap:.2rem; align-content:start; }
.google-meta strong { font-size:1.25rem; line-height:1; }
.google-meta span { color:var(--text-muted); font-size:.78rem; }
.google-empty { border-top:1px solid var(--border); padding-top:.75rem; }
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
.saved-heading { font-size:1rem; }
.lab-card { display:grid; grid-template-columns:1fr auto; gap:1rem; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; }
.lab-card.selected { border-color:var(--border-hover); }
.lab-main h2 { font-size:1.05rem; margin-bottom:.2rem; }
.lab-main p, .lab-main a, .lab-rating span { color:var(--text-muted); font-size:.86rem; }
.lab-status { display:inline-flex; width:max-content; border:1px solid var(--border); border-radius:999px; padding:.14rem .5rem; margin:.25rem 0; }
.status-open { color:#64d98a !important; }
.status-temporarily_closed { color:#ffd166 !important; }
.status-closed { color:var(--danger) !important; }
.status-unknown { color:var(--text-faint) !important; }
.lab-rating { text-align:right; }
.lab-rating strong { display:block; font-size:1.4rem; }
.delete-lab { margin-top:.6rem; color:var(--danger); }
.review-form { grid-column:1 / -1; display:grid; grid-template-columns:120px 1fr auto; gap:.6rem; }
@media (max-width: 820px) {
  .lab-map { height:260px; }
  .location-tools { grid-template-columns:1fr; }
  .form-grid, .lab-card, .review-form, .google-card { grid-template-columns:1fr; }
  .lab-rating, .google-meta { text-align:left; }
  .request-card, .google-panel-head { flex-direction:column; }
}
</style>
