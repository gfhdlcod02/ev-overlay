import type { Env } from '@/types'

/**
 * Alert Webhook Stub Implementations
 *
 * Provides test endpoints for PagerDuty and Slack integration
 * Serves at: /admin/alerts/webhook/pagerduty and /admin/alerts/webhook/slack
 *
 * These stubs accept webhook payloads and log them for testing
 * without sending actual notifications.
 */

export interface PagerDutyPayload {
  routing_key: string
  event_action: 'trigger' | 'acknowledge' | 'resolve'
  dedup_key?: string
  payload?: {
    summary: string
    severity: 'critical' | 'error' | 'warning' | 'info'
    source: string
    component?: string
    group?: string
    class?: string
    custom_details?: Record<string, unknown>
  }
}

export interface SlackPayload {
  text?: string
  blocks?: Array<{
    type: string
    text?: { type: string; text: string }
  }>
  attachments?: Array<{
    color: string
    title: string
    text: string
    fields?: Array<{ title: string; value: string; short: boolean }>
  }>
}

interface StoredAlert {
  id: string
  timestamp: string
  type: 'pagerduty' | 'slack'
  payload: PagerDutyPayload | SlackPayload
  source: string
}

const ALERTS_STORE_KEY = 'alerts:webhook:store'
const MAX_STORED_ALERTS = 100

/**
 * Handle PagerDuty webhook (stub)
 */
export async function handlePagerDutyWebhook(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const payload = await request.json() as PagerDutyPayload

    // Validate required fields
    if (!payload.routing_key) {
      return new Response(
        JSON.stringify({ error: 'Missing routing_key' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!payload.event_action) {
      return new Response(
        JSON.stringify({ error: 'Missing event_action' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Store the alert
    const alert: StoredAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'pagerduty',
      payload,
      source: request.headers.get('X-Forwarded-For') || 'unknown'
    }

    await storeAlert(env, alert)

    // Log the alert
    console.log('[PagerDuty Stub]', JSON.stringify({
      requestId,
      alertId: alert.id,
      eventAction: payload.event_action,
      summary: payload.payload?.summary || 'N/A',
      severity: payload.payload?.severity || 'unknown'
    }))

    // Return PagerDuty-style response
    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Event processed',
        dedup_key: payload.dedup_key || crypto.randomUUID()
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('PagerDuty webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Handle Slack webhook (stub)
 */
export async function handleSlackWebhook(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const payload = await request.json() as SlackPayload

    // Validate - either text or blocks must be present
    if (!payload.text && !payload.blocks && !payload.attachments) {
      return new Response(
        JSON.stringify({ error: 'Missing message content (text, blocks, or attachments required)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Store the alert
    const alert: StoredAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'slack',
      payload,
      source: request.headers.get('X-Forwarded-For') || 'unknown'
    }

    await storeAlert(env, alert)

    // Log the alert
    const messageText = payload.text ||
      payload.attachments?.[0]?.text ||
      payload.blocks?.find(b => b.text)?.text?.text ||
      'N/A'

    console.log('[Slack Stub]', JSON.stringify({
      requestId,
      alertId: alert.id,
      message: messageText.substring(0, 200)
    }))

    // Return Slack-style response
    return new Response(
      JSON.stringify({
        ok: true,
        warning: 'This is a stub endpoint - no actual Slack notification sent'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Slack webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Serve alert history dashboard
 */
export async function serveAlertHistory(env: Env): Promise<Response> {
  const alerts = await getStoredAlerts(env)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alert History - EV Overlay</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header {
      border-bottom: 1px solid #334155;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    h1 { font-size: 1.875rem; font-weight: 700; color: #f8fafc; }
    .subtitle { color: #94a3b8; margin-top: 0.25rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #1e293b;
      border-radius: 0.5rem;
      padding: 1rem;
      text-align: center;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #3b82f6;
    }
    .stat-label {
      font-size: 0.875rem;
      color: #94a3b8;
    }
    .alert-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .alert-item {
      background: #1e293b;
      border-radius: 0.5rem;
      padding: 1rem;
      border-left: 4px solid #334155;
    }
    .alert-item.pagerduty { border-left-color: #06b6d4; }
    .alert-item.slack { border-left-color: #a855f7; }
    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .alert-type {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background: #334155;
    }
    .alert-type.pagerduty { background: #164e63; color: #67e8f9; }
    .alert-type.slack { background: #581c87; color: #d8b4fe; }
    .alert-time {
      font-size: 0.75rem;
      color: #64748b;
    }
    .alert-content {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.75rem;
      background: #0f172a;
      padding: 0.75rem;
      border-radius: 0.25rem;
      overflow-x: auto;
      max-height: 150px;
      overflow-y: auto;
    }
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #64748b;
    }
    .endpoint-info {
      background: #1e293b;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .endpoint-info h2 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .endpoint {
      font-family: monospace;
      font-size: 0.875rem;
      background: #0f172a;
      padding: 0.5rem 0.75rem;
      border-radius: 0.25rem;
      margin-bottom: 0.5rem;
    }
    .refresh {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Alert History</h1>
      <p class="subtitle">Received webhook alerts for testing</p>
    </header>

    <div class="endpoint-info">
      <h2>Webhook Endpoints (Stub)</h2>
      <div class="endpoint">POST /admin/alerts/webhook/pagerduty</div>
      <div class="endpoint">POST /admin/alerts/webhook/slack</div>
      <p style="margin-top: 0.5rem; font-size: 0.875rem; color: #94a3b8;">
        These endpoints accept webhook payloads but only log them for testing.
        No actual notifications are sent.
      </p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${alerts.length}</div>
        <div class="stat-label">Total Alerts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${alerts.filter(a => a.type === 'pagerduty').length}</div>
        <div class="stat-label">PagerDuty</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${alerts.filter(a => a.type === 'slack').length}</div>
        <div class="stat-label">Slack</div>
      </div>
    </div>

    <div class="alert-list">
      ${alerts.length > 0 ? alerts.slice().reverse().map(alert => `
        <div class="alert-item ${alert.type}">
          <div class="alert-header">
            <span class="alert-type ${alert.type}">${alert.type}</span>
            <span class="alert-time">${new Date(alert.timestamp).toLocaleString()}</span>
          </div>
          <pre class="alert-content">${JSON.stringify(alert.payload, null, 2).substring(0, 500)}${JSON.stringify(alert.payload, null, 2).length > 500 ? '...' : ''}</pre>
        </div>
      `).join('') : '<div class="empty-state">No alerts received yet</div>'}
    </div>
  </div>

  <button class="refresh" onclick="location.reload()">Refresh</button>
  <script>setTimeout(() => location.reload(), 30000);</script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }
  })
}

/**
 * Store alert in KV
 */
async function storeAlert(env: Env, alert: StoredAlert): Promise<void> {
  try {
    const existing = await env.ROUTE_CACHE.get(ALERTS_STORE_KEY, 'json') as StoredAlert[] | null
    const alerts = existing || []

    alerts.push(alert)

    // Keep only last N alerts
    while (alerts.length > MAX_STORED_ALERTS) {
      alerts.shift()
    }

    // Store with 7-day TTL
    await env.ROUTE_CACHE.put(ALERTS_STORE_KEY, JSON.stringify(alerts), {
      expirationTtl: 7 * 24 * 60 * 60
    })
  } catch (error) {
    console.error('Failed to store alert:', error)
  }
}

/**
 * Get stored alerts
 */
async function getStoredAlerts(env: Env): Promise<StoredAlert[]> {
  try {
    return await env.ROUTE_CACHE.get(ALERTS_STORE_KEY, 'json') as StoredAlert[] || []
  } catch {
    return []
  }
}

/**
 * Trigger a test alert (for manual testing)
 */
export async function triggerTestAlert(
  type: 'pagerduty' | 'slack',
  env: Env
): Promise<Response> {
  const alert: StoredAlert = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    payload: type === 'pagerduty'
      ? {
          routing_key: 'test-key',
          event_action: 'trigger',
          payload: {
            summary: 'Test alert from EV Overlay',
            severity: 'warning',
            source: 'test-endpoint',
            custom_details: {
              test: true,
              timestamp: new Date().toISOString()
            }
          }
        }
      : {
          text: 'Test alert from EV Overlay',
          attachments: [{
            color: 'warning',
            title: 'Test Alert',
            text: 'This is a test message',
            fields: [
              { title: 'Environment', value: 'test', short: true },
              { title: 'Timestamp', value: new Date().toISOString(), short: true }
            ]
          }]
        },
    source: 'test-trigger'
  }

  await storeAlert(env, alert)

  return new Response(
    JSON.stringify({
      success: true,
      message: `Test ${type} alert created`,
      alertId: alert.id
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
