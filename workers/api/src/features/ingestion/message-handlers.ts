import type { Env, QueueMessage, OcmStationRecord } from '../../types';
import { createD1Client } from '../../db/client';
import { ChargingStationRepository } from '../../db/repositories';
import { StationConnectorRepository } from '../../db/repositories/station-connector';
import { createStationCache } from '../../kv/station-cache';
import { fetchOcmStations } from './ocm-client';
import { createQueueProducer } from './queue-producer';

/**
 * Queue Message Handlers
 *
 * Handles each type of queue message for the ingestion pipeline.
 */

/**
 * Handle FETCH_OCM_PAGE message
 * Fetches a page of stations from OCM and queues batch processing
 */
export async function handleFetchOcmPage(
  message: Extract<QueueMessage, { type: 'FETCH_OCM_PAGE' }>,
  env: Env
): Promise<void> {
  const { jobId, page, pageSize, filters } = message;
  const { countryCode, modifiedSince, boundingBox } = filters;

  console.log(`[${jobId}] Fetching OCM page ${page} with size ${pageSize}`);

  try {
    const result = await fetchOcmStations({
      apiKey: env.OPENCHARGEMAP_API_KEY,
      page,
      pageSize,
      countryCode,
      modifiedSince,
      boundingBox
    });

    if (result.stations.length === 0) {
      console.log(`[${jobId}] No more stations to fetch`);
      return;
    }

    // Queue batch processing for these stations
    const queue = createQueueProducer(env.INGESTION_QUEUE);
    await queue.queueBatchProcess(
      `${jobId}-batch`,
      result.stations.map(normalizeOcmStationForBatch)
    );

    // If there are more pages, queue the next page
    if (result.hasMore) {
      await queue.queueOcmFetch(`${jobId}-next`, page + 1, pageSize, {
        countryCode,
        modifiedSince,
        boundingBox
      });
    }

    console.log(`[${jobId}] Queued ${result.stations.length} stations for processing`);
  } catch (error) {
    console.error(`[${jobId}] Failed to fetch OCM page:`, error);
    throw error; // Trigger retry
  }
}

/**
 * Handle PROCESS_BATCH message
 * Upserts stations and their connectors to D1
 */
export async function handleProcessBatch(
  message: Extract<QueueMessage, { type: 'PROCESS_BATCH' }>,
  env: Env
): Promise<void> {
  const { jobId, records: stations } = message;

  console.log(`[${jobId}] Processing batch of ${stations.length} stations`);

  const db = createD1Client(env.DB);
  const stationRepo = new ChargingStationRepository(db);
  const connectorRepo = new StationConnectorRepository(db);

  const processedIds: string[] = [];

  for (const stationData of stations) {
    try {
      // Upsert station
      const { station, isNew } = await stationRepo.upsertByExternalId(
        stationData.externalId,
        {
          externalId: stationData.externalId,
          name: stationData.name,
          operator: stationData.operator,
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          address: stationData.address,
          city: stationData.city,
          country: stationData.country,
          status: stationData.status
        }
      );

      // Sync connectors
      if (stationData.connectors.length > 0) {
        await connectorRepo.syncConnectors(
          station.id,
          stationData.connectors.map(c => ({
            connectorType: c.type,
            powerKw: c.powerKw ?? undefined,
            status: c.status ?? 'available'
          }))
        );
      }

      processedIds.push(station.id.toString());

      console.log(
        `[${jobId}] ${isNew ? 'Created' : 'Updated'} station ${station.externalId} (${station.name})`
      );
    } catch (error) {
      console.error(`[${jobId}] Failed to process station ${stationData.externalId}:`, error);
      // Continue with other stations, don't fail the entire batch
    }
  }

  // Invalidate cache for updated stations
  if (processedIds.length > 0) {
    const cache = createStationCache(env.STATION_CACHE);
    await cache.invalidateQueries();
    console.log(`[${jobId}] Invalidated cache for ${processedIds.length} stations`);
  }

  console.log(`[${jobId}] Successfully processed ${processedIds.length}/${stations.length} stations`);
}

/**
 * Handle WRITE_SNAPSHOT message
 * Writes a snapshot of station data to R2
 */
export async function handleWriteSnapshot(
  message: Extract<QueueMessage, { type: 'WRITE_SNAPSHOT' }>,
  env: Env
): Promise<void> {
  const { jobId, r2Key, stationIds } = message;

  console.log(`[${jobId}] Writing snapshot to R2`);

  try {
    const snapshotKey = r2Key || `snapshots/${new Date().toISOString().split('T')[0]}/${jobId}.json`;

    await env.SNAPSHOTS_BUCKET.put(
      snapshotKey,
      JSON.stringify({ stationIds }, null, 2),
      {
        httpMetadata: {
          contentType: 'application/json'
        },
        customMetadata: {
          jobId: jobId.toString(),
          timestamp: new Date().toISOString()
        }
      }
    );

    console.log(`[${jobId}] Snapshot written to ${snapshotKey}`);
  } catch (error) {
    console.error(`[${jobId}] Failed to write snapshot:`, error);
    throw error;
  }
}

/**
 * Handle INVALIDATE_CACHE message
 * Invalidates station cache entries
 */
export async function handleInvalidateCache(
  message: Extract<QueueMessage, { type: 'INVALIDATE_CACHE' }>,
  env: Env
): Promise<void> {
  const { stationIds } = message;

  console.log('Processing cache invalidation');

  const cache = createStationCache(env.STATION_CACHE);

  if (stationIds && stationIds.length > 0) {
    // Invalidate specific stations
    await cache.invalidateStations(stationIds);
    console.log(`Invalidated ${stationIds.length} specific station caches`);
  } else {
    // Invalidate all query caches
    await cache.invalidateQueries();
    console.log('Invalidated all station query caches');
  }
}

/**
 * Trigger ingestion job from cron or manual invocation
 */
export async function triggerIngestionJob(env: Env): Promise<void> {
  const jobId = `ingest-${Date.now()}`;
  console.log(`[${jobId}] Triggering ingestion job`);

  const queue = createQueueProducer(env.INGESTION_QUEUE);

  // Queue initial page fetch
  await queue.queueOcmFetch(jobId, 1, 100, {
    countryCode: 'TH' // Start with Thailand
  });

  console.log(`[${jobId}] Ingestion job queued`);
}

// Helper function to normalize OCM station for batch processing
function normalizeOcmStationForBatch(
  station: OcmStationRecord
): {
  externalId: string;
  name: string;
  operator?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  status: string;
  connectors: Array<{
    type: string;
    powerKw: number | undefined;
    status: string;
  }>;
} {
  return {
    externalId: station.externalId,
    name: station.name,
    operator: station.operator,
    latitude: station.latitude,
    longitude: station.longitude,
    address: station.address,
    city: station.city,
    country: station.country,
    status: station.status ?? 'operational',
    connectors: station.connectors.map((c: { type: string; powerKw?: number; status?: string }) => ({
      type: c.type,
      powerKw: c.powerKw ?? undefined,
      status: c.status ?? 'available'
    }))
  };
}
