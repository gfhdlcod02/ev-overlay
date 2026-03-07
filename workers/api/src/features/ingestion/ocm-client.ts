import type { OcmStationRecord } from '../../types';

/**
 * OpenChargeMap API Client
 *
 * Fetches charging station data from OpenChargeMap API.
 */

const OCM_BASE_URL = 'https://api.openchargemap.io/v3';

export interface OcmFetchOptions {
  apiKey: string;
  countryCode?: string;
  modifiedSince?: string;
  boundingBox?: {
    lat1: number;
    lng1: number;
    lat2: number;
    lng2: number;
  };
  page: number;
  pageSize: number;
}

export interface OcmFetchResult {
  stations: OcmStationRecord[];
  hasMore: boolean;
  total: number;
}

/**
 * Fetch charging stations from OpenChargeMap
 */
export async function fetchOcmStations(options: OcmFetchOptions): Promise<OcmFetchResult> {
  const params = new URLSearchParams({
    key: options.apiKey,
    output: 'json',
    maxresults: options.pageSize.toString(),
    page: options.page.toString(),
    includecomments: 'false',
    camelcase: 'true',
    compact: 'true'
  });

  if (options.countryCode) {
    params.set('countrycode', options.countryCode);
  }

  if (options.modifiedSince) {
    params.set('modifiedsince', options.modifiedSince);
  }

  if (options.boundingBox) {
    const { lat1, lng1, lat2, lng2 } = options.boundingBox;
    params.set('boundingbox', `(${lat1},${lng1}),(${lat2},${lng2})`);
  }

  const url = `${OCM_BASE_URL}/poi?${params.toString()}`;

  // Fetch with timeout and retry
  const response = await fetchWithRetry(url, {
    timeout: 30000,
    retries: 3
  });

  if (!response.ok) {
    throw new Error(`OCM API error: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json() as OcmApiResponse[];

  // Transform to internal format
  const stations = data.map(normalizeOcmStation);

  return {
    stations,
    hasMore: data.length === options.pageSize,
    total: data.length
  };
}

interface OcmApiResponse {
  ID: number;
  UUID: string;
  DataProviderID: number;
  OperatorID?: number;
  UsageTypeID?: number;
  AddressInfo: {
    Title: string;
    AddressLine1?: string;
    AddressLine2?: string;
    Town?: string;
    StateOrProvince?: string;
    Postcode?: string;
    CountryID?: number;
    Latitude: number;
    Longitude: number;
  };
  Connections?: OcmConnection[];
  NumberOfPoints?: number;
  StatusTypeID?: number;
  DateLastStatusUpdate?: string;
  DataQualityLevel?: number;
  DateCreated?: string;
  SubmissionStatusTypeID?: number;
}

interface OcmConnection {
  ID: number;
  ConnectionTypeID?: number;
  StatusTypeID?: number;
  LevelID?: number;
  Amps?: number;
  Voltage?: number;
  PowerKW?: number;
  CurrentTypeID?: number;
  Quantity?: number;
}

function normalizeOcmStation(data: OcmApiResponse): OcmStationRecord {
  const address = data.AddressInfo;

  return {
    externalId: data.ID.toString(),
    name: address.Title,
    operator: undefined, // Would need lookup table for OperatorID
    latitude: address.Latitude,
    longitude: address.Longitude,
    address: address.AddressLine1,
    city: address.Town,
    country: undefined, // Would need lookup for CountryID
    status: mapStatusType(data.StatusTypeID),
    connectors: (data.Connections || []).map(conn => ({
      type: mapConnectionType(conn.ConnectionTypeID),
      powerKw: conn.PowerKW,
      voltage: conn.Voltage,
      amperage: conn.Amps,
      status: mapConnectionStatus(conn.StatusTypeID),
      quantity: conn.Quantity || 1
    })),
    metadata: {
      usageType: mapUsageType(data.UsageTypeID),
      paymentRequired: undefined,
      accessRestrictions: undefined
    }
  };
}

function mapStatusType(statusId?: number): string {
  // OCM StatusTypeID mapping
  const statusMap: Record<number, string> = {
    0: 'unknown',
    10: 'operational',
    20: 'closed',
    30: 'planned',
    50: 'operational',
    75: 'operational',
    100: 'out_of_order',
    150: 'planned',
    200: 'closed'
  };
  return statusMap[statusId || 0] || 'unknown';
}

function mapConnectionType(typeId?: number): string {
  // Simplified mapping - full mapping would be extensive
  const typeMap: Record<number, string> = {
    1: 'Type 1 (J1772)',
    2: 'CHAdeMO',
    3: 'Type 2 (Mennekes)',
    4: 'CCS',
    5: 'Type 2 (Tethered)',
    6: 'Type 3C',
    7: 'Tesla Roadster',
    8: 'Tesla Supercharger',
    9: 'Tesla Destination',
    10: 'NEMA 5-20',
    11: 'NEMA 14-50',
    13: 'CCS (CHAdeMO)',
    15: 'CCS (Type 2)',
    16: 'Type 2 (Socket Only)',
    25: 'Type 2 (Tethered)',
    27: 'Type 2 (Socket Only)',
    28: 'Type 2 (Tethered)',
    29: 'Type 2 (Socket Only)',
    30: 'CHAdeMO',
    31: 'CCS',
    32: 'Type 1 (J1772)',
    33: 'Type 2 (Mennekes)',
    34: 'CCS'
  };
  return typeMap[typeId || 0] || 'Unknown';
}

function mapConnectionStatus(statusId?: number): string {
  const statusMap: Record<number, string> = {
    0: 'unknown',
    10: 'available',
    20: 'occupied',
    30: 'out_of_order',
    50: 'available',
    100: 'out_of_order'
  };
  return statusMap[statusId || 0] || 'unknown';
}

function mapUsageType(usageTypeId?: number): string {
  const usageMap: Record<number, string> = {
    0: 'unknown',
    1: 'public',
    2: 'private',
    3: 'private',
    4: 'public',
    5: 'private',
    6: 'public',
    7: 'public'
  };
  return usageMap[usageTypeId || 0] || 'unknown';
}

interface FetchOptions {
  timeout: number;
  retries: number;
}

async function fetchWithRetry(url: string, options: FetchOptions): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < options.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EV-Overlay/1.0'
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Exponential backoff: 1s, 5s, 25s
      if (attempt < options.retries - 1) {
        const delay = Math.pow(5, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

export { fetchWithRetry };
