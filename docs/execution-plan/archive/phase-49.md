# Phase 49 — Theme Set, Status Primitives And Toasts

## Completion-time scope

Closed 2026-10-24. Tasks 241–244 are user-accepted. Feedback lane, part 1
(promotion ②): the four-theme set, `DP-FB-01` and `DP-SAAS-01`, the status
primitives with the development state switch, and the toast position and
colour. Ran on branch `phase-49/theme-set-status-toasts` under the lightweight
Claude workflow, beside the SaaS lane's Phase 42.

Carried in: ISSUE-20-01 (Phase 20) and MI-13 (Phase 35), both resolved in
Task 241. Carried over: mi-1, mi-2 and mi-3, deferred to Task 248 (Phase 50),
whose plan entry carries them, in
[`Issues_Deferred.md`](../../issues/Issues_Deferred.md). `pnpm test:db` was not
applicable at close (`main` does not have it yet; Task 213). Ledger:
[`Issues_Phase_49.md`](../../issues/Issues_Phase_49.md).

## Task contracts at close

Waits for: none (runs beside Phases 42–44). Holds what the SaaS phases need
before Phase 45 and Phase 47: the four-theme set, the looks, the status
primitives and the toast position and colour (F33).

### Task 241: [x] Reduce the color themes to four

**Files and actions:**
- `src/lib/color-themes.ts` (new, non-client): the theme ids
  (`griddo`, `neumorphism`, `claymorphism`, `retro-mac`), the default and the
  storage key, the one list the store and the no-flash script read
  (ISSUE-20-01).
- `src/stores/color-theme-store.ts` and test: read the shared list; a persisted
  removed id falls back to `griddo` through the existing validation.
- `src/app/layout.tsx`: build the no-flash script from the shared list; drop
  Playfair Display and VT323.
- `src/components/layout/color-theme-toggle.tsx`: four options.
- `src/app/globals.css`: remove the `tiny-desk`, `origami`, `terminal` and
  `graphite` blocks and swatch variables, including their Inbox/Triage
  realization rules.
- Tests that enumerate themes (`theme-transition.test.ts`,
  `sidebar.test.tsx`, `inbox-triage-theme-realization.test.tsx`,
  `triage-workspace.test.tsx`, `hierarchy-explorer.test.tsx`,
  `breakdown-panel.test.tsx` and any other found by search): drop the removed
  themes.

**Dependencies:** this phase's lifecycle gate.

**Authority:** F28; SaaS S40; Phase 35 MI-13; ISSUE-20-01; CLAUDE.md
Architecture 8; DESIGN_TOKENS §Color Theme System.

**Observable acceptance:** the picker shows four themes; a reload with a stored
`terminal` id shows `griddo` with no flash; the four themes look as before;
no theme context under `src/` names a removed theme (the `tiny-desk`,
`origami` and `graphite` ids, a `terminal` color-theme id or
`data-color-theme` selector, `--font-playfair`, `--font-vt323`, Playfair
Display, VT323); the Inbox `terminal` operation phase is unrelated and stays;
from this task on no test or check covers the removed themes.

**Verification:** gate; that scoped search returns nothing under `src/`;
browser checkpoint of the four themes, light and dark.

**Commit message:** `refactor(theme): reduce the color themes to four`.

### Task 242: [x] Record the feedback and SaaS surface decisions `DP-FB-01` and `DP-SAAS-01`

**Files and actions:** a served HTML option sheet in `griddo`, with
`retro-mac` and `neumorphism` spot-checks and Korean explanations, rendering
every surface of DESIGN_TOKENS `DP-FB-01` and `DP-SAAS-01` together, with
shapes copied from the realized theme CSS, not from base components; record the
user's choices in DESIGN_TOKENS §Feedback Status Surfaces and §SaaS App-State
Surfaces, including the `:root` values of the status tokens. The sheet is
scratch, not committed.

**Dependencies:** Task 241.

**Authority:** F03, F07, F09, F12, F15, F21–F24, F29, F33; SaaS S27, S40;
DESIGN_TOKENS `DP-FB-01`, `DP-SAAS-01`.

**Observable acceptance:** the user's choice for each surface of both
prerequisites is recorded and committed; no implementation file changes.

**Verification:** `git diff --check`; the user confirms the recorded text.

**Commit message:** `docs(design): record DP-FB-01 and DP-SAAS-01`.

### Task 243: [x] Add the status primitives and the development state switch

**Files and actions:**
- `src/lib/constants.ts`: `DISPLAY_DELAY_MS = 300` (D7; reuse it if Task 217
  added it first).
- `src/hooks/use-display-delay.ts` and test: whether a pending or reconciling
  presentation is visible yet; restarts on a new phase; never reads or changes
  command state (F02).
- `src/components/feedback/status-icon.tsx` and test: `pending`, `unknown`,
  `reconciling`, `problem`; the delayed rotating loader, static under reduced
  motion; `?`; `!`; the `data-status-emphasis` helper for `?` and `!` only
  (F03).
- `src/components/feedback/status-tooltip.tsx` and test: hover and keyboard
  focus, one at a time, no controls, `aria-describedby`, static display (F09).
- A visually hidden polite status region for the success announcements of
  F04, in `src/components/feedback/`.
- `src/app/globals.css`: the status tokens with the `DP-FB-01` values (light
  and dark, on `:root`) and the `data-feedback-role` styles.
- `src/lib/dev/state-switch.ts`, `src/components/dev/state-switch-panel.tsx`
  and test: a development-only store and panel that force, per item, delayed
  pending, reconciling, unknown, not applied, rejected, conflict, integrity and
  editor offline over the current Inbox operation projections, and show each
  primitive in each state; it also injects outcomes at the `DataStore`
  boundary, through a development-only wrapper that `getDataStore()` in
  `src/lib/db/datastore.ts` applies to whichever store it returns (delay the
  next calls of a command kind, or make them return
  unknown, not applied, rejected or conflict), so the real recovery paths run
  end to end without stopping the shared local Supabase; mounted only when
  `NODE_ENV` is `development`.

**Dependencies:** Task 242.

**Authority:** F02, F03, F04, F09, F15, F30; SPEC §Item status presentation,
§Development state switch; DESIGN_TOKENS §Feedback Status Surfaces.

**Observable acceptance:** a result faster than 300ms shows nothing; a slower
one shows the loader at 300ms; reconciling keeps `?` and then the loader; the
loader is static under reduced motion; only one tooltip shows at a time and it
describes its item; the switch forces each state on the current Inbox items,
and an injected unknown or not-applied outcome runs the real `Check again` or
`Retry` path; the production build contains no switch code.

**Verification:** gate; `expert` review (delay hook, switch isolation); a
search of the production build output for the switch; browser checkpoint of
the primitives and forced states in the themes.

**Commit message:** `feat(feedback): add the status primitives and the development state switch`.

### Task 244: [x] Move and recolour the toasts and keep full-Grid create dialogs open

**Files and actions:**
- `src/app/providers.tsx`: the `sonner` Toaster at the top-left of the work
  area, right of the sidebar; at most three visible; kinds styled through the
  status tokens with the ✓, `!` and `wifi-off` icons instead of `richColors`
  (F12, F15).
- `src/hooks/use-toast-anchor.ts` and test: the stack's offset, below the fixed
  breadcrumb on Grid pages and at the breadcrumb row elsewhere (Task 248
  extends it to the revealed breadcrumb); translucent and pointer-transparent
  while a Node or Bit is dragged.
- `src/app/globals.css`: `toast-stack` and `toast` roles.
- `src/lib/copy/feedback.ts` (created here if Task 228 has not created it):
  the create-dialog sentence of SPEC §Feedback copy.
- `src/components/layout/grid-runtime.tsx` and the Node and Bit create dialogs
  it opens, with `grid-runtime.test.tsx`: when the target Grid has no empty
  cell, the dialog stays open with the typed title and shows the inline error,
  at every level, L0 included; no toast (F16).

**Dependencies:** Task 243.

**Authority:** F12, F15, F16 (create dialog); SPEC §Toasts, §Feedback copy;
DESIGN_TOKENS `toast-stack`, `toast`; `DP-FB-01`.

**Observable acceptance:** toasts appear at the top-left of the work area,
below the breadcrumb on Grid pages and at the top-left on the Inbox, Calendar
and Trash; their hues are blended and their icons differ by kind; at most three
show; during a drag the stack is translucent and a drop on a cell under it
works; a full-Grid create keeps the dialog, the title and the reason at L0 and
below, including a Bit created from L0 into a full parent (the reason names
that parent), with no toast. The kept toasts' texts are unchanged (Task 232 aligns
them).

**Verification:** gate; browser checkpoint in the themes, including a drag
under the stack and full-Grid creates of a Node and a Bit at L0 and at L1.

**Commit message:** `feat(feedback): move and recolour the toasts and keep full-grid create dialogs open`.
