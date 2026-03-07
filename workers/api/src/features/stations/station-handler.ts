import type { Env, StationsResponse, StationDetail, CompactStation } from '../../types';
import { createStationCache } from '../../kv/station-cache';
import { createD1Client } from '../../db/client';
import { ChargingStationRepository } from '../../db/repositories';

/**
 * Station Query Handler
 *
 * Handles GET /api/v1/stations and GET /api/v1/stations/:id
 */

export interface StationListOptions {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
  limit?: number;
  offset?: number;
}

export interface StationListResult {
  stations: CompactStation[];
  total: number;
  cacheHit: boolean;
  durationMs: number;
}

export interface StationDetailResult {
  station: StationDetail | null;
  cacheHit: boolean;
  durationMs: number;
}

/**
 * Handle station list query with bbox
 */
export async function handleStationList(
  options: StationListOptions,
  env: Env
): Promise<StationListResult> {
  const startTime = Date.now();
  const { lat1, lng1, lat2, lng2, limit = 50, offset = 0 } = options;

  // Validate bounds
  if (!isValidBounds(lat1, lng1, lat2, lng2)) {
    throw new Error('Invalid bounds: coordinates out of range');
  }

  // Check cache
  const cache = createStationCache(env.STATION_CACHE);
  const cached = await cache.getQuery({ lat1, lng1, lat2, lng2 });

  if (cached) {
    const durationMs = Date.now() - startTime;
    return {
      stations: cached.stations.slice(offset, offset + limit),
      total: cached.totalCount,
      cacheHit: true,
      durationMs
    };
  }

  // Query D1
  const db = createD1Client(env.DB);
  const repo = new ChargingStationRepository(db);

  const stations = await repo.findWithinBounds(lat1, lat2, lng1, lng2, limit, offset);
  const total = await repo.countWithinBounds(lat1, lat2, lng1, lng2);

  // Transform to compact format
  const compactStations: CompactStation[] = stations.map(s => ({
    id: parseInt(s.id, 10),
    name: s.name,
    lat: s.latitude,
    lng: s.longitude,
    connectors: [] // Connectors fetched separately
  }));

  // Cache results
  await cache.setQuery({ lat1, lng1, lat2, lng2 }, compactStations, total);

  const durationMs = Date.now() - startTime;

  return {
    stations: compactStations,
    total,
    cacheHit: false,
    durationMs
  };
}

/**
 * Handle single station detail query
 */
export async function handleStationDetail(
  stationId: string,
  env: Env
): Promise<StationDetailResult> {
  const startTime = Date.now();

  // Check cache first
  const cache = createStationCache(env.STATION_CACHE);
  const numericId = parseInt(stationId, 10);

  if (!isNaN(numericId)) {
    const cached = await cache.getStation(numericId);
    if (cached) {
      const durationMs = Date.now() - startTime;
      return {
        station: cached,
        cacheHit: true,
        durationMs
      };
    }
  }

  // Query D1
  const db = createD1Client(env.DB);
  const repo = new ChargingStationRepository(db);

  const station = await repo.findById(parseInt(stationId, 10));

  if (!station) {
    const durationMs = Date.now() - startTime;
    return {
      station: null,
      cacheHit: false,
      durationMs
    };
  }

  const detail: StationDetail = {
    id: station.id,
    externalId: station.externalId,
    name: station.name,
    operator: station.operator ?? null,
    lat: station.latitude,
    lng: station.longitude,
    address: station.address ?? null,
    city: station.city ?? null,
    status: station.status,
    connectors: [], // Connectors fetched separately
    lastUpdated: station.updatedAt
  };

  // Cache individual station
  await cache.setStation(detail);

  const durationMs = Date.now() - startTime;

  return {
    station: detail,
    cacheHit: false,
    durationMs
  };
}

function isValidBounds(lat1: number, lng1: number, lat2: number, lng2: number): boolean {
  return (
    lat1 >= -90 && lat1 <= 90 &&
    lat2 >= -90 && lat2 <= 90 &&
    lng1 >= -180 && lng1 <= 180 &&
    lng2 >= -180 && lng2 <= 180
  );
}
