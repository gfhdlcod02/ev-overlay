import { handleRoute, type Env } from './handlers/route'
import { handleCors, addCorsHeaders } from './handlers/cors'

export { Env }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight
    const corsResponse = handleCors(request)
    if (corsResponse) {
      return corsResponse
    }

    let response: Response

    try {
      // Route requests
      if (url.pathname === '/api/route') {
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

    // Add CORS headers to all responses
    return addCorsHeaders(response)
  },
}
