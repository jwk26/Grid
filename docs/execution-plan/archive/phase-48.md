# Phase 48 — Accounts And Launch

## Completion-time scope

Closed 2026-11-02. Tasks 235–240 and 238A are user-accepted. SaaS lane, part 7
and the last: the app has accounts and is ready to publish as Grid. Task 235
added the account modal, sign-out to a new guest and the account-deletion
fallback: `delete_my_account()` records the request, `ensure_account()`,
`get_snapshot()`, the reconcile functions and every write function answer
`account_deleting`, and the account-being-deleted and account-deleted screens
replace the app; a user change resets the `triage-store` app session (Phase 50
mi-1). Task 236 added Turnstile on guest sign-in with its security-check
screen, and PKCE OAuth with GitHub and Google: the provider's account chooser
every time, a return without finishing read as a cancel, and one verified email
linking both providers to one account. Task 237 copies the approved demo seed
`DP-SAAS-02` into new guests (15 L0 seed Nodes, 85 seed Nodes and 267 Bits with
the Scratches, after five reworks judged in a private window). Task 238 added
the daily `pg_cron` job `cleanup-guests` (03:17 UTC) and the narrow-window
notice below 1024px, an opaque frame over the mounted, `inert` app, with no
guest created while narrow. Task 238A fit the Node card content from 1024 to
1920px. Task 239 named the product "Grid" (internal name `griddo`). Task 240
measured D8 on production: the limit-sized account failed all three runs and
the 50% account passed them, so the real-account limits dropped to nodes 500,
bits 2,500, chunks 5,000 and `scratch_breakdowns` 2,500; the production
settings, `public/privacy.html`, the Security Advisor result and the first
cleanup on production are recorded in the ledger. Ran on branch
`phase-48/accounts-and-launch`.

Changed during the phase: Task 238A was added from the Task 238 visual check,
and Task 239 lost its backup job and restore test (user, 2026-11-01; automatic
account backup is `2026-11-01-account-backup`).

Production: migrations `20261037000000` to `20261040000000` were applied during
Task 240, so the close applied none and took no dump, since production holds
nothing to keep (user, 2026-11-01). The production smoke runs right after the
merge, before the URL is announced; its result is in the ledger's Phase close.

Carried in: Phase 42 MI-8 (closed by the user, 2026-11-02) and Phase 50 mi-1
(fixed in Task 235 by `06bdca5`). Carried over: mi-1 to mi-6, in
[`Issues_Deferred.md`](../../issues/Issues_Deferred.md). The record is in the
ledger: [`Issues_Phase_48.md`](../../issues/Issues_Phase_48.md).

## Task contracts at close

### Task 235: [x] Add the account modal, sign-out and account deletion

**Files and actions:** `src/components/layout/account-modal.tsx` and test (the
guest and account variants, copy and privacy note from SPEC §Feedback copy, the
deletion confirmation); the account icon becomes its button; sign-out drops the
snapshot and starts a new guest; sign-out from one tab followed by the other
tabs.
- Account deletion: the SCHEMA fallback only. Task 218 recorded that hosted
  Supabase refuses the dedicated role (`postgres` has no grant option on
  `auth.users`; Phase 42 ledger, 2026-10-24), so no dedicated role is built.
  Migration: `delete_my_account()` as a write function owned by
  `griddo_writer` that records `accounts.deletion_requested_at` for the caller
  only, and `account_deleting` in `ensure_account()`, `get_snapshot()`, the
  reconcile functions and every write function, with its tests (S42 (1): it
  marks only the caller's account, and each of those functions rejects a
  marked account); the client signs out to a new guest with the fallback toast; the
  account-being-deleted screen. The rows are deleted by Task 238's daily
  cleanup.
- Account deleted: `account_missing` is already returned by `ensure_account()`,
  `get_snapshot()`, the reconcile and write functions (Phases 42–44); this task
  adds the client's account-deleted screen for it.
- User change (Phase 50 mi-1, user, 2026-10-30): a sign-out or any other user
  change also resets the app-session state of `src/stores/triage-store.ts`
  (selection, Pool expansion and its manual exception, Pool query and scroll,
  Explorer path and columns), with a test, so the new account enters through
  the saved-Scratch or first-Scratch fallback, not the external-removal hold;
  SPEC §Inbox/Triage State Ownership, App session row, gains that reset.
- Reserved cells (feedback F34): every `ensure_account()` call site added here
  passes the top-left 3×2 block until Task 249 is on `main`, and none after.

**Dependencies:** Phase 47 Final Close and `main` sync; this phase's lifecycle
gate.

**Authority:** S23, S29, S42 (1); SCHEMA §Account deletion; SPEC §Account icon
and modal, §App-level screens, §Inbox/Triage State Ownership; Phase 50 mi-1.

**Observable acceptance:** the modal shows the right variant; sign-out lands on
a new guest; `Delete account` records the request, lands on a new guest and
shows the fallback toast (`Your account will be deleted within 24 hours.`); a
second browser profile still signed in to that account, or a new sign-in to it
before the cleanup, shows the account-being-deleted screen on its next read or
write and the data never appears, while another tab in the same browser
follows the new guest; once the account's auth user is gone (in this task by a
test-only delete; from Task 238 by the cleanup), the next read or write shows
the account-deleted screen, never an empty Grid; signing out in one tab moves
every tab to the same new guest; after a sign-out the new account's Inbox
opens through the ordinary selection fallback, with no external-removal hold.

**Verification:** full gate; `expert` review with the SQL checklist; browser
checkpoint in the three themes.

**Commit message:** `feat(account): add the account modal and deletion`.

### Task 236: [x] Add OAuth and Turnstile

**Files and actions:**
- Already registered (user, 2026-10-26, ahead of this task): GitHub OAuth
  apps `grid (dev)` and `grid`; Google Cloud project `grid` with web clients
  `grid dev` and `grid` (consent screen External, still in Testing with the
  user's accounts as test users); Cloudflare Turnstile widget `grid` (Managed,
  hostname the stable Vercel production domain). The dev callbacks use
  `http://127.0.0.1:54321/auth/v1/callback`. Their ids and secrets live only in
  the user's password manager; the user enters them, and they are never asked
  for or pasted in a session. Nothing is enabled in the Supabase dashboard yet.
- Local: the dev client ids and secrets go only into the git-ignored
  `.env.local`, which `supabase/config.toml` reads, and `.env.local.example`
  lists the names. Local Turnstile uses Cloudflare's public test keys (SPEC
  §Environments And Hosting).
- Production: the user sets the provider secrets, the Turnstile secret, the
  Site URL and the redirect URLs in the dashboard; nothing secret enters Git.
- `session.ts`: OAuth sign-in returning to `/`; a cancel or provider error
  keeps the guest session, cleans the URL and reopens the account modal with
  its inline error; Turnstile on anonymous sign-in with the widget in the
  security-check screen (S42 (3)); the guest-creation failure reasons; the
  session-expired screen gains the two sign-in buttons (F20).
- Reserved cells (feedback F34): every `ensure_account()` call site added here
  passes the top-left 3×2 block until Task 249 is on `main`, and none after.

**Dependencies:** Task 235.

**Authority:** S10, S21, S23, S42 (3); F20; SPEC §Account entry.

**Observable acceptance:** on local Supabase, GitHub and Google sign-in open an
own empty account with its system Nodes; cancelling at the provider returns to
the same guest with the modal and its inline error; a guest's anonymous
sign-in passes the Turnstile test key; the test key that forces an
interactive challenge shows the widget in the security-check screen; the test
key that always fails shows the reason and `Retry`; `git grep` finds no OAuth secret.

**Verification:** full gate; browser checkpoint with both providers on local
Supabase.

**Commit message:** `feat(auth): add OAuth and Turnstile`.

### Task 237: [x] Record the demo seed `DP-SAAS-02` and copy it into new guests

**Decision prerequisite `DP-SAAS-02`:** owner the user; missing decision the
demo seed content (S10); the task drafts it from the
`scripts/dev-fixtures/inbox-triage.js` scenarios, within the guest limits, as a
reviewable list and a rendered L0, and the user approves it; the code slice
below waits for that approval, recorded in this task.

**Files and actions:** migration: the seed as data in `internal` and
`ensure_account()` step 3 (new ids, remapped references, deadlines and
modification times relative to the copy time, references to Inbox and
Archive mapped to the account's existing system Nodes and no seed item in their
cells, `seeded_at`), with the copy-once
concurrency test (S30, S42 (2)); the seed uses no cell with `x` < 3 and `y` < 2
at any level (feedback F34), checked by a database test.

**Dependencies:** Task 236.

**Authority:** S10, S13, S30, S42 (2).

**Observable acceptance:** a new guest opens on the approved demo with live
urgency and aging; two concurrent first calls copy it once; a real account gets
no seed.

**Verification:** full gate; `expert` review with the SQL checklist; browser
checkpoint.

**Commit message:** `feat(db): copy the demo seed into new guests`.

### Task 238: [x] Add guest cleanup and the narrow-window notice

**Files and actions:** migration: `create extension if not exists pg_cron`
(off by default on the free plan; Task 218 proved that a job scheduled by
`postgres` deletes from `auth.users` with the cascade, so the S22 GitHub
Actions fallback is not used) and `internal.cleanup_guests()` scheduled daily,
deleting guests 7 days after `last_visit_at` and every account with a
deletion request (the account-deletion fallback, Task 235), with the S29 test
that an account with a staged candidate is deleted; `app-frame.tsx`: the narrow-window notice over the
mounted, `inert` app below 1024px, and no guest creation while narrow
(S42 (4)).

**Dependencies:** Task 237.

**Authority:** S10, S22, S42 (4)(5); SCHEMA §Guest cleanup; SPEC §Account
entry step 1.

**Observable acceptance:** a guest idle for more than 7 days is deleted with
all its rows, and one with an open tab is kept; an account with a deletion
request is deleted with all its rows on the next run, and a second browser
profile still signed in to it with a valid access token then shows the
account-deleted screen (one whose token has already expired shows the
session-expired screen, SPEC §App-level screens); narrowing the window shows the
notice, and widening it returns to the same screen with drafts intact.

**Verification:** full gate; `expert` review with the SQL checklist; browser
checkpoint.

**Commit message:** `feat(account): add guest cleanup and the narrow-window notice`.

### Task 238A: [x] Fit the Node card content at every supported width

User, 2026-11-01, from the Task 238 visual check. The Node card shrinks with
its cell, but its content has fixed floors that sum to 63px (icon 24, lift 6,
padding 8 and 7, title 18), so below a window about 1534px wide the content no
longer fits: the icon meets the title near 1350px and leaves the card at
1024px, where the card is 34.7px.

**Files and actions:** `src/app/globals.css`, the
`.grid-cell-container > *` rule: lower the floors so they sum to no more than
the card at 1024px, and reduce `--grid-inset` for a small cell; the exact
values are set in a visual round with the user. `DESIGN_TOKENS.md`
§Responsive Grid Node Tokens follows. Tokens only; no change to the Grid
layout, the cell count or `MIN_WINDOW_WIDTH`. Bit cards are out of scope
(`2026-10-31-grid-bit-card-footprint`).

**Dependencies:** Task 238.

**Authority:** user, 2026-11-01; DESIGN_TOKENS §Responsive Grid Node Tokens;
SPEC §Responsive Breakpoints.

**Observable acceptance:** at window widths from 1024px to 1920px, in the four
themes, a Node's icon overlaps neither its title nor the card edge, on the Grid
and on the Inbox Explorer cards; the look at 1920px is unchanged.

**Verification:** full gate; the agent measures the icon, title and card edges
across the widths; the user judges the look at 1280, 1366 and 1440px.

**Commit message:** `fix(grid): fit the Node card content at every supported width`.

### Task 239: [x] Name the product

User, 2026-11-01: the name is "Grid", and the backup job leaves this task
(SPEC §Environments And Hosting, S35; `D-ACCOUNT-BACKUP`).

**Files and actions:** `APP_NAME` in `src/lib/constants.ts` becomes "Grid", so
the tab titles follow the feedback F25 format; "Grid" in the `sr-only` heading
of `src/app/(grid)/page.tsx` and in the copy that uses the product name
(`src/lib/copy/feedback.ts`, the account modal; SPEC §Feedback copy; S24);
the `src/app/layout.tsx` metadata keeps no `title`, and its description becomes
`Task management on a 2D grid`. The common noun in `your grid` stays lowercase,
and the theme picker's `GridDO` label stays (S24). The internal name becomes
`griddo` (S06): the comments in `src/app/globals.css` and
`scripts/dev-fixtures/`, and the test title in
`src/lib/animations/motion-language.test.ts`. Archived records and the
`GRIDDO_*` environment variables stay.

**Dependencies:** Task 238A.

**Authority:** S06, S24.

**Observable acceptance:** the tab title and the L0 heading read "Grid"; no
user-visible copy uses "grid" as the product name; the metadata description no
longer says "Local-first"; outside that label, live code and tests no longer
say `GridDO`.

**Verification:** full gate; browser check of the tab title, the L0 heading and
the account modal.

**Commit message:** `chore: name the product Grid`.

### Task 240: [x] Prepare the launch

**Files and actions:** first, with the project confirmed active (S22), the
migrations not yet on production applied after a dry run and the user's
approval, and `scripts/verify/hosted-roles.mjs` run again, so every check below
reads the schema that ships (user, 2026-11-01); production auth settings final
(anonymous sign-in with Turnstile, both providers, rate limits, their values
read from the dashboard and decided by the user), confirmed by the user in the
dashboard, with captcha turned on only after D8 passes, since
`d8-measure.mjs` signs in without a token; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set
for Production in Vercel before the merge, confirmed by the user; the Google
OAuth consent screen published out of Testing, so any Google account can sign
in, confirmed by the user in Google Cloud; Google refuses to publish without a
home page URL and a privacy policy URL (user, 2026-11-01), so
`public/privacy.html` is added (SPEC §Environments And Hosting) and the
Branding page takes the production `/` and `/privacy.html`; if Google needs the
page reachable, publishing waits for the merge and comes before the smoke; the
production GitHub OAuth app and
the Google consent screen named "Grid", renamed by the user (without brand
verification Google's sign-in screen keeps showing the Supabase host;
verification needs an owned domain, a public home page and a privacy policy
page, and is not a launch condition; user, 2026-11-01); the Security Advisor on
production shows no warning other than the accepted lint 0012 and one
`authenticated_security_definer_function_executable` warning for each client
write function in the SCHEMA function table (accepted by design, S14; user,
2026-10-24); such a warning for any other function, or any other warning, is a
finding; the D8 measurement again on production (MI-8):
`scripts/verify/d8-measure.mjs` gains a `vacuum analyze` of the built accounts,
a two-minute wait before the calls, since a real account is not read right
after a bulk insert, the server time beside each call, and a verdict on the
cold call with the warm ones, and is proven with `--local`; the limit-sized
account also runs at 50% and 25% of the limits; three runs from the same
network, every run within the limits (limit-sized 3 s or less, one-tenth 1 s or
less; the one-tenth cold call is judged on its server time, since lowering the
limits cannot shorten connection setup; user, 2026-11-01); if the limit-sized
account fails, a migration lowers the limits (SCHEMA §Account limits) to the
largest measured size that passes every run, before the Phase 48 close; a
written production smoke checklist in the ledger
(guest entry, a write, the privacy page, OAuth sign-in with both providers,
sign-out, guest cleanup scheduled, and account deletion last, since one verified
email links both providers to one account). The Phase 48 close then applies any migration
not yet on production and merges, with no dump, since production holds nothing
to keep (user, 2026-11-01), and runs that smoke right after the merge, before
the URL is announced; if it fails, the URL stays unannounced and the fix goes
through a new phase.

**Dependencies:** Task 239.

**Authority:** S21, S22, S34, S36, S37; D8; SPEC §Environments And Hosting.

**Observable acceptance:** the production settings and the Advisor result are
recorded and confirmed by the user; the D8 result is recorded and passes, or
the lowered limits are applied; the smoke checklist exists; `/privacy.html`
opens as a plain document with no guest created; no secret in Git; `supabase db
diff` shows that the production schema equals the migrations in Git.

**Verification:** full gate; the user confirms the settings. The post-merge
smoke result is recorded in the Phase 48 close.

**Commit message:** `docs: prepare the grid launch`.
