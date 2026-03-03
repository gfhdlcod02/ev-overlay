import { describe, it, expect } from 'vitest'
import { buildGoogleMapsUrl, buildGoogleMapsMobileUrl, isMobileDevice } from '../../src/url-builder/google-maps'
import type { Location, ChargingStop } from '../../src/types'

describe('buildGoogleMapsUrl', () => {
  const origin: Location = { lat: 37.7749, lng: -122.4194 } // San Francisco
  const destination: Location = { lat: 34.0522, lng: -118.2437 } // Los Angeles

  it('should build basic URL without stops', () => {
    const url = buildGoogleMapsUrl(origin, destination)

    expect(url).toContain('https://www.google.com/maps/dir/?api=1')
    expect(url).toContain('origin=37.7749%2C-122.4194')
    expect(url).toContain('destination=34.0522%2C-118.2437')
    expect(url).toContain('travelmode=driving')
    expect(url).not.toContain('waypoints')
  })

  it('should include waypoints for charging stops', () => {
    const stops: ChargingStop[] = [
      {
        sequence: 1,
        position: { lat: 36.0, lng: -120.5 },
        distanceFromStartKm: 250,
        arrivalChargePercent: 30,
        chargeToPercent: 80,
        distanceToNextKm: 350,
      },
    ]

    const url = buildGoogleMapsUrl(origin, destination, stops)

    expect(url).toContain('waypoints=36%2C-120.5')
  })

  it('should include multiple waypoints in order', () => {
    const stops: ChargingStop[] = [
      {
        sequence: 2,
        position: { lat: 36.5, lng: -121 },
        distanceFromStartKm: 300,
        arrivalChargePercent: 25,
        chargeToPercent: 80,
        distanceToNextKm: 200,
      },
      {
        sequence: 1,
        position: { lat: 36, lng: -120.5 },
        distanceFromStartKm: 250,
        arrivalChargePercent: 30,
        chargeToPercent: 80,
        distanceToNextKm: 50,
      },
    ]

    const url = buildGoogleMapsUrl(origin, destination, stops)

    // Stops should be sorted by sequence
    expect(url).toContain('waypoints=36%2C-120.5%7C36.5%2C-121')
  })

  it('should handle coordinates with negative values', () => {
    const nyc: Location = { lat: 40.7128, lng: -74.006 }
    const london: Location = { lat: 51.5074, lng: -0.1278 }

    const url = buildGoogleMapsUrl(nyc, london)

    expect(url).toContain('origin=40.7128%2C-74.006')
    expect(url).toContain('destination=51.5074%2C-0.1278')
  })

  it('should handle coordinates with many decimal places', () => {
    const preciseOrigin: Location = { lat: 37.7749295, lng: -122.4194155 }
    const preciseDest: Location = { lat: 34.0522342, lng: -118.2436849 }

    const url = buildGoogleMapsUrl(preciseOrigin, preciseDest)

    expect(url).toContain('origin=37.7749295%2C-122.4194155')
    expect(url).toContain('destination=34.0522342%2C-118.2436849')
  })
})

describe('buildGoogleMapsMobileUrl', () => {
  const origin: Location = { lat: 37.7749, lng: -122.4194 }
  const destination: Location = { lat: 34.0522, lng: -118.2437 }

  it('should build mobile-compatible URL', () => {
    const url = buildGoogleMapsMobileUrl(origin, destination)

    // Currently returns web URL which redirects to app
    expect(url).toContain('google.com/maps')
    expect(url).toContain('api=1')
  })
})

describe('isMobileDevice', () => {
  it('should detect iPhone', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    expect(isMobileDevice(ua)).toBe(true)
  })

  it('should detect Android', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 10; SM-G973F)'
    expect(isMobileDevice(ua)).toBe(true)
  })

  it('should detect iPad', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'
    expect(isMobileDevice(ua)).toBe(true)
  })

  it('should not detect desktop Chrome', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    expect(isMobileDevice(ua)).toBe(false)
  })

  it('should not detect desktop Safari', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    expect(isMobileDevice(ua)).toBe(false)
  })

  it('should detect BlackBerry', () => {
    const ua = 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en)'
    expect(isMobileDevice(ua)).toBe(true)
  })
})
