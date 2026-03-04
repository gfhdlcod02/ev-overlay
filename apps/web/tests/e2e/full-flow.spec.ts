import { test, expect } from '@playwright/test'

// Mock route data
const mockRouteResponse = {
  route: {
    origin: { lat: 37.7749, lng: -122.4194, address: 'San Francisco, CA' },
    destination: { lat: 34.0522, lng: -118.2437, address: 'Los Angeles, CA' },
    distanceKm: 612.5,
    durationMin: 350,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [-122.4194, 37.7749],
        [-120.0, 36.5],
        [-118.2437, 34.0522],
      ],
    },
  },
}

const mockShortRouteResponse = {
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

test.describe('Full Trip Planning Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API calls
    await page.route('**/api/route**', async route => {
      const url = route.request().url()
      // Return short route for San Jose destination
      if (url.includes('San+Jose') || url.includes('37.3382')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockShortRouteResponse),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockRouteResponse),
        })
      }
    })

    // Mock geocoding API
    await page.route('**://nominatim.openstreetmap.org/**', async route => {
      const url = route.request().url()
      if (url.includes('San+Francisco')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { lat: '37.7749', lon: '-122.4194', display_name: 'San Francisco, CA' },
          ]),
        })
      } else if (url.includes('Los+Angeles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { lat: '34.0522', lon: '-118.2437', display_name: 'Los Angeles, CA' },
          ]),
        })
      } else if (url.includes('San+Jose')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { lat: '37.3382', lon: '-121.8863', display_name: 'San Jose, CA' },
          ]),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { lat: '37.7749', lon: '-122.4194', display_name: 'Mock Location' },
          ]),
        })
      }
    })

    await page.goto('http://localhost:3000')
  })

  test('should plan trip from SF to LA with geocoding', async ({ page }) => {
    // Wait for form to load
    await expect(page.getByRole('heading', { name: 'EV Trip Planner' })).toBeVisible()

    // Fill in addresses (not coordinates)
    await page.getByLabel('Origin').fill('San Francisco, CA')
    await page.getByLabel('Destination').fill('Los Angeles, CA')

    // Click Plan Trip
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Wait for result (loading state may be too brief to catch)
    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    // Verify results
    await expect(page.getByText('Total Distance')).toBeVisible()
    await expect(page.getByText('Est. Duration')).toBeVisible()
    await expect(page.getByText('Safe Range')).toBeVisible()

    // Verify Google Maps button
    await expect(page.getByRole('link', { name: 'Open in Google Maps' })).toBeVisible()

    // Take screenshot of success
    await page.screenshot({ path: 'test-results/sf-to-la-success.png' })
  })

  test('should show charging stops for long trip with low range', async ({ page }) => {
    await page.getByLabel('Origin').fill('San Francisco, CA')
    await page.getByLabel('Destination').fill('Los Angeles, CA')

    // Reduce range to force charging stops
    await page.getByLabel('Range at 100%:').fill('200')
    await page.getByLabel('Current Charge:').fill('50')

    await page.getByRole('button', { name: 'Plan Trip' }).click()

    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    // Should show charging stops
    await expect(page.getByText('Charging Stops')).toBeVisible()

    await page.screenshot({ path: 'test-results/with-charging-stops.png' })
  })

  test('should show no stops needed for trip within range', async ({ page }) => {
    // Mock a very short route that won't need charging
    await page.route('**/api/route**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            origin: { lat: 37.7749, lng: -122.4194, address: 'San Francisco, CA' },
            destination: { lat: 37.8044, lng: -122.2712, address: 'Oakland, CA' },
            distanceKm: 15, // Very short distance - no stops needed
            durationMin: 20,
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [-122.4194, 37.7749],
                [-122.2712, 37.8044],
              ],
            },
          },
        }),
      })
    })

    await page.getByLabel('Origin').fill('San Francisco, CA')
    await page.getByLabel('Destination').fill('Oakland, CA')

    // High range
    await page.getByLabel('Range at 100%:').fill('500')
    await page.getByLabel('Current Charge:').fill('90')

    await page.getByRole('button', { name: 'Plan Trip' }).click()

    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    // Should show no stops needed
    await expect(page.getByText(/No charging stops needed/)).toBeVisible()

    await page.screenshot({ path: 'test-results/no-stops-needed.png' })
  })
})
