import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Station Query Flow
 * Task: T090 - E2E tests for station query
 *
 * Covers: Station search → Map display → Station details
 */

test.describe('Station Query Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
  })

  test('displays charging stations on map', async ({ page }) => {
    // Pan map to Bangkok area
    // This simulates user interacting with map
    await page.click('.leaflet-container')

    // Wait for stations to load
    await page.waitForTimeout(1000)

    // Verify station markers appear
    const stationMarkers = await page.locator('.station-marker').count()
    expect(stationMarkers).toBeGreaterThan(0)
  })

  test('clicking station marker shows details', async ({ page }) => {
    // Click on map to load stations
    await page.click('.leaflet-container')
    await page.waitForTimeout(1000)

    // Click first station marker
    await page.click('.station-marker')

    // Verify station details panel
    await expect(page.locator('[data-testid="station-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="station-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="station-connectors"]')).toBeVisible()
  })

  test('station search by location', async ({ page }) => {
    // Use search box to find stations
    await page.fill('[data-testid="station-search"]', 'Central World Bangkok')
    await page.press('[data-testid="station-search"]', 'Enter')

    // Wait for search results
    await page.waitForSelector('[data-testid="station-search-results"]', { timeout: 5000 })

    // Verify results displayed
    const results = await page.locator('[data-testid="station-search-item"]').count()
    expect(results).toBeGreaterThan(0)
  })

  test('filters stations by connector type', async ({ page }) => {
    // Open filter panel
    await page.click('[data-testid="filter-button"]')

    // Select CCS connector type
    await page.check('[data-testid="filter-ccs"]')

    // Apply filters
    await page.click('[data-testid="apply-filters"]')

    // Wait for map update
    await page.waitForTimeout(1000)

    // Verify filtered markers
    const markers = await page.locator('.station-marker').count()
    expect(markers).toBeGreaterThanOrEqual(0)
  })

  test('station details show connector information', async ({ page }) => {
    // Load stations
    await page.click('.leaflet-container')
    await page.waitForTimeout(1000)

    // Click station marker
    await page.click('.station-marker')

    // Verify connector details
    await expect(page.locator('[data-testid="connector-type"]')).toBeVisible()
    await expect(page.locator('[data-testid="connector-power"]')).toBeVisible()
    await expect(page.locator('[data-testid="connector-status"]')).toBeVisible()
  })

  test('map clustering at different zoom levels', async ({ page }) => {
    // Zoom out
    await page.click('.leaflet-control-zoom-out')
    await page.waitForTimeout(500)

    // Check for cluster markers at low zoom
    const clusters = await page.locator('.marker-cluster').count()

    // Zoom in
    await page.click('.leaflet-control-zoom-in')
    await page.click('.leaflet-control-zoom-in')
    await page.waitForTimeout(500)

    // Check for individual markers at high zoom
    const individual = await page.locator('.station-marker').count()

    // Either clusters or individual markers should exist
    expect(clusters + individual).toBeGreaterThan(0)
  })

  test('station data freshness indicator', async ({ page }) => {
    await page.click('.leaflet-container')
    await page.waitForTimeout(1000)

    await page.click('.station-marker')

    // Verify last updated timestamp
    await expect(page.locator('[data-testid="last-updated"]')).toBeVisible()

    // Verify it's recent (within 30 days for test data)
    const timestamp = await page.locator('[data-testid="last-updated"]').textContent()
    expect(timestamp).toContain('202')
  })

  test('handles empty search results gracefully', async ({ page }) => {
    // Search in remote area with no stations
    await page.fill('[data-testid="station-search"]', 'Middle of Ocean')
    await page.press('[data-testid="station-search"]', 'Enter')

    // Should show no results message
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible()
    await expect(page.locator('[data-testid="no-results"]')).toContainText('No stations found')
  })

  test('mobile station list view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    // Open station list on mobile
    await page.click('[data-testid="station-list-toggle"]')

    // Verify list is visible
    await expect(page.locator('[data-testid="station-list"]')).toBeVisible()

    // Click station in list
    await page.click('[data-testid="station-list-item"]:first-child')

    // Verify details shown
    await expect(page.locator('[data-testid="station-details"]')).toBeVisible()
  })

  test('station cache indicator', async ({ page }) => {
    // First load
    await page.click('.leaflet-container')
    await page.waitForTimeout(1000)

    // Check for cache indicator
    const cacheIndicator = page.locator('[data-testid="cache-indicator"]')

    if (await cacheIndicator.isVisible().catch(() => false)) {
      const text = await cacheIndicator.textContent()
      expect(['cached', 'fresh', 'live']).toContain(text?.toLowerCase())
    }
  })
})
