import type { D1Client } from '../client';
import type { ChargingStation, StationConnector } from '../../types';

/**
 * Charging Station Repository
 *
 * CRUD operations for charging stations with geo-query support.
 */

export interface CreateStationInput {
  externalId: string;
  name: string;
  operator?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  status?: string;
  usageType?: string;
}

export interface UpdateStationInput {
  name?: string;
  operator?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  status?: string;
  usageType?: string;
}

export interface BoundingBox {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}

export class ChargingStationRepository {
  constructor(private client: D1Client) {}

  /**
   * Find station by ID
   */
  async findById(id: number): Promise<ChargingStation | null> {
    const result = await this.client.queryOne<Record<string, unknown>>(
      `SELECT * FROM charging_stations WHERE id = ?`,
      [id]
    );
    return result ? this.mapFromDb(result) : null;
  }

  /**
   * Find station by external ID (OCM ID)
   */
  async findByExternalId(externalId: string): Promise<ChargingStation | null> {
    const result = await this.client.queryOne<Record<string, unknown>>(
      `SELECT * FROM charging_stations WHERE external_id = ?`,
      [externalId]
    );
    return result ? this.mapFromDb(result) : null;
  }

  /**
   * Find stations within bounding box
   */
  async findInBoundingBox(
    bbox: BoundingBox,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ stations: ChargingStation[]; total: number }> {
    const { lat1, lng1, lat2, lng2 } = bbox;
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    // Query stations
    const stations = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM charging_stations
       WHERE latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
         AND status = 'operational'
       ORDER BY latitude, longitude
       LIMIT ? OFFSET ?`,
      [Math.min(lat1, lat2), Math.max(lat1, lat2), Math.min(lng1, lng2), Math.max(lng1, lng2), limit, offset]
    );

    // Count total
    const countResult = await this.client.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM charging_stations
       WHERE latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
         AND status = 'operational'`,
      [Math.min(lat1, lat2), Math.max(lat1, lat2), Math.min(lng1, lng2), Math.max(lng1, lng2)]
    );

    return {
      stations: stations.results.map(s => this.mapFromDb(s)),
      total: countResult?.count ?? 0
    };
  }

  /**
   * Create new station
   */
  async create(input: CreateStationInput): Promise<ChargingStation> {
    const result = await this.client.execute(
      `INSERT INTO charging_stations (
        external_id, name, operator, latitude, longitude,
        address, city, country, postal_code, status, usage_type, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        input.externalId,
        input.name,
        input.operator ?? null,
        input.latitude,
        input.longitude,
        input.address ?? null,
        input.city ?? null,
        input.country ?? null,
        input.postalCode ?? null,
        input.status ?? 'operational',
        input.usageType ?? null
      ]
    );

    if (!result.success) {
      throw new Error('Failed to create charging station');
    }

    const station = await this.findById(result.lastRowId);
    if (!station) {
      throw new Error('Created station not found');
    }

    return station;
  }

  /**
   * Update station by ID
   */
  async update(id: number, input: UpdateStationInput): Promise<ChargingStation | null> {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) { sets.push('name = ?'); values.push(input.name); }
    if (input.operator !== undefined) { sets.push('operator = ?'); values.push(input.operator); }
    if (input.latitude !== undefined) { sets.push('latitude = ?'); values.push(input.latitude); }
    if (input.longitude !== undefined) { sets.push('longitude = ?'); values.push(input.longitude); }
    if (input.address !== undefined) { sets.push('address = ?'); values.push(input.address); }
    if (input.city !== undefined) { sets.push('city = ?'); values.push(input.city); }
    if (input.country !== undefined) { sets.push('country = ?'); values.push(input.country); }
    if (input.postalCode !== undefined) { sets.push('postal_code = ?'); values.push(input.postalCode); }
    if (input.status !== undefined) { sets.push('status = ?'); values.push(input.status); }
    if (input.usageType !== undefined) { sets.push('usage_type = ?'); values.push(input.usageType); }

    if (sets.length === 0) {
      return this.findById(id);
    }

    sets.push('last_synced_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.client.execute(
      `UPDATE charging_stations SET ${sets.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Upsert station by external ID (insert or update)
   */
  async upsertByExternalId(
    externalId: string,
    input: CreateStationInput
  ): Promise<{ station: ChargingStation; isNew: boolean }> {
    const existing = await this.findByExternalId(externalId);

    if (existing) {
      const updated = await this.update(existing.id, input);
      if (!updated) {
        throw new Error('Failed to update existing station');
      }
      return { station: updated, isNew: false };
    }

    const created = await this.create(input);
    return { station: created, isNew: true };
  }

  /**
   * Delete station by ID
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.client.execute(
      `DELETE FROM charging_stations WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Count total stations
   */
  async count(): Promise<number> {
    const result = await this.client.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM charging_stations`
    );
    return result?.count ?? 0;
  }

  /**
   * Find stations updated since timestamp
   */
  async findUpdatedSince(since: string): Promise<ChargingStation[]> {
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM charging_stations WHERE updated_at > ? ORDER BY updated_at`,
      [since]
    );
    return result.results.map(s => this.mapFromDb(s));
  }

  /**
   * Find stations within bounds (for station handler)
   */
  async findWithinBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    externalId: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string | null;
    city: string | null;
    country: string | null;
    status: string;
    connectors: Array<{
      type: string;
      powerKw: number | null;
      status: string;
    }>;
    updatedAt: string;
  }>> {
    const result = await this.client.query<{
      id: number;
      external_id: string;
      name: string;
      latitude: number;
      longitude: number;
      address: string | null;
      city: string | null;
      country: string | null;
      status: string;
      updated_at: string;
    }>(
      `SELECT * FROM charging_stations
       WHERE latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
         AND status = 'operational'
       ORDER BY latitude, longitude
       LIMIT ? OFFSET ?`,
      [minLat, maxLat, minLng, maxLng, limit, offset]
    );

    // Fetch connectors for each station
    const stationsWithConnectors = await Promise.all(
      result.results.map(async (station) => {
        const connectorsResult = await this.client.query<{
          type: string;
          power_kw: number | null;
          status: string;
        }>(
          `SELECT type, power_kw, status FROM station_connectors WHERE station_id = ?`,
          [station.id]
        );

        return {
          id: station.id.toString(),
          externalId: station.external_id,
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          address: station.address,
          city: station.city,
          country: station.country,
          status: station.status,
          connectors: connectorsResult.results.map(c => ({
            type: c.type,
            powerKw: c.power_kw,
            status: c.status
          })),
          updatedAt: station.updated_at
        };
      })
    );

    return stationsWithConnectors;
  }

  /**
   * Count stations within bounds
   */
  async countWithinBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ): Promise<number> {
    const result = await this.client.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM charging_stations
       WHERE latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
         AND status = 'operational'`,
      [minLat, maxLat, minLng, maxLng]
    );
    return result?.count ?? 0;
  }

  /**
   * Map database row to ChargingStation type
   */
  private mapFromDb(row: Record<string, unknown>): ChargingStation {
    return {
      id: row.id as number,
      externalId: row.external_id as string,
      name: row.name as string,
      operator: row.operator as string | null,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      address: row.address as string | null,
      city: row.city as string | null,
      country: row.country as string | null,
      postalCode: row.postal_code as string | null,
      status: row.status as 'operational' | 'closed' | 'planned',
      usageType: row.usage_type as string | null,
      isOperational: Boolean(row.is_operational),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      lastSyncedAt: row.last_synced_at as string | null
    };
  }
}
