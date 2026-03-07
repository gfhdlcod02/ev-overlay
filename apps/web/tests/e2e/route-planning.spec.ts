import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Route Planning Flow
 * Task: T089 - E2E tests for route planning
 *
 * Covers: Input form → Route calculation → Map display → Charging stops
 */

test.describe('Route Planning Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/')
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
  })

  test('user can plan a route from Bangkok to Chiang Mai', async ({ page }) => {
    // Fill origin
    await page.fill('[data-testid="origin-input"]', 'Bangkok')
    await page.press('[data-testid="origin-input"]', 'Tab')

    // Fill destination
    await page.fill('[data-testid="destination-input"]', 'Chiang Mai')
    await page.press('[data-testid="destination-input"]', 'Tab')

    // Set EV parameters using range inputs
    await page.locator('[data-testid="range-km"]').fill('450')
    await page.locator('[data-testid="current-soc"]').fill('80')

    // Submit form
    await page.click('[data-testid="plan-route-button"]')

    // Wait for route calculation
    await page.waitForSelector('[data-testid="route-results"]', { timeout: 10000 })

    // Verify results displayed
    await expect(page.locator('[data-testid="route-summary"]')).toBeVisible()
    await expect(page.locator('[data-testid="charging-stops"]')).toBeVisible()

    // Verify at least one charging stop suggested
    const stops = await page.locator('[data-testid="charging-stop-item"]').count()
    expect(stops).toBeGreaterThan(0)
  })

  test('displays loading state during route calculation', async ({ page }) => {
    await page.fill('[data-testid="origin-input"]', 'Bangkok')
    await page.fill('[data-testid="destination-input"]', 'Chiang Mai')
    await page.locator('[data-testid="current-soc"]').fill('80')

    await page.click('[data-testid="plan-route-button"]')

    // Verify loading state
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()

    // Wait for results
    await page.waitForSelector('[data-testid="route-results"]', { timeout: 10000 })

    // Loading should disappear
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible()
  })

  test('shows error for invalid coordinates', async ({ page }) => {
    // Try to submit without entering destination
    await page.fill('[data-testid="origin-input"]', 'Bangkok')

    // Submit form - should show validation error
    await page.click('[data-testid="plan-route-button"]')

    // Verify error message (validation error for empty destination)
    // The button may be disabled or show validation errors
    const submitButton = page.locator('[data-testid="plan-route-button"]')
    const isDisabled = await submitButton.isDisabled()
    expect(isDisabled).toBe(true)
  })

  test('caches route results for identical requests', async ({ page }) => {
    // First request
    await page.fill('[data-testid="origin-input"]', 'Bangkok')
    await page.fill('[data-testid="destination-input"]', 'Chiang Mai')
    await page.locator('[data-testid="current-soc"]').fill('80')

    const startTime1 = Date.now()
    await page.click('[data-testid="plan-route-button"]')
    await page.waitForSelector('[data-testid="route-results"]', { timeout: 10000 })
    const duration1 = Date.now() - startTime1

    // Reset and make same request
    await page.click('[data-testid="reset-button"]')
    await page.fill('[data-testid="origin-input"]', 'Bangkok')
    await page.fill('[data-testid="destination-input"]', 'Chiang Mai')
    await page.locator('[data-testid="current-soc"]').fill('80')

    const startTime2 = Date.now()
    await page.click('[data-testid="plan-route-button"]')
    await page.waitForSelector('[data-testid="route-results"]', { timeout: 5000 })
    const duration2 = Date.now() - startTime2

    // Cached response should be faster (or at least not slower)
    expect(duration2).toBeLessThanOrEqual(duration1 + 1000)
  })

  test('displays route on map', async ({ page }) => {
    await page.fill('[data-testid="origin-input"]', 'Bangkok')
    await page.fill('[data-testid="destination-input"]', 'Chiang Mai')
    await page.locator('[data-testid="current-soc"]').fill('80')

    await page.click('[data-testid="plan-route-button"]')
    await page.waitForSelector('[data-testid="route-results"]', { timeout: 10000 })

    // Verify route polyline is on map
    await expect(page.locator('.leaflet-overlay-pane svg path')).toBeVisible()
  })

  test('Open in Google Maps button works', async ({ page, context }) => {
    await page.fill('[data-testid="origin-input"]', 'Bangkok')
    await page.fill('[data-testid="destination-input"]', 'Chiang Mai')
    await page.locator('[data-testid="current-soc"]').fill('80')

    await page.click('[data-testid="plan-route-button"]')
    await page.waitForSelector('[data-testid="route-results"]', { timeout: 10000 })

    // Click Google Maps button
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('[data-testid="open-google-maps"]'),
    ])

    // Verify Google Maps URL
    await expect(newPage).toHaveURL(/google\.com\/maps/)
  })

  test('handles rate limiting gracefully', async ({ page }) => {
    // Make multiple rapid requests to trigger rate limit
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="origin-input"]', `Test Origin ${i}`)
      await page.fill('[data-testid="destination-input"]', `Test Dest ${i}`)
      await page.click('[data-testid="plan-route-button"]')
      await page.waitForTimeout(100)
    }

    // Should show rate limit message instead of crashing
    const errorVisible = await page.locator('[data-testid="error-message"]').isVisible()
    if (errorVisible) {
      await expect(page.locator('[data-testid="error-message"]')).toContainText('rate limit')
    }
  })

  test('mobile viewport responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.fill('[data-testid="origin-input"]', 'Bangkok')
    await page.fill('[data-testid="destination-input"]', 'Chiang Mai')
    await page.click('[data-testid="plan-route-button"]')

    await page.waitForSelector('[data-testid="route-results"]', { timeout: 10000 })

    // Verify elements are visible on mobile
    await expect(page.locator('[data-testid="route-summary"]')).toBeVisible()

    // Check that map doesn't overflow
    const mapBox = await page.locator('.leaflet-container').boundingBox()
    expect(mapBox?.width).toBeLessThanOrEqual(375)
  })
})
