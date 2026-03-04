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

test.describe('Basic UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API calls
    await page.route('**/api/route**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRouteResponse),
      })
    })

    await page.goto('/')
  })

  test('should display the trip planner form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'EV Trip Planner' })).toBeVisible()
    await expect(page.getByLabel('Origin')).toBeVisible()
    await expect(page.getByLabel('Destination')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Plan Trip' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
  })

  test('should have disabled Plan Trip button initially', async ({ page }) => {
    // Button should be disabled when form is empty
    await expect(page.getByRole('button', { name: 'Plan Trip' })).toBeDisabled()
  })

  test('should enable Plan Trip button with valid inputs', async ({ page }) => {
    await page.getByLabel('Origin').fill('37.7749,-122.4194')
    await page.getByLabel('Destination').fill('34.0522,-118.2437')

    // Button should be enabled now
    await expect(page.getByRole('button', { name: 'Plan Trip' })).toBeEnabled()
  })

  test('should show loading state on submit', async ({ page }) => {
    // Add a delayed mock so loading state is visible
    await page.route('**/api/route**', async route => {
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRouteResponse),
      })
    })

    await page.getByLabel('Origin').fill('37.7749,-122.4194')
    await page.getByLabel('Destination').fill('34.0522,-118.2437')

    await page.getByRole('button', { name: 'Plan Trip' }).click()

    // Should show loading state
    await expect(page.getByText('Planning...')).toBeVisible()
  })

  test('should have EV parameter inputs', async ({ page }) => {
    await expect(page.getByLabel('Current Charge:')).toBeVisible()
    await expect(page.getByLabel('Range at 100%:')).toBeVisible()
    await expect(page.getByLabel('Reserve on Arrival:')).toBeVisible()
    await expect(page.getByLabel('Driving Mode')).toBeVisible()
  })

  test('should have correct default values', async ({ page }) => {
    await expect(page.getByLabel('Current Charge:')).toHaveValue('70')
    await expect(page.getByLabel('Range at 100%:')).toHaveValue('450')
    await expect(page.getByLabel('Reserve on Arrival:')).toHaveValue('20')
  })

  test('reset button should clear inputs', async ({ page }) => {
    await page.getByLabel('Origin').fill('Test Origin')
    await page.getByLabel('Destination').fill('Test Destination')

    await page.getByRole('button', { name: 'Reset' }).click()

    await expect(page.getByLabel('Origin')).toHaveValue('')
    await expect(page.getByLabel('Destination')).toHaveValue('')
  })
})

test.describe('Mobile Responsive', () => {
  test('should display on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'EV Trip Planner' })).toBeVisible()
    await expect(page.getByLabel('Origin')).toBeVisible()
    await expect(page.getByLabel('Destination')).toBeVisible()
  })
})
