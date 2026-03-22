import type { Genome, TournamentResult } from '../types/domain';

export function scoreGenome(genome: Genome): TournamentResult {
  return {
    genome_id: genome.id,
    score: 0,
    worst_decile_score: 0,
    calibration_error: 0,
    action_instability: 0,
    promoted: false
  };
}
