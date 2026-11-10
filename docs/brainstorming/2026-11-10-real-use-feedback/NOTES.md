# Real-Use Feedback — Notes

Raw feedback and the control tower's code check. The current classification,
user directions and open questions live in `DECISION.md`.

## Raw feedback (user, 2026-11-10, verbatim)

## Grid 실사용 Feedback
### Sidebar
- Sidebar의 세로 영역은 한정적이라 어떤 node를 놓을지, 어떤 순서로 놓을지 생각이 필요해. 기존 배치와 더불어 현재 새로운 icon들이 추가될 예정인데 어떻게 하는것이 좋을지 생각해야 함. 예를 들어, Backup icon은 profile icon 내부로 흡수시키는건 어떨까 싶어
- sidebar hide 기능은 어떨까? 내가 생각하는 grid user flow는 sidebar click 보다는 cmd + k로 빠르게 node/bit/scratch를 추가하고 화면은 화면으로서만 집중하는 그림이야. 이 User flow를 welcome 화면에서 소개해주고 자연스럽게 유도하는거야. 하지만 sidebar을 바로 Hide 하는건 나이가 있거나 관습적인 유저들에게는 너무 급진적일 수 있으니 settings에서 hide할 수 있다고 안내만 해주는거지. hide 이후에도 좌측 상단에 open 할 수 있는 버튼은 다시 놔둬야 해. 그리고 sidebar 내부에 mouse enter 상태에서는 open 유지하도록 하고. 필요해서 열었는데 몇 초 있다가 다시 접히면 짜증나니까.
- Node/bit Item drag 시 search, calendar icon 없어지는 것이 별로임. edit button 강조, 'x' 버튼 등장으로 delete을 용이하게 한 의도는 알겠으나 시각적으로 별로. 이 두 기능 모두 node/bit 우클릭 시 Option Menu 추가 하는 것으로 옮기기. item drag 시, drag와 동시에 사용할 수 없는 sidebar icon들을 blur 처리(trash, theme, night mode button에 적용된 방식) 하는 것이 타당해보임
- 현재 Inbox, Archive 는 grid에 node가 존재하고, sidebar에도 존재함. 두 위치에 동시에 존재할 수는 없음. Default는 Node로 놓고 Welcome 화면에서 Node를 sidebar에 추가할 수 있다는 기능 설명의 대표적인 예시로 사용하기
- Calendar 기능도 Node로 빼기. Grid 서비스를 처음 사용하는 User는 Inbox, Archive, Calendar 세 가지 Node를 먼저 보게 되고 Guide를 따라 이 세가지 node를 sidebar로 옮길 수 있음을 알게 될 것
- Brainstorming 항목에 favorite node 추가 논의가 있을거야. 시안도 griddo2-claude-qc에 존재하지만 현재 시안그대로 적용하기에는 좀 old-fashioned라 UI는 다시 논의가 필요해. Inbox, Archive, Calendar의 3종 Default Node를 sidebar에 추가해 본 user는 '일반 node도 추가 되나?' 라는 호기심으로 자연스럽게 이어지게 될 것이고, 그걸 위해 favorite node 기능을 추가하자. 다만, sidebar은 세로 영역이 한정적이므로 일반 node는 2개까지만 sidebar에 둘 수 있고 favorite icon 을 추가하고 click으로 별도의 favorite node 창을 여는 걸로 하자
- Settings button 필요. 내부에 어떤것들이 들어와야할지는 좀 고민해보자.
    - sidebar hide toggle
### Grid
- node/bit 우클릭 시 Option Menu 추가하기
    - sidebar inbox/archive icon에 이미 적용되어 있어 재활용 가능
    - delete, edit, archive,
- node/bit 우측 상단 '...' 삭제. 시인성도 좋지 않고 Option menu로 변경
- 화면 우측에 bit 배치 시 가변적인 길이 때문에 잘 보이지 않음. drop zone 크기 기준으로 bit 크기를 제한하면 어떨까
- 100%에 도달한 bit는 due 임박 alert 왜 뜨는지? 의도된 것인지?
- Create, Edit node/bit UI가 vanilla css 상태야. theme 별로 UI 다시 만들어야 함.
- Node, bit 버튼이 둘이나 필요할까? 둘을 'Item' 이란 개념으로 묶고 Add할 수 있는 것은 Scratch, Item 으로 이원화 하면 어떤가? Add Item UI 안에서 node/bit 은 toggle 할 수 있게 바꾸고
### Calendar
- Pool UI가 너무 vanilla임 sidebar과 pool의 최상단 item 높낮이도 달라서 보기 불편함
- node/bit icon이 모두 vanilla 상태임
- 전체적인 UI에 NO SCROLLBAR 원칙도 지켜지지 않고 있음
### Trash
- 내부 UI가 vanilla 상태임. 어떤 기능이 필요한지 이야기해보고 UI 다시 만들어야 함
### Archive
- 정확히 어떤 기능인지 파악이 힘듦. UI도 이상하고 이게 뭔지 잘 모르겠음
- 내부 UI가 vanilla 상태임. 어떤 기능이 필요한지 논의하고 UI 다시 만들어야 함
### Search
- Search node, bit, and features.. 로 바꾸기
- 'fixed menu' 가 뭔지 잘 모르겠음. 'esc' 로 바꾸기
- 어떤 기능이 있어야 하는지 논의 후 실제 사용 할 수 있게 추가해야함
    - Add Scratch
    - Add Node
    - Add Bit
    - Search 기능은 추가적으로 만드는것이 아닌 기본 search input에서 바로 검색

## Code check (control tower, `main` `ae8a0b6`, 2026-11-10)

- **Sidebar order today** (`src/components/layout/sidebar.tsx`): Home, Account,
  Backup, `+` Add, Pencil (edit mode), Search, Calendar, divider, system Nodes
  (Inbox, Archive View), then at the bottom Trash, color theme, dark/light.
- **Drag time:** while a Node or Bit is dragged, Search and Calendar are replaced
  by `DeleteDropTarget` (the `X`) and the Pencil gets a drag-target emphasis;
  other icons are dimmed with `opacity-40 saturate-50`. That dim is the pattern
  the user asks to reuse for unusable icons.
- **System Nodes:** the sidebar always lists Inbox and Archive View; their
  right-click menu toggles `hiddenFromGrid` ("Remove from L0 Grid" / "Show on
  L0 Grid"). So "in both places" is today's design: `hiddenFromGrid` decides the
  Grid only, never the sidebar. A rule "on the sidebar ⇔ hidden from the Grid"
  can derive from the existing flag without a new column.
- **Calendar** is a route (`/calendar/weekly`), not a Node. A Calendar card that
  occupies a Grid cell needs a row (cells are data: `cell_taken`,
  `pick_free_cell`), so it is DB-lane work: a new `systemRole`, `ensure_account`,
  the demo seed and the cross-account tests. Archive View (`archive_view`) is the
  precedent of a system Node that opens a view.
- **`...` buttons:** `node-card.tsx` and `bit-card.tsx` render `MoreHorizontal`
  in the top-right corner. A Radix context menu already exists on the sidebar
  system Nodes.
- **Completed Bit still alerts:** `bit-card.tsx` applies the urgency blink from
  `getUrgencyLevel(bit.deadline)` without checking `status === "complete"`, and
  `use-global-urgency.ts` (the Calendar icon dot) counts every active Bit with a
  deadline, complete or not. SCHEMA Hook 3 completes a Bit when all its Chunks
  complete, so a 100% Bit is `complete` and keeps blinking. SPEC states no rule
  either way; this is a spec gap, not a recorded intent.
- **No-scrollbar rule** exists only for Inbox/Triage lists (SPEC "Pool list,
  Breakdown row list, Staging … Explorer column"; DESIGN_TOKENS "Internal
  scrolling"). An app-wide rule (Calendar, Trash, Archive, dialogs) is a new
  decision, not an unmet existing one.
- **Search placeholder** today: "Search nodes, bits, and chunks…" in
  `search-overlay.tsx`. "Fixed Menu" is the label in `command-palette.tsx`; the
  palette input filters nothing (SPEC, by design). The user's Search section
  treats the overlay and the palette as one surface.
- **Archive and Trash** surfaces: `src/components/archive/`,
  `src/components/trash/`; Calendar Pool: `src/components/calendar/items-pool.tsx`,
  `node-pool.tsx`.

## Control tower views, round 2 (2026-11-10, proposals, not user decisions)

- **R1 edit mode:** retire edit mode once R8 exists; move "`+` on an empty
  cell" to a right-click menu on an empty cell (New Node here / New Bit here).
- **R3 vs R6:** keep drag-to-add. During a Node drag zone B lights as a drop
  target and the rest dims; during a Bit drag everything dims (Favorites are
  Nodes).
- **R6:** share the 5 zone-B slots between system Nodes and Favorites; show the
  dotted placeholders only while zone B has free slots (at most 2) and drop
  them when it is full. Height estimate: 3 + 6 + 3 icons and two dividers fit
  under 600px.
- **R9 options to render:** (a) a hover action strip inside the card's bottom
  edge; (b) a `...` kept in a layer that does not scale, with a 24px target;
  (c) no visible button, a one-time "right-click for more" hint. The root cause
  either way: the hover scale moves the hit target.
- **R17 restore confirm:** Restore is safe and reversible; a modal adds friction
  to the most common Trash action. A toast that says where the item went back,
  with a "Go to" link, answers the real worry. Permanent delete and Empty Trash
  keep their confirmations. Two columns as master–detail: the list with search
  and sort on the left, the selected item's full tree and actions on the right.
- **R21 `+` menu:** keep two groups with one line each, "Scratch — write it now,
  place it later" and "Node, Bit — create it in place". Scratch is the
  capture-now, organize-later inbox; Triage turns it into Nodes and Bits. One
  "New Item" header hides that reason and reuses the word just dropped.
- **R22 Google sign-in branding** (from memory, verify against current docs when
  planned): the chooser shows `<ref>.supabase.co` because the OAuth redirect is
  on that domain. Options: (A) a Supabase custom domain (paid: Pro plan plus the
  custom-domain add-on); (B) Google Identity Services with
  `signInWithIdToken`, which runs on the app's own origin (free, an app and
  SPEC S23 change); (C) Google brand verification for the app name and logo,
  which needs a domain the owner controls. GitHub shows the OAuth App's name and
  logo, set in the GitHub OAuth App settings without verification.

## Aging check (control tower, `main` `ae8a0b6`, 2026-11-10)

- **Rule today (SCHEMA Hook table "Aging state"):** days since `mtime`; 0–5
  Fresh, 6–11 Stagnant, 12+ Neglected (`AGING_FRESH_DAYS = 5`,
  `AGING_STAGNANT_DAYS = 11`). Any logical edit resets `mtime`; Chunk activity
  resets the parent Bit's. Grid-visible Nodes and Bits only; system Nodes have
  no aging (ST09). The demo seed stores times relative to the copy, so aging
  looks alive for a guest.
- **Look today:** `getAgingFilter()` in `src/lib/utils/aging.ts` returns a CSS
  `filter` that `node-card.tsx` and `bit-card.tsx` put on the whole card:
  Stagnant `saturate(0.5) brightness(0.9)`, Neglected `saturate(0.2)
  brightness(0.75)`.
- **Observations:**
  1. No theme hook: `globals.css` defines `--aging-*-filter` and
     `--aging-dust-opacity`, but the components use the hard-coded strings, so
     no theme can change the aging look (the same kind of gap as ISSUE-20-02).
  2. Desaturation does little in monochrome `retro-mac` and grey
     `neumorphism`; mostly the brightness step remains (reasoning, not yet
     checked on screen).
  3. The filter darkens the text too; Neglected may fall below the contrast
     target.
  4. It stacks with other states: a completed Bit is already at 50% opacity
     and struck through; an urgent or overdue Bit fades as it ages, which
     weakens the urgency signal.
- **Plans on record:** the old PRD (non-authoritative) wanted a dust/noise
  texture on Neglected (deferred in `OMISSION_AUDIT.md`; only the unused
  `--aging-dust-opacity` remains). The draft revision in
  `2026-04-28-node-rollup-focus-aging` §Aging Revision proposes four levels
  (Fresh 0–3, Cooling 3–7, Stagnant 7–14, Neglected 14+), saturation plus
  opacity with a 0.6 floor and a contrast check, no animation, an urgency
  override (overdue items skip aging) and aging for Inbox Scratch. SCHEMA
  still has the three-level rule.
