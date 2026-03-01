<template>
  <div ref="mapContainer" class="w-full h-full min-h-[400px] rounded-lg shadow"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import type { TripResult } from '@ev/core'

const props = defineProps<{
  result: TripResult | null
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let routeLayer: L.LayerGroup | null = null
let markersLayer: L.LayerGroup | null = null

onMounted(() => {
  if (!mapContainer.value) return

  // Initialize map
  map = L.map(mapContainer.value).setView([39.8283, -98.5795], 4) // Center of US

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  // Create layer groups
  routeLayer = L.layerGroup().addTo(map)
  markersLayer = L.layerGroup().addTo(map)

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

watch(
  () => props.result,
  (newResult) => {
    if (newResult) {
      updateMap(newResult)
    } else {
      clearMap()
    }
  }
)

function clearMap() {
  if (routeLayer) {
    routeLayer.clearLayers()
  }
  if (markersLayer) {
    markersLayer.clearLayers()
  }
  if (map) {
    map.setView([39.8283, -98.5795], 4)
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
      .map((c) => [c[1], c[0]] as [number, number]) // [lng, lat] -> [lat, lng]

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
    const bounds = L.latLngBounds(
      coordinates.map((c) => [c[1], c[0]] as [number, number])
    )
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}
</script>

<style scoped>
:deep(.charging-stop-marker) {
  background: transparent;
  border: none;
}
</style>
