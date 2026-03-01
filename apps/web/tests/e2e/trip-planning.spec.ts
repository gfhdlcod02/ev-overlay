import { test, expect } from '@playwright/test'

// Mock route data for SF to LA
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

test.describe('Trip Planning Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API calls
    await page.route('**/api/route**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRouteResponse),
      })
    })

    // Mock geocoding API
    await page.route('**://nominatim.openstreetmap.org/**', async (route) => {
      const url = route.request().url()
      if (url.includes('San+Francisco')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ lat: '37.7749', lon: '-122.4194', display_name: 'San Francisco, CA' }]),
        })
      } else if (url.includes('Los+Angeles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ lat: '34.0522', lon: '-118.2437', display_name: 'Los Angeles, CA' }]),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ lat: '37.7749', lon: '-122.4194', display_name: 'Mock Location' }]),
        })
      }
    })

    await page.goto('http://localhost:3000')
  })

  test('should display the trip planner form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'EV Trip Planner' })).toBeVisible()
    await expect(page.getByLabel('Origin')).toBeVisible()
    await expect(page.getByLabel('Destination')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Plan Trip' })).toBeVisible()
  })

  test('should plan a trip from SF to LA with coordinates', async ({ page }) => {
    // Fill in coordinates directly (skip geocoding)
    await page.getByLabel('Origin').fill('37.7749,-122.4194')
    await page.getByLabel('Destination').fill('34.0522,-118.2437')

    // Wait for button to be enabled
    await expect(page.getByRole('button', { name: 'Plan Trip' })).toBeEnabled()

    // Submit the form
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Wait for loading to complete and result to appear
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

  test('should show loading state while planning', async ({ page }) => {
    // Add a delay to the mock to ensure loading state is visible
    await page.route('**/api/route**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRouteResponse),
      })
    })

    await page.getByLabel('Origin').fill('37.7749,-122.4194')
    await page.getByLabel('Destination').fill('34.0522,-118.2437')

    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Should show loading state briefly
    await expect(page.getByText('Planning...')).toBeVisible()
  })

  test('should calculate and display charging stops for long trips', async ({ page }) => {
    // Long trip with lower range to force charging stops
    await page.getByLabel('Origin').fill('37.7749,-122.4194')
    await page.getByLabel('Destination').fill('34.0522,-118.2437')

    // Reduce the range to ensure stops are needed
    await page.getByLabel('Range at 100%:').fill('200')
    await page.getByLabel('Current Charge:').fill('50')

    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Wait for result
    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    // Should show charging stops
    await expect(page.getByText('Charging Stops')).toBeVisible()

    await page.screenshot({ path: 'test-results/with-charging-stops.png' })
  })

  test('should show no charging stops needed for trips within range', async ({ page }) => {
    // Use a mock that returns a short route (within safe range)
    await page.route('**/api/route**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            origin: { lat: 37.7749, lng: -122.4194, address: 'San Francisco, CA' },
            destination: { lat: 37.8044, lng: -122.2712, address: 'Oakland, CA' },
            distanceKm: 20, // Short distance - no stops needed
            durationMin: 25,
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

    // Short trip with good range
    await page.getByLabel('Origin').fill('37.7749,-122.4194')
    await page.getByLabel('Destination').fill('37.8044,-122.2712')

    // Good range and charge
    await page.getByLabel('Current Charge:').fill('80')
    await page.getByLabel('Range at 100%:').fill('300')

    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Wait for result
    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    // Should show no stops needed message
    await expect(page.getByText(/No charging stops needed/)).toBeVisible()

    await page.screenshot({ path: 'test-results/no-stops-needed.png' })
  })

  test('should reset form when clicking reset button', async ({ page }) => {
    // Fill in and submit
    await page.getByLabel('Origin').fill('37.7749,-122.4194')
    await page.getByLabel('Destination').fill('34.0522,-118.2437')

    await page.getByRole('button', { name: 'Plan Trip' }).click()
    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    // Click reset
    await page.getByRole('button', { name: 'Reset' }).click()

    // Form should be cleared
    await expect(page.getByLabel('Origin')).toHaveValue('')
    await expect(page.getByLabel('Destination')).toHaveValue('')
    await expect(page.getByText('Trip Summary')).not.toBeVisible()
  })
})
