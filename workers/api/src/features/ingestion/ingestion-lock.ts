import type { DurableObjectState, Request } from '@cloudflare/workers-types';

/**
 * Ingestion Lock Durable Object
 *
 * Manages distributed locking for data ingestion jobs to prevent
 * concurrent ingestion operations that could cause data inconsistency.
 */

export interface LockState {
  locked: boolean;
  acquiredAt: number | null;
  acquiredBy: string | null;
  timeoutMs: number;
  lastHeartbeat: number;
}

export interface LockResult {
  success: boolean;
  state: LockState;
  message?: string;
}

export class IngestionLock {
  private state: DurableObjectState;
  private defaultTimeoutMs: number;

  constructor(state: DurableObjectState, env: { LOCK_TIMEOUT_MS?: string }) {
    this.state = state;
    this.defaultTimeoutMs = parseInt(env.LOCK_TIMEOUT_MS || '300000', 10); // 5 minutes default
  }

  /**
   * Handle incoming request for lock operations
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const lockId = url.searchParams.get('lockId') || 'default';

    if (action === 'acquire') {
      const timeoutMs = parseInt(url.searchParams.get('timeoutMs') || String(this.defaultTimeoutMs), 10);
      const result = await this.acquire(lockId, timeoutMs);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'release') {
      const result = await this.release(lockId);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'status') {
      const state = await this.getState();
      return new Response(JSON.stringify({ state }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'heartbeat') {
      const result = await this.heartbeat(lockId);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Attempt to acquire the lock
   */
  async acquire(lockId: string, timeoutMs: number): Promise<LockResult> {
    const now = Date.now();
    const currentState = await this.getState();

    // Check if lock is already held and not expired
    if (currentState.locked && currentState.acquiredAt) {
      const expiresAt = currentState.acquiredAt + currentState.timeoutMs;

      if (now < expiresAt && currentState.acquiredBy !== lockId) {
        return {
          success: false,
          state: currentState,
          message: 'Lock already held by another process'
        };
      }

      // Lock expired or same holder re-acquiring
    }

    // Acquire lock
    const newState: LockState = {
      locked: true,
      acquiredAt: now,
      acquiredBy: lockId,
      timeoutMs,
      lastHeartbeat: now
    };

    await this.state.storage.put('lock', newState);

    // Schedule automatic release after timeout
    this.state.waitUntil(this.scheduleRelease(timeoutMs));

    return {
      success: true,
      state: newState
    };
  }

  /**
   * Release the lock
   */
  async release(lockId: string): Promise<LockResult> {
    const currentState = await this.getState();

    if (!currentState.locked) {
      return {
        success: true,
        state: currentState,
        message: 'Lock was not held'
      };
    }

    if (currentState.acquiredBy !== lockId) {
      return {
        success: false,
        state: currentState,
        message: 'Cannot release lock held by another process'
      };
    }

    const newState: LockState = {
      locked: false,
      acquiredAt: null,
      acquiredBy: null,
      timeoutMs: this.defaultTimeoutMs,
      lastHeartbeat: Date.now()
    };

    await this.state.storage.put('lock', newState);

    return {
      success: true,
      state: newState
    };
  }

  /**
   * Update heartbeat to extend lock
   */
  async heartbeat(lockId: string): Promise<LockResult> {
    const currentState = await this.getState();

    if (!currentState.locked) {
      return {
        success: false,
        state: currentState,
        message: 'Lock not held'
      };
    }

    if (currentState.acquiredBy !== lockId) {
      return {
        success: false,
        state: currentState,
        message: 'Cannot heartbeat lock held by another process'
      };
    }

    const now = Date.now();
    const newState: LockState = {
      ...currentState,
      lastHeartbeat: now
    };

    await this.state.storage.put('lock', newState);

    return {
      success: true,
      state: newState
    };
  }

  /**
   * Get current lock state
   */
  private async getState(): Promise<LockState> {
    const stored = await this.state.storage.get<LockState>('lock');

    if (!stored) {
      return {
        locked: false,
        acquiredAt: null,
        acquiredBy: null,
        timeoutMs: this.defaultTimeoutMs,
        lastHeartbeat: Date.now()
      };
    }

    // Check if lock has expired
    if (stored.locked && stored.acquiredAt) {
      const expiresAt = stored.acquiredAt + stored.timeoutMs;
      if (Date.now() > expiresAt) {
        return {
          locked: false,
          acquiredAt: null,
          acquiredBy: null,
          timeoutMs: this.defaultTimeoutMs,
          lastHeartbeat: stored.lastHeartbeat
        };
      }
    }

    return stored;
  }

  /**
   * Schedule automatic lock release after timeout
   */
  private async scheduleRelease(timeoutMs: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, timeoutMs + 1000)); // Small buffer

    const state = await this.getState();
    if (state.locked && state.acquiredAt) {
      const expiresAt = state.acquiredAt + state.timeoutMs;
      if (Date.now() >= expiresAt) {
        await this.state.storage.put('lock', {
          locked: false,
          acquiredAt: null,
          acquiredBy: null,
          timeoutMs: this.defaultTimeoutMs,
          lastHeartbeat: state.lastHeartbeat
        });
      }
    }
  }
}

/**
 * Helper function to acquire ingestion lock
 */
export async function acquireIngestionLock(
  env: { INGESTION_LOCK: DurableObjectNamespace },
  lockId: string,
  timeoutMs: number = 300000
): Promise<LockResult> {
  const id = env.INGESTION_LOCK.idFromName('ingestion-lock');
  const stub = env.INGESTION_LOCK.get(id);

  const response = await stub.fetch(`http://internal/action?action=acquire&lockId=${lockId}&timeoutMs=${timeoutMs}`);
  return response.json() as Promise<LockResult>;
}

/**
 * Helper function to release ingestion lock
 */
export async function releaseIngestionLock(
  env: { INGESTION_LOCK: DurableObjectNamespace },
  lockId: string
): Promise<LockResult> {
  const id = env.INGESTION_LOCK.idFromName('ingestion-lock');
  const stub = env.INGESTION_LOCK.get(id);

  const response = await stub.fetch(`http://internal/action?action=release&lockId=${lockId}`);
  return response.json() as Promise<LockResult>;
}

/**
 * Helper function to check lock status
 */
export async function getIngestionLockStatus(
  env: { INGESTION_LOCK: DurableObjectNamespace }
): Promise<{ state: LockState }> {
  const id = env.INGESTION_LOCK.idFromName('ingestion-lock');
  const stub = env.INGESTION_LOCK.get(id);

  const response = await stub.fetch('http://internal/action?action=status');
  return response.json() as Promise<{ state: LockState }>;
}
