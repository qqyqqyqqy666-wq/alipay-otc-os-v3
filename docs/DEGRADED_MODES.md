# Degraded Modes

| Mode | Trigger | Behavior | Recovery |
|---|---|---|---|
| READ_ONLY_MODE | Core truth sources stale or unresolved | Observe, log, snapshot only | Fresh truth restored |
| NO_NEW_ACTIONS | Pending trade backlog too large | Do not emit new plans | Backlog normalized |
| TRUTH_CONFLICT_BLOCK | Execution-critical field conflict | Block affected instruments | Conflict resolved |
| MANUAL_RECON_REQUIRED | Ledger mismatch or illegal transition | Require operator/user reconciliation | Manual reconciliation completed |
| HOLD_ONLY_MODE | Truth confidence too low | Emit HOLD only | Confidence threshold restored |
