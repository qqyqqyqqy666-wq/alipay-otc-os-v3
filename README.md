# alipay-otc-os-v3

A top-tier architectural scaffold for a Chinese public mutual fund Alipay OTC decision operating system.

## Scope

This repository is intentionally designed as a **truth-first, friction-aware, replayable, state-machine-driven OTC OS scaffold**.
It does **not** auto-trade. The human executes orders manually.

## System priorities

1. Structured sources never go through an LLM.
2. Decisions never read raw scraped data directly.
3. Truth is field-arbitrated and evidence-backed.
4. Every action must pass through a friction engine.
5. Ledger mismatch blocks new recommendations.
6. All states are replayable and auditable.
7. Model evolution is offline only via shadow tournament.

## Repository layout

- `src/core/types` — domain contracts and shared types.
- `src/core/truth` — truth resolver and truth update services.
- `src/core/brain` — exposure inference and regime routing brains.
- `src/core/friction` — friction, fee, delay, and channel constraints.
- `src/core/planner` — execution plan generation.
- `src/core/recon` — reconciliation and ledger consistency.
- `src/core/state_machine` — trade and reconciliation state machines.
- `src/core/evolution` — genome, shadow tournament, promotion guardrails.
- `src/ingestion` — raw source fetchers.
- `src/parsers` — deterministic parsers for structured and semi-structured inputs.
- `src/pipeline` — ingestion/truth/decision/reconciliation pipelines.
- `schema` — D1 schema and seed templates.
- `docs` — architecture construction blueprint.

## Deploy sequence

1. Create Worker, D1, KV, R2, Queues.
2. Fill `wrangler.toml` placeholders.
3. Add runtime secrets:
   - `TELEGRAM_BOT_TOKEN`
   - `FRED_API_KEY` (optional until FRED ingestion is enabled)
4. Apply SQL in this order:
   - `schema/migrations_v3.sql`
   - `schema/seed_source_registry.template.sql`
   - `schema/seed_instrument_static_truth.template.sql`
   - `schema/seed_trading_calendar.template.sql`
5. Connect GitHub build/deploy.

## Current state

This package is a **v3 engineering blueprint + compile-safe scaffold**, not a finished production alpha.
What is already here:

- strict TypeScript contracts
- D1 schema with truth/evidence/ledger/state-machine support
- state machine scaffolding
- truth arbitration skeleton
- friction engine skeleton
- execution planner skeleton
- replay/evolution interfaces
- architecture documentation

What still needs project-specific completion:

- source-specific parsers for actual Alipay/Tiantian pages
- calibrated exposure and regime models
- production-grade friction parameters
- mobile / email / webhook reconciliation integrations
- historical replay datasets and tournament runners
