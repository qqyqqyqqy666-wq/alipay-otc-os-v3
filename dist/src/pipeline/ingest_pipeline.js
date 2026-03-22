export function buildObservationFrame(channel, sourceValues) {
    return {
        as_of: new Date().toISOString(),
        source_values: sourceValues,
        source_confidence: {},
        source_freshness_minutes: {},
        channel
    };
}
