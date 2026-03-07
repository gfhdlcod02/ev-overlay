import type { RouteRequest, RouteResponse, Env } from '../../types';
import { RouteCache, RouteCache as RouteCacheManager } from '../../kv/route-cache';
import { createD1Client } from '../../db/client';
import { ChargingStationRepository } from '../../db/repositories';

/**
 * Route Handler
 *
 * Handles POST /api/v1/routes with KV caching and Google Maps integration.
 */

const GOOGLE_MAPS_ROUTES_API = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export interface RouteHandlerOptions {
  request: RouteRequest;
  env: Env;
  requestId: string;
}

export interface RouteHandlerResult {
  response: RouteResponse;
  cacheHit: boolean;
  durationMs: number;
}

export async function handleRouteRequest(
  options: RouteHandlerOptions
): Promise<RouteHandlerResult> {
  const { request, env, requestId } = options;
  const startTime = Date.now();

  // Initialize cache
  const routeCache = new RouteCacheManager(env.ROUTE_CACHE);

  // Generate cache key
  const cacheKeyParts = RouteCacheManager.extractKeyParts(request);
  const cacheKey = RouteCacheManager.generateKey(cacheKeyParts);

  // Check cache
  const cached = await routeCache.get(cacheKey);
  if (cached) {
    const durationMs = Date.now() - startTime;
    return {
      response: {
        route: {
          distance: cached.distance,
          duration: cached.duration,
          polyline: cached.polyline,
          legs: [] // TODO: Reconstruct legs from cached data
        },
        chargingStops: cached.chargingStops,
        safeRangeKm: 0 // TODO: Calculate from cached data
      },
      cacheHit: true,
      durationMs
    };
  }

  // Fetch route from Google Maps
  const route = await fetchGoogleMapsRoute(request, env);

  // Find charging stations along route
  const chargingStops = await findChargingStops(route, request, env);

  // Calculate safe range
  const safeRangeKm = calculateSafeRange(request);

  const response: RouteResponse = {
    route: {
      distance: route.distance,
      duration: route.duration,
      polyline: route.polyline,
      legs: route.legs
    },
    chargingStops,
    safeRangeKm
  };

  // Cache the response
  await routeCache.set(cacheKey, {
    origin: {
      lat: request.origin.lat,
      lng: request.origin.lng,
      name: request.origin.name || ''
    },
    destination: {
      lat: request.destination.lat,
      lng: request.destination.lng,
      name: request.destination.name || ''
    },
    distance: response.route.distance,
    duration: response.route.duration,
    polyline: response.route.polyline,
    chargingStops: response.chargingStops
  });

  const durationMs = Date.now() - startTime;

  return {
    response,
    cacheHit: false,
    durationMs
  };
}

interface GoogleMapsRoute {
  distance: number;
  duration: number;
  polyline: string;
  legs: Array<{
    from: { lat: number; lng: number; name?: string };
    to: { lat: number; lng: number; name?: string };
    distance: number;
    duration: number;
    consumptionKwh: number;
  }>;
}

async function fetchGoogleMapsRoute(
  request: RouteRequest,
  env: Env
): Promise<GoogleMapsRoute> {
  const body = {
    origin: {
      location: {
        latLng: {
          latitude: request.origin.lat,
          longitude: request.origin.lng
        }
      }
    },
    destination: {
      location: {
        latLng: {
          latitude: request.destination.lat,
          longitude: request.destination.lng
        }
      }
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false
    },
    languageCode: 'en-US',
    units: 'METRIC'
  };

  const response = await fetch(GOOGLE_MAPS_ROUTES_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Maps API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    routes: Array<{
      duration: string;
      distanceMeters: number;
      polyline: { encodedPolyline: string };
      legs: Array<{
        startLocation: { latLng: { latitude: number; longitude: number } };
        endLocation: { latLng: { latitude: number; longitude: number } };
        distanceMeters: number;
        duration: string;
      }>;
    }>;
  };

  const route = data.routes[0];
  if (!route) {
    throw new Error('No route found');
  }

  return {
    distance: route.distanceMeters,
    duration: parseDuration(route.duration),
    polyline: route.polyline.encodedPolyline,
    legs: route.legs.map((leg, index) => ({
      from: {
        lat: leg.startLocation.latLng.latitude,
        lng: leg.startLocation.latLng.longitude,
        name: index === 0 ? request.origin.name : undefined
      },
      to: {
        lat: leg.endLocation.latLng.latitude,
        lng: leg.endLocation.latLng.longitude,
        name: index === route.legs.length - 1 ? request.destination.name : undefined
      },
      distance: leg.distanceMeters,
      duration: parseDuration(leg.duration),
      consumptionKwh: 0 // TODO: Calculate based on EV parameters
    }))
  };
}

function parseDuration(duration: string): number {
  // Parse "300s" or "300.5s" to seconds
  const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) {
    return 0;
  }
  return Math.round(parseFloat(match[1]));
}

async function findChargingStops(
  route: GoogleMapsRoute,
  request: RouteRequest,
  env: Env
): Promise<RouteResponse['chargingStops']> {
  // Initialize D1 client
  const db = createD1Client(env.DB);
  const stationRepo = new ChargingStationRepository(db);

  // Calculate safe range for this vehicle
  const safeRangeKm = calculateSafeRange(request);
  if (safeRangeKm <= 0) {
    return [];
  }

  // Get route bounding box for station query
  const bounds = calculateRouteBounds(route);

  // Query stations within route corridor
  const stations = await stationRepo.findWithinBounds(
    bounds.minLat,
    bounds.maxLat,
    bounds.minLng,
    bounds.maxLng
  );

  if (stations.length === 0) {
    return [];
  }

  // Calculate optimal charging stops along route
  const stops = calculateOptimalStops(route, stations, safeRangeKm, request);

  return stops;
}

interface RouteBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function calculateRouteBounds(route: GoogleMapsRoute): RouteBounds {
  const legs = route.legs;
  if (legs.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }

  let minLat = legs[0].from.lat;
  let maxLat = legs[0].from.lat;
  let minLng = legs[0].from.lng;
  let maxLng = legs[0].from.lng;

  for (const leg of legs) {
    minLat = Math.min(minLat, leg.from.lat, leg.to.lat);
    maxLat = Math.max(maxLat, leg.from.lat, leg.to.lat);
    minLng = Math.min(minLng, leg.from.lng, leg.to.lng);
    maxLng = Math.max(maxLng, leg.from.lng, leg.to.lng);
  }

  // Add buffer for station search (10km ~ 0.1 degrees)
  const buffer = 0.1;
  return {
    minLat: minLat - buffer,
    maxLat: maxLat + buffer,
    minLng: minLng - buffer,
    maxLng: maxLng + buffer
  };
}

function calculateOptimalStops(
  route: GoogleMapsRoute,
  stations: Array<{
    id: string;
    externalId: string;
    name: string;
    latitude: number;
    longitude: number;
    address?: string | null;
    city?: string | null;
    status: string;
    connectors: Array<{
      type: string;
      powerKw: number | null;
      status: string;
    }>;
  }>,
  safeRangeKm: number,
  request: RouteRequest
): RouteResponse['chargingStops'] {
  const stops: RouteResponse['chargingStops'] = [];
  const totalDistance = route.distance / 1000; // Convert to km
  let distanceCovered = 0;
  let currentSoc = request.vehicle.currentSocPercent;
  const targetSoc = request.preferences?.chargeToPercent ?? 80;
  const minChargeSoc = request.vehicle.reserveSocPercent ?? 20;

  // Sort stations by distance along route (approximate using distance from origin)
  const sortedStations = stations
    .filter(s => s.status === 'operational' && s.connectors.some(c => c.powerKw && c.powerKw >= 50))
    .map(s => ({
      ...s,
      distanceFromStart: estimateDistanceAlongRoute(route, s.latitude, s.longitude)
    }))
    .sort((a, b) => a.distanceFromStart - b.distanceFromStart);

  while (distanceCovered + safeRangeKm < totalDistance) {
    // Find the farthest reachable station within safe range
    const targetDistance = distanceCovered + safeRangeKm * 0.8; // Use 80% of safe range for buffer
    const reachableStations = sortedStations.filter(s =>
      s.distanceFromStart > distanceCovered &&
      s.distanceFromStart <= targetDistance
    );

    if (reachableStations.length === 0) {
      // No reachable stations, break to avoid infinite loop
      break;
    }

    // Pick the farthest reachable station with highest power
    const bestStation = reachableStations.reduce((best, current) => {
      const bestPower = Math.max(...best.connectors.map(c => c.powerKw || 0));
      const currentPower = Math.max(...current.connectors.map(c => c.powerKw || 0));
      if (currentPower > bestPower) return current;
      if (currentPower === bestPower && current.distanceFromStart > best.distanceFromStart) return current;
      return best;
    });

    // Calculate charging time needed
    const maxPower = Math.max(...bestStation.connectors.map(c => c.powerKw || 0));
    const energyNeededKwh = request.vehicle.batteryCapacityKwh * (targetSoc - minChargeSoc) / 100;
    const chargingMinutes = Math.ceil((energyNeededKwh / maxPower) * 60);

    stops.push({
      station: {
        id: parseInt(bestStation.id, 10),
        name: bestStation.name,
        lat: bestStation.latitude,
        lng: bestStation.longitude,
        operator: null,
        connectors: bestStation.connectors.map(c => ({
          type: c.type || 'Unknown',
          powerKw: c.powerKw || 0,
          status: (c.status as 'available' | 'occupied' | 'unknown') || 'unknown'
        }))
      },
      arrivalSoc: currentSoc - (distanceCovered / safeRangeKm) * currentSoc,
      departureSoc: targetSoc,
      chargeDurationMinutes: chargingMinutes,
      legIndex: stops.length
    });

    distanceCovered = bestStation.distanceFromStart;
    currentSoc = targetSoc;
  }

  return stops;
}

function estimateDistanceAlongRoute(
  route: GoogleMapsRoute,
  lat: number,
  lng: number
): number {
  // Simple estimation: find closest point on route legs
  let minDistance = Infinity;
  let accumulatedDistance = 0;

  for (const leg of route.legs) {
    // Check distance to start of leg
    const distToStart = haversineDistance(lat, lng, leg.from.lat, leg.from.lng);
    if (distToStart < minDistance) {
      minDistance = distToStart;
    }

    // Check distance to end of leg
    const distToEnd = haversineDistance(lat, lng, leg.to.lat, leg.to.lng);
    if (distToEnd < minDistance) {
      minDistance = distToEnd;
      accumulatedDistance += leg.distance / 1000;
    }
  }

  return accumulatedDistance;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateSafeRange(request: RouteRequest): number {
  const vehicle = request.vehicle;
  const reserveSoc = vehicle.reserveSocPercent ?? 20;
  const factor = vehicle.drivingFactor ?? 1.0;

  // safeRangeKm = ((socNow - reserveArrival)/100) * (range100Km / factor)
  const usableSoc = vehicle.currentSocPercent - reserveSoc;
  if (usableSoc <= 0) {
    return 0;
  }

  return (usableSoc / 100) * (vehicle.rangeKmAt100Percent / factor);
}
