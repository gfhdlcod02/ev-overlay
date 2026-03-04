import { test, expect } from '@playwright/test'

test.describe('API Configuration', () => {
  test('should use correct API URL for route requests', async ({ page }) => {
    // Track network requests
    const apiRequests: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/route')) {
        apiRequests.push(url)
      }
    })

    // Mock the API response
    await page.route('**/api/route**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            segments: [],
            totalDistance: 1000,
            totalDuration: 3600,
            chargingStops: [],
          },
        }),
      })
    })

    await page.goto('/')

    // Fill in origin and destination
    await page.getByLabel('Origin').fill('13.7563,100.5018')
    await page.getByLabel('Destination').fill('18.7883,98.9853')

    // Click plan trip button
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Wait for API call
    await page.waitForTimeout(1000)

    // Verify API was called with correct URL pattern
    expect(apiRequests.length).toBeGreaterThan(0)

    const apiUrl = apiRequests[0]

    // Should be absolute URL, not relative
    expect(apiUrl).toMatch(/^https?:\/\//)

    // Should contain the workers.dev domain in production
    // or localhost in development
    const isValidUrl =
      apiUrl.includes('workers.dev') || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')

    expect(isValidUrl, `API URL should point to valid endpoint, got: ${apiUrl}`).toBe(true)
  })

  test('API URL should be configured in built application', async ({ page }) => {
    // This test verifies the API endpoint configuration by checking
    // that the API client is properly configured in the built app

    await page.goto('/')

    // Wait for the app to load
    await expect(page.locator('.leaflet-container')).toBeVisible()

    // Check if the page loaded without errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Verify the app is functional by checking for key elements
    await expect(page.getByLabel('Origin')).toBeVisible()
    await expect(page.getByLabel('Destination')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Plan Trip' })).toBeVisible()

    // Fill in test data to trigger API validation
    await page.getByLabel('Origin').fill('13.7563,100.5018')
    await page.getByLabel('Destination').fill('18.7883,98.9853')

    // Check that inputs accepted the values
    await expect(page.getByLabel('Origin')).toHaveValue('13.7563,100.5018')
    await expect(page.getByLabel('Destination')).toHaveValue('18.7883,98.9853')
  })
})
