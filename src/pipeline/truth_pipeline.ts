import type { TruthUpdateInput } from '../core/types/dto';
import { resolveTruthUpdate } from '../core/truth/truth_updater';

export function runTruthPipeline(input: TruthUpdateInput) {
  return resolveTruthUpdate(input);
}
