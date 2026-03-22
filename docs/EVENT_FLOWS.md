# Event Flows

## Ingestion -> Truth Update

1. Fetch raw structured or semi-structured source.
2. Persist raw payload hash and metadata.
3. Parse deterministically.
4. Emit field-level evidence rows.
5. Resolve truth per field using source registry + freshness + trust rank.
6. Persist truth event.
7. Persist truth snapshot.

## Signal -> Execution Plan

1. Read latest truth snapshot.
2. Generate exposure posterior and regime posterior.
3. Generate signal candidates.
4. Pass every candidate through friction engine.
5. Build execution plan only from post-friction result.
6. Persist action ledger and idempotency key.

## Manual Execution -> Confirmation -> Cash Arrival

1. User executes order manually.
2. Mobile/webhook confirmation enters pending trade state machine.
3. Await channel confirmation.
4. Await cash arrival when applicable.
5. Reconcile with position and cash ledger.
6. Close plan only after state machine reaches DONE.

## Anomaly -> Degraded Mode

1. Detect source conflict or stale truth.
2. Evaluate degraded mode policy.
3. Persist system health event.
4. Suppress or narrow output behavior.
5. Exit degraded mode only on explicit recovery conditions.
