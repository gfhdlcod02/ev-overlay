import type { Env } from '@/types'

/**
 * Simple HTML Dashboard for Rate Limiting Metrics
 *
 * Serves at: /admin/dashboard/rate-limits
 * Displays current rate limit status, recent blocks, and utilization
 */

export async function serveRateLimitDashboard(env: Env): Promise<Response> {
  // Fetch aggregated rate limit data from KV
  const today = new Date().toISOString().split('T')[0]
  const metricsKey = `analytics:ratelimit:${today}`

  interface RateLimitMetrics {
    totalRequests: number
    blockedRequests: number
    topClients: Array<{ key: string; requests: number; blocked: number }>
    hourlyStats: Array<{ hour: number; requests: number; blocked: number }>
  }

  let metrics: RateLimitMetrics | null = null

  try {
    metrics = await env.ROUTE_CACHE.get(metricsKey, 'json') as RateLimitMetrics | null
  } catch {
    metrics = null
  }

  // Default empty state
  const data = metrics || {
    totalRequests: 0,
    blockedRequests: 0,
    topClients: [],
    hourlyStats: Array.from({ length: 24 }, (_, i) => ({ hour: i, requests: 0, blocked: 0 }))
  }

  const blockRate = data.totalRequests > 0
    ? ((data.blockedRequests / data.totalRequests) * 100).toFixed(2)
    : '0.00'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rate Limiting Dashboard - EV Overlay</title>
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
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: #1e293b;
      border-radius: 0.75rem;
      padding: 1.5rem;
      border: 1px solid #334155;
    }
    .card h2 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    .metric {
      font-size: 2.25rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .metric.success { color: #22c55e; }
    .metric.warning { color: #f59e0b; }
    .metric.danger { color: #ef4444; }
    .metric small {
      font-size: 0.875rem;
      font-weight: 400;
      color: #94a3b8;
      margin-left: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid #334155;
    }
    th {
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    tr:hover { background: #334155; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge.success { background: #166534; color: #86efac; }
    .badge.warning { background: #92400e; color: #fcd34d; }
    .badge.danger { background: #991b1b; color: #fca5a5; }
    .chart {
      height: 200px;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      padding-top: 1rem;
    }
    .bar {
      flex: 1;
      background: linear-gradient(to top, #3b82f6, #60a5fa);
      border-radius: 2px 2px 0 0;
      min-height: 4px;
      position: relative;
    }
    .bar.blocked {
      background: linear-gradient(to top, #ef4444, #f87171);
    }
    .bar:hover::after {
      content: attr(data-hour);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      white-space: nowrap;
      margin-bottom: 0.25rem;
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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
    .refresh:hover { background: #2563eb; }
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Rate Limiting Dashboard</h1>
      <p class="subtitle">Real-time rate limiting metrics and blocked requests</p>
    </header>

    <div class="grid">
      <div class="card">
        <h2>Total Requests (24h)</h2>
        <div class="metric">${data.totalRequests.toLocaleString()}</div>
      </div>

      <div class="card">
        <h2>Blocked Requests</h2>
        <div class="metric ${data.blockedRequests > 100 ? 'warning' : 'success'}">${data.blockedRequests.toLocaleString()}</div>
      </div>

      <div class="card">
        <h2>Block Rate</h2>
        <div class="metric ${parseFloat(blockRate) > 5 ? 'warning' : parseFloat(blockRate) > 10 ? 'danger' : 'success'}">${blockRate}%</div>
      </div>

      <div class="card">
        <h2>Top Client</h2>
        <div class="metric" style="font-size: 1.125rem;">
          ${data.topClients[0]?.key.substring(0, 16) || 'N/A'}<small>${data.topClients[0]?.requests || 0} req</small>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <h2>Hourly Request Distribution</h2>
      <div class="chart">
        ${data.hourlyStats.map(h => {
          const maxRequests = Math.max(...data.hourlyStats.map(s => s.requests), 1)
          const height = maxRequests > 0 ? (h.requests / maxRequests) * 100 : 0
          const blockedHeight = h.requests > 0 ? (h.blocked / h.requests) * height : 0
          return `<div class="bar ${h.blocked > 0 ? 'blocked' : ''}" style="height: ${height}%;" data-hour="${h.hour}:00 - ${h.requests} req, ${h.blocked} blocked"></div>`
        }).join('')}
      </div>
    </div>

    <div class="card">
      <h2>Top Clients by Request Volume</h2>
      ${data.topClients.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Client Key</th>
            <th>Requests</th>
            <th>Blocked</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.topClients.slice(0, 10).map(client => {
            const blockRate = client.requests > 0 ? (client.blocked / client.requests * 100).toFixed(1) : '0.0'
            const status = client.blocked > client.requests * 0.5 ? 'danger' : client.blocked > 0 ? 'warning' : 'success'
            const statusText = client.blocked > client.requests * 0.5 ? 'Throttled' : client.blocked > 0 ? 'Limited' : 'Normal'
            return `<tr>
              <td><code>${client.key.substring(0, 24)}...</code></td>
              <td>${client.requests.toLocaleString()}</td>
              <td>${client.blocked.toLocaleString()}</td>
              <td><span class="badge ${status}">${statusText}</span></td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
      ` : '<div class="empty-state">No client data available yet</div>'}
    </div>
  </div>

  <button class="refresh" onclick="location.reload()">Refresh</button>

  <script>
    // Auto-refresh every 60 seconds
    setTimeout(() => location.reload(), 60000);
  </script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store'
    }
  })
}

/**
 * Record rate limit metrics for dashboard
 */
export async function recordRateLimitMetric(
  env: Env,
  clientKey: string,
  allowed: boolean,
  remaining: number
): Promise<void> {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const hour = now.getHours()
  const metricsKey = `analytics:ratelimit:${today}`

  try {
    // Get existing metrics
    const existing = await env.ROUTE_CACHE.get(metricsKey, 'json') as {
      totalRequests: number
      blockedRequests: number
      topClients: Array<{ key: string; requests: number; blocked: number }>
      hourlyStats: Array<{ hour: number; requests: number; blocked: number }>
    } | null

    const metrics = existing || {
      totalRequests: 0,
      blockedRequests: 0,
      topClients: [],
      hourlyStats: Array.from({ length: 24 }, (_, i) => ({ hour: i, requests: 0, blocked: 0 }))
    }

    // Update totals
    metrics.totalRequests++
    if (!allowed) {
      metrics.blockedRequests++
    }

    // Update hourly stats
    metrics.hourlyStats[hour].requests++
    if (!allowed) {
      metrics.hourlyStats[hour].blocked++
    }

    // Update client stats
    const clientIndex = metrics.topClients.findIndex(c => c.key === clientKey)
    if (clientIndex >= 0) {
      metrics.topClients[clientIndex].requests++
      if (!allowed) {
        metrics.topClients[clientIndex].blocked++
      }
    } else {
      metrics.topClients.push({
        key: clientKey,
        requests: 1,
        blocked: allowed ? 0 : 1
      })
    }

    // Sort by request count and keep top 50
    metrics.topClients.sort((a, b) => b.requests - a.requests)
    metrics.topClients = metrics.topClients.slice(0, 50)

    // Store with 7-day TTL
    await env.ROUTE_CACHE.put(metricsKey, JSON.stringify(metrics), {
      expirationTtl: 7 * 24 * 60 * 60
    })
  } catch (error) {
    // Silently fail - don't block requests due to metrics errors
    console.error('Failed to record rate limit metric:', error)
  }
}
