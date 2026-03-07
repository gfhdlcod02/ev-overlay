import type { D1Client } from '../client';
import type { StationConnector } from '../../types';

/**
 * Station Connector Repository
 *
 * CRUD operations for station connectors.
 */

export interface CreateConnectorInput {
  stationId: number;
  connectorType: string;
  powerKw?: number;
  voltage?: number;
  amperage?: number;
  status?: string;
  quantity?: number;
}

export interface UpdateConnectorInput {
  connectorType?: string;
  powerKw?: number;
  voltage?: number;
  amperage?: number;
  status?: string;
  quantity?: number;
}

export class StationConnectorRepository {
  constructor(private client: D1Client) {}

  /**
   * Find connector by ID
   */
  async findById(id: number): Promise<StationConnector | null> {
    const result = await this.client.queryOne<Record<string, unknown>>(
      `SELECT * FROM station_connectors WHERE id = ?`,
      [id]
    );
    return result ? this.mapFromDb(result) : null;
  }

  /**
   * Find all connectors for a station
   */
  async findByStationId(stationId: number): Promise<StationConnector[]> {
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM station_connectors WHERE station_id = ? ORDER BY id`,
      [stationId]
    );
    return result.results.map(c => this.mapFromDb(c));
  }

  /**
   * Create new connector
   */
  async create(input: CreateConnectorInput): Promise<StationConnector> {
    const result = await this.client.execute(
      `INSERT INTO station_connectors (
        station_id, connector_type, power_kw, voltage, amperage, status, quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.stationId,
        input.connectorType,
        input.powerKw ?? null,
        input.voltage ?? null,
        input.amperage ?? null,
        input.status ?? 'available',
        input.quantity ?? 1
      ]
    );

    if (!result.success) {
      throw new Error('Failed to create connector');
    }

    const connector = await this.findById(result.lastRowId);
    if (!connector) {
      throw new Error('Created connector not found');
    }

    return connector;
  }

  /**
   * Update connector by ID
   */
  async update(id: number, input: UpdateConnectorInput): Promise<StationConnector | null> {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (input.connectorType !== undefined) { sets.push('connector_type = ?'); values.push(input.connectorType); }
    if (input.powerKw !== undefined) { sets.push('power_kw = ?'); values.push(input.powerKw); }
    if (input.voltage !== undefined) { sets.push('voltage = ?'); values.push(input.voltage); }
    if (input.amperage !== undefined) { sets.push('amperage = ?'); values.push(input.amperage); }
    if (input.status !== undefined) { sets.push('status = ?'); values.push(input.status); }
    if (input.quantity !== undefined) { sets.push('quantity = ?'); values.push(input.quantity); }

    if (sets.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await this.client.execute(
      `UPDATE station_connectors SET ${sets.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Upsert connector for a station
   * Uses connector type as unique key within station
   */
  async upsertForStation(
    stationId: number,
    connectorType: string,
    input: Omit<CreateConnectorInput, 'stationId' | 'connectorType'>
  ): Promise<{ connector: StationConnector; isNew: boolean }> {
    // Check for existing connector of same type at this station
    const existing = await this.client.queryOne<Record<string, unknown>>(
      `SELECT * FROM station_connectors WHERE station_id = ? AND connector_type = ?`,
      [stationId, connectorType]
    );

    if (existing) {
      const updated = await this.update(existing.id as number, {
        ...input,
        connectorType
      });
      if (!updated) {
        throw new Error('Failed to update connector');
      }
      return { connector: updated, isNew: false };
    }

    const created = await this.create({
      stationId,
      connectorType,
      ...input
    });

    return { connector: created, isNew: true };
  }

  /**
   * Delete connector by ID
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.client.execute(
      `DELETE FROM station_connectors WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Delete all connectors for a station
   */
  async deleteByStationId(stationId: number): Promise<number> {
    const result = await this.client.execute(
      `DELETE FROM station_connectors WHERE station_id = ?`,
      [stationId]
    );
    return result.changes;
  }

  /**
   * Sync connectors for a station
   * - Creates new connectors not in existing set
   * - Updates existing connectors
   * - Removes connectors not in new set
   */
  async syncConnectors(
    stationId: number,
    connectors: Array<{
      connectorType: string;
      powerKw?: number;
      voltage?: number;
      amperage?: number;
      status?: string;
      quantity?: number;
    }>
  ): Promise<{ created: number; updated: number; deleted: number }> {
    const stats = { created: 0, updated: 0, deleted: 0 };

    // Get current connectors
    const currentConnectors = await this.findByStationId(stationId);
    const currentTypes = new Map(currentConnectors.map(c => [c.connectorType, c]));
    const newTypes = new Set(connectors.map(c => c.connectorType));

    // Delete connectors no longer present
    for (const current of currentConnectors) {
      if (!newTypes.has(current.connectorType)) {
        await this.delete(current.id);
        stats.deleted++;
      }
    }

    // Upsert new/existing connectors
    for (const connector of connectors) {
      const result = await this.upsertForStation(stationId, connector.connectorType, {
        powerKw: connector.powerKw,
        voltage: connector.voltage,
        amperage: connector.amperage,
        status: connector.status,
        quantity: connector.quantity
      });

      if (result.isNew) {
        stats.created++;
      } else {
        stats.updated++;
      }
    }

    return stats;
  }

  /**
   * Count connectors for a station
   */
  async countByStationId(stationId: number): Promise<number> {
    const result = await this.client.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM station_connectors WHERE station_id = ?`,
      [stationId]
    );
    return result?.count ?? 0;
  }

  /**
   * Map database row to StationConnector type
   */
  private mapFromDb(row: Record<string, unknown>): StationConnector {
    return {
      id: row.id as number,
      stationId: row.station_id as number,
      connectorType: row.connector_type as string,
      powerKw: row.power_kw as number | null,
      voltage: row.voltage as number | null,
      amperage: row.amperage as number | null,
      status: row.status as 'available' | 'occupied' | 'out_of_order',
      quantity: row.quantity as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  }
}
