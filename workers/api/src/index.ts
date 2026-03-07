import type { Env, RouteRequest, QueueMessage } from './types'
import { handleRouteRequest } from './features/routing/route-handler'
import { handleStationList, handleStationDetail } from './features/stations/station-handler'
import { checkRateLimit, getRateLimitHeaders, createRateLimitError } from './features/rate-limiting/middleware'
import { createD1Client } from './db/client'
import { RateLimiter } from './features/rate-limiting/rate-limiter'
import { IngestionLock } from './features/ingestion/ingestion-lock'
import {
  handleFetchOcmPage,
  handleProcessBatch,
  handleWriteSnapshot,
  handleInvalidateCache,
  triggerIngestionJob
} from './features/ingestion/message-handlers'
import { serveRateLimitDashboard, recordRateLimitMetric } from './features/observability/dashboards/rate-limit-dashboard'
import { servePerformanceDashboard, recordCacheMetric } from './features/observability/dashboards/performance-dashboard'
import { handlePagerDutyWebhook, handleSlackWebhook, serveAlertHistory, triggerTestAlert } from './features/observability/alerts/webhook-stubs'

// Version - replaced during build
const VERSION = '1.0.0'
const COMMIT = 'dev'

export { Env, RateLimiter, IngestionLock }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const requestId = crypto.randomUUID()

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      })
    }

    let response: Response
    let rateLimitHeaders: Record<string, string> | undefined

    try {
      // Route requests
      if (url.pathname === '/api/version') {
        response = new Response(
          JSON.stringify({
            version: VERSION,
            commit: COMMIT,
            environment: 'production'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (url.pathname === '/api/health') {
        response = await handleHealthCheck(env)
      } else if (url.pathname === '/admin/dashboard/rate-limits') {
        // Rate limiting dashboard (T071)
        response = await serveRateLimitDashboard(env)
      } else if (url.pathname === '/admin/dashboard/performance') {
        // Performance metrics dashboard (T077)
        response = await servePerformanceDashboard(env)
      } else if (url.pathname === '/admin/alerts/webhook/pagerduty') {
        // PagerDuty webhook stub (T081)
        response = await handlePagerDutyWebhook(request, env, requestId)
      } else if (url.pathname === '/admin/alerts/webhook/slack') {
        // Slack webhook stub (T081)
        response = await handleSlackWebhook(request, env, requestId)
      } else if (url.pathname === '/admin/alerts/history') {
        // Alert history viewer
        response = await serveAlertHistory(env)
      } else if (url.pathname === '/admin/alerts/test/pagerduty' && request.method === 'POST') {
        // Trigger test PagerDuty alert
        response = await triggerTestAlert('pagerduty', env)
      } else if (url.pathname === '/admin/alerts/test/slack' && request.method === 'POST') {
        // Trigger test Slack alert
        response = await triggerTestAlert('slack', env)
      } else if (url.pathname === '/api/v1/analytics/web-vitals' && request.method === 'POST') {
        // Web Vitals analytics endpoint - receives metrics from frontend
        response = await handleWebVitals(request, env, requestId)
      } else if (url.pathname === '/api/v1/routes' && request.method === 'POST') {
        // Check rate limit for route planning
        const rateLimitResult = await checkRateLimit(request, env, 'route', ctx)
        rateLimitHeaders = getRateLimitHeaders(rateLimitResult)

        if (!rateLimitResult.allowed) {
          const retryAfter = rateLimitHeaders['Retry-After'] || '60'
          const errorBody = createRateLimitError(parseInt(retryAfter, 10))
          response = new Response(JSON.stringify(errorBody), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...rateLimitHeaders,
            },
          })
        } else {
          // Handle new route API with KV caching
          const body = await request.json() as RouteRequest
          const result = await handleRouteRequest({
            request: body,
            env,
            requestId
          })

          response = new Response(JSON.stringify(result.response), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Cache': result.cacheHit ? 'HIT' : 'MISS',
              'X-Response-Time': `${result.durationMs}ms`,
              'X-Request-Id': requestId
            }
          })
        }
      } else if (url.pathname === '/api/v1/stations' && request.method === 'GET') {
        // Check rate limit for station queries
        const rateLimitResult = await checkRateLimit(request, env, 'station', ctx)
        rateLimitHeaders = getRateLimitHeaders(rateLimitResult)

        if (!rateLimitResult.allowed) {
          const retryAfter = rateLimitHeaders['Retry-After'] || '60'
          const errorBody = createRateLimitError(parseInt(retryAfter, 10))
          response = new Response(JSON.stringify(errorBody), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...rateLimitHeaders,
            },
          })
        } else {
          // Parse query params
          const lat1 = parseFloat(url.searchParams.get('lat1') || '')
          const lng1 = parseFloat(url.searchParams.get('lng1') || '')
          const lat2 = parseFloat(url.searchParams.get('lat2') || '')
          const lng2 = parseFloat(url.searchParams.get('lng2') || '')
          const limit = parseInt(url.searchParams.get('limit') || '50', 10)
          const offset = parseInt(url.searchParams.get('offset') || '0', 10)

          if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
            response = new Response(
              JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Missing or invalid bbox parameters' } }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          } else {
            const result = await handleStationList({ lat1, lng1, lat2, lng2, limit, offset }, env)
            response = new Response(
              JSON.stringify({ stations: result.stations, total: result.total }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'X-Cache': result.cacheHit ? 'HIT' : 'MISS',
                  'X-Response-Time': `${result.durationMs}ms`,
                  'X-Request-Id': requestId
                }
              }
            )
          }
        }
      } else if (url.pathname.startsWith('/api/v1/stations/') && request.method === 'GET') {
        // Check rate limit for station detail
        const rateLimitResult = await checkRateLimit(request, env, 'station', ctx)
        rateLimitHeaders = getRateLimitHeaders(rateLimitResult)

        if (!rateLimitResult.allowed) {
          const retryAfter = rateLimitHeaders['Retry-After'] || '60'
          const errorBody = createRateLimitError(parseInt(retryAfter, 10))
          response = new Response(JSON.stringify(errorBody), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...rateLimitHeaders,
            },
          })
        } else {
          const stationId = url.pathname.split('/').pop()
          if (!stationId) {
            response = new Response(
              JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Missing station ID' } }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          } else {
            const result = await handleStationDetail(stationId, env)
            if (!result.station) {
              response = new Response(
                JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Station not found' } }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
              )
            } else {
              response = new Response(JSON.stringify(result.station), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'X-Cache': result.cacheHit ? 'HIT' : 'MISS',
                  'X-Response-Time': `${result.durationMs}ms`,
                  'X-Request-Id': requestId
                }
              })
            }
          }
        }
      } else if (url.pathname === '/api/route' && request.method === 'POST') {
        // Legacy route endpoint - maintain backward compatibility
        const rateLimitResult = await checkRateLimit(request, env, 'route', ctx)
        rateLimitHeaders = getRateLimitHeaders(rateLimitResult)

        if (!rateLimitResult.allowed) {
          const retryAfter = rateLimitHeaders['Retry-After'] || '60'
          const errorBody = createRateLimitError(parseInt(retryAfter, 10))
          response = new Response(JSON.stringify(errorBody), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...rateLimitHeaders,
            },
          })
        } else {
          // TODO: Legacy handler or proxy to new handler
          const body = await request.json() as RouteRequest
          const result = await handleRouteRequest({ request: body, env, requestId })
          response = new Response(JSON.stringify(result.response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
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
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            requestId
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Add rate limit headers to response (if they were set)
    if (rateLimitHeaders) {
      const newHeaders = new Headers(response.headers)
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value)
      })

      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
    }

    // Add CORS headers to all responses
    const finalHeaders = new Headers(response.headers)
    finalHeaders.set('Access-Control-Allow-Origin', '*')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: finalHeaders
    })
  },

  // Queue consumer for ingestion jobs
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    console.log(`Processing ${batch.messages.length} queue messages`)

    for (const message of batch.messages) {
      try {
        await processQueueMessage(message.body, env)
        message.ack()
      } catch (error) {
        console.error('Queue message processing failed:', error)
        message.retry()
      }
    }
  },

  // Cron trigger for scheduled ingestion
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Cron triggered:', controller.scheduledTime)

    // Trigger hourly ingestion job
    ctx.waitUntil(triggerIngestionJob(env))
  }
}

async function handleHealthCheck(env: Env): Promise<Response> {
  const db = createD1Client(env.DB)

  const checks = {
    database: false,
    cache: false
  }

  // Check D1
  try {
    checks.database = await db.healthCheck()
  } catch {
    checks.database = false
  }

  // Check KV (just verify binding exists)
  checks.cache = !!env.ROUTE_CACHE

  const status = checks.database && checks.cache ? 'healthy' : 'degraded'

  return new Response(
    JSON.stringify({
      status,
      timestamp: new Date().toISOString(),
      version: VERSION,
      checks
    }),
    { status: status === 'healthy' ? 200 : 503, headers: { 'Content-Type': 'application/json' } }
  )
}

async function handleWebVitals(request: Request, env: Env, requestId: string): Promise<Response> {
  try {
    const body = await request.json() as {
      metrics: Record<string, number>
      url: string
      timestamp: string
      userAgent: string
      connection?: string
    }

    // Log Web Vitals metrics for monitoring
    // In production, these would be sent to analytics platform (e.g., Grafana, Datadog)
    console.log('[WebVitals]', JSON.stringify({
      requestId,
      timestamp: body.timestamp,
      url: body.url,
      connection: body.connection,
      metrics: body.metrics
    }))

    // Store aggregated metrics in KV for dashboard (optional)
    // This is a simplified implementation - production would use proper analytics
    const dateKey = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const metricsKey = `analytics:webvitals:${dateKey}`

    // Fire-and-forget: Don't block response on analytics storage
    const ctx = { waitUntil: (promise: Promise<unknown>) => promise }

    ctx.waitUntil(
      (async () => {
        try {
          // Get existing data or initialize
          const existing = await env.ROUTE_CACHE.get(metricsKey, 'json') as Record<string, number[]> || {}

          // Aggregate metrics
          for (const [key, value] of Object.entries(body.metrics)) {
            if (typeof value === 'number' && !isNaN(value)) {
              if (!existing[key]) existing[key] = []
              existing[key].push(value)
              // Keep last 1000 values per metric per day
              if (existing[key].length > 1000) {
                existing[key] = existing[key].slice(-1000)
              }
            }
          }

          // Store with 30-day TTL
          await env.ROUTE_CACHE.put(metricsKey, JSON.stringify(existing), {
            expirationTtl: 30 * 24 * 60 * 60
          })
        } catch (e) {
          console.error('Failed to store Web Vitals metrics:', e)
        }
      })()
    )

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Web Vitals handler error:', error)
    return new Response(
      JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Invalid metrics data' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function processQueueMessage(message: QueueMessage, env: Env): Promise<void> {
  switch (message.type) {
    case 'FETCH_OCM_PAGE':
      await handleFetchOcmPage(message as Extract<QueueMessage, { type: 'FETCH_OCM_PAGE' }>, env)
      break
    case 'PROCESS_BATCH':
      await handleProcessBatch(message as Extract<QueueMessage, { type: 'PROCESS_BATCH' }>, env)
      break
    case 'WRITE_SNAPSHOT':
      await handleWriteSnapshot(message as Extract<QueueMessage, { type: 'WRITE_SNAPSHOT' }>, env)
      break
    case 'INVALIDATE_CACHE':
      await handleInvalidateCache(message as Extract<QueueMessage, { type: 'INVALIDATE_CACHE' }>, env)
      break
    default:
      console.warn('Unknown message type:', (message as { type: string }).type)
  }
}
