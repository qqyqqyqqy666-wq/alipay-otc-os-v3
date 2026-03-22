export function rankSignals(signals) {
    return [...signals].sort((a, b) => (b.strength * b.confidence) - (a.strength * a.confidence));
}
