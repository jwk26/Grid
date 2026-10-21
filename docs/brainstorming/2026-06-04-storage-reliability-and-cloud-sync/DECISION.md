# Storage Reliability and Cloud Sync

## Metadata

- Created: 2026-06-04
- Readiness: draft
- Status: superseded by 2026-10-21-saas-conversion (user, 2026-10-21)
- Category: storage strategy idea
- Source project: griddo2-claude
- Source topic: user-reported IndexedDB data loss and origin fragmentation
- Source prototype: n/a
- Tags: storage, indexeddb, backup, export-import, persistent-storage, supabase, cloud-sync, origin, data-loss
- Dependencies: PRD Storage Strategy, DataStore abstraction

## Summary

GridDO currently stores all user data in IndexedDB. That matches the original
v1 product strategy, but real usage exposed two reliability risks:

- browser storage can be cleared during cache/browser maintenance, deleting all
  Nodes and Bits
- each local dev origin has separate IndexedDB storage, so changing ports makes
  different data sets appear

The current direction is to keep IndexedDB for now, add an immediate backup and
storage-safety layer, and evaluate Supabase as the v2 storage/sync direction.

## Current Direction

Do not immediately discard IndexedDB. First add a v1.5 safety net centered on
real local backup files:

- JSON backup files stored outside browser-managed IndexedDB
- sidebar Sync control with freshness/status indicator
- manual sync and auto sync
- restore and import flows
- browser persistent-storage request via `navigator.storage.persist()` where
  supported
- origin-awareness in debug/dev surfaces so port-specific data separation is
  explicit
- documented fixed-origin local development guidance

Supabase remains a serious v2 candidate, but it should be evaluated before
becoming the canonical storage source. A full migration likely touches auth,
schema, row ownership, RLS, import/migration flow, latency policy, offline
behavior, and reactive read subscriptions.

The v1.5 backup file format should be migration-ready: it should represent
canonical GridDO entities, not a raw Dexie-only dump. Future Supabase migration
can use the backup JSON as an input file, then expand it into normalized cloud
tables.

## Problem

The original PRD already names the risk: browser-local data can be lost and is
not available cross-device. The user has now experienced the data-loss case in
practice after cache removal or Chrome update/maintenance.

IndexedDB origin separation also creates confusing development behavior. Data
created under one local origin, such as `http://localhost:3000`, is not visible
under another, such as `http://localhost:3001`. This is expected browser
behavior because IndexedDB storage is scoped by origin, including port.

## Decision Tracks

### Track A: Safety Net First

Smallest useful step:

1. Add export of the complete local database as a versioned full JSON snapshot.
2. Let the user select a backup folder when browser support allows direct file
   writes.
3. Add a sidebar Sync button that shows whether local data is backed up,
   pending, saving, or failed.
4. Add auto sync that writes real files when folder permission exists.
5. Add manual sync that writes immediately, or falls back to browser download
   when direct folder writes are unavailable.
6. Add restore and import flows with validation, preview, and safety backup.
7. Request persistent browser storage when the app initializes or when the user
   enables local backup safety.
8. Improve `/debug-indexeddb` or an equivalent settings surface to show the
   current origin and explain that local dev ports have separate storage.

### Track A Decisions

#### Backup File Model

Use full JSON snapshots, not patch/diff files.

- `griddo-latest.json`: newest successful backup.
- `griddo-YYYY-MM-DD-HHMM.json`: dated backup for rollback/history.
- `griddo-pre-restore-YYYY-MM-DD-HHMM.json`: safety backup created before a
  replace restore or other destructive restore path.

Each backup file must be independently restorable. Dated files should not depend
on earlier files.

#### Content Hash and Dedupe

Use content-hash comparison as a core backup principle.

- Compute a stable hash from the actual backup payload.
- Exclude volatile metadata such as `exportedAt`, filename, and source origin
  from the hash.
- If the current payload hash matches the last successful backup hash, do not
  write a duplicate file.
- Auto sync should update files only when content changed.
- Manual sync should report "already up to date" when content did not change,
  unless a future explicit "force backup copy" action is added.
- Safety backup before restore/import should also skip duplicate creation when
  the current data is already represented by a successful backup.

#### Retention

Do not auto-delete dated backups in v1.5.

Hash dedupe should keep backup count reasonable, and automatic deletion could
remove the user's last useful recovery point. Future retention settings may
offer "keep all", "keep last N days", or "keep last N backups", but v1.5 keeps
all created backup files.

#### Sidebar Sync UX

Add a sidebar Sync control. In v1.5, "sync" means backup freshness, not cloud
multi-device sync.

Recommended states:

- green/check: current content hash is backed up
- yellow/clock or sync icon: local data changed and backup is pending
- blue/spinner: backup is saving
- red/warning: setup, permission, unsupported browser, or write failure needs
  user action

Manual sync:

- Click the sidebar Sync control to write a backup now.
- If auto folder writes are unavailable, manual sync falls back to a normal
  browser download.

Auto sync:

- After local data changes, wait for a debounce window such as 30 seconds.
- If content changed, update `griddo-latest.json`.
- Create a dated backup only when content differs from the last dated backup.
- If content did not change, do not write a file.

#### Capability and Fallback

Treat backup support as a capability ladder:

1. Full auto backup: File System Access API is available, a backup folder is
   selected, and write permission is active.
2. Manual file backup only: direct folder writes are unsupported or unavailable;
   sidebar becomes a backup reminder and manual sync downloads a file.
3. Broken/unavailable: permission was denied, writes fail, or payload generation
   fails; sidebar shows warning and offers retry/download fallback.

Backup failure must not block normal GridDO usage. The last successful backup
hash/timestamp remains the only trusted backup state.

Replace restore must be stricter: if the current database is not empty and a
pre-restore safety backup is required but cannot be written, restore stops
instead of deleting current data.

#### Atomic Writes

Apply atomic-write behavior where feasible.

- Write `griddo-latest.tmp.json` first, then update `griddo-latest.json` after
  the temp write succeeds.
- Dated backups are new files, so overwrite risk is lower.
- Failed writes do not update the last successful backup state.
- Restore/import accepts only files that pass JSON parsing, schema version
  checks, and content hash validation.

#### Restore and Import

Provide two separate flows:

- **Restore from backup:** replace the current GridDO database with the backup
  file. Before replacing non-empty current data, write a pre-restore safety
  backup. Restore is for disaster recovery or returning the whole app to a
  known previous state.
- **Import from backup:** keep current data and add backup data as new copies.
  This is not a true merge. All imported entities get new IDs; parent-child
  links are remapped; existing rows are not overwritten.

Import policy:

- If current payload hash exactly matches the backup hash, skip import.
- If the same backup hash was previously imported, warn that re-import will
  create duplicate copies.
- Title/path equality does not imply identity. Same-looking items are not
  auto-merged.
- Root-level imported groups should be visually distinguishable, for example
  with `(Imported)` or a date suffix.
- System nodes are reconciled rather than duplicated: imported Scratch Bits
  should attach to the current Inbox system node, and imported Archive View
  identity should not create another active Archive system node.

Do not send current data to GridDO Trash during restore. Trash remains the
in-app deletion lifecycle, not a backup staging area. Existing data needed after
restore should be recovered from the pre-restore backup through Import from
backup.

#### Backup Scope

Back up the full application data graph, not only active grid items.

Required:

- `nodes`: active, trashed, archived, and system Nodes
- `bits`: active, trashed, archived, and Scratch Bits
- `chunks`: all Chunks, including those whose parent Bit is trashed/archived
- `scratchBreakdowns`: all Breakdown/Scribble rows, including `consumedAt`
- lifecycle fields: `deletedAt`, `archivedAt`, `hiddenFromGrid`,
  `systemRole`, `pastDeadlineDismissed`
- layout/order fields: `parentId`, `level`, `x`, `y`, `order`, `createdAt`,
  `mtime`
- deadline/scheduling fields: `deadline`, `deadlineAllDay`, `time`,
  `timeAllDay`, priority/status

Recommended manifest:

- `backupFormatVersion`
- `schemaVersion` or `appSchemaVersion`
- `exportedAt`
- `sourceOrigin` as debug metadata only
- store-level row counts
- stable `contentHash`

Conditional:

- user-facing settings should be included when they exist
- internal settings, such as local migration markers, may be exported under a
  separate internal section with an explicit import policy

Exclude:

- backup folder/file handles and browser permissions
- current route, search query, drag/hover state, edit mode, and other runtime UI
  state
- backup status itself, except as manifest metadata

#### Privacy

Use plain JSON in v1.5.

The setup/restore UI should clearly communicate that the backup file contains
GridDO tasks, ideas, Scratch content, and related metadata. If the user chooses
a cloud-synced folder such as iCloud Drive, Dropbox, Google Drive, or OneDrive,
that service's storage/sync policy applies.

Encrypted/password-protected backups are deferred. Encryption introduces
password loss, key storage, auto-sync unlock, and cross-device import questions
that are larger than the immediate safety-net goal.

#### Versioning and Compatibility

Backups must be versioned.

- Include `backupFormatVersion: 1`.
- Include an application/schema version marker.
- Support known versions only.
- Older supported versions should migrate through explicit migration functions.
- Future versions, unknown required stores, and missing required fields should
  fail validation.
- Unknown optional metadata may be ignored.

### Track B: Supabase Evaluation

Supabase should be evaluated as a storage strategy, not assumed as a small
implementation swap.

Evaluate at least:

- source of truth model: Supabase-only vs IndexedDB local cache plus Supabase
  sync/backup
- authentication: required account model, anonymous/local-only mode, migration
  from existing local data
- schema mapping: Nodes, Bits, Chunks, future system nodes, archive fields, and
  scratch breakdown rows
- RLS and ownership: single-user now, multi-device later
- conflict model: how simultaneous edits or offline edits resolve
- latency model: preserve GridDO's instant drag/drop feel
- backup model: whether Supabase replaces manual backup or coexists with it

### Track B Direction

The v1.5 backup file is also the future migration input format.

Do not store the whole backup JSON blob as the primary Supabase app database.
Instead, a future migration flow should:

1. Let the user log in or create a cloud identity.
2. Let the user select a local GridDO backup JSON.
3. Validate the backup file using the same manifest/schema checks.
4. Attach the current cloud `user_id` during migration.
5. Insert or upsert rows into normalized Supabase tables such as `nodes`,
   `bits`, `chunks`, and `scratch_breakdowns`.
6. Optionally store the original backup JSON separately for audit or disaster
   recovery, but not as the canonical query model.

Backup JSON supports one-time cloud migration. It does not solve live
bidirectional sync. Real cloud sync still needs conflict resolution, revision or
mutation history, tombstones, offline queue behavior, latency policy, and
reactive subscription replacement.

## Product Language

- **Local safety net:** user-visible backup/restore protection while IndexedDB
  remains the primary v1 store.
- **Origin fragmentation:** separate browser storage per protocol/host/port.
- **Cloud sync:** server-backed storage that can survive browser data deletion
  and support cross-device use.
- **Cloud backup:** server-backed copy used mainly for recovery, not necessarily
  real-time sync.
- **Backup sync:** v1.5 local-file backup freshness. This is not cloud
  multi-device sync.
- **Restore:** replace current GridDO data with a backup file.
- **Import as copies:** add backup data as new copied entities without
  modifying existing data.

## Implementation Notes

- Preserve the existing DataStore abstraction. It exists specifically so the
  storage backend can change without rewriting UI components.
- Do not bypass Zod validation on import. Imported data must pass the same write
  boundary rules or a versioned migration step.
- Export format should include a schema/version marker so future imports can
  migrate old backups.
- Port numbers and temporary worktree paths are not durable metadata. They may
  appear in debug output but should not become stable backup identifiers.
- A persistent-storage request reduces browser-initiated eviction risk, but it
  does not protect against deliberate user/browser data clearing. It is not a
  substitute for export/import or cloud backup.
- Prefer "Restore from backup" and "Import from backup" labels over a single
  ambiguous "Import" label.
- Backup payload hashing must operate on canonical data, not volatile manifest
  metadata.
- Import as copies remaps IDs. Restore preserves IDs.
- Supabase migration can preserve IDs when importing a backup into an empty
  cloud account, but copy import should generate new IDs to avoid collisions.

## Open Questions

- What exact debounce duration should auto sync use? Current recommendation:
  30 seconds after the last data change.
- Should the sidebar label say "Sync", "Backup", or "Backup Sync"?
- Should manual sync offer an explicit "force dated copy" action when the hash
  has not changed?
- Should `settings` be restored/imported wholesale, excluded, or split into
  user-facing settings vs internal migration markers?
- What UI depth is acceptable for Import from backup preview in v1.5?
