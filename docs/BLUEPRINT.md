# OTC OS v3 Construction Blueprint

## System verdict

This system is not a recommendation bot. It is a truth-first OTC operating system.
It must survive stale data, fee cliffs, delayed confirmations, ledger mismatch, and source conflict.
The objective is not maximum cleverness. The objective is maximum survivability under OTC friction.

## Six control centers

1. Constitutional center — non-negotiable rules.
2. Truth center — source registry, evidence logs, field arbitration.
3. Inference center — exposure posterior + macro regime posterior.
4. Friction center — fee cliff, delay gap, capital lock, channel restrictions.
5. Execution center — executable plans only, no raw recommendations.
6. Evolution center — offline replay, challenger selection, promotion control.

## Failure-first doctrine

The system should assume:
- the latest NAV may be stale
- channel state may conflict across sources
- portfolio state may be dirty
- retries may duplicate messages
- any partially confirmed trade can poison future decisions

Therefore every layer must emit evidence, versioning, and replayable events.
