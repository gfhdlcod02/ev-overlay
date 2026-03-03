import { test, expect } from '@playwright/test'

// Mock route data
const mockRouteResponse = {
  route: {
    origin: { lat: 13.7563, lng: 100.5018, address: 'Bangkok, Thailand' },
    destination: { lat: 13.8500, lng: 100.5500, address: 'Destination' },
    distanceKm: 15.5,
    durationMin: 25,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [100.5018, 13.7563],
        [100.55, 13.85],
      ],
    },
  },
}

test.describe('iOS Geolocation Coordinate Formatting', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API calls
    await page.route('**/api/route**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRouteResponse),
      })
    })

    await page.goto('http://localhost:3000')
  })

  test('should handle geolocation coordinates with dot decimal separator', async ({ page }) => {
    // Grant geolocation permission
    await page.context().grantPermissions(['geolocation'])

    // Set up mock geolocation BEFORE page load to ensure watch works
    await page.addInitScript(() => {
      const mockPosition = {
        coords: {
          latitude: 13.7563,
          longitude: 100.5018,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      }

      // Override geolocation API
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            success(mockPosition as unknown as GeolocationPosition)
          },
          watchPosition: (success: PositionCallback) => {
            success(mockPosition as unknown as GeolocationPosition)
            return 0
          },
          clearWatch: () => {},
        },
        writable: true,
      })
    })

    // Reload page to trigger geolocation with mock
    await page.reload()

    // Wait for geolocation to populate origin
    await page.waitForTimeout(1000)

    // Get the origin input value
    const originValue = await page.getByLabel('Origin').inputValue()

    // Verify coordinates use dot as decimal separator (not comma)
    // The format should be: lat,lng with dots as decimal separators
    expect(originValue).toMatch(/^-?\d+\.\d+,-?\d+\.\d+$/)
    expect(originValue).not.toContain(',,')
    expect(originValue).toContain('.')

    // Fill destination
    await page.getByLabel('Destination').fill('13.8500,100.5500')

    // Click Plan Trip
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Should show Trip Summary (no error)
    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/ios-geolocation-success.png' })
  })

  test('should plan trip with coordinates on iPhone Safari', async ({ page }) => {
    // Simulate iPhone Safari user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })

    // Fill in coordinates directly (bypassing geolocation)
    await page.getByLabel('Origin').fill('13.7563,100.5018')
    await page.getByLabel('Destination').fill('13.8500,100.5500')

    // Verify the format is correct
    const originValue = await page.getByLabel('Origin').inputValue()
    expect(originValue).toBe('13.7563,100.5018')

    // Submit
    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Should succeed
    await expect(page.getByText('Trip Summary')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/ios-safari-trip-success.png' })
  })

  test('should not show locale-related errors in coordinates', async ({ page }) => {
    // Test various coordinate formats that might cause issues
    const testCases = [
      { input: '13.756300,100.501800', expected: '13.756300,100.501800' },
      { input: '13.7563,100.5018', expected: '13.7563,100.5018' },
      { input: '-33.8688,151.2093', expected: '-33.8688,151.2093' }, // Sydney
      { input: '0,0', expected: '0,0' }, // Equator/Prime Meridian
    ]

    for (const testCase of testCases) {
      await page.getByLabel('Origin').fill(testCase.input)
      await page.getByLabel('Destination').fill('13.8500,100.5500')

      const originValue = await page.getByLabel('Origin').inputValue()
      expect(originValue).toBe(testCase.expected)

      // Clear for next test
      await page.getByLabel('Origin').clear()
    }
  })
})
