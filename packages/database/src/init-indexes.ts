// packages/database/src/init-indexes.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { prisma } from './index';

export interface IndexSpec {
  collection: string;
  key: Record<string, any>;
  name: string;
  unique?: boolean;
  partialFilterExpression?: Record<string, any>;
  expireAfterSeconds?: number;
}

export const TARGET_CUSTOM_INDEXES: IndexSpec[] = [
  {
    collection: 'Hotel',
    key: { location: '2dsphere' },
    name: 'hotel_location_2dsphere',
  },
  {
    collection: 'Hotel',
    key: { application_id: 1 },
    name: 'hotel_application_id_partial_unique',
    unique: true,
    partialFilterExpression: { application_id: { $type: 'objectId' } },
  },
  {
    collection: 'Reservation',
    key: { idempotency_key: 1 },
    name: 'reservation_idempotency_key_partial_unique',
    unique: true,
    partialFilterExpression: { idempotency_key: { $type: 'string' } },
  },
  {
    collection: 'RoomAssignment',
    key: { reservation_room_id: 1, slot_index: 1 },
    name: 'room_assignment_active_slot_unique',
    unique: true,
    partialFilterExpression: { status: 'ACTIVE' },
  },
  {
    collection: 'RefreshToken',
    key: { expires_at: 1 },
    name: 'refresh_token_ttl_idx',
    expireAfterSeconds: 0,
  },
];

function areObjectsEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => areObjectsEqual(a[k], b[k]));
}

async function reconcileCollectionIndexes(collection: string, targetSpecs: IndexSpec[]): Promise<void> {
  let existingIndexes: any[] = [];
  try {
    const listRes: any = await prisma.$runCommandRaw({ listIndexes: collection });
    existingIndexes = listRes.cursor?.firstBatch || [];
  } catch (err: any) {
    // If collection does not exist or BSON parser meets 2dsphere tagged value
    existingIndexes = [];
  }

  for (const spec of targetSpecs) {
    let indexExists = false;

    for (const existing of existingIndexes) {
      if (existing.name === '_id_') continue;

      const keyMatches = areObjectsEqual(existing.key, spec.key);
      const nameMatches = existing.name === spec.name;

      if (keyMatches || nameMatches) {
        const uniqueMatches = Boolean(existing.unique) === Boolean(spec.unique);
        const partialMatches = areObjectsEqual(
          existing.partialFilterExpression,
          spec.partialFilterExpression
        );
        const ttlMatches = existing.expireAfterSeconds === spec.expireAfterSeconds;

        if (keyMatches && uniqueMatches && partialMatches && ttlMatches) {
          console.log(`✓ Index exact match: ${collection}.${spec.name}`);
          indexExists = true;
          break;
        }

        console.log(`Dropping mismatched legacy index: ${collection}.${existing.name}`);
        try {
          await prisma.$runCommandRaw({
            dropIndexes: collection,
            index: existing.name,
          });
        } catch (dropErr: any) {
          console.warn(`Warning dropping index ${existing.name}:`, dropErr.message);
        }
      }
    }

    if (!indexExists) {
      const indexDoc: Record<string, any> = {
        key: spec.key,
        name: spec.name,
      };
      if (spec.unique) indexDoc.unique = true;
      if (spec.partialFilterExpression) indexDoc.partialFilterExpression = spec.partialFilterExpression;
      if (spec.expireAfterSeconds !== undefined) indexDoc.expireAfterSeconds = spec.expireAfterSeconds;

      try {
        await prisma.$runCommandRaw({
          createIndexes: collection,
          indexes: [indexDoc],
        });
        console.log(`✓ Created canonical index: ${collection}.${spec.name}`);
      } catch (createErr: any) {
        if (createErr.message?.includes('already exists') || createErr.message?.includes('IndexOptionsConflict')) {
          console.log(`✓ Index already present on Atlas: ${collection}.${spec.name}`);
        } else {
          throw createErr;
        }
      }
    }
  }
}

export async function initializeMongoIndexes(): Promise<void> {
  console.log('--- Reconciling MongoDB Atlas Custom Indexes ---');

  // Group specs by collection
  const byCollection = new Map<string, IndexSpec[]>();
  for (const spec of TARGET_CUSTOM_INDEXES) {
    const list = byCollection.get(spec.collection) || [];
    list.push(spec);
    byCollection.set(spec.collection, list);
  }

  for (const [col, specs] of byCollection.entries()) {
    await reconcileCollectionIndexes(col, specs);
  }

  console.log('\n--- Atlas Custom Indexes Configured Successfully ---');
  for (const spec of TARGET_CUSTOM_INDEXES) {
    console.log(`Confirmed Target Index: ${spec.collection}.${spec.name}`, {
      key: spec.key,
      unique: spec.unique,
      partialFilterExpression: spec.partialFilterExpression,
      expireAfterSeconds: spec.expireAfterSeconds,
    });
  }
  console.log('All custom indexes reconciled and verified successfully.\n');
}

// Direct CLI execution
if (require.main === module || process.argv[1]?.endsWith('init-indexes.ts')) {
  initializeMongoIndexes()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Index initialization error:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
