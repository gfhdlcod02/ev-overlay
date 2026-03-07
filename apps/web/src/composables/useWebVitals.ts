import { onMounted, ref } from 'vue'

export interface WebVitalsMetrics {
  lcp?: number // Largest Contentful Paint (ms)
  fid?: number // First Input Delay (ms)
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte (ms)
  fcp?: number // First Contentful Paint (ms)
  inp?: number // Interaction to Next Paint (ms) - new metric
}

export interface WebVitalsReport {
  metrics: WebVitalsMetrics
  url: string
  timestamp: string
  userAgent: string
  connection?: string
}

const metrics = ref<WebVitalsMetrics>({})

/**
 * Track Web Vitals performance metrics
 * Reports metrics to analytics endpoint for monitoring
 */
export function useWebVitals() {
  const isSupported = typeof window !== 'undefined' && 'performance' in window

  onMounted(() => {
    if (!isSupported) return

    // Time to First Byte (TTFB)
    measureTTFB()

    // First Contentful Paint (FCP)
    measureFCP()

    // Largest Contentful Paint (LCP)
    measureLCP()

    // First Input Delay (FID)
    measureFID()

    // Cumulative Layout Shift (CLS)
    measureCLS()

    // Interaction to Next Paint (INP) - using observer approach
    measureINP()

    // Report metrics after page is fully loaded and stable
    if (document.readyState === 'complete') {
      scheduleReport()
    } else {
      window.addEventListener('load', scheduleReport)
    }
  })

  function measureTTFB() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      metrics.value.ttfb = navigation.responseStart - navigation.startTime
    }
  }

  function measureFCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          metrics.value.fcp = entry.startTime
          observer.disconnect()
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['paint'] })
    } catch {
      // FCP not supported
    }
  }

  function measureLCP() {
    let lcpValue = 0

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      for (const entry of entries) {
        // Get the last (largest) entry
        lcpValue = entry.startTime
      }
      metrics.value.lcp = lcpValue
    })

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch {
      // LCP not supported
    }
  }

  function measureFID() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      for (const entry of entries) {
        const fidEntry = entry as PerformanceEventTiming
        metrics.value.fid = fidEntry.processingStart - fidEntry.startTime
        observer.disconnect()
      }
    })

    try {
      observer.observe({ entryTypes: ['first-input'] })
    } catch {
      // FID not supported
    }
  }

  function measureCLS() {
    let clsValue = 0
    let sessionEntries: PerformanceEntry[] = []
    let sessionValue = 0

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      for (const entry of entries) {
        // Only count layout shifts without recent user input
        const layoutShift = entry as LayoutShift
        if (!layoutShift.hadRecentInput) {
          sessionEntries.push(entry)
          sessionValue += layoutShift.value
        }
      }
      clsValue = sessionValue
      metrics.value.cls = clsValue
    })

    try {
      observer.observe({ entryTypes: ['layout-shift'] })
    } catch {
      // CLS not supported
    }
  }

  function measureINP() {
    const interactions: number[] = []

    // Extended PerformanceEventTiming with interactionId (not in standard types yet)
    interface PerformanceEventTimingExt extends PerformanceEventTiming {
      interactionId?: number
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEventTimingExt[]
      for (const entry of entries) {
        if (entry.interactionId && entry.interactionId > 0) {
          const duration = entry.processingEnd - entry.startTime
          interactions.push(duration)
        }
      }

      // INP is the 98th percentile of interaction durations
      if (interactions.length > 0) {
        const sorted = interactions.sort((a, b) => a - b)
        const index = Math.floor(sorted.length * 0.98)
        metrics.value.inp = sorted[index]
      }
    })

    try {
      observer.observe({ entryTypes: ['event'] })
    } catch {
      // Event timing not supported
    }
  }

  function scheduleReport() {
    // Report after 5 seconds to capture stable metrics
    setTimeout(() => {
      reportMetrics()
    }, 5000)
  }

  async function reportMetrics() {
    // Skip if no meaningful metrics collected
    if (Object.keys(metrics.value).length === 0) return

    const report: WebVitalsReport = {
      metrics: metrics.value,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: (navigator as NavigatorWithConnection).connection?.effectiveType
    }

    // Send to analytics endpoint
    try {
      // Use sendBeacon for reliable delivery during page unload
      const data = JSON.stringify(report)

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/v1/analytics/web-vitals', new Blob([data], { type: 'application/json' }))
      } else {
        // Fallback to fetch
        await fetch('/api/v1/analytics/web-vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true
        })
      }
    } catch {
      // Silently fail - don't impact user experience
    }
  }

  return {
    metrics,
    getWebVitalsSummary: () => ({
      ...metrics.value,
      // Score thresholds per Core Web Vitals
      scores: {
        lcp: getScore(metrics.value.lcp, 2500, 4000), // Good < 2.5s, Poor > 4s
        fid: getScore(metrics.value.fid, 100, 300),   // Good < 100ms, Poor > 300ms
        cls: getScore(metrics.value.cls, 0.1, 0.25),  // Good < 0.1, Poor > 0.25
        fcp: getScore(metrics.value.fcp, 1800, 3000), // Good < 1.8s, Poor > 3s
        ttfb: getScore(metrics.value.ttfb, 800, 1800), // Good < 800ms, Poor > 1.8s
        inp: getScore(metrics.value.inp, 200, 500)    // Good < 200ms, Poor > 500ms
      }
    })
  }
}

// Helper to determine score category
type Score = 'good' | 'needs-improvement' | 'poor' | 'unknown'

function getScore(value: number | undefined, goodThreshold: number, poorThreshold: number): Score {
  if (value === undefined) return 'unknown'
  if (value <= goodThreshold) return 'good'
  if (value <= poorThreshold) return 'needs-improvement'
  return 'poor'
}

// Type for Navigator with connection API
interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string
  }
}

// Type for Layout Shift entry
interface LayoutShift extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}
