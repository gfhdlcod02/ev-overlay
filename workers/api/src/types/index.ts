// ============================================
// Entity Types (matches D1 schema)
// ============================================

export interface ChargingStation {
  id: number;
  externalId: string;
  name: string;
  operator: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  status: 'operational' | 'closed' | 'planned';
  usageType: string | null;
  isOperational: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
}

export interface StationConnector {
  id: number;
  stationId: number;
  connectorType: string;
  powerKw: number | null;
  voltage: number | null;
  amperage: number | null;
  status: 'available' | 'occupied' | 'out_of_order';
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionJob {
  id: number;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  source: string;
  paramsJson: string | null;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface StationSnapshot {
  id: number;
  jobId: number;
  stationId: number;
  snapshotR2Key: string;
  createdAt: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface RouteRequest {
  origin: {
    name?: string;
    lat: number;
    lng: number;
  };
  destination: {
    name?: string;
    lat: number;
    lng: number;
  };
  vehicle: {
    batteryCapacityKwh: number;
    rangeKmAt100Percent: number;
    currentSocPercent: number;
    reserveSocPercent?: number;
    bufferKm?: number;
    drivingFactor?: number;
  };
  preferences?: {
    maxChargingStops?: number;
    chargeToPercent?: number;
    connectorTypes?: string[];
  };
}

export interface RouteResponse {
  route: {
    distance: number;
    duration: number;
    polyline: string;
    legs: RouteLeg[];
  };
  chargingStops: ChargingStop[];
  safeRangeKm: number;
  warnings?: string[];
}

export interface RouteLeg {
  from: LocationPoint;
  to: LocationPoint;
  distance: number;
  duration: number;
  consumptionKwh: number;
}

export interface ChargingStop {
  station: StationSummary;
  arrivalSoc: number;
  departureSoc: number;
  chargeDurationMinutes: number;
  legIndex: number;
}

export interface StationSummary {
  id: number;
  name: string;
  lat: number;
  lng: number;
  operator: string | null;
  connectors: ConnectorInfo[];
}

export interface ConnectorInfo {
  type: string;
  powerKw: number;
  status: 'available' | 'occupied' | 'unknown';
}

export interface LocationPoint {
  name?: string;
  lat: number;
  lng: number;
}

export interface StationsQuery {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
  connectorType?: string;
  minPowerKw?: number;
  limit?: number;
  offset?: number;
}

export interface StationsResponse {
  stations: StationDetail[];
  total: number;
  limit: number;
  offset: number;
}

export interface StationDetail {
  id: number;
  externalId: string;
  name: string;
  operator: string | null;
  lat: number;
  lng: number;
  address: string | null;
  city: string | null;
  status: string;
  connectors: ConnectorDetail[];
  lastUpdated: string;
}

export interface ConnectorDetail {
  id: number;
  type: string;
  powerKw: number | null;
  voltage: number | null;
  amperage: number | null;
  status: string;
  quantity: number;
}

// ============================================
// Queue Message Types
// ============================================

export interface FetchOcmPageMessage {
  type: 'FETCH_OCM_PAGE';
  jobId: number;
  page: number;
  pageSize: number;
  filters: {
    modifiedSince?: string;
    countryCode?: string;
    boundingBox?: {
      lat1: number;
      lng1: number;
      lat2: number;
      lng2: number;
    };
  };
  retryCount: number;
  createdAt: string;
}

export interface ProcessBatchMessage {
  type: 'PROCESS_BATCH';
  jobId: number;
  batchId: string;
  records: OcmStationRecord[];
  options: {
    skipValidation?: boolean;
    dryRun?: boolean;
  };
  retryCount: number;
  createdAt: string;
}

export interface OcmStationRecord {
  externalId: string;
  name: string;
  operator?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  status?: string;
  connectors: OcmConnector[];
  metadata?: {
    usageType?: string;
    paymentRequired?: boolean;
    accessRestrictions?: string[];
  };
}

export interface OcmConnector {
  type: string;
  powerKw?: number;
  voltage?: number;
  amperage?: number;
  status?: string;
}

export interface WriteSnapshotMessage {
  type: 'WRITE_SNAPSHOT';
  jobId: number;
  batchId: string;
  stationIds: number[];
  r2Key: string;
  format: 'jsonl' | 'parquet';
  retryCount: number;
  createdAt: string;
}

export interface InvalidateCacheMessage {
  type: 'INVALIDATE_CACHE';
  patterns: string[];
  stationIds?: number[];
  createdAt: string;
}

export type QueueMessage =
  | FetchOcmPageMessage
  | ProcessBatchMessage
  | WriteSnapshotMessage
  | InvalidateCacheMessage;

// ============================================
// Cache Types
// ============================================

export interface CachedRoute {
  version: 1;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  distance: number;
  duration: number;
  polyline: string;
  chargingStops: ChargingStop[];
  cachedAt: string;
  expiresAt: string;
}

export interface CachedStationQuery {
  version: 1;
  bbox: [number, number, number, number];
  stations: CompactStation[];
  totalCount: number;
  cachedAt: string;
}

export interface CompactStation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  connectors: CompactConnector[];
}

export interface CompactConnector {
  type: string;
  powerKw: number;
}

// ============================================
// Durable Object State Types
// ============================================

export interface RateLimitState {
  clientKey: string;
  requests: number[];
  limit: number;
  windowMs: number;
  lastReset: number;
}

export interface IngestionLockState {
  locked: boolean;
  acquiredAt: number | null;
  acquiredBy: string | null;
  timeoutMs: number;
  lastHeartbeat: number;
}

// ============================================
// Cloudflare Workers Built-in Types
// ============================================

export type { Queue } from '@cloudflare/workers-types';

// Worker Environment Bindings
// ============================================

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  ROUTE_CACHE: KVNamespace;
  STATION_CACHE: KVNamespace;

  // R2 Bucket
  SNAPSHOTS_BUCKET: R2Bucket;

  // Queue
  INGESTION_QUEUE: Queue<QueueMessage>;

  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;
  INGESTION_LOCK: DurableObjectNamespace;

  // Secrets (set via wrangler secret)
  GOOGLE_MAPS_API_KEY: string;
  OPENCHARGEMAP_API_KEY: string;

  // Environment variables
  OSRM_BASE_URL: string;
  RATE_LIMIT_REQUESTS_PER_HOUR: string;
  RATE_LIMIT_WINDOW_MS: string;
  ROUTE_CACHE_TTL_SECONDS: string;
  STATION_CACHE_TTL_SECONDS: string;
  OCM_API_BASE_URL: string;
  OCM_COUNTRY_CODE: string;
  OCM_MAX_RESULTS: string;
}

// ============================================
// Rate Limiting Types
// ============================================

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// ============================================
// Error Types
// ============================================

export interface ApiError {
  error: string;
  message: string;
  details?: { field: string; issue: string }[];
  requestId?: string;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: 'ok' | 'error';
    cache: 'ok' | 'error';
    externalApis?: 'ok' | 'degraded' | 'error';
  };
}
