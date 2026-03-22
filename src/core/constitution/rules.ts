export const CONSTITUTION_RULES = [
  'No structured source goes through an LLM.',
  'No decision reads raw scraped results directly.',
  'All truth fields must be source-arbitrated.',
  'All actions must pass through friction.',
  'Ledger mismatch blocks new actions.',
  'Every state must be replayable and auditable.',
  'Evolution happens offline only via shadow tournament.'
] as const;
