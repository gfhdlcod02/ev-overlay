import { test, expect } from '@playwright/test'

test.describe('API Error Handling', () => {
  test('should show error when API returns HTML error page instead of JSON', async ({ page }) => {
    // Route API calls to return HTML (simulating 404 or 500 error page)
    await page.route('**/api/route**', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'text/html',
        body: `<!DOCTYPE html>
<html>
<head><title>Not Found</title></head>
<body>
  <h1>404 Not Found</h1>
  <p>The requested URL was not found on this server.</p>
</body>
</html>`,
      })
    })

    await page.goto('http://localhost:3000')

    // Fill in form
    await page.getByLabel('Origin').fill('13.7563,100.5018')
    await page.getByLabel('Destination').fill('13.8500,100.5500')

    // Submit
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Should show service error heading
    await expect(page.getByRole('heading', { name: 'Service Error' })).toBeVisible()
    // Should show detailed error message
    await expect(page.getByText(/API returned HTML instead of JSON/)).toBeVisible()

    await page.screenshot({ path: 'test-results/api-html-error.png' })
  })

  test('should show error when API is unreachable (connection refused)', async ({ page }) => {
    // Block API calls to simulate unreachable service
    await page.route('**/api/route**', async route => {
      await route.abort('failed')
    })

    await page.goto('http://localhost:3000')

    // Fill in form
    await page.getByLabel('Origin').fill('13.7563,100.5018')
    await page.getByLabel('Destination').fill('13.8500,100.5500')

    // Submit
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Should show service error heading
    await expect(page.getByRole('heading', { name: 'Service Error' })).toBeVisible()
    // Should show detailed error message
    await expect(page.getByText(/Cannot connect to API server/)).toBeVisible()

    await page.screenshot({ path: 'test-results/api-unreachable.png' })
  })

  test('should diagnose API health before planning', async ({ page }) => {
    // First test with API available
    await page.route('**/api/route**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          route: {
            origin: { lat: 13.7563, lng: 100.5018, address: 'Bangkok' },
            destination: { lat: 13.85, lng: 100.55, address: 'Chiang Mai' },
            distanceKm: 700,
            durationMin: 480,
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [100.5018, 13.7563],
                [100.55, 13.85],
              ],
            },
          },
        }),
      })
    })

    await page.goto('http://localhost:3000')

    // Verify form is ready
    await expect(page.getByLabel('Origin')).toBeVisible()
    await expect(page.getByLabel('Destination')).toBeVisible()

    // Fill and submit
    await page.getByLabel('Origin').fill('13.7563,100.5018')
    await page.getByLabel('Destination').fill('13.8500,100.5500')
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Should show success
    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/api-success.png' })
  })

  test('should handle API returning 500 Internal Server Error', async ({ page }) => {
    await page.route('**/api/route**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'ROUTE_CALCULATION_FAILED',
            message: 'Failed to calculate route from OSRM',
          },
        }),
      })
    })

    await page.goto('http://localhost:3000')

    await page.getByLabel('Origin').fill('13.7563,100.5018')
    await page.getByLabel('Destination').fill('13.8500,100.5500')
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Should show service error heading
    await expect(page.getByRole('heading', { name: 'Service Error' })).toBeVisible()
    // Should show detailed error message from API
    await expect(page.getByText(/Failed to calculate route from OSRM/)).toBeVisible()

    await page.screenshot({ path: 'test-results/api-500-error.png' })
  })

  test('should handle rate limiting (429)', async ({ page }) => {
    await page.route('**/api/route**', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: {
          'Retry-After': '60',
        },
        body: JSON.stringify({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        }),
      })
    })

    await page.goto('http://localhost:3000')

    await page.getByLabel('Origin').fill('13.7563,100.5018')
    await page.getByLabel('Destination').fill('13.8500,100.5500')
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Should show rate limit error
    await expect(page.getByText(/rate limit|too many requests/i)).toBeVisible()

    await page.screenshot({ path: 'test-results/api-rate-limited.png' })
  })
})
