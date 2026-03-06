/**
 * Centralized configuration for the API Worker
 * All environment-specific values are loaded from here
 *
 * Note: Cloudflare Workers don't use process.env. Environment variables are
 * passed via the Env object to the fetch handler.
 */

// OSRM Configuration
export const OSRM_CONFIG = {
  /** Default base URL for OSRM API */
  DEFAULT_BASE_URL: 'https://router.project-osrm.org',
  /** Connection timeout in milliseconds */
  CONNECT_TIMEOUT_MS: 5000,
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 20000,
  /** Number of retries on timeout */
  RETRIES: 1,
}

// Cache Configuration
export const CACHE_CONFIG = {
  /** Cache TTL in seconds (7 days) */
  TTL_SECONDS: 7 * 24 * 60 * 60,
  /** Cache key prefix */
  KEY_PREFIX: 'route:',
  /** Coordinate precision for cache keys (decimal places) */
  COORDINATE_PRECISION: 4,
}

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  /** Maximum requests per window */
  MAX_REQUESTS: 60,
  /** Window size in seconds */
  WINDOW_SECONDS: 60,
}

// CORS Configuration
export const CORS_CONFIG = {
  /** Allowed origins */
  ALLOWED_ORIGINS: ['*'],
  /** Allowed methods */
  ALLOWED_METHODS: ['GET', 'OPTIONS'],
  /** Allowed headers */
  ALLOWED_HEADERS: ['Content-Type'],
  /** Max age for preflight cache in seconds */
  MAX_AGE_SECONDS: 86400,
}

// App Metadata
export const APP_CONFIG = {
  /** Application version (replaced during build) */
  VERSION: '__APP_VERSION__'.startsWith('__') ? 'dev' : '__APP_VERSION__',
  /** Git commit hash (replaced during build) */
  COMMIT: '__GIT_COMMIT__'.startsWith('__') ? 'local' : '__GIT_COMMIT__',
}
