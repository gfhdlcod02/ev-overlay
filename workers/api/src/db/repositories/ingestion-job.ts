import type { D1Client } from '../client';
import type { IngestionJob } from '../../types';

/**
 * Ingestion Job Repository
 *
 * Track data ingestion jobs from external providers.
 */

export interface CreateJobInput {
  source?: string;
  paramsJson?: string;
}

export interface JobStats {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
}

export class IngestionJobRepository {
  constructor(private client: D1Client) {}

  /**
   * Create new ingestion job
   */
  async create(input: CreateJobInput = {}): Promise<IngestionJob> {
    const result = await this.client.execute(
      `INSERT INTO ingestion_jobs (source, paramsJson, status) VALUES (?, ?, 'running')`,
      [input.source ?? 'openchargemap', input.paramsJson ?? null]
    );

    if (!result.success) {
      throw new Error('Failed to create ingestion job');
    }

    const job = await this.findById(result.lastRowId);
    if (!job) {
      throw new Error('Created job not found');
    }

    return job;
  }

  /**
   * Find job by ID
   */
  async findById(id: number): Promise<IngestionJob | null> {
    const result = await this.client.queryOne<Record<string, unknown>>(
      `SELECT * FROM ingestion_jobs WHERE id = ?`,
      [id]
    );
    return result ? this.mapFromDb(result) : null;
  }

  /**
   * Find recent jobs
   */
  async findRecent(limit: number = 10): Promise<IngestionJob[]> {
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM ingestion_jobs ORDER BY started_at DESC LIMIT ?`,
      [limit]
    );
    return result.results.map(j => this.mapFromDb(j));
  }

  /**
   * Find running jobs
   */
  async findRunning(): Promise<IngestionJob[]> {
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM ingestion_jobs WHERE status = 'running' ORDER BY started_at`
    );
    return result.results.map(j => this.mapFromDb(j));
  }

  /**
   * Update job statistics
   */
  async updateStats(id: number, stats: Partial<JobStats>): Promise<IngestionJob | null> {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (stats.recordsProcessed !== undefined) {
      sets.push('records_processed = ?');
      values.push(stats.recordsProcessed);
    }
    if (stats.recordsCreated !== undefined) {
      sets.push('records_created = ?');
      values.push(stats.recordsCreated);
    }
    if (stats.recordsUpdated !== undefined) {
      sets.push('records_updated = ?');
      values.push(stats.recordsUpdated);
    }
    if (stats.recordsFailed !== undefined) {
      sets.push('records_failed = ?');
      values.push(stats.recordsFailed);
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await this.client.execute(
      `UPDATE ingestion_jobs SET ${sets.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Mark job as completed
   */
  async complete(id: number, durationMs: number): Promise<IngestionJob | null> {
    const result = await this.client.execute(
      `UPDATE ingestion_jobs SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        duration_ms = ?
      WHERE id = ? AND status = 'running'`,
      [durationMs, id]
    );

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Mark job as failed
   */
  async fail(id: number, errorMessage: string, durationMs?: number): Promise<IngestionJob | null> {
    const result = await this.client.execute(
      `UPDATE ingestion_jobs SET
        status = 'failed',
        completed_at = CURRENT_TIMESTAMP,
        error_message = ?,
        duration_ms = ?
      WHERE id = ? AND status = 'running'`,
      [errorMessage, durationMs ?? null, id]
    );

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Mark job as partial (some records failed)
   */
  async markPartial(id: number, durationMs: number): Promise<IngestionJob | null> {
    const result = await this.client.execute(
      `UPDATE ingestion_jobs SET
        status = 'partial',
        completed_at = CURRENT_TIMESTAMP,
        duration_ms = ?
      WHERE id = ? AND status = 'running'`,
      [durationMs, id]
    );

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Get job statistics summary
   */
  async getStatsSummary(since?: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    partial: number;
    totalRecordsProcessed: number;
  }> {
    const whereClause = since ? 'WHERE started_at > ?' : '';
    const params = since ? [since] : [];

    const result = await this.client.queryOne<{
      total: number;
      completed: number;
      failed: number;
      partial: number;
      totalRecords: number;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial,
        SUM(records_processed) as totalRecords
      FROM ingestion_jobs
      ${whereClause}`,
      params
    );

    return {
      total: result?.total ?? 0,
      completed: result?.completed ?? 0,
      failed: result?.failed ?? 0,
      partial: result?.partial ?? 0,
      totalRecordsProcessed: result?.totalRecords ?? 0
    };
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(olderThanDays: number): Promise<number> {
    const result = await this.client.execute(
      `DELETE FROM ingestion_jobs
       WHERE status IN ('completed', 'failed', 'partial')
       AND started_at < datetime('now', '-' || ? || ' days')`,
      [olderThanDays]
    );
    return result.changes;
  }

  /**
   * Map database row to IngestionJob type
   */
  private mapFromDb(row: Record<string, unknown>): IngestionJob {
    return {
      id: row.id as number,
      startedAt: row.started_at as string,
      completedAt: row.completed_at as string | null,
      status: row.status as 'running' | 'completed' | 'failed' | 'partial',
      source: row.source as string,
      paramsJson: row.params_json as string | null,
      recordsProcessed: row.records_processed as number,
      recordsCreated: row.records_created as number,
      recordsUpdated: row.records_updated as number,
      recordsFailed: row.records_failed as number,
      errorMessage: row.error_message as string | null,
      durationMs: row.duration_ms as number | null
    };
  }
}
