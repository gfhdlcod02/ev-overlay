import { handleRoute, type Env } from './handlers/route'
import { handleCors, addCorsHeaders } from './handlers/cors'
import { checkRateLimit, getRateLimitHeaders, createRateLimitError } from './handlers/rate-limit'

export { Env }

// Version is replaced during build (defaults to 'dev' if not injected)
const VERSION = '__APP_VERSION__'.startsWith('__') ? 'dev' : '__APP_VERSION__'
const COMMIT = '__GIT_COMMIT__'.startsWith('__') ? 'local' : '__GIT_COMMIT__'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight
    const corsResponse = handleCors(request)
    if (corsResponse) {
      return corsResponse
    }

    let response: Response
    let rateLimitHeaders: ReturnType<typeof getRateLimitHeaders> | undefined

    try {
      // Route requests
      if (url.pathname === '/api/version') {
        response = new Response(
          JSON.stringify({
            version: VERSION,
            commit: COMMIT,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (url.pathname === '/api/route') {
        // Check rate limit only for /api/route endpoint
        const rateLimitResult = await checkRateLimit(request, env)
        rateLimitHeaders = getRateLimitHeaders(rateLimitResult)

        // If rate limited, return 429 response
        if (!rateLimitResult.allowed) {
          const retryAfter = rateLimitHeaders['Retry-After'] || '60'
          const errorBody = createRateLimitError(parseInt(retryAfter, 10))
          const rateLimitedResponse = new Response(JSON.stringify(errorBody), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...rateLimitHeaders,
            },
          })
          return addCorsHeaders(rateLimitedResponse)
        }

        response = await handleRoute(request, env)
      } else {
        response = new Response(
          JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } catch (e) {
      console.error('Worker error:', e instanceof Error ? e.message : 'Unknown error')
      response = new Response(
        JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Add rate limit headers to response (if they were set)
    if (rateLimitHeaders) {
      const responseWithHeaders = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          ...rateLimitHeaders,
        },
      })
      return addCorsHeaders(responseWithHeaders)
    }

    // Add CORS headers to all responses
    return addCorsHeaders(response)
  },
}
