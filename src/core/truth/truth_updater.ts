import type { TruthUpdateInput } from '../types/dto';
import type { TruthArbitrationStatus } from '../types/domain';

export interface TruthResolutionDecision {
  field: string;
  chosenValue: unknown;
  sourceId: string;
  confidence: number;
  status: TruthArbitrationStatus;
  rationale: string;
}

export function resolveTruthUpdate(input: TruthUpdateInput): TruthResolutionDecision[] {
  return Object.entries(input.observedFieldValues).map(([field, chosenValue]) => ({
    field,
    chosenValue,
    sourceId: input.sourceId,
    confidence: 0.75,
    status: 'RESOLVED',
    rationale: 'Single-source placeholder resolver; replace with field-level multi-source arbitration.'
  }));
}
