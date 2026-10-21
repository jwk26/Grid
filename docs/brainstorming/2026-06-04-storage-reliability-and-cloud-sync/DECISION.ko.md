# 저장소 안정성과 클라우드 동기화

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

## 요약

GridDO는 현재 모든 사용자 데이터를 IndexedDB에 저장한다. 이는 기존 v1 제품 전략과 일치하지만, 실제 사용 중 두 가지 안정성 리스크가 드러났다.

- 캐시 제거 또는 브라우저 유지보수 과정에서 브라우저 저장소가 비워질 수 있고, 이때 모든 Node와 Bit가 삭제될 수 있다.
- local dev origin이 다르면 IndexedDB 저장소도 분리되므로, 포트를 바꿔 앱을 열면 서로 다른 데이터셋처럼 보인다.

현재 방향은 IndexedDB를 당장 폐기하지 않고, 즉시 적용 가능한 backup/storage safety layer를 추가하며, Supabase는 v2 storage/sync 방향으로 평가하는 것이다.

## 현재 방향

IndexedDB를 즉시 버리지 않는다. 먼저 실제 로컬 백업 파일을 중심으로 v1.5 safety net을 추가한다.

- 브라우저 관리 IndexedDB 밖에 저장되는 JSON backup 파일
- freshness/status indicator가 있는 sidebar Sync control
- manual sync와 auto sync
- restore/import flow
- 지원되는 경우 `navigator.storage.persist()`를 통한 persistent storage 요청
- port-specific data separation이 명확히 드러나는 debug/dev surface의 origin 표시
- fixed-origin local development guidance 문서화

Supabase는 여전히 중요한 v2 후보지만, canonical storage source가 되기 전에 평가가 필요하다. full migration은 auth, schema, row ownership, RLS, import/migration flow, latency policy, offline behavior, reactive read subscription까지 건드릴 가능성이 높다.

v1.5 backup file format은 migration-ready여야 한다. raw Dexie dump가 아니라 canonical GridDO entity를 표현해야 하며, 향후 Supabase migration은 이 backup JSON을 input file로 사용한 뒤 normalized cloud table로 풀어 넣을 수 있어야 한다.

## 문제

기존 PRD는 이미 browser-local data loss와 cross-device 부재를 리스크로 명시한다. 사용자는 cache removal 또는 Chrome update/maintenance 이후 실제로 data-loss case를 경험했다.

IndexedDB origin separation도 local development에서 혼란을 만든다. 예를 들어 `http://localhost:3000`에서 만든 데이터는 `http://localhost:3001`에서 보이지 않는다. 이는 IndexedDB storage가 port를 포함한 origin 단위로 scope되기 때문에 발생하는 정상 브라우저 동작이다.

## Decision Tracks

### Track A: Safety Net First

가장 작고 유용한 단계:

1. complete local database를 versioned full JSON snapshot으로 export한다.
2. 브라우저가 direct file write를 지원할 때 사용자가 backup folder를 선택할 수 있게 한다.
3. local data가 backed up, pending, saving, failed 중 어떤 상태인지 보여주는 sidebar Sync button을 추가한다.
4. folder permission이 있을 때 실제 파일을 쓰는 auto sync를 추가한다.
5. manual sync는 즉시 파일을 쓰고, direct folder write가 불가능하면 browser download로 fallback한다.
6. validation, preview, safety backup을 포함한 restore/import flow를 추가한다.
7. 앱 초기화 시점 또는 사용자가 local backup safety를 켤 때 persistent browser storage를 요청한다.
8. `/debug-indexeddb` 또는 equivalent settings surface에서 current origin을 보여주고 local dev port마다 storage가 분리된다는 점을 설명한다.

### Track A Decisions

#### Backup File Model

patch/diff file이 아니라 full JSON snapshot을 사용한다.

- `griddo-latest.json`: 가장 최신의 successful backup.
- `griddo-YYYY-MM-DD-HHMM.json`: rollback/history를 위한 dated backup.
- `griddo-pre-restore-YYYY-MM-DD-HHMM.json`: replace restore 또는 destructive restore path 전에 생성되는 safety backup.

각 backup file은 독립적으로 restore 가능해야 한다. dated file이 이전 파일에 의존하면 안 된다.

#### Content Hash and Dedupe

content-hash comparison을 backup 기능의 핵심 원칙으로 사용한다.

- 실제 backup payload에서 stable hash를 계산한다.
- `exportedAt`, filename, source origin 같은 volatile metadata는 hash 대상에서 제외한다.
- current payload hash가 last successful backup hash와 같으면 duplicate file을 쓰지 않는다.
- auto sync는 content가 바뀐 경우에만 파일을 갱신한다.
- manual sync는 content가 바뀌지 않았으면 "already up to date"를 보고한다. 향후 명시적인 "force backup copy" action이 추가될 수 있다.
- restore/import 전 safety backup도 현재 데이터가 이미 successful backup으로 대표될 수 있으면 duplicate creation을 건너뛴다.

#### Retention

v1.5에서는 dated backup을 자동 삭제하지 않는다.

Hash dedupe가 backup count를 합리적으로 낮게 유지할 것이고, automatic deletion은 사용자의 마지막 useful recovery point를 제거할 수 있다. 향후 retention settings에서 "keep all", "keep last N days", "keep last N backups" 같은 옵션을 제공할 수 있지만, v1.5는 생성된 backup file을 모두 보존한다.

#### Sidebar Sync UX

sidebar Sync control을 추가한다. v1.5에서 "sync"는 cloud multi-device sync가 아니라 backup freshness를 의미한다.

Recommended states:

- green/check: current content hash가 backed up 상태
- yellow/clock 또는 sync icon: local data가 변경되었고 backup pending
- blue/spinner: backup saving
- red/warning: setup, permission, unsupported browser, write failure 등 user action 필요

Manual sync:

- sidebar Sync control을 클릭하면 즉시 backup을 쓴다.
- auto folder write가 불가능하면 normal browser download로 fallback한다.

Auto sync:

- local data 변경 이후 30초 같은 debounce window를 기다린다.
- content가 바뀌었으면 `griddo-latest.json`을 업데이트한다.
- dated backup은 content가 last dated backup과 다를 때만 생성한다.
- content가 바뀌지 않았으면 파일을 쓰지 않는다.

#### Capability and Fallback

backup support를 capability ladder로 다룬다.

1. Full auto backup: File System Access API 사용 가능, backup folder 선택됨, write permission 활성.
2. Manual file backup only: direct folder write가 unsupported 또는 unavailable. sidebar는 backup reminder가 되고 manual sync는 file을 download한다.
3. Broken/unavailable: permission denied, write fail, payload generation fail. sidebar는 warning을 보여주고 retry/download fallback을 제공한다.

Backup failure는 normal GridDO usage를 막으면 안 된다. last successful backup hash/timestamp만 trusted backup state로 본다.

Replace restore는 더 엄격해야 한다. current database가 비어 있지 않고 pre-restore safety backup이 필요하지만 쓸 수 없다면, current data를 삭제하지 않고 restore를 중단한다.

#### Atomic Writes

가능한 범위에서 atomic-write behavior를 적용한다.

- 먼저 `griddo-latest.tmp.json`에 쓰고, temp write가 성공한 뒤 `griddo-latest.json`을 갱신한다.
- Dated backups는 새 파일이므로 overwrite risk가 낮다.
- Failed writes는 last successful backup state를 업데이트하지 않는다.
- Restore/import는 JSON parsing, schema version checks, content hash validation을 통과한 파일만 허용한다.

#### Restore and Import

두 개의 flow를 분리해서 제공한다.

- **Restore from backup:** current GridDO database를 backup file로 교체한다. non-empty current data를 replace하기 전에 pre-restore safety backup을 쓴다. Restore는 disaster recovery 또는 app 전체를 known previous state로 되돌리기 위한 기능이다.
- **Import from backup:** current data를 유지하고 backup data를 new copies로 추가한다. true merge가 아니다. 모든 imported entity는 new ID를 받고, parent-child link는 remap되며, existing row는 overwrite되지 않는다.

Import policy:

- current payload hash가 backup hash와 정확히 같으면 import를 skip한다.
- 같은 backup hash가 이전에 import된 적 있으면 re-import가 duplicate copies를 만든다고 warning한다.
- title/path equality는 identity를 의미하지 않는다. 동일하게 보이는 item도 auto-merge하지 않는다.
- root-level imported group은 `(Imported)` 또는 date suffix 등으로 시각적으로 구분 가능해야 한다.
- System node는 duplicate하지 않고 reconcile한다. imported Scratch Bits는 current Inbox system node에 attach하고, imported Archive View identity가 또 다른 active Archive system node를 만들면 안 된다.

Restore 중 current data를 GridDO Trash로 보내지 않는다. Trash는 in-app deletion lifecycle이지 backup staging area가 아니다. Restore 이후 기존 data가 필요하면 pre-restore backup을 Import from backup으로 가져온다.

#### Backup Scope

active grid item만이 아니라 full application data graph를 back up한다.

Required:

- `nodes`: active, trashed, archived, system Nodes
- `bits`: active, trashed, archived, Scratch Bits
- `chunks`: parent Bit이 trashed/archived인 경우를 포함한 모든 Chunks
- `scratchBreakdowns`: `consumedAt`을 포함한 모든 Breakdown/Scribble rows
- lifecycle fields: `deletedAt`, `archivedAt`, `hiddenFromGrid`, `systemRole`, `pastDeadlineDismissed`
- layout/order fields: `parentId`, `level`, `x`, `y`, `order`, `createdAt`, `mtime`
- deadline/scheduling fields: `deadline`, `deadlineAllDay`, `time`, `timeAllDay`, priority/status

Recommended manifest:

- `backupFormatVersion`
- `schemaVersion` 또는 `appSchemaVersion`
- `exportedAt`
- debug metadata로서의 `sourceOrigin`
- store-level row counts
- stable `contentHash`

Conditional:

- user-facing settings가 존재하면 포함해야 한다.
- local migration marker 같은 internal settings는 별도 internal section으로 export하고 explicit import policy를 둔다.

Exclude:

- backup folder/file handles와 browser permissions
- current route, search query, drag/hover state, edit mode 등 runtime UI state
- manifest metadata를 제외한 backup status 자체

#### Privacy

v1.5에서는 plain JSON을 사용한다.

setup/restore UI는 backup file에 GridDO tasks, ideas, Scratch content, related metadata가 포함된다는 점을 명확히 알려야 한다. 사용자가 iCloud Drive, Dropbox, Google Drive, OneDrive 같은 cloud-synced folder를 선택하면 해당 서비스의 storage/sync policy가 적용된다.

Encrypted/password-protected backups는 defer한다. Encryption은 password loss, key storage, auto-sync unlock, cross-device import question을 만들며, immediate safety-net goal보다 큰 문제다.

#### Versioning and Compatibility

Backups는 versioned여야 한다.

- `backupFormatVersion: 1`을 포함한다.
- application/schema version marker를 포함한다.
- known version만 지원한다.
- older supported version은 explicit migration function을 통해 migrate한다.
- future version, unknown required store, missing required field는 validation failure로 처리한다.
- unknown optional metadata는 안전한 경우 무시할 수 있다.

### Track B: Supabase Evaluation

Supabase는 small implementation swap으로 가정하지 않고 storage strategy로 평가해야 한다.

평가 항목:

- source of truth model: Supabase-only vs IndexedDB local cache plus Supabase sync/backup
- authentication: required account model, anonymous/local-only mode, existing local data migration
- schema mapping: Nodes, Bits, Chunks, future system nodes, archive fields, scratch breakdown rows
- RLS and ownership: single-user now, multi-device later
- conflict model: simultaneous edits 또는 offline edits 처리
- latency model: GridDO의 instant drag/drop feel 보존
- backup model: Supabase가 manual backup을 대체하는지, 함께 존재하는지

### Track B Direction

v1.5 backup file은 future migration input format이기도 하다.

whole backup JSON blob을 primary Supabase app database로 저장하지 않는다. 대신 future migration flow는 다음과 같아야 한다.

1. 사용자가 login하거나 cloud identity를 만든다.
2. 사용자가 local GridDO backup JSON을 선택한다.
3. 동일한 manifest/schema checks로 backup file을 validate한다.
4. migration 중 current cloud `user_id`를 attach한다.
5. `nodes`, `bits`, `chunks`, `scratch_breakdowns` 같은 normalized Supabase tables에 rows를 insert 또는 upsert한다.
6. 원본 backup JSON은 audit 또는 disaster recovery 용도로 별도 저장할 수 있지만, canonical query model로 사용하지 않는다.

Backup JSON은 one-time cloud migration을 지원한다. live bidirectional sync는 해결하지 않는다. Real cloud sync는 conflict resolution, revision 또는 mutation history, tombstones, offline queue behavior, latency policy, reactive subscription replacement가 별도로 필요하다.

## Product Language

- **Local safety net:** IndexedDB가 v1 primary store로 남아 있는 동안 사용자에게 보이는 backup/restore protection.
- **Origin fragmentation:** protocol/host/port별로 분리되는 browser storage.
- **Cloud sync:** browser data deletion을 견디고 cross-device use를 지원하는 server-backed storage.
- **Cloud backup:** recovery를 주목적으로 하는 server-backed copy. 반드시 real-time sync는 아니다.
- **Backup sync:** v1.5 local-file backup freshness. cloud multi-device sync가 아니다.
- **Restore:** current GridDO data를 backup file로 replace한다.
- **Import as copies:** existing data를 수정하지 않고 backup data를 new copied entities로 추가한다.

## Implementation Notes

- 기존 DataStore abstraction을 보존한다. 이 abstraction은 UI component rewrite 없이 storage backend를 바꾸기 위해 존재한다.
- import 시 Zod validation을 우회하지 않는다. Imported data는 동일한 write boundary rules 또는 versioned migration step을 통과해야 한다.
- export format에는 old backup을 migrate할 수 있도록 schema/version marker가 포함되어야 한다.
- port number와 temporary worktree path는 durable metadata가 아니다. debug output에는 나타날 수 있지만 stable backup identifier가 되어서는 안 된다.
- persistent-storage request는 browser-initiated eviction risk를 줄이지만 deliberate user/browser data clearing을 막지 못한다. export/import 또는 cloud backup의 대체물이 아니다.
- 하나의 모호한 "Import" label보다 "Restore from backup"과 "Import from backup" label을 선호한다.
- Backup payload hashing은 volatile manifest metadata가 아니라 canonical data에 대해 수행해야 한다.
- Import as copies는 ID를 remap한다. Restore는 ID를 preserve한다.
- Supabase migration은 empty cloud account에 backup을 import할 때 ID를 preserve할 수 있지만, copy import는 collision을 피하기 위해 new ID를 생성해야 한다.

## Open Questions

- auto sync의 정확한 debounce duration은 얼마로 할 것인가? 현재 추천: 마지막 data change 후 30초.
- sidebar label은 "Sync", "Backup", "Backup Sync" 중 무엇으로 할 것인가?
- manual sync가 hash가 바뀌지 않았을 때도 explicit "force dated copy" action을 제공해야 하는가?
- `settings`는 wholesale restore/import할 것인가, exclude할 것인가, user-facing settings와 internal migration markers로 나눌 것인가?
- v1.5의 Import from backup preview는 어느 정도 UI depth까지 허용할 것인가?
