/**
 * CORS configuration for API endpoints
 * Restricts origins to allowed domains
 */

// Allowed origins - configure based on environment
const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',  // Alternative dev port
  'https://ev-overlay.pages.dev',     // Cloudflare Pages staging
  'https://ev-overlay-prod.pages.dev', // Cloudflare Pages production
]

// Add production domain from environment if available
const getAllowedOrigins = (env: Record<string, string>): string[] => {
  const origins = [...ALLOWED_ORIGINS]
  if (env.PAGES_URL) {
    origins.push(env.PAGES_URL)
  }
  if (env.CUSTOM_DOMAIN) {
    origins.push(`https://${env.CUSTOM_DOMAIN}`)
  }
  return origins
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflight(request: Request, env: Record<string, string>): Response {
  const allowedOrigins = getAllowedOrigins(env)
  const origin = request.headers.get('Origin')

  // Check if origin is allowed
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(response: Response, request: Request, env: Record<string, string>): Response {
  const allowedOrigins = getAllowedOrigins(env)
  const origin = request.headers.get('Origin')

  // Check if origin is allowed
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  const newHeaders = new Headers(response.headers)
  newHeaders.set('Access-Control-Allow-Origin', allowedOrigin)
  newHeaders.set('Access-Control-Allow-Credentials', 'true')
  newHeaders.set('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

/**
 * Check if request origin is allowed
 */
export function isOriginAllowed(request: Request, env: Record<string, string>): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true // Allow requests without origin (e.g., curl, server-to-server)

  const allowedOrigins = getAllowedOrigins(env)
  return allowedOrigins.includes(origin)
}
