export function isChannelBlocked(dynamicTruth) {
    return dynamicTruth.subscription_open === false || dynamicTruth.redemption_open === false;
}
