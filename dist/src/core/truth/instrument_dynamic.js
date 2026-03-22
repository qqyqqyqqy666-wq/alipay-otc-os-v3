export function hasUsableDynamicTruth(input) {
    return input.arbitration_status === 'RESOLVED' && input.truth_confidence >= 0.6;
}
