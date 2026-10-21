# Flow-Trace Review — SaaS Conversion Phases 42–48

**Reviewed:** 2026-10-22, round 2, by the independent `expert` reviewer. Round 1 found 12 gaps (G1–G12); round 2 found none.
**Inputs:** `docs/brainstorming/2026-10-21-saas-conversion/DECISION.md` (S01–S43) and `PROMOTION_MAP.md` (D1–D9, Q1–Q3, phase waits, local-Supabase lane rule, SCHEMA additions, flow review round 1 decisions); feedback topic `DECISION.md` F02, F11, F13, F14, F16 copy and F17–F20 within the S41 boundary; `CLAUDE.md`; `docs/SCHEMA.md` §Postgres Target, §Repository Operation Contract, §Database Functions and Hooks; `docs/SPEC.md` Architecture Decisions 1–3, 7, 9, 11, 15, 19–21, §Account Entry And App States, §Feedback And Network States, §Environments And Hosting; `docs/DESIGN_TOKENS.md` §SaaS App-State Surfaces; `docs/EXECUTION_PLAN.md` SaaS section (Tasks 213–240), graph, Phase Index, writer register and Next Numbers; `docs/PLANNING_STANDARD.md` §5.3 and §6; code parity in `src/lib/db/`, `src/hooks/`, `src/components/`, `src/app/providers.tsx` and `scripts/dev-fixtures/`.
**Decision prerequisites:** `DP-SAAS-01` (owner user; open; decided by Task 225; blocks the surface slices of Tasks 228, 234, 235, 236, 238). `DP-SAAS-02` (owner user; open; inside Task 237; blocks its migration slice). Q7, the hosted write role, deletion role and `pg_cron` checks, is a technical check owned by Task 218. Q8, the `/run-phase` change for two lanes, is outside promotion ①.

## Flow-Trace Table

| # | Flow / exact source citation | Entry / actor / authority | States and data effects | Task / file / action | Observable acceptance | Decision Prerequisite / Record | Boundary Cases | Ownership Status |
|---|------------------------------|--------------------------|------------------------|----------------------|-----------------------|--------------------------------|----------------|------------------|
| 1 | First visit becomes a guest; S10, S13, S23; SPEC §Account entry 2–5 | Visitor without a session | Anonymous sign-in → `ensure_account()` → `get_snapshot()` → ready | 228 (`session.ts`, `app-frame.tsx`, `providers.tsx`, `getDataStore()` switch) | Guest with system Nodes; no empty-Grid flash | DP-SAAS-01 | No Turnstile before 236, no seed before 237 | ✅ Owned |
| 2 | Initial load delay; S26, F02, F19 | App start | Blank gate (228) → busy loading screen after 300ms (234) | 228, 234 | No screen under 300ms | DP-SAAS-01 | Blank gate between 228 and 234 is local only | ✅ Owned |
| 3 | Load failure and Retry, paused or unreachable project; S16, S22, S26 | `ensure_account`/`get_snapshot` fails | Reason line, `Retry`, focus | 228 | Supabase stopped → reason and Retry; Retry after restart | DP-SAAS-01 | — | ✅ Owned |
| 4 | Guest-creation failure, retry on reconnect; S26, F19 | Anonymous sign-in fails | Reason, `Retry`, auto-retry on `online` | 228, 236 | The always-fail test key shows reason and `Retry` | DP-SAAS-01 | — | ✅ Owned |
| 5 | Turnstile security check, widget in frame; S42 (3) | Guest entry, locally from Phase 48 | Widget in the security-check screen → token → sign-in | 236 | Pass key passes; the interactive-challenge test key shows the widget in the frame | DP-SAAS-01 | Repaired after round 2 (interactive key added) | ✅ Owned |
| 6 | Returning visit, same guest; S23, S42 (5) | Same browser | Session restored; `last_visit_at` | 215, 228 | Reload returns to the same guest | — | — | ✅ Owned |
| 7 | Guest cleanup 7 days after the last visit, open tab kept; S42 (5) | Daily job; hourly client call | Deletes anonymous `auth.users`, cascade | 218 (hosted deletion check), 220, 228, 238 | Idle guest deleted; open-tab guest kept | Q7 | — | ✅ Owned |
| 8 | Narrow window at entry and on resize; S42 (4) | Viewport under 1024px | Notice over the `inert` app; no guest created | 238 | Widening restores the same screen | DP-SAAS-01 | — | ✅ Owned |
| 9 | OAuth sign-in, cancel and error; S10, S23; round-1 decision 2 | Guest in the modal | Redirect → return → `ensure_account` → new snapshot; cancel keeps the guest, cleans the URL, reopens the modal with an inline error | 235, 236 | Local GitHub/Google open an own empty account; cancel returns to the guest with the inline error | DP-SAAS-01 | After an expiry there is no session to keep; the expired screen returns (repaired) | ✅ Owned |
| 10 | Sign-out to a new guest; S23 | Real account | Snapshot dropped; new guest | 235 | Lands on a new guest | DP-SAAS-01 | — | ✅ Owned |
| 11 | User change in another tab; first-visit tabs converge; SPEC Decision 20, §Account entry "Several tabs" | Shared session | Drop snapshot, repeat entry behind the frame; only the signing-out tab creates the guest | 228, 235 | Two first-visit tabs end on one guest; sign-out moves every tab to the same guest | — | — | ✅ Owned |
| 12 | Account deletion, normal path; S42 (1) | `Delete account` | `delete_my_account()` cascade; new guest; toast | 218 (branch recorded), 235 | Rows removed; toast; a second browser profile shows the account-deleted screen; same-browser tabs follow the new guest | DP-SAAS-01 | Repaired after round 2 (same-browser vs other-device wording) | ✅ Owned |
| 13 | Deletion fallback, re-sign-in before cleanup | Same, when the hosted grant is refused | `deletion_requested_at`; `account_deleting`; frame screen | 218 (branch), 235, 238 | Sign-in before cleanup shows the being-deleted screen | DP-SAAS-01 | Implemented only if Task 218 recorded it | ✅ Owned |
| 14 | Deleted account still open on another device or browser; SCHEMA §Account deletion; SPEC "Account deleted" | Still-valid JWT elsewhere | `account_missing` from `get_snapshot`, reconcile and write functions; account-deleted screen | 215 (`ensure_account`), 235 | Next read or write shows the screen | DP-SAAS-01 | — | ✅ Owned |
| 15 | Refresh failure: network vs auth; SPEC §Session expiry; round-1 decision 5 | Token refresh fails | Auth-server rejection sets the marker; network failure becomes a connection state and retries | 228, 233, 234 | Network-only failure shows offline, not expired | — | Before 233 the connection path is local only | ✅ Owned |
| 16 | Session-expired screen and marker; F20, S43 (2) | Refresh rejected | Marker cleared only when the chosen action completes; screen across reloads; no guest before the choice | 228, 234, 236 | Screen and focus; no guest, even after reload; cancelled OAuth returns to the screen | DP-SAAS-01 | Repaired after round 2 (clear-on-completion rule, `When` cell) | ✅ Owned |
| 17 | Expired screen after Phase 48, sign-in buttons | Same | Buttons added | 236 | Present | DP-SAAS-01 | — | ✅ Owned |
| 18 | Group 1 write, rollback, toast; S15, S28 | Drag, edit, create | Pending layer; rollback; rolled-back toast | 231, 232 | Shown at once; refusal rolls back | — | — | ✅ Owned |
| 19 | Unknown outcome; S16, S26 | No answer within 15s | Refetch, keep or roll back, never resend | 227 (timeout), 231 (rule), 233 (in-flight recovery) | A write in flight when the server stops ends in the server's state | — | Timeout owned by 227 only (repaired) | ✅ Owned |
| 20 | Parent-change moves; S43 (3) | Drop on a Node or breadcrumb | Client picks the cell; server refuses a taken one | 219, 231 | — | — | — | ✅ Owned |
| 21 | Two quick moves; refetch race; S32 | — | Ordered sends; stale refetch discarded | 217, 231 | Named tests | — | — | ✅ Owned |
| 22 | Group 2 immediate hide | Trash, archive | Hide at once; return on failure | 220, 231 | Hide at once | — | — | ✅ Owned |
| 23 | Group 3 pending loader; SPEC write-feel row 3; DESIGN_TOKENS reused-loader row | Permanent delete, Empty Trash, restore, promotion | F03 loader after 300ms, busy | 232 | Loader only after 300ms | — | F03 ships in ②; Phase 47 waits for the lane | ✅ Owned |
| 24 | One action, one call; SCHEMA §Exposed functions | Empty Trash, deadline parent extension, Calendar Chunk-time extension, Chunk reorder | One function each | 219, 220 (functions); 227 (DataStore methods, caller rewiring) | Each one-call action sends exactly one request | — | Dexie store implements them too | ✅ Owned |
| 25 | Inbox commands over RPC; S08, S16 | Add, Stage, … | Status map; timeout → unknown → reconcile | 221–224, 227 | Reconcile after a forced timeout (store tests in `supabase/tests/`) | — | — | ✅ Owned |
| 26 | `account_limit` copy; SCHEMA `rejection.limit` | Create past a limit | `{code, table, limit}` | 217, 219, 221, 223, 227, 232 | — | — | — | ✅ Owned |
| 27 | Offline write attempt, Inbox included; S27, F18, F05 | Any write while offline | Nothing changes; input kept; toast; editor offline source moves to the monitor | 233 | Wi-Fi off → only the toast | — | Depends on ② F05, stated | ✅ Owned |
| 28 | Connection states and badge; S27, F17 | Request results | normal, unstable, offline; 30s probe | 233, 234 | Badge per state; silent recovery | DP-SAAS-01 | — | ✅ Owned |
| 29 | Multi-tab refetch; S17 | Focus, visibility | Base replaced | 233 | — | — | — | ✅ Owned |
| 30 | Trash auto-cleanup and visit record | Startup, hourly | Envelope; `last_visit_at` | 220, 228 | Visit advances | — | — | ✅ Owned |
| 31 | Restore, delete and Empty Trash results; F16 | Trash | Kept toasts, aligned copy | 220, 227, 232 | New copy | — | — | ✅ Owned |
| 32 | Promotion | Context action | Group 3; Node and Bit limits | 220, 232 | — | — | — | ✅ Owned |
| 33 | Account limits, real vs guest | Create paths | Counts include Trash and Archive | 219, 221, 223 | Per-table tests | — | — | ✅ Owned |
| 34 | Cross-account isolation; internal functions | Test users | RLS, composite FKs, revoked EXECUTE | 214–216 | Refusals; coverage suite | — | — | ✅ Owned |
| 35 | Concurrency | Concurrent calls | Locks | 215, 219, 220, 237 | Named tests | — | — | ✅ Owned |
| 36 | `ensure_account` with L0 full; SCHEMA §Account preparation | Drifted or missing system Node | Node skipped; rest applied | 215 | Ported test changes from "throws" to "skips" | — | Parity verified (`use-system-node-seeding.ts` ignores the error today) | ✅ Owned |
| 37 | Demo seed; S42 (2) | First empty guest | New ids; Inbox/Archive references mapped to existing system Nodes; their cells clear | 237 | Live urgency and aging; copied once | DP-SAAS-02 open | — | ✅ Owned |
| 38 | Toast rules and the 17 kept calls | — | `toast.ts` | 232 | Counted, stacked, timed | — | — | ✅ Owned |
| 39 | `DP-SAAS-01` decision | Start of Phase 45 | Option sheet | 225 | Choice committed | DP-SAAS-01 | — | ✅ Owned |
| 40 | Early production and hosted checks; D1, D8 | User and agent | Push; role, deletion-role and `pg_cron` deletion checks; lint 0012; D8 | 218 | Each result or fallback recorded before Phase 43 | Q7 | — | ✅ Owned |
| 41 | Migration order; CLAUDE.md Production; shared rules | — | Before launch whenever needed with approval; after launch at close, dump → migrations → merge | 218, 240 | — | — | — | ✅ Owned |
| 42 | Launch verification; round-1 decision 1 | Phase 48 | Local verification; production smoke right after the merge, before announcement | 236, 240, Phase 48 close | Settings and Advisor recorded; smoke recorded at close | — | — | ✅ Owned |
| 43 | Security Advisor | Phase close | Lint 0012 accepted | 218, 240 | No warning except 0012 | — | — | ✅ Owned |
| 44 | Backup and restore drill; S35, Q2 | Owner's Mac | Roles, schema and data incl. `auth`; forced `kickstart` run | 239 | Three files; restore brings back auth users | — | — | ✅ Owned |
| 45 | Development slice switch | Developer | Dev page, 404 when off, removed in 230 | 217, 230 | 404 when off | — | — | ✅ Owned |
| 46 | Reads move to `liveRead` | Hooks | `DataStore.liveRead`, Dexie backing inside `indexeddb.ts` | 226 | Hook tests green; parity fixture | — | 13 dexie-mocking tests named (repaired wording) | ✅ Owned |
| 47 | Write switch and bootstrap order | Phase 45 | 227 stays on Dexie; 228 switches | 227, 228 | 228: flows on local Supabase | — | — | ✅ Owned |
| 48 | Fixtures on local Supabase; CLAUDE.md Test data | Playwright | `supabase/seed.sql` `dev.seed_fixture` (service role, local only) keeps the account row and system Nodes; fixture returns `IDS` per run | 229 | Every fixture scenario reachable | — | Repaired after round 2 (`dev` schema in SCHEMA and the §6 checklist, `expert` review, rows kept) | ✅ Owned |
| 49 | Dexie removal | Phase 46 | Orphan command rejected without a call; test-only writes throw; slice page removed | 227, 230 | No `dexie` import; Phase 45 behavior kept | — | — | ✅ Owned |
| 50 | Phase waits, S43 (4) fallback, lane rule, writer register | — | Register rows for the shared SaaS and cross-lane files | Plan §Shared-File Writer Register | — | — | Repaired after round 2 (`use-dnd.ts`, `indexeddb.ts`, `datastore.ts`, `bit-detail-popup.tsx`, `sidebar.tsx`, `.env.local.example`) | ✅ Owned |
| 51 | Product name "grid" | — | Static title; F25 Node-title format kept | 239 | Title and heading read "grid" | — | — | ✅ Owned |
| 52 | MI-19 | Phase 45 | Re-read after the await | 229; `Issues_Deferred.md` rebound | Fixed or shown moot | — | — | ✅ Owned |
| 53 | Inbox status under real latency | Phase 47 | Throttled network or production | 234 | No flicker the user objects to | — | — | ✅ Owned |
| 54 | Realtime cross-tab push; S17 | — | Not built | — | — | — | Out of scope | ⏸️ Deferred |
| 55 | Offline editing and write queue; S16 | — | View-only while offline | — | — | — | Out of scope | ⏸️ Deferred |

Ownership Status: ✅ Owned | ⚠️ Weak | ❌ Gap | ⏸️ Deferred

## Gaps Found (if any)

None in round 2. The round-1 gaps and their resolutions:

| # | Flow | Gap Type | Description | Resolution |
|---|------|----------|-------------|------------|
| G1 | 5, 9, 42 | Acceptance not observable | Phase 48 needed production checks before its code could reach `main` | Local OAuth (development apps, secrets only in `.env.local`) and Turnstile test keys; production smoke after the Phase 48 merge, before announcement (user, 2026-10-22) |
| G2 | 9 | Missing state | OAuth cancel or error had no state or copy | Guest kept, URL cleaned, modal reopened with an inline error (user) |
| G3 | 11 | Missing state | User change in another tab | Drop snapshot, repeat entry; only the signing-out tab creates the guest (user) |
| G4 | 12, 13 | Hidden branch, no hosted check | Deletion-role branch chosen without a hosted check | Task 218 checks it and `pg_cron` deleting an auth user; branch recorded before Phase 43 |
| G5 | 14 | Missing state | Deleted account still open elsewhere | `account_missing` and the account-deleted screen (user) |
| G6 | 15 | Ambiguity | Network vs auth refresh failure | Only an auth-server rejection is expiry; `localStorage` marker across reloads (user) |
| G7 | 23 | Unowned visual | Group-3 loader look | Reuses feedback F03's loader (user) |
| G8 | 24 | Unowned interface change | Multi-write actions without DataStore and caller changes | `reorder_chunks`, Chunk-time extension, `emptyTrash()`; callers rewired in Task 227 |
| G9 | 26 | Contract gap | `{limit}` not in the envelope | `rejection.limit` |
| G10 | 36 | Parity mismatch | "As today" was false for L0 full | Skip that Node and apply the rest; ported test changes (user) |
| G11 | 47 | Task order | Store switched before the session existed | `getDataStore()` switch moved to Task 228 |
| G12 | 48 | Not implementable | Fixture could not seed through public functions | Local-only `dev.seed_fixture()` from `supabase/seed.sql` |

## Author repairs after round 2

The round-2 review found no Gap and five Weak items, plus minor notes. All
were repaired before approval, and the table above shows their repaired
status:

- Flow 5: Task 236 checks the interactive-challenge Turnstile test key.
- Flow 12: the second-browser-profile check in Task 235, and the "Account
  deleted" trigger text in SPEC.
- Flow 16: the marker is cleared only when the chosen action completes, and
  the `When` cell now names an auth-server rejection.
- Flow 48: `dev` in SCHEMA §Schemas and roles and in the §6 checklist; an
  `expert` review in Task 229; the account row and system Nodes kept.
- Flow 50: the writer-register rows.
- Minor: Task 227's store tests live in `supabase/tests/`; Task 232 no longer
  owns the timeout; Task 226 names the 13 dexie-mocking tests; the split SPEC
  sentence about open sign-up is restored; PROMOTION_MAP progress updated.

## Summary

- Flows traced: 55
- Fully owned: 53
- Weak: 0 (5 in round 2, repaired by the author)
- Gaps: 0 (12 in round 1, resolved)
- Deferred: 2
- Decision prerequisites: 2 open (DP-SAAS-01, DP-SAAS-02) / 0 closed / 1 explicitly scoped out (Q8)
- Open prerequisite IDs and exact blocked task slices:
  - DP-SAAS-01 blocks the surface slices of Tasks 228, 234, 235, 236 and 238.
  - DP-SAAS-02 blocks the Task 237 migration slice.
- Parity checks:
  - 20 `toast.*(` calls, 17 of them kept.
  - 19 `liveQuery` call sites in 17 hook files.
  - 13 tests mock `dexie`.
  - `GRID_COLS = 18`, `GRID_ROWS = 9`.
  - The DataStore method names and the one-call caller sites exist as named.
  - `use-system-node-seeding.ts` ignores the `GRID_FULL` rejection today.
- Flow ownership: PASS
- Implementation readiness: BLOCKED_PENDING_USER_DECISIONS, for the DP slices only.
  - Phase 42 (Tasks 213–218) is READY once the plan is approved and Docker Desktop is installed.
  - Phases 43–44 are READY behind their phase waits.
  - Phase 45 waits for the feedback lane's close or the S43 (4) choice.
