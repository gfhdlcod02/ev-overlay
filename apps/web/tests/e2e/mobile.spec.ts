import { test, expect } from '@playwright/test'

// Mock route data
const mockRouteResponse = {
  route: {
    origin: { lat: 37.7749, lng: -122.4194, address: 'San Francisco, CA' },
    destination: { lat: 37.3382, lng: -121.8863, address: 'San Jose, CA' },
    distanceKm: 80.0,
    durationMin: 60,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [-122.4194, 37.7749],
        [-121.8863, 37.3382],
      ],
    },
  },
}

test.describe('Mobile Viewport', () => {
  test('should display correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000')

    // Should show the form
    await expect(page.getByRole('heading', { name: 'EV Trip Planner' })).toBeVisible()

    // Form inputs should be accessible
    await expect(page.getByLabel('Origin')).toBeVisible()
    await expect(page.getByLabel('Destination')).toBeVisible()
  })

  test('should plan trip on mobile device with coordinates', async ({ page }) => {
    // Mock API calls
    await page.route('**/api/route**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRouteResponse),
      })
    })

    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000')

    // Fill in trip with coordinates (skip geocoding)
    await page.getByLabel('Origin').fill('37.7749,-122.4194')
    await page.getByLabel('Destination').fill('37.3382,-121.8863') // San Jose coordinates

    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Wait for result
    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    // Summary should be visible
    await expect(page.getByText('Total Distance')).toBeVisible()
    await expect(page.getByText('Est. Duration')).toBeVisible()

    await page.screenshot({ path: 'test-results/mobile-trip-success.png' })
  })
})
