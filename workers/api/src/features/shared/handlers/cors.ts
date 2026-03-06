/**
 * CORS headers for all responses
 */
import { CORS_CONFIG } from '@/config'

export const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_CONFIG.ALLOWED_ORIGINS[0] || '*',
  'Access-Control-Allow-Methods': CORS_CONFIG.ALLOWED_METHODS.join(', '),
  'Access-Control-Allow-Headers': CORS_CONFIG.ALLOWED_HEADERS.join(', '),
  'Access-Control-Max-Age': CORS_CONFIG.MAX_AGE_SECONDS.toString(),
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }
  return null
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
