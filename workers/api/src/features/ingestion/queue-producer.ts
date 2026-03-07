import type { Queue, QueueMessage, OcmStationRecord } from '../../types';

/**
 * Queue Producer
 *
 * Produces messages to the ingestion queue for background processing.
 */

export class QueueProducer {
  constructor(private queue: Queue<QueueMessage>) {}

  /**
   * Queue a fetch OCM page job
   */
  async queueOcmFetch(
    jobId: string,
    page: number,
    pageSize: number,
    options: {
      countryCode?: string;
      modifiedSince?: string;
      boundingBox?: { lat1: number; lng1: number; lat2: number; lng2: number };
    } = {}
  ): Promise<void> {
    const message: QueueMessage = {
      type: 'FETCH_OCM_PAGE',
      jobId: 0, // Will be set by database
      page,
      pageSize,
      filters: {
        countryCode: options.countryCode,
        modifiedSince: options.modifiedSince,
        boundingBox: options.boundingBox
      },
      retryCount: 0,
      createdAt: new Date().toISOString()
    };

    await this.queue.send(message);
  }

  /**
   * Queue a batch processing job
   */
  async queueBatchProcess(
    batchId: string,
    stations: OcmStationRecord[]
  ): Promise<void> {
    const message: QueueMessage = {
      type: 'PROCESS_BATCH',
      jobId: 0,
      batchId,
      records: stations,
      options: {},
      retryCount: 0,
      createdAt: new Date().toISOString()
    };

    await this.queue.send(message);
  }

  /**
   * Queue a snapshot write job
   */
  async queueSnapshotWrite(
    jobId: string,
    stationIds: number[],
    r2Key: string
  ): Promise<void> {
    const message: QueueMessage = {
      type: 'WRITE_SNAPSHOT',
      jobId: 0,
      batchId: jobId,
      stationIds,
      r2Key,
      format: 'jsonl',
      retryCount: 0,
      createdAt: new Date().toISOString()
    };

    await this.queue.send(message);
  }

  /**
   * Queue a cache invalidation job
   */
  async queueCacheInvalidation(
    stationIds?: number[]
  ): Promise<void> {
    const message: QueueMessage = {
      type: 'INVALIDATE_CACHE',
      patterns: stationIds ? stationIds.map(id => `station:${id}`) : ['stations:all'],
      stationIds,
      createdAt: new Date().toISOString()
    };

    await this.queue.send(message);
  }

  /**
   * Send multiple messages in batch
   */
  async sendBatch(messages: QueueMessage[]): Promise<void> {
    await Promise.all(messages.map(m => this.queue.send(m)));
  }
}

/**
 * Create queue producer from environment
 */
export function createQueueProducer(
  queue: Queue<QueueMessage>
): QueueProducer {
  return new QueueProducer(queue);
}
