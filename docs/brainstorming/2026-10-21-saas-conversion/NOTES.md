# SaaS Conversion — Notes

## Session brief (2026-10-21)

Written in the post-Phase-35 planning session (Opus) for a fresh Opus session
(effort high) that continues this brainstorming. The user starts that session
with one line that points here.

### Goal

Settle the open questions below with the user and bring `DECISION.md` to
`Readiness: code-ready`, so that a later `/craft-docs` session can promote it.
Brainstorming only: no production code and no canonical-document edits.

### Setup

1. Create the worktree `/Users/jwk/Documents/grid-saas` on a new branch
   `docs/saas-conversion` from `origin/main`. `/craft-docs` later works on the
   same `docs/<topic>` branch.
2. Move this folder from the main worktree
   (`/Users/jwk/Documents/grid/docs/brainstorming/2026-10-21-saas-conversion/`)
   into the same path in the new worktree.
3. In `docs/brainstorming/2026-06-04-storage-reliability-and-cloud-sync/DECISION.md`
   and `DECISION.ko.md`, add one metadata line:
   `- Status: superseded by 2026-10-21-saas-conversion (user, 2026-10-21)`.
4. Commit: `docs: start SaaS conversion brainstorming`.

### Inputs

- `CLAUDE.md`, `docs/brainstorming/readme.md`, this folder.
- `docs/prd.md` §Storage Strategy; `docs/SPEC.md` §Architecture Decisions 1–3
  and 11; `docs/SCHEMA.md` (object stores, revisions, the command/result
  contract).
- `src/lib/db/datastore.ts`, `src/lib/db/schema.ts`, the Dexie schema at the
  top of `src/lib/db/indexeddb.ts`, and two hooks as samples
  (`src/hooks/use-grid-data.ts`, `src/hooks/use-scratch-breakdowns.ts`).
- `2026-06-04-storage-reliability-and-cloud-sync` (Track B), for history only.
- The `docs/issues/Issues_Deferred.md` rows under "Carried items" below.

### Procedure

1. Work through the open questions in the order below, at most four per
   AskUserQuestion round, each with options and a recommendation. The user is
   a beginner: explain each term (RLS, RPC, query cache, optimistic update)
   before asking about it.
2. Record each answer in `DECISION.md` as a new `S` row (user, date). Keep the
   reasoning and the rejected options here, under "Discussion".
3. A question that needs evidence (for example, whether a Postgres function can
   carry a command's full result contract) may get a throwaway spike, only with
   the user's approval, outside `src/`, and never merged.
4. When every blocking question is answered, set Readiness to `code-ready`,
   commit, and give the next step: `/craft-docs` with this topic in a fresh
   Opus session.
5. The `/run-phase` change the user agreed on 2026-10-20 (only the phases a
   phase depends on must be closed, so independent lanes can run in parallel)
   belongs to its own fresh session. Mention it when phasing comes up; do not
   edit skills here.

### Working rules

- Reply in Korean, as a senior-developer mentor; be direct about mistakes.
- End each decision request with "권장, 제안드린대로 진행할까요?".

## Facts checked in the code (`main` `552b00a`, 2026-10-21)

- `src/lib/db/datastore.ts` (396 lines): the `DataStore` interface, 69 async
  methods covering reads, ordinary writes and the atomic Inbox/Triage commands
  with typed results, and the single injection point `getDataStore()`
  (`datastore.ts:388`), which imports the Dexie implementation.
- `src/lib/db/indexeddb.ts` (4,862 lines): the Dexie database `GridDO`, schema
  v4, with the stores `nodes`, `bits`, `chunks`, `settings`,
  `scratchBreakdowns`, `stagedCandidates` and `candidateOrphanAuditEvents`, and
  `IndexedDBDataStore`.
- `src/lib/db/schema.ts` (236 lines): the Zod schemas, applied at the write
  boundary only (CLAUDE.md Architecture 5).
- About 9,800 lines of DB tests in `src/lib/db/*.test.ts`, on
  `fake-indexeddb`.
- Reactive layer: 17 hook files wrap `getDataStore()` reads in Dexie
  `liveQuery`/`useLiveQuery`. `liveQuery` re-runs only when Dexie tables
  change, so a Supabase store needs another reactive mechanism. Components
  import hooks, never the store (Architecture 2), so components can mostly stay
  as they are if the hook return shapes stay.
- Nodes, Bits and Scratch Breakdowns carry `version`; every logical mutation
  increments it exactly once (Architecture 9).
- The Inbox/Triage command contract already has the shape of a network
  request: stable operation and target IDs, `expectedVersion`, the results
  `applied` / `already_applied` / `not_applied` / `rejected` / `conflict` /
  `unknown`, and an `unknown` outcome reconciles with the same operation ID
  (`docs/SPEC.md:120`). SPEC Architecture 2 (`docs/SPEC.md:102`) already
  requires any replacement store to keep these semantics.
- PRD §Storage Strategy (`docs/prd.md:44–64`): v1 local-only; v2 "optional
  cloud sync ... Auth only exists to identify whose data to sync, not to gate
  access." The SaaS conversion changes this: auth gates access per account.
- Client-side jobs: `TrashAutoCleanup` and `SystemNodeSeeding` mount in
  `src/app/providers.tsx` (`use-trash-auto-cleanup.ts`,
  `use-system-node-seeding.ts`); orphan cleanup runs as an Inbox operation in
  `triage-workspace.tsx`.
- Dev fixtures and browser checks seed IndexedDB through `window.griddoFixture`
  (`scripts/dev-fixtures/inbox-triage.js`); drags go through
  `scripts/dev-fixtures/drag.js`.
- No server code yet: no `src/app/api`, no middleware or proxy, no env files,
  no deployment config.
- Stack: Next.js 16.2.1, React 19.2.4, Dexie 4.3, Zod 3.25, Zustand 5,
  Vitest 4.

## Carried items

| Item | Relevance |
|---|---|
| Phase 35 MI-23 | A failed live read shows nothing (the `liveQuery` hooks only `console.error`). The new reactive layer needs loading, error and ready states anyway; fold it in. |
| Phase 27 P27-08 | Confirmed-orphan proof has no remote-authority producer. A server source of truth may answer it or make it moot. |
| Phase 3 Issue 6 | "Hooks still use direct `indexedDBStore` imports." Hooks now go through `getDataStore()`, so the row looks stale; verify and close it at promotion. |

## Open questions

In the suggested order. "Rec." is the advisory recommendation of 2026-10-21,
not a decision. Answered: 1 (S07), 2 (S08), 3 (S10), 4 (S11–S13), 5 (S14),
6 (S09, S15), 7 (S16), 8 (S17), 9 (S13, S18), 10 (S19).

1. **Client data architecture.**
   (a) Server-authoritative with a client query cache (for example TanStack
   Query), plus optional Realtime.
   (b) Load the account's whole dataset into a client store at sign-in, compute
   views in memory as today, and send writes to the server. Personal-size data
   makes this viable, and it keeps render-time compute (Architecture 4) and
   most hook logic.
   (c) A local-first sync engine (Dexie plus server sync, offline).
   The user leaned to a server-authoritative design on 2026-10-21. Rec.: (a)
   or (b), not (c): a sync engine is the hardest path for a solo developer.
   Choose between (a) and (b) on data size and on how much hook logic survives.
2. **Where the atomic commands run.** Postgres functions called over RPC
   (native transactions, `auth.uid()` inside, no extra server), Next.js Route
   Handlers with a service key, or Supabase Edge Functions. Rec.: Postgres
   functions that keep the command/result contract.
3. **Auth.** Methods: email magic link, GitHub/Google OAuth, or password.
   Portfolio visitors will not sign up, so decide a demo path (anonymous
   sign-in, or a shared demo account reset on a schedule) and sample data for a
   new account. Rec.: OAuth or magic link for the owner, plus a demo path.
4. **Schema mapping.** Tables with `user_id` on every row; ids (keep
   client-generated string ids, since the command contract needs stable
   operation and target IDs); `createdAt`/`mtime` from the client or the
   server; `version` columns; constraints (one item per grid cell per parent;
   unique `sourceBreakdownId` on candidates); indexes from the Dexie compound
   indexes; system Nodes (Inbox, Archive) created per account at sign-up
   instead of client seeding; `settings` per account or per device.
5. **RLS and security.** A policy per table (`user_id = auth.uid()`), RPC
   functions as `security invoker` or `definer`, and RLS tests. Rec.: RLS tests
   are blocking, not optional.
6. **Write feel.** CLAUDE.md Architecture 6 says ordinary local writes are
   immediate. With a server: optimistic updates (show first, roll back on
   failure) for ordinary writes such as drag moves, renames and completion,
   while the Inbox commands keep their pending/reconciling UI. Decide the list.
7. **Network failure and offline.** Is v1 without offline editing? What does
   the UI show when a read or a write fails (MI-23, the `unknown` outcome)?
8. **Multiple tabs and Realtime.** Dexie `liveQuery` keeps tabs in sync today.
   Options: Realtime subscriptions, refetch on focus, or single-tab behavior
   for v1.
9. **Client-side jobs.** Keep Trash auto-cleanup, system Node seeding and
   orphan cleanup client-triggered, or move them to the server (`pg_cron`,
   triggers, the sign-up hook).
10. **Search.** The global `searchAll()` and the Grid Explorer search run over
    local data today: a server query (ILIKE or full-text) or in-memory search
    over the loaded dataset (depends on question 1).
11. **Testing.** A local Supabase (CLI plus Docker) for SQL, RLS and RPC tests;
    what replaces the `fake-indexeddb` tests; hook tests against a fake
    `DataStore`; fixtures and Playwright checks with a seeded test account. The
    gates stay `git diff --check`, `pnpm test`, `pnpm lint`, `pnpm typecheck`
    and `pnpm build`.
12. **Environments and hosting.** At least a local (`supabase start`) and a
    production project, and an optional preview; env vars and secrets kept out
    of Git; Vercel hosting for the portfolio link; the Supabase region (Seoul
    is closest). Free-tier projects have been paused after a period of
    inactivity, which would break a portfolio link: check the current terms and
    decide (keep-alive or accept).
13. **Account lifecycle.** Sign-out clears the client cache; account deletion
    removes every row; a short privacy note on the sign-in page.
14. **Display name "grid" (S06).** Where it appears: the page title, the
    sign-in page, the sidebar.
15. **Phasing.** A shape to test: (1) Supabase project, auth, hosting and
    environments; (2) schema, RLS and per-account system Nodes; (3) reads and
    the reactive layer; (4) ordinary writes; (5) the atomic commands as RPC;
    (6) removal of Dexie and the IndexedDB code and tests. Decide which phase
    brings the sign-in UI, and whether the default-theme and status-feedback
    lanes run in parallel (after the agreed `/run-phase` change).

## Discussion

### Planning session, 2026-10-20/21 (summary)

- For the data-loss problem three options were compared: (1) Supabase as the
  only store, (2) row-level sync with Dexie kept locally, (3) a cloud snapshot
  backup. For a personal local-first app the advisory first recommended (3).
  Once the user stated the SaaS goal, (3) was dropped, because a backup is not
  a SaaS architecture. Between server-authoritative and a local-first sync
  engine, the advisory recommends server-authoritative (open question 1).
- Dropped: local JSON export/import as an interim safety net (made
  unnecessary by S04), and the 2026-06-04 Track A local backup files (File
  System Access API folder writes, dated files, import as copies).
- The main asset is the two-layer design (`DataStore` commands and reactive
  hooks): the conversion replaces the store and the hook internals, not the
  components.
- Naming: the user first asked to replace every "griddo" in the project with
  "grid" (about 1,311 occurrences in about 210 tracked files, mostly historical
  records), then chose to keep "griddo" inside the project and use "grid" only
  as the user-facing name, because "grid" is a general noun that collides with
  the Grid domain term (S06).

### Brainstorming session, 2026-10-21

Setup done as briefed (worktree `/Users/jwk/Documents/grid-saas`, branch
`docs/saas-conversion`, commit `d387820`). The user is a frontend developer
with little backend background; explanations start from GridDO examples.

Further facts checked:

- Three hooks already read the whole active dataset
  (`use-global-urgency`, `use-grid-explorer-search`,
  `use-explorer-remote-status` call `getAllActiveNodes()` and
  `getAllActiveBits()`), and `use-calendar-data` walks the tree. There are 19
  `liveQuery(` call sites in 17 hook files.
- `supabase-js` (PostgREST) runs each request as its own transaction; a
  multi-statement transaction needs a Postgres function or a direct database
  connection. A service-role key bypasses RLS.
- Supabase's built-in SMTP delivers only to the project's team members, at 2
  messages per hour (docs, 2026-10-21); magic link for other users needs
  custom SMTP.
- Supabase anonymous sign-in: anonymous users get the `authenticated` role and
  an `is_anonymous` JWT claim; the docs recommend CAPTCHA/Turnstile; the
  default IP rate limit is 30 sign-ins per hour; there is no automatic cleanup
  of anonymous users (a scheduled delete on `auth.users` is the documented
  approach); linking an OAuth identity converts an anonymous user.
- `indexeddb.ts` calls `Date.now()` 31 times: `mtime`/`createdAt` come from the
  browser clock today.
- Grid cell uniqueness (SCHEMA Hook 8) spans `nodes` and `bits`, so one unique
  index cannot enforce it; it stays a check inside the write functions.
- No Docker and no Supabase CLI on the machine; local Supabase needs a
  container runtime first (question 11).

Question 1 (S07). The account snapshot was chosen because the app's reads are
already whole-dataset shaped and the hook bodies survive with only the
subscription replaced. Rejected: (a) a per-query cache, because every cascading
write (trash cascade, `mtime` cascade, placement) would need an exact
invalidation map across 17 hooks, and a missed key shows stale data; (c) a
sync engine, for its conflict-resolution cost. Cost accepted: the initial load
grows with the data (measure it and set a bound), and writes must return or
refetch the changed rows. Implementing the snapshot fetch with TanStack Query
is allowed as a detail for `/craft-docs`.

Question 2 (S08). Postgres functions give one transaction per call,
`auth.uid()` and RLS without a server to run. Almost every GridDO write
touches several rows (version increment plus Hook 1 `mtime` cascade), so the
rule is "every write is a function". Rejected: Next.js Route Handlers or
Server Actions with a direct Postgres connection (connection pooling, JWT
verification, RLS bypass risk, an extra hop); Supabase Edge Functions (the same
transaction problem plus another runtime); keeping the write logic in
client TypeScript with a thin server-side version check (less SQL, but the
server could not enforce cell, target and ancestry rules, against SCHEMA's
"transaction/DB function plus constraints" direction). Cost accepted: most of
the write logic in `indexeddb.ts` is rewritten in SQL; the SCHEMA command
matrix is the spec and the existing DB test scenarios are the answer key. A
throwaway spike (one command plus its reconcile, as SQL) stays available if
the first SQL phase proves harder than expected.

User concerns answered before the decisions:

- The data model stays; no redesign. Changes: `user_id` on every row, a
  naming convention (question 4), timestamps kept as epoch-ms numbers
  (recommended, so the aging/urgency/calendar code is untouched) but set by the
  server clock, constraints the database can hold, and system Nodes created at
  sign-up.
- "Only the storage changes" was half right: components and hook logic stay,
  but the `DataStore` implementation is mostly rewritten, and auth, RLS,
  network states and hosting are new. The conversion is the largest work item
  so far; it is phased (question 15).
- Perceived differences: sign-in, a short initial load, network-failure states
  and (pending question 7) no offline editing; everyday interactions stay
  immediate through optimistic updates (S09). Data survives browser clearing.
  The free-tier pause risk to the portfolio link goes to question 12.

Question 3 (S10). The user chose GitHub and Google OAuth and planned an
auto-login into one shared seeded test account. Rejected in favour of
per-visitor anonymous accounts: a shared account lets visitors change each
other's data (and see conflict UI when two are active), hands every visitor
the account's session, and needs resets that break active sessions. Also
rejected: magic link (custom SMTP needed) and email plus password (reset flow
and email). Open details: the demo URL, a guest-mode banner, the cleanup age,
where the seed is defined (the content of
`scripts/dev-fixtures/inbox-triage.js` can serve as a source), and whether
sign-up is open to anyone (question 13).

Questions 4 and 5 (S11–S14), same session:

- Naming (S11): quoted camelCase columns were rejected because Postgres folds
  unquoted identifiers to lower case, so every SQL statement in the write
  functions would need `"parentId"` quoting and a missed quote fails at run
  time. snake_case with one conversion boundary was chosen.
- `settings` (S11): the IndexedDB store holds only `bzMigration_<parent>`
  markers for `runBreadcrumbZoneMigration` (called from `grid-runtime.tsx`;
  blocked cells come from the measured breadcrumb). New accounts carry no
  legacy data (S04); `/craft-docs` checks whether any new-data path (for
  example Inbox placement) can still land in the blocked zone before removing
  it.
- Validation (S12): the explanation given was "client checks are for the
  user's convenience, server checks are the gate", because client code can be
  changed by anyone in the browser.
- Account preparation (S13): an `auth.users` insert trigger was rejected
  because a trigger error blocks sign-up itself and SCHEMA states "No database
  triggers"; an idempotent function keeps today's `ensureSystemNodes()`
  semantics and can be called again after a failure.
- Security (S14): the anon key is public by design, so RLS is the only
  barrier. Rejected: (A) security-definer functions with an explicit
  `user_id = auth.uid()` check in each (one missed check opens another
  account, and the user, a frontend developer, cannot reliably catch that in
  SQL review), kept only as the fallback; (C) table write grants for the
  client role with RLS only (bypasses the functions and their version rules,
  contradicts S08). The dedicated-role design is unverified on Supabase
  (Supabase's `postgres` role bypasses RLS, so functions must be owned by a
  separate role without BYPASSRLS that `auth.uid()` still resolves inside);
  the first SQL phase proves it.

Questions 6–10 (S15–S19), same session:

- Hook write call sites counted: `updateNode` 7, `updateBit` 7, `updateChunk`
  5, `createBit` 2, `softDeleteBit` 2, `hardDeleteNode` 2, `hardDeleteBit` 2,
  and one each of `createNode`, `createChunk`, `deleteChunk`,
  `softDeleteNode`, `restoreNode`, `restoreBit`, `archiveNode`, `archiveBit`,
  `unarchiveNode`, `unarchiveBit`, `promoteBitToNode`, `cleanupExpiredTrash`,
  `runBreadcrumbZoneMigration` (outside `src/lib/db`, excluding tests).
- S15: predicting trash/archive cascades in the client was rejected because it
  duplicates the SQL cascade logic in TypeScript; hiding the target is enough,
  since descendants are reached only through it. Permanent delete is never
  optimistic because it cannot be undone; restore and promotion results
  (cell, new Node) are chosen by the server. Ordering of rapid successive
  writes to one record is a `/craft-docs` detail.
- S16: automatic resend of an ordinary write after an unknown outcome was
  rejected because a resend of a write that did commit increments `version`
  twice (Architecture 9). Offline editing was rejected because it brings back
  the sync engine rejected in S07. The status-feedback and toast topics run
  after this conversion (S05), so only a minimal notice is in scope.
- S17: Realtime was deferred (subscription management, de-duplicating the
  client's own writes); single-tab enforcement was rejected for usability.
  Reading the snapshot table by table was rejected because a write between
  requests can show a candidate without its source.
- S18: "tombstoned" in the orphan contract named a hypothetical remote store;
  Postgres has no tombstones here, and a foreign key from
  `staged_candidates.source_breakdown_id` refuses deletion of a staged source,
  so neither `source_deleted` nor `source_tombstoned` can occur. All local data
  is discarded (S04), so no legacy orphan exists. The defensive rule that an
  unresolved source is never rendered as a valid card can stay. Server-side
  Trash cleanup (`pg_cron`) was not chosen: Trash is only seen inside the app,
  so client-triggered cleanup changes nothing for the user; the anonymous
  account cleanup (S10) is the one server-scheduled job (question 12).
