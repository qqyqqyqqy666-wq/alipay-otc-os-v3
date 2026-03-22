import type { InstrumentDynamicTruth } from '../types/domain';

export function isChannelBlocked(dynamicTruth: InstrumentDynamicTruth): boolean {
  return dynamicTruth.subscription_open === false || dynamicTruth.redemption_open === false;
}
