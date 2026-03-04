<template>
  <div ref="mapContainer" class="w-full h-full min-h-[400px] rounded-lg shadow"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import type { TripResult } from '@ev/core'
import { useLocationStore } from '@/stores/location'
import { THAILAND_DEFAULT, USER_LOCATION_ZOOM, FLY_TO_DURATION_SECS } from '@/utils/coordinates'

const props = defineProps<{
  result: TripResult | null
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let routeLayer: L.LayerGroup | null = null
let markersLayer: L.LayerGroup | null = null
let userMarker: L.Marker | null = null

const locationStore = useLocationStore()

onMounted(() => {
  if (!mapContainer.value) return

  // Initialize map with Thailand default view
  map = L.map(mapContainer.value).setView(THAILAND_DEFAULT.center, THAILAND_DEFAULT.zoom)

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  // Create layer groups
  routeLayer = L.layerGroup().addTo(map)
  markersLayer = L.layerGroup().addTo(map)

  // Track user interactions with the map
  map.on('movestart', () => {
    locationStore.markUserInteracted()
  })
  map.on('zoomstart', () => {
    locationStore.markUserInteracted()
  })

  // Update map if we already have a result
  if (props.result) {
    updateMap(props.result)
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// Watch for route result changes
watch(
  () => props.result,
  newResult => {
    if (newResult) {
      updateMap(newResult)
    } else {
      clearRouteDisplay()
    }
  }
)

// Watch for location changes to auto-center map
watch(
  () => locationStore.canAutoCenter,
  canAutoCenter => {
    if (canAutoCenter && locationStore.position && map) {
      const { lat, lng } = locationStore.position
      map.flyTo([lat, lng], USER_LOCATION_ZOOM, {
        duration: FLY_TO_DURATION_SECS,
        easeLinearity: 0.25,
      })
    }
  }
)

// Watch for position changes to update user marker
watch(
  () => locationStore.position,
  position => {
    updateUserMarker(position)
  }
)

function clearRouteDisplay() {
  if (routeLayer) {
    routeLayer.clearLayers()
  }
  if (markersLayer) {
    markersLayer.clearLayers()
  }
}

function updateUserMarker(position: { lat: number; lng: number } | null) {
  // Remove existing user marker
  if (userMarker) {
    userMarker.remove()
    userMarker = null
  }

  // Add new user marker if position available
  if (position && map) {
    const icon = L.divIcon({
      className: 'user-location-marker',
      html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg ring-2 ring-blue-300 animate-pulse"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    userMarker = L.marker([position.lat, position.lng], { icon })
      .bindPopup('<b>Your Location</b>')
      .addTo(map)
  }
}

function updateMap(result: TripResult) {
  if (!map || !routeLayer || !markersLayer) return

  // Clear existing layers
  routeLayer.clearLayers()
  markersLayer.clearLayers()

  // Draw route segments
  const coordinates = result.route.geometry.coordinates
  for (const segment of result.segments) {
    const segmentCoords = coordinates
      .slice(segment.startIdx, segment.endIdx + 1)
      .map(c => [c[1], c[0]] as [number, number]) // [lng, lat] -> [lat, lng]

    L.polyline(segmentCoords, {
      color: segment.color,
      weight: 5,
      opacity: 0.8,
    }).addTo(routeLayer)
  }

  // Add origin marker
  const origin = result.route.origin
  L.marker([origin.lat, origin.lng])
    .bindPopup('<b>Origin</b><br>' + (origin.address || 'Start'))
    .addTo(markersLayer)

  // Add destination marker
  const dest = result.route.destination
  L.marker([dest.lat, dest.lng])
    .bindPopup('<b>Destination</b><br>' + (dest.address || 'End'))
    .addTo(markersLayer)

  // Add charging stop markers
  for (const stop of result.stops) {
    const icon = L.divIcon({
      className: 'charging-stop-marker',
      html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow flex items-center justify-center text-white text-xs font-bold">${stop.sequence}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    L.marker([stop.position.lat, stop.position.lng], { icon })
      .bindPopup(
        `<b>Charging Stop ${stop.sequence}</b><br>` +
          `Arrival: ${stop.arrivalChargePercent.toFixed(1)}%<br>` +
          `Charge to: ${stop.chargeToPercent}%<br>` +
          `Distance: ${stop.distanceFromStartKm.toFixed(1)} km`
      )
      .addTo(markersLayer)
  }

  // Fit bounds to show entire route
  if (coordinates.length > 0) {
    const bounds = L.latLngBounds(coordinates.map(c => [c[1], c[0]] as [number, number]))
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}
</script>

<style scoped>
:deep(.charging-stop-marker) {
  background: transparent;
  border: none;
}

:deep(.user-location-marker) {
  background: transparent;
  border: none;
}
</style>
