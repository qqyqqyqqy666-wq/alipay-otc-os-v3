import type { SignalCandidate } from '../types/domain';

export function rankSignals(signals: SignalCandidate[]): SignalCandidate[] {
  return [...signals].sort((a, b) => (b.strength * b.confidence) - (a.strength * a.confidence));
}
