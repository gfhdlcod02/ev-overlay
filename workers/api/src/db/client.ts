import type { D1Database } from '@cloudflare/workers-types';

/**
 * D1 Client Wrapper
 *
 * Provides a typed interface for D1 database operations with
 * connection management and error handling.
 */

export interface QueryResult<T = unknown> {
  results: T[];
  success: boolean;
  meta?: {
    duration: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

export class D1Client {
  constructor(private db: D1Database) {}

  /**
   * Execute a prepared statement with parameters
   */
  async query<T = unknown>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const statement = this.db.prepare(sql);
    const result = params
      ? await statement.bind(...params).all()
      : await statement.all();

    return {
      results: result.results as T[],
      success: result.success,
      meta: result.meta
    };
  }

  /**
   * Execute a single-row query (first result only)
   */
  async queryOne<T = unknown>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.results[0] ?? null;
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE statement
   */
  async execute(
    sql: string,
    params?: unknown[]
  ): Promise<{ success: boolean; changes: number; lastRowId: number }> {
    const statement = this.db.prepare(sql);
    const result = params
      ? await statement.bind(...params).run()
      : await statement.run();

    return {
      success: result.success,
      changes: result.meta?.changes ?? 0,
      lastRowId: result.meta?.last_row_id ?? 0
    };
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch<T = unknown>(
    statements: { sql: string; params?: unknown[] }[]
  ): Promise<QueryResult<T>[]> {
    const prepared = statements.map(({ sql, params }) => {
      const stmt = this.db.prepare(sql);
      return params ? stmt.bind(...params) : stmt;
    });

    const results = await this.db.batch(prepared);

    return results.map(result => ({
      results: result.results as T[],
      success: result.success,
      meta: result.meta
    }));
  }

  /**
   * Execute statements within a transaction
   */
  async transaction<T>(
    callback: (client: D1Client) => Promise<T>
  ): Promise<T> {
    // D1 doesn't support explicit transactions yet, so we just wrap in try/catch
    // and rely on SQLite's auto-commit per statement
    // Future: Use SAVEPOINT when D1 supports it
    try {
      return await callback(this);
    } catch (error) {
      // Transaction failed - D1 auto-rollback per statement
      throw error;
    }
  }

  /**
   * Health check - verify database connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a D1 client instance from environment binding
 */
export function createD1Client(db: D1Database): D1Client {
  return new D1Client(db);
}
