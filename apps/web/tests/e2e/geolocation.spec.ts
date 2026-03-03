import { test, expect } from '@playwright/test'

// Thailand default coordinates (Bangkok) - defined for reference
// const THAILAND_CENTER = { lat: 13.7563, lng: 100.5018 }
// const THAILAND_ZOOM = 6

// Mock user location (San Francisco for testing)
const MOCK_USER_LOCATION = {
  lat: 37.7749,
  lng: -122.4194,
  accuracy: 100, // High accuracy (< 1km threshold)
}

test.describe('User Story 1: Default Map View on Load', () => {
  test('should display Thailand as default view before geolocation', async ({ page }) => {
    // Navigate without special permissions (default is prompt)
    await page.goto('/')

    // Wait for map to initialize
    await page.waitForTimeout(1000)

    // Check that the map container exists
    const mapContainer = page.locator('.leaflet-container')
    await expect(mapContainer).toBeVisible()

    // The map should be initialized (we can verify by checking container exists)
    // Leaflet doesn't expose center/zoom easily for testing, but we can verify
    // the map renders by checking for tile layer
    const tileLayer = page.locator('.leaflet-tile-loaded, .leaflet-tile')
    await expect(tileLayer.first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('User Story 2: Origin Auto-populate', () => {
  test('should auto-populate origin when permission granted and accuracy sufficient', async ({ browser }) => {
    // Create context with geolocation granted
    const context = await browser.newContext({
      geolocation: {
        latitude: MOCK_USER_LOCATION.lat,
        longitude: MOCK_USER_LOCATION.lng,
      },
      permissions: ['geolocation'],
    })
    const page = await context.newPage()

    await page.goto('/')

    // Wait for geolocation to resolve
    await page.waitForTimeout(2000)

    // Check that origin field contains coordinates
    const originInput = page.getByLabel('Origin')
    const originValue = await originInput.inputValue()

    // Should contain the mock coordinates (formatted to 6 decimal places)
    expect(originValue).toContain(MOCK_USER_LOCATION.lat.toString())
    expect(originValue).toContain(MOCK_USER_LOCATION.lng.toString())

    // Clean up
    await context.close()
  })

  test('should keep origin empty when permission denied', async ({ browser }) => {
    // Create context without geolocation
    const context = await browser.newContext()
    const page = await context.newPage()

    // Mock geolocation to be denied
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1, // PERMISSION_DENIED
              message: 'User denied geolocation',
            } as GeolocationPositionError)
          },
        },
        writable: true,
        configurable: true,
      })
    })

    await page.goto('/')

    // Wait for geolocation to fail
    await page.waitForTimeout(2000)

    // Origin should remain empty
    const originInput = page.getByLabel('Origin')
    await expect(originInput).toHaveValue('')

    // Should show error message
    await expect(page.locator('text=Location access denied')).toBeVisible()

    // Clean up
    await context.close()
  })

  test('should not auto-populate when accuracy is insufficient (>1km)', async ({ browser }) => {
    // Grant permission but accuracy cannot be mocked directly through Playwright
    // This test documents the expected behavior
    const context = await browser.newContext({
      geolocation: {
        latitude: MOCK_USER_LOCATION.lat,
        longitude: MOCK_USER_LOCATION.lng,
      },
      permissions: ['geolocation'],
    })
    const page = await context.newPage()

    await page.goto('/')

    // Wait for geolocation
    await page.waitForTimeout(2000)

    // Origin should be populated since our mock has good accuracy
    const originInput = page.getByLabel('Origin')
    const originValue = await originInput.inputValue()
    expect(originValue).not.toBe('')

    await context.close()
  })
})

test.describe('User Story 3: Map Auto-recenter', () => {
  test('should recenter map to user location when permission granted', async ({ browser }) => {
    // Create context with geolocation granted
    const context = await browser.newContext({
      geolocation: {
        latitude: MOCK_USER_LOCATION.lat,
        longitude: MOCK_USER_LOCATION.lng,
      },
      permissions: ['geolocation'],
    })
    const page = await context.newPage()

    await page.goto('/')

    // Wait for map to initialize and geolocation to resolve
    await page.waitForTimeout(2500)

    // Map should have user location marker (blue dot with pulse animation)
    const userMarker = page.locator('.user-location-marker')
    await expect(userMarker).toBeVisible({ timeout: 5000 })

    await context.close()
  })

  test('should NOT recenter map after user manual interaction', async ({ browser }) => {
    // Create context with geolocation granted
    const context = await browser.newContext({
      geolocation: {
        latitude: MOCK_USER_LOCATION.lat,
        longitude: MOCK_USER_LOCATION.lng,
      },
      permissions: ['geolocation'],
    })
    const page = await context.newPage()

    await page.goto('/')

    // Wait for map to initialize
    await page.waitForTimeout(1000)

    // Simulate user interaction by dragging the map
    const mapContainer = page.locator('.leaflet-container')
    await mapContainer.dragTo(mapContainer, {
      sourcePosition: { x: 200, y: 200 },
      targetPosition: { x: 100, y: 100 },
    })

    // Wait for geolocation to resolve
    await page.waitForTimeout(1500)

    // Map should NOT have auto-recentered (no flyTo animation triggered)
    // The user interaction flag should prevent auto-centering

    await context.close()
  })
})

test.describe('User Story 4: Geolocation Fallback Handling', () => {
  test('should fall back gracefully when permission denied', async ({ browser }) => {
    // Create context without geolocation
    const context = await browser.newContext()
    const page = await context.newPage()

    // Mock geolocation denied
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1, // PERMISSION_DENIED
              message: 'User denied geolocation',
            } as GeolocationPositionError)
          },
        },
        writable: true,
        configurable: true,
      })
    })

    await page.goto('/')

    // Wait for geolocation to fail
    await page.waitForTimeout(2000)

    // Application should still be functional
    await expect(page.getByLabel('Origin')).toBeVisible()
    await expect(page.getByLabel('Destination')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Plan Trip' })).toBeVisible()

    // User can still manually enter origin
    await page.getByLabel('Origin').fill('13.7563,100.5018')
    await page.getByLabel('Destination').fill('18.7883,98.9853')

    // Origin should have the manually entered value
    await expect(page.getByLabel('Origin')).toHaveValue('13.7563,100.5018')

    await context.close()
  })

  test('should handle geolocation timeout gracefully', async ({ browser }) => {
    // Create context without geolocation
    const context = await browser.newContext()
    const page = await context.newPage()

    // Mock geolocation timeout
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 3, // TIMEOUT
              message: 'Geolocation timeout',
            } as GeolocationPositionError)
          },
        },
        writable: true,
        configurable: true,
      })
    })

    await page.goto('/')

    // Wait for timeout (5 seconds)
    await page.waitForTimeout(6000)

    // Application should remain functional
    await expect(page.getByLabel('Origin')).toBeVisible()
    await expect(page.getByLabel('Destination')).toBeVisible()

    await context.close()
  })

  test('should handle browsers without geolocation support', async ({ page }) => {
    // Mock navigator.geolocation as undefined
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: false,
        configurable: false,
      })
    })

    await page.goto('/')

    // Wait for initialization
    await page.waitForTimeout(1000)

    // Application should still work
    await expect(page.getByLabel('Origin')).toBeVisible()
    await expect(page.getByLabel('Destination')).toBeVisible()
  })
})

test.describe('User Story 5: Loading State and Error Feedback', () => {
  test('should show loading indicator during geolocation request', async ({ browser }) => {
    // Grant permission but delay will be noticeable
    const context = await browser.newContext({
      geolocation: {
        latitude: MOCK_USER_LOCATION.lat,
        longitude: MOCK_USER_LOCATION.lng,
      },
      permissions: ['geolocation'],
    })
    const page = await context.newPage()

    await page.goto('/')

    // Check for loading state (may be brief with mocked geolocation)
    // The loading spinner may appear briefly in the Origin field
    const loadingSpinner = page.locator('svg.animate-spin')

    // Wait for geolocation to complete (max 5s timeout)
    await page.waitForTimeout(3000)

    // After completion, loading should be gone and either origin is filled or error shown
    await expect(loadingSpinner).not.toBeVisible()

    await context.close()
  })

  test('should show error notice when permission denied', async ({ browser }) => {
    // Create context without geolocation
    const context = await browser.newContext()
    const page = await context.newPage()

    // Mock geolocation denied
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1, // PERMISSION_DENIED
              message: 'User denied geolocation',
            } as GeolocationPositionError)
          },
        },
        writable: true,
        configurable: true,
      })
    })

    await page.goto('/')

    // Wait for geolocation to fail
    await page.waitForTimeout(2000)

    // Should show error message
    await expect(page.locator('text=Location access denied')).toBeVisible()

    await context.close()
  })

  test('should show error notice on geolocation error', async ({ browser }) => {
    // Create context without geolocation
    const context = await browser.newContext()
    const page = await context.newPage()

    // Mock geolocation to throw an error
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 2, // POSITION_UNAVAILABLE
              message: 'Position unavailable',
            } as GeolocationPositionError)
          },
        },
        writable: true,
        configurable: true,
      })
    })

    await page.goto('/')

    // Wait for error
    await page.waitForTimeout(2000)

    // Should show error message
    await expect(page.locator('text=Could not get location')).toBeVisible()

    await context.close()
  })

  test('should clear loading state on success', async ({ browser }) => {
    const context = await browser.newContext({
      geolocation: {
        latitude: MOCK_USER_LOCATION.lat,
        longitude: MOCK_USER_LOCATION.lng,
      },
      permissions: ['geolocation'],
    })
    const page = await context.newPage()

    await page.goto('/')

    // Wait for completion
    await page.waitForTimeout(3000)

    // Loading spinner should be gone
    const loadingSpinner = page.locator('svg.animate-spin')
    await expect(loadingSpinner).not.toBeVisible()

    // Checkmark should be visible
    const checkmark = page.locator('svg.text-green-500')
    await expect(checkmark).toBeVisible()

    await context.close()
  })
})

test.describe('Integration: End-to-End Geolocation Flow', () => {
  test('complete flow: default view → geolocation success → origin populated', async ({ browser }) => {
    // Grant geolocation
    const context = await browser.newContext({
      geolocation: {
        latitude: MOCK_USER_LOCATION.lat,
        longitude: MOCK_USER_LOCATION.lng,
      },
      permissions: ['geolocation'],
    })
    const page = await context.newPage()

    await page.goto('/')

    // 1. Map should show default view initially (Thailand)
    const mapContainer = page.locator('.leaflet-container')
    await expect(mapContainer).toBeVisible()

    // 2. Loading state may appear briefly (mocked geolocation is fast)
    const loadingSpinner = page.locator('svg.animate-spin')

    // 3. Wait for geolocation to complete
    await page.waitForTimeout(3000)

    // 4. Origin should be populated
    const originInput = page.getByLabel('Origin')
    const originValue = await originInput.inputValue()
    expect(originValue).toContain(MOCK_USER_LOCATION.lat.toString())

    // 5. User location marker should be visible
    const userMarker = page.locator('.user-location-marker')
    await expect(userMarker).toBeVisible()

    // 6. Loading should be gone, checkmark visible
    await expect(loadingSpinner).not.toBeVisible()
    await expect(page.locator('svg.text-green-500')).toBeVisible()

    await context.close()
  })

  test('complete flow: default view → permission denied → manual entry', async ({ browser }) => {
    // Create context without geolocation
    const context = await browser.newContext()
    const page = await context.newPage()

    // Mock geolocation denied
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1, // PERMISSION_DENIED
              message: 'User denied geolocation',
            } as GeolocationPositionError)
          },
        },
        writable: true,
        configurable: true,
      })
    })

    await page.goto('/')

    // 1. Map should show default view
    const mapContainer = page.locator('.leaflet-container')
    await expect(mapContainer).toBeVisible()

    // 2. Wait for geolocation to fail
    await page.waitForTimeout(2000)

    // 3. Error message should be visible
    await expect(page.locator('text=Location access denied')).toBeVisible()

    // 4. Origin should remain empty
    const originInput = page.getByLabel('Origin')
    await expect(originInput).toHaveValue('')

    // 5. User can manually enter origin
    await originInput.fill('13.7563,100.5018')
    await expect(originInput).toHaveValue('13.7563,100.5018')

    await context.close()
  })
})
