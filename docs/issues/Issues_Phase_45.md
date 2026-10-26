# Issues — Phase 45: Client Switch

Branch: phase-45/client-switch · Started: 2026-10-26
Carried over: Phase 35 MI-19 (bound to Task 229); Phase 35 MI-23 (absorbed by Tasks 228 and 234); Phase 44 ledger Task 227 notes (Breakdown/Stage/Unstage take no `operationId`; `already_applied` Delete/Unstage envelopes carry no deleted id, so refetch after an unknown outcome; rejection codes per the notes).
Baseline gate (2026-10-26): `git diff --check`, `pnpm test` (2177), `pnpm test:db` (898), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass.
