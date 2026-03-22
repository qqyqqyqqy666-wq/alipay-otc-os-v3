import type { InstrumentStaticTruth } from '../types/domain';

export function isTradableStaticInstrument(instrument: InstrumentStaticTruth): boolean {
  return instrument.is_active;
}
