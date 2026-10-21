# Command Palette (Cmd+K) Default Behavior and Create Commands

## Metadata

- Created: 2026-10-20
- Readiness: draft
- Category: feature idea
- Source project: GridDO
- Source topic: n/a (user idea, planning session after the Phase 35 close)
- Source prototype: n/a
- Tags: command-palette, cmd-k, search, quick-capture, node-create, bit-create
- Dependencies: `2026-05-18-quick-capture-palette` (visual/interaction recipe
  source), `2026-04-28-quick-capture-entry-surface` (Capture vs Create)

## Summary

`Cmd+K` opens a palette with a text input, but typing in it finds nothing. Its
only actions are `1` Scratch capture and `2` open the Search overlay. The user
wants a defined default behavior for the input and Node and Bit creation next
to Scratch. The surface's user-facing name is undecided; "Command Palette" is
the current SPEC name.

## Current state (checked on `main` `552b00a`)

- By design, not a bug: SPEC `Command Palette (Cmd+K)` fixes the commands
  (`1` = Scratch capture, `2` = the existing Search overlay) and says the prompt
  input is "visual-shell only, not an app-wide search/filter".
- `src/components/quick-capture/command-palette.tsx` renders a "Fixed Menu";
  the input has no filter or search handler.
- The sidebar `+` entry surface already separates `Ideas` (Scratch) from
  `Create` (Node, Bit) (`2026-04-28-quick-capture-entry-surface`).

## Direction (user, 2026-10-20)

- Decide what typing in the input does.
- Add Node and Bit creation; today the palette only captures Scratch.

## Options to weigh at promotion (advisory notes, 2026-10-20)

- Input default: (A) filter the command list; (B) search Nodes and Bits inline
  through the existing global `useSearch()` / `searchAll()` and jump to the
  result, which may make the separate Search overlay redundant; (C) the typed
  text becomes a Scratch on Enter. They combine, for example (A)+(B) with a top
  row "Capture '<text>' as Scratch".
- Node/Bit creation: reuse the existing create dialogs rather than a new form.
  A new Node or Bit needs a parent and a grid cell; the palette knows them on
  `/grid/[id]` but not on L0, Calendar, Inbox or Archive.
- Keep the Capture vs Create grouping from the entry-surface topic.

## Open questions

- The surface's name.
- The input default (A, B, C or a mix).
- The Node/Bit target when the palette opens outside a Grid page.
- Whether the Search overlay stays a separate surface.
