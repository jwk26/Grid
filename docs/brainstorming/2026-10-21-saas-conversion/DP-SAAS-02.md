# DP-SAAS-02 — Demo seed for new guests (draft)

Status: approved by the owner (Task 237, Stage 1, 2026-10-31). Times: T is the copy time; `mtime` is `T − n days`, deadlines are `T + n days` with `deadline_all_day = false`. Aging and urgency are computed from these at render time, so they move while the visitor stays (aging: fresh ≤ 5 days, stagnant ≤ 11, neglected beyond; urgency 1/2/3 at ≤ 3/2/1 days).

## Rules

- Every Node and Bit cell has `x` ≥ 3 or `y` ≥ 2 at every level (reserved block, F34). The L0 cells (3,0) and (4,0), where Inbox and Archive land while the block is reserved, hold no seed item; after Task 249 they move to (0,0) and (1,0).
- Scratches belong to the guest's own Inbox. They take cells outside the reserved block (as the fixture does, not the Hook 8 sentinel (0,0)); Triage ignores their cells. Archived and trashed Bits keep their original parents. Nothing is parented to Archive.
- Language (user, 2026-10-31): one seed for every visitor, mostly Korean with some English, no variants. Counted over the 33 items inside Nodes (27 Bits, 2 sub-Nodes, 4 Scratches): 23 Korean, 10 English (7:3); on L0, 5 Korean seed Nodes and 1 English one, which with the fixed English Inbox and Archive reads 5:3. Chunks and Breakdown rows follow their parent; a Korean sentence with an English proper noun counts as Korean. Korean Node titles stay around 6 characters.
- Icons: every Node and Bit icon is in `NODE_ICON_NAMES` (a test checks it); Scratches use `sparkles`, what capture writes. Bit icons are in the Bits table. Chunks have no icon.
- Chunk `time` is set on open Chunks and on the first Chunk of "홈페이지 문구 쓰기" (a past time, T−1d); every other Chunk has no `time` (null); times are in the Bits table, never past the Bit's deadline. `time_all_day = false`.
- Hook 1: a parent's `mtime` is never older than a child's `mtime`, `archived_at` or `deleted_at`.
- Totals: 8 Nodes (+ Inbox, Archive), 27 Bits (2 archived, 1 trashed) + 4 Scratches, 10 Chunks, 11 Scratch rows, 2 staged candidates. Guest limits: 100 / 300 / 1,000 / 300.
- Covered on purpose: aging on both sides of the 5- and 11-day boundaries (5/6 and 11/12 days), urgency 1, 2, 3 and overdue, a Bit completed by Chunks and one by hand, a three-level Node tree, Korean and English titles, Trash, Archive, Scratches with open and staged Breakdown rows, and an empty Scratch.

## Nodes

| Node | Parent | Cell | Icon | Hue | mtime | Deadline | Expected state |
|---|---|---|---|---|---|---|---|
| 사이트 개편 | L0 | (6,2) | Globe | 221 | T−1d | T+9d | fresh, none |
| 팀 워크숍 | L0 | (8,2) | Users | 160 | T−4d | T+3d | fresh, urgency 1 |
| 집안일 | L0 | (10,2) | Home | 25 | T−8d | — | stagnant |
| 스페인어 | L0 | (6,4) | GraduationCap | 340 | T−14d | — | neglected |
| Reading list | L0 | (8,4) | BookOpen | 275 | T−5d | — | fresh |
| 습관 앱 | L0 | (10,4) | Rocket | 45 | T−2d | T+21d | fresh, none |
| 이사 | 집안일 (L0) | (3,0) | ListTodo | 25 | T−8d | — | stagnant |
| 짐 싸기 | 이사 (L1) | (3,1) | Box | 25 | T−8d | — | stagnant |

## Bits

| Bit | Node | Cell | Icon | Priority | mtime | Deadline | Status | Chunks | Expected state |
|---|---|---|---|---|---|---|---|---|---|
| 홈페이지 문구 쓰기 | 사이트 개편 | (3,0) | FileText | high | T−1d | T+0.83d | active | 히어로 문구 초안 (complete, time T-1d); 후기 3개 고르기 (incomplete, time T+0.42d); 문구 교정하기 (incomplete, time T+0.75d) | fresh, urgency 3 |
| 색상 팔레트 정하기 | 사이트 개편 | (4,0) | Palette | mid | T−3d | — | complete | 팔레트 3개 비교하기 (complete); 명암비 확인하기 (complete) | fresh, complete |
| Set up analytics | 사이트 개편 | (5,0) | Target | low | T−2d | T+7d | active | — | fresh, none |
| Redirect the old URLs | 사이트 개편 | (3,1) | Compass | high | T−1d | T-1d | active | — | fresh, overdue |
| 예전 로고 시안 | 사이트 개편 | (4,1) | Image | — | T−12d | — | archived T−10d | — | hidden from the Grid |
| 장소 예약하기 | 팀 워크숍 | (3,0) | Building2 | high | T−4d | T+2d | active | 후보지 3곳 추리기 (complete); 1순위 장소에 전화하기 (incomplete, time T+1.5d); 예약금 내기 (incomplete, time T+2d) | fresh, urgency 2 |
| 일정표 보내기 | 팀 워크숍 | (4,0) | CalendarDays | mid | T−4d | T+3d | active | — | fresh, urgency 1 |
| 식단 조사하기 | 팀 워크숍 | (5,0) | Coffee | low | T−4d | — | complete | — | fresh, complete |
| 지난 분기 회고 노트 | 팀 워크숍 | (3,1) | Book | — | T−20d | — | archived T−5d | — | hidden from the Grid |
| 여권 갱신하기 | 집안일 | (4,0) | Plane | high | T−8d | T+30d | active | — | stagnant, none |
| 치과 예약하기 | 집안일 | (5,0) | Heart | mid | T−8d | — | active | — | stagnant |
| 자전거 고치기 | 집안일 | (6,0) | Hammer | low | T−9d | — | active | — | stagnant |
| 우편물 전송 신청 | 이사 | (3,0) | MessageSquare | mid | T−8d | — | active | — | stagnant |
| 기존 인터넷 해지 | 이사 | (4,0) | Globe | — | T−9d | T+14d | active | — | stagnant, none |
| 책 포장하기 | 짐 싸기 | (3,0) | BookOpen | — | T−8d | — | active | — | stagnant |
| 주방 박스 라벨 붙이기 | 짐 싸기 | (4,0) | Tag | — | T−8d | — | active | — | stagnant |
| 5단원 끝내기 | 스페인어 | (3,0) | GraduationCap | mid | T−14d | — | active | — | neglected |
| 언어 교환 파트너와 연습하기 | 스페인어 | (4,0) | Users | low | T−20d | — | active | — | neglected |
| 자막 없이 한 편 보기 | 스페인어 | (5,0) | Video | low | T−16d | — | active | — | neglected |
| Finish The Pragmatic Programmer | Reading list | (3,0) | Book | mid | T−5d | — | active | — | fresh |
| Read the Postgres docs on RLS | Reading list | (4,0) | Lock | — | T−6d | — | active | — | stagnant |
| Skim the React 19 release notes | Reading list | (5,0) | Code | low | T−11d | — | active | — | stagnant |
| Reread chapter 3 of Designing Data-Intensive Applications | Reading list | (6,0) | Brain | low | T−12d | — | active | — | neglected |
| 첫 화면 스케치 | 습관 앱 | (3,0) | PenTool | mid | T−2d | T+5d | active | 종이 와이어프레임 (complete); 폰트 고르기 (incomplete, time T+4d) | fresh, none |
| Ship a landing page | 습관 앱 | (4,0) | Rocket | high | T−3d | T+14d | active | — | fresh, none |
| Write the README | 습관 앱 | (5,0) | FileText | low | T−2d | — | active | — | fresh |
| 출시 스레드 초안 | 습관 앱 | (6,0) | MessageSquare | — | T−4d | — | trashed T−2d | — | hidden from the Grid |

"색상 팔레트 정하기" is completed by its Chunks; "식단 조사하기" is completed by hand (no Chunks). Chunk times never pass their Bit's deadline; Bit deadlines never pass their Node's.

## Inbox Scratches

| Scratch | Cell | Created | Breakdown rows | Staged | Expected state |
|---|---|---|---|---|---|
| Plan the field study | (3,0) | T−45min | Review the field notes; Draft the study summary; Book the meeting room; Send the participant list; Archive the old drafts | Review the field notes → node; Draft the study summary → bit | open rows, 2 staged |
| 주말 여행 아이디어 | (4,0) | T−1.08d | 기차 시간 확인하기; 반려견 동반 숙소 찾기; 등산화 챙기기; 민수에게 차 빌릴 수 있는지 묻기 | — | open rows |
| 엄마 선물 아이디어 | (5,0) | T−3d | none (empty Scratch) | — | empty |
| Questions for Monday's stand-up | (6,0) | T−6d | Is the deploy freeze still on?; Who owns the analytics ticket? | — | open rows |
