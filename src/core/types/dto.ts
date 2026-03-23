import type { AssetBucket, Direction, ISODateTime, UUID } from './domain';

export interface TruthUpdateInput {
  instrumentId: UUID;
  sourceId: string;
  observedAt: ISODateTime;
  observedFieldValues: Record<string, unknown>;
}

export interface PlannerInput {
  bucketId: AssetBucket;
  instrumentFrom: UUID | null;
  instrumentTo: UUID | null;
  netEdgeAfterFriction: number;
  blockedReason: string | null;
  thesisCode: string;
  signalDirection: Direction;
}

export interface QueueMessage<TPayload extends Record<string, unknown>> {
  messageId: string;
  createdAt: ISODateTime;
  payload: TPayload;
}
