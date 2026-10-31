# DP-SAAS-02 — Demo seed for new guests

Status: approved by the owner (Task 237, Stage 1, 2026-10-31); reworked five times on 2026-10-31 after the visual checks: for placement (the Bits crowded the left near the breadcrumb), for quantity (the seed was too thin), for grouping and the per-Grid counts, for the L0 count (15 Nodes, each with sub-Nodes), and for an irregular, evenly spread seed with signs of use (user, advisory reviews at the Task finish). The fifth rework awaits the owner's visual check.

Times: T is the copy time; `mtime` is `T − n days`, deadlines are `T + n days` with `deadline_all_day = false`. Aging and urgency are computed from these at render time, so they move while the visitor stays (aging: fresh ≤ 5 days, stagnant ≤ 11, neglected beyond; urgency 1/2/3 at ≤ 3/2/1 days).

## Rules

- **Reserved block:** every Node and Bit cell has `x` ≥ 3 or `y` ≥ 2 at every level (F34). The L0 cells (3,0) and (4,0), where Inbox and Archive land while the block is reserved, hold no seed item; after Task 249 they move to (0,0) and (1,0).
- **Placement (SPEC `/grid/[nodeId]` Level 1-2 content):** inside a Node, sub-Nodes fill the left zone with no gap, row by row from (2,2) (`x` 2 to 7 on `y` 2, a seventh at (2,3)), related ones adjacent; Bits fill the right zone in two columns at `x` 9 and 13 (a Bit card spans two cells, so 9–10 and 13–14), from `y` 1 with no empty row in a column, the first half of a list in the `x` 9 column and the rest in the `x` 13 column, so related Bits stay together. The columns stay at 9 and 13 until the `2026-10-31-grid-bit-card-footprint` phase, since a Bit card still grows with its title. A Node at level 2 holds Bits only. On L0, related Nodes sit next to each other in four blocks with one empty cell between blocks (blocks at `x` 5–6, 8–10 and 12–13, rows `y` 2–3 and 5–6), outside the reserved block and (3,0), (4,0): work and projects (사이트 개편, 팀 워크숍, 습관 앱, Open source); home, money and health (집안일, 가계부, 재테크, 건강검진, 운동); learning (Reading list, 스페인어); leisure (Travel, 캠핑, Photography, Cooking).
- **Shape:** 15 L0 seed Nodes (10 Korean, 5 English; with Inbox and Archive 10:7); every one holds at least 2 sub-Nodes and has at least one branch down to level 2. The four Nodes a visitor opens first (사이트 개편, 팀 워크숍, 집안일, Reading list) hold seven sub-Nodes each and have 2 to 3 such branches; 20 of the 50 level-1 Nodes (40%) hold sub-Nodes; 20 Nodes sit at level 2. Bit counts are irregular, not repeated: 11, 8, 12, 9 inside the four Nodes (8 to 14), 1 to 8 inside a level-1 Node, 1 to 5 inside a level-2 Node, 2 to 6 inside the other L0 Nodes. A Node's Bit count includes an archived or trashed Bit it holds.
- **Totals:** 85 Nodes (+ Inbox, Archive), 260 Bits (2 archived, 1 trashed) + 7 Scratches, 85 Chunks, 21 Scratch rows, 3 staged candidates. Guest limits: 100 / 300 / 1,000 / 300.
- **Signs of use:** 52 completed Bits (by hand, or because all their Chunks are done: Hook 3); 69 deadlines, 4 of them overdue and 20 within three days (every deadline inside its Node's, Hook 2; a completed Bit keeps at most a future one); 24 Bits carry 85 Chunks, 10 of them in progress and the others all done or not started; 15 Bits carry a short description; 15 Nodes below L0 have not been touched for over two weeks while 38 were touched within five days (Hook 1); 7 Scratches with 21 Breakdown rows, 6 of them consumed (a consumed row is never the source of a staged candidate, Hook 13).
- **Language (user, 2026-10-31):** one seed for every visitor, mostly Korean with some English, no variants. Inside Nodes (70 sub-Nodes, 260 Bits, 7 Scratches = 337 items): 227 Korean, 110 English (about 7:3). Chunks and Breakdown rows follow their parent; a Korean sentence with an English proper noun counts as Korean. Korean Node titles stay around 6 characters; Bit titles stay within 14 Korean or 24 English characters.
- **Icons:** every Node and Bit icon is in `NODE_ICON_NAMES` (a test checks it); Scratches use `sparkles`, what capture writes.
- **Chunks:** 24 Bits carry 85 Chunks (two to four each, with the generic steps `자료 모으기 / 초안 쓰기 / 검토 받기 / 마무리하기` or their English forms, and a few specific ones); an open Chunk of a Bit with a deadline carries a `time` not past it; every other Chunk has none; `time_all_day = false`. A Bit whose Chunks are all complete is complete; with an open Chunk it is active (Hook 3).
- **Hook 1:** a Node's `mtime` is the newest `mtime`, `archived_at` or `deleted_at` of what it holds (Nodes and Bits); a Node's deadline is the latest deadline below it (Hook 2), or none.
- **Scratches** belong to the guest's own Inbox and take cells (3,0)–(9,0) outside the reserved block (as the fixture does, not the Hook 8 sentinel); Triage ignores their cells. Archived and trashed Bits keep their original parents; nothing is parented to Archive.
- **Covered on purpose:** aging on both sides of the 5- and 11-day boundaries (the four Reading list Bits at 5, 6, 11 and 12 days), urgency 1, 2, 3 and overdue, a Bit completed by Chunks ("색상 팔레트 정하기") and one by hand ("식단 조사하기"), a three-level Node tree, Korean and English titles, Trash, Archive, Scratches with open, consumed and staged Breakdown rows, and an empty Scratch.

## Nodes

| Node | Parent | Cell | Icon | mtime | Deadline | Expected state |
|---|---|---|---|---|---|---|
| 사이트 개편 | L0 | (5,2) | Globe | T−0.5d | T+14d | fresh |
| 디자인 | 사이트 개편 (L0) | (2,2) | Palette | T−0.5d | T+5d | fresh |
| 개발 | 사이트 개편 (L0) | (3,2) | Code | T−0.5d | T+10d | fresh |
| Frontend | 개발 (L1) | (2,2) | Layers | T−0.5d | T+10d | fresh |
| 콘텐츠 | 사이트 개편 (L0) | (4,2) | FileText | T−0.5d | T+14d | fresh |
| 블로그 | 콘텐츠 (L1) | (2,2) | PenTool | T−0.5d | T+14d | fresh |
| 마케팅 | 사이트 개편 (L0) | (5,2) | Zap | T−0.5d | — | fresh |
| 운영 | 사이트 개편 (L0) | (6,2) | Settings | T−15d | — | neglected |
| 법무 | 사이트 개편 (L0) | (7,2) | Lock | T−15d | T+1d | neglected, urgency 3 |
| 분석 | 사이트 개편 (L0) | (2,3) | Compass | T−15d | — | neglected |
| 팀 워크숍 | L0 | (6,2) | Users | T−4d | T+3d | fresh, urgency 1 |
| 장소 | 팀 워크숍 (L0) | (2,2) | Building2 | T−4d | T+3d | fresh, urgency 1 |
| 현장 점검 | 장소 (L1) | (2,2) | ClipboardList | T−4d | — | fresh |
| 프로그램 | 팀 워크숍 (L0) | (3,2) | Target | T−4d | T+1d | fresh, urgency 3 |
| 팀 게임 | 프로그램 (L1) | (2,2) | Gamepad2 | T−4d | T+0.5d | fresh, urgency 3 |
| 예산 | 팀 워크숍 (L0) | (4,2) | Wallet | T−4d | — | fresh |
| 교통 | 팀 워크숍 (L0) | (5,2) | Car | T−4d | — | fresh |
| 식사 | 팀 워크숍 (L0) | (6,2) | Coffee | T−4d | — | fresh |
| 준비물 | 팀 워크숍 (L0) | (7,2) | Box | T−4d | T+1.5d | fresh, urgency 2 |
| 후속 | 팀 워크숍 (L0) | (2,3) | Star | T−4d | T+2d | fresh, urgency 2 |
| 집안일 | L0 | (8,2) | Home | T−6d | T+60d | stagnant |
| 이사 | 집안일 (L0) | (2,2) | ListTodo | T−6d | T+14d | stagnant |
| 짐 싸기 | 이사 (L1) | (2,2) | Box | T−6d | T+6d | stagnant |
| 청소 | 집안일 (L0) | (3,2) | Hammer | T−6d | T+14d | stagnant |
| 대청소 | 청소 (L1) | (2,2) | FolderOpen | T−6d | — | stagnant |
| 장보기 | 집안일 (L0) | (4,2) | ShoppingCart | T−6d | T+21d | stagnant |
| 수리 | 집안일 (L0) | (5,2) | Hammer | T−15d | — | neglected |
| 요리 | 집안일 (L0) | (6,2) | Coffee | T−6d | T+30d | stagnant |
| 밑반찬 | 요리 (L1) | (2,2) | Coffee | T−6d | — | stagnant |
| 행정 | 집안일 (L0) | (7,2) | ClipboardList | T−15d | — | neglected |
| 정리 | 집안일 (L0) | (2,3) | FolderOpen | T−15d | T+45d | neglected |
| Reading list | L0 | (12,2) | BookOpen | T−5d | T+7d | fresh |
| Tech books | Reading list (L0) | (2,2) | Book | T−12d | — | neglected |
| Databases | Tech books (L1) | (2,2) | Layers | T−12d | — | neglected |
| Fiction | Reading list (L0) | (3,2) | Bookmark | T−6d | — | stagnant |
| Podcasts | Reading list (L0) | (4,2) | Headphones | T−6d | T+7d | stagnant |
| Articles | Reading list (L0) | (5,2) | FileText | T−6d | — | stagnant |
| Backlog | Articles (L1) | (2,2) | FolderOpen | T−6d | — | stagnant |
| Papers | Reading list (L0) | (6,2) | ClipboardList | T−15d | — | neglected |
| Wishlist | Reading list (L0) | (7,2) | Gift | T−15d | — | neglected |
| Newsletters | Reading list (L0) | (2,3) | MessageSquare | T−15d | — | neglected |
| 스페인어 | L0 | (13,2) | GraduationCap | T−14d | T+55d | neglected |
| 문법 | 스페인어 (L0) | (2,2) | Book | T−14d | T+2d | neglected, urgency 2 |
| 동사 변화 | 문법 (L1) | (2,2) | Book | T−14d | T+2d | neglected, urgency 2 |
| 듣기 | 스페인어 (L0) | (3,2) | Headphones | T−14d | T+5d | neglected |
| 습관 앱 | L0 | (5,3) | Rocket | T−2d | T+14d | fresh |
| 기획 | 습관 앱 (L0) | (2,2) | ClipboardList | T−2d | T+8d | fresh |
| 화면 | 습관 앱 (L0) | (3,2) | PenTool | T−2d | T+12d | fresh |
| 아이콘 | 화면 (L1) | (2,2) | Image | T−2d | — | fresh |
| 운동 | L0 | (9,3) | Dumbbell | T−1d | T+25d | fresh |
| 러닝 | 운동 (L0) | (2,2) | Timer | T−1d | T+18d | fresh |
| 대회 준비 | 러닝 (L1) | (2,2) | Target | T−1d | — | fresh |
| 근력 | 운동 (L0) | (3,2) | Dumbbell | T−1d | T+25d | fresh |
| 재테크 | L0 | (10,2) | Wallet | T−6d | T+20d | stagnant |
| 연금 | 재테크 (L0) | (2,2) | Diamond | T−6d | T+2d | stagnant, urgency 2 |
| 개인연금 | 연금 (L1) | (2,2) | Diamond | T−6d | — | stagnant |
| 보험 | 재테크 (L0) | (3,2) | Lock | T−6d | — | stagnant |
| 가계부 | L0 | (9,2) | Calculator | T−0.5d | T+55d | fresh |
| 고정비 | 가계부 (L0) | (2,2) | CreditCard | T−0.5d | T+55d | fresh |
| 구독 | 고정비 (L1) | (2,2) | Video | T−0.5d | — | fresh |
| 변동비 | 가계부 (L0) | (3,2) | ShoppingCart | T−0.5d | T+2d | fresh, urgency 2 |
| 건강검진 | L0 | (8,3) | Heart | T−6d | T+8d | stagnant |
| 치과 | 건강검진 (L0) | (2,2) | Heart | T−6d | — | stagnant |
| 치료 기록 | 치과 (L1) | (2,2) | ClipboardList | T−6d | — | stagnant |
| 안과 | 건강검진 (L0) | (3,2) | Image | T−6d | T+8d | stagnant |
| 캠핑 | L0 | (6,5) | Compass | T−15d | T+18d | neglected |
| 장비 | 캠핑 (L0) | (2,2) | Box | T−15d | T+2d | neglected, urgency 2 |
| 쿨러 | 장비 (L1) | (2,2) | Box | T−15d | T+2d | neglected, urgency 2 |
| 장소 | 캠핑 (L0) | (3,2) | Map | T−15d | T+18d | neglected |
| Travel | L0 | (5,5) | Plane | T−3d | T+40d | fresh |
| Japan | Travel (L0) | (2,2) | Map | T−3d | T+25d | fresh |
| Kyoto | Japan (L1) | (2,2) | Compass | T−3d | — | fresh |
| Lisbon | Travel (L0) | (3,2) | Camera | T−3d | T+40d | fresh |
| Cooking | L0 | (6,6) | Coffee | T−0.5d | T+55d | fresh |
| Weeknight | Cooking (L0) | (2,2) | Flame | T−0.5d | — | fresh |
| Soups | Weeknight (L1) | (2,2) | Coffee | T−0.5d | — | fresh |
| Baking | Cooking (L0) | (3,2) | Coffee | T−0.5d | T+2d | fresh, urgency 2 |
| Photography | L0 | (5,6) | Camera | T−15d | T+5d | neglected |
| Portraits | Photography (L0) | (2,2) | Image | T−15d | T+5d | neglected |
| Lighting | Portraits (L1) | (2,2) | Lightbulb | T−15d | T+5d | neglected |
| Landscapes | Photography (L0) | (3,2) | Map | T−15d | — | neglected |
| Open source | L0 | (6,3) | Code | T−6d | T+12d | stagnant |
| Docs | Open source (L0) | (2,2) | FileText | T−6d | — | stagnant |
| Examples | Docs (L1) | (2,2) | Code | T−6d | — | stagnant |
| Releases | Open source (L0) | (3,2) | Rocket | T−6d | T+12d | stagnant |

## Bits

| Node | Bit | Cell | Icon | Priority | mtime | Deadline | Status | Chunks | Note | Expected state |
|---|---|---|---|---|---|---|---|---|---|---|
| 디자인 | 로고 최종본 고르기 | (9,1) | FileText | high | T−0.5d | — | active | — | — | fresh |
| 디자인 | 아이콘 세트 정리 | (9,2) | Target | mid | T−1d | — | active | — | — | fresh |
| 디자인 | 모바일 시안 검토 | (13,1) | Pin | low | T−2d | T+5d | active | — | — | fresh |
| 디자인 | 예전 로고 시안 | (13,2) | Star | — | T−12d | — | archived T−10d | — | — | hidden from the Grid |
| Frontend | Build the header | (9,1) | Lightbulb | mid | T−0.5d | T+7d | active | — | — | fresh |
| Frontend | Lazy load images | (9,2) | Tag | — | T−1d | — | active | — | — | fresh |
| Frontend | Check dark mode | (13,1) | Bookmark | low | T−2d | — | active | Gather the notes (complete); Draft it (complete); Get a review (incomplete); Wrap it up (incomplete) | — | fresh |
| Frontend | Audit the bundle size | (13,2) | ClipboardList | high | T−3d | T+10d | active | — | — | fresh |
| 개발 | Redirect the old URLs | (9,1) | Zap | high | T−1d | T−1d | active | — | description | fresh, overdue |
| 개발 | Set up analytics | (9,2) | Heart | low | T−2d | T+7d | active | — | — | fresh |
| 개발 | Audit the CI pipeline | (9,3) | FileText | mid | T−2d | — | complete | — | — | fresh, complete |
| 개발 | Update dependencies | (13,1) | Target | low | T−3d | — | active | — | — | fresh |
| 개발 | Cut the build time | (13,2) | Pin | — | T−4d | — | active | — | — | fresh |
| 블로그 | 첫 글 초안 | (9,1) | Star | mid | T−0.5d | T+14d | active | — | — | fresh |
| 콘텐츠 | 소개 글 다듬기 | (9,1) | Lightbulb | — | T−0.5d | — | active | — | — | fresh |
| 콘텐츠 | 사례 3개 정리 | (9,2) | Tag | low | T−1d | — | active | — | — | fresh |
| 콘텐츠 | 블로그 일정 잡기 | (9,3) | Bookmark | high | T−2d | — | active | — | — | fresh |
| 콘텐츠 | 보도 자료 확인 | (13,1) | ClipboardList | mid | T−3d | — | complete | — | — | fresh, complete |
| 콘텐츠 | 번역 감수 | (13,2) | Zap | low | T−4d | — | active | — | — | fresh |
| 콘텐츠 | 이미지 라이선스 확인 | (13,3) | Heart | — | T−5d | — | active | — | — | fresh |
| 콘텐츠 | 삭제한 소개 초안 | (13,4) | FileText | mid | T−4d | — | trashed T−2d | — | — | hidden from the Grid |
| 마케팅 | 뉴스레터 초안 | (9,1) | Target | — | T−0.5d | — | active | — | — | fresh |
| 마케팅 | SNS 이미지 만들기 | (13,1) | Pin | low | T−1d | — | complete | — | — | fresh, complete |
| 운영 | 장애 연락망 정리 | (9,1) | Star | high | T−15d | — | active | — | — | neglected |
| 법무 | 약관 검토 요청 | (9,1) | Lightbulb | mid | T−15d | T+1d | active | 자료 모으기 (incomplete, time T+0.5d); 초안 쓰기 (incomplete, time T+0.5d); 검토 받기 (incomplete, time T+0.5d) | — | neglected, urgency 3 |
| 법무 | 저작권 표기 확인 | (9,2) | Tag | low | T−18d | — | active | — | — | neglected |
| 법무 | 개인정보 동의 문구 | (13,1) | Bookmark | — | T−21d | — | active | — | — | neglected |
| 분석 | 전환 목표 정하기 | (9,1) | ClipboardList | mid | T−15d | — | complete | — | — | neglected, complete |
| 분석 | 방문자 대시보드 | (9,2) | Zap | — | T−18d | — | active | — | — | neglected |
| 분석 | 주간 리포트 틀 | (13,1) | Heart | low | T−21d | — | active | — | — | neglected |
| 사이트 개편 | 홈페이지 문구 쓰기 | (9,1) | FileText | high | T−1d | T+0.83d | active | 히어로 문구 초안 (complete, time T−1d); 후기 3개 고르기 (incomplete, time T+0.42d); 문구 교정하기 (incomplete, time T+0.75d) | description | fresh, urgency 3 |
| 사이트 개편 | 색상 팔레트 정하기 | (9,2) | Target | mid | T−3d | — | complete | 팔레트 3개 비교하기 (complete); 명암비 확인하기 (complete) | — | fresh, complete |
| 사이트 개편 | 사이트맵 정리 | (9,3) | Pin | high | T−2d | — | active | — | — | fresh |
| 사이트 개편 | 접근성 점검 | (9,4) | Star | mid | T−3d | T+1d | active | — | — | fresh, urgency 3 |
| 사이트 개편 | 메타 태그 점검 | (9,5) | Lightbulb | low | T−4d | — | complete | — | — | fresh, complete |
| 사이트 개편 | 푸터 링크 정리 | (9,6) | Tag | — | T−5d | — | active | — | — | fresh |
| 사이트 개편 | 쿠키 안내 문구 | (13,1) | Bookmark | mid | T−0.5d | T+2d | active | — | — | fresh, urgency 2 |
| 사이트 개편 | 404 페이지 만들기 | (13,2) | ClipboardList | — | T−1d | T+1d | complete | 자료 모으기 (complete); 초안 쓰기 (complete); 검토 받기 (complete); 마무리하기 (complete) | — | fresh, urgency 3, complete |
| 사이트 개편 | 파비콘 교체 | (13,3) | Zap | low | T−2d | — | active | — | — | fresh |
| 사이트 개편 | 배포 일정 공유 | (13,4) | Heart | high | T−3d | — | complete | — | — | fresh, complete |
| 사이트 개편 | 검색 노출 확인 | (13,5) | FileText | mid | T−4d | T+3d | active | — | — | fresh, urgency 1 |
| 현장 점검 | 비상구 위치 확인 | (9,1) | Target | low | T−4d | — | active | — | — | fresh |
| 현장 점검 | 와이파이 확인 | (13,1) | Pin | — | T−5d | — | active | — | — | fresh |
| 장소 | 장소 예약하기 | (9,1) | Star | high | T−4d | T+2d | active | 후보지 3곳 추리기 (complete); 1순위 장소에 전화하기 (incomplete, time T+1.5d); 예약금 내기 (incomplete, time T+2d) | description | fresh, urgency 2 |
| 장소 | 현장 답사 일정 | (9,2) | Lightbulb | mid | T−5d | — | complete | 자료 모으기 (complete); 초안 쓰기 (complete); 검토 받기 (complete); 마무리하기 (complete) | — | fresh, complete |
| 장소 | 주차 안내 확인 | (13,1) | Tag | — | T−4d | — | complete | — | — | fresh, complete |
| 장소 | 방 구성 확인 | (13,2) | Bookmark | low | T−5d | T+3d | active | — | — | fresh, urgency 1 |
| 장소 | 지난 분기 회고 노트 | (13,3) | ClipboardList | high | T−20d | — | archived T−5d | — | — | hidden from the Grid |
| 팀 게임 | 규칙 정리 | (9,1) | Zap | mid | T−4d | — | active | — | — | fresh |
| 팀 게임 | 도구 준비 | (9,2) | Heart | low | T−5d | — | complete | — | — | fresh, complete |
| 팀 게임 | 심판 정하기 | (13,1) | FileText | — | T−4d | T+0.5d | active | 자료 모으기 (complete); 초안 쓰기 (complete); 검토 받기 (incomplete, time T+0.25d); 마무리하기 (incomplete, time T+0.25d) | — | fresh, urgency 3 |
| 팀 게임 | 점수판 만들기 | (13,2) | Target | mid | T−5d | — | active | — | — | fresh |
| 프로그램 | 전체 시간표 짜기 | (9,1) | Pin | — | T−4d | T+0.5d | active | — | — | fresh, urgency 3 |
| 프로그램 | 진행자 정하기 | (9,2) | Star | low | T−5d | — | complete | — | — | fresh, complete |
| 프로그램 | 대체 프로그램 | (9,3) | Lightbulb | high | T−4d | — | active | — | — | fresh |
| 프로그램 | 시상 계획 | (13,1) | Tag | mid | T−5d | — | active | — | — | fresh |
| 프로그램 | 사진 담당 정하기 | (13,2) | Bookmark | low | T−4d | T+1d | active | — | — | fresh, urgency 3 |
| 예산 | 항목별 견적 받기 | (9,1) | ClipboardList | — | T−4d | — | active | — | — | fresh |
| 예산 | 카드 한도 확인 | (13,1) | Zap | mid | T−5d | — | active | — | — | fresh |
| 교통 | 버스 대절 문의 | (9,1) | Heart | — | T−4d | — | complete | — | — | fresh, complete |
| 교통 | 집합 장소 공지 | (13,1) | FileText | low | T−5d | — | active | — | — | fresh |
| 식사 | 메뉴 후보 3개 | (9,1) | Target | high | T−4d | — | active | — | — | fresh |
| 준비물 | 노트북 충전기 목록 | (9,1) | Pin | mid | T−4d | T+1.5d | active | — | — | fresh, urgency 2 |
| 준비물 | 응급 키트 | (9,2) | Star | low | T−5d | — | active | — | — | fresh |
| 준비물 | 현수막 제작 | (13,1) | Lightbulb | — | T−4d | — | complete | — | — | fresh, complete |
| 후속 | 사진 공유하기 | (9,1) | Tag | mid | T−4d | — | active | — | — | fresh |
| 후속 | 만족도 조사 분석 | (13,1) | Bookmark | — | T−5d | T+2d | active | — | — | fresh, urgency 2 |
| 팀 워크숍 | 일정표 보내기 | (9,1) | ClipboardList | mid | T−4d | T+3d | active | — | description | fresh, urgency 1 |
| 팀 워크숍 | 식단 조사하기 | (9,2) | Zap | low | T−4d | — | complete | — | — | fresh, complete |
| 팀 워크숍 | 참석자 확인하기 | (9,3) | Heart | low | T−4d | — | active | — | — | fresh |
| 팀 워크숍 | 이동 수단 정리 | (9,4) | FileText | high | T−6d | T+1.5d | active | — | — | stagnant, urgency 2 |
| 팀 워크숍 | 비상 연락망 만들기 | (13,1) | Target | mid | T−4d | — | complete | — | — | fresh, complete |
| 팀 워크숍 | 명찰 준비 | (13,2) | Pin | low | T−5d | — | active | — | — | fresh |
| 팀 워크숍 | 간식 구매 | (13,3) | Star | — | T−4d | T+2d | active | — | — | fresh, urgency 2 |
| 팀 워크숍 | 단체 사진 계획 | (13,4) | Lightbulb | mid | T−6d | — | active | — | — | stagnant |
| 짐 싸기 | 책 포장하기 | (9,1) | Tag | — | T−6d | T+4d | active | — | — | stagnant |
| 짐 싸기 | 주방 박스 라벨 붙이기 | (9,2) | Bookmark | low | T−7d | — | active | — | — | stagnant |
| 짐 싸기 | 겨울옷 압축하기 | (9,3) | ClipboardList | high | T−8d | — | active | — | — | stagnant |
| 짐 싸기 | 깨지기 쉬운 물건 표시 | (13,1) | Zap | mid | T−9d | T+6d | active | — | — | stagnant |
| 짐 싸기 | 박스 번호 매기기 | (13,2) | Heart | low | T−10d | — | complete | — | — | stagnant, complete |
| 이사 | 우편물 전송 신청 | (9,1) | FileText | — | T−6d | — | active | — | — | stagnant |
| 이사 | 기존 인터넷 해지 | (9,2) | Target | mid | T−9d | T+14d | active | — | description | stagnant |
| 이사 | 주소 변경 신고 | (13,1) | Pin | — | T−8d | — | active | — | — | stagnant |
| 이사 | 이사 업체 비교 | (13,2) | Star | low | T−9d | T+4d | complete | 자료 모으기 (complete); 초안 쓰기 (complete); 검토 받기 (complete) | — | stagnant, complete |
| 대청소 | 커튼 빨기 | (9,1) | Lightbulb | high | T−6d | — | active | 자료 모으기 (complete); 초안 쓰기 (complete); 검토 받기 (incomplete); 마무리하기 (incomplete) | — | stagnant |
| 대청소 | 매트 털기 | (9,2) | Tag | mid | T−7d | — | active | — | — | stagnant |
| 대청소 | 바닥 왁스 | (13,1) | Bookmark | low | T−8d | — | active | — | — | stagnant |
| 대청소 | 창문 닦기 | (13,2) | ClipboardList | — | T−9d | — | complete | — | — | stagnant, complete |
| 청소 | 에어컨 필터 씻기 | (9,1) | Zap | mid | T−6d | — | active | — | — | stagnant |
| 청소 | 베란다 정리 | (9,2) | Heart | — | T−7d | — | active | — | — | stagnant |
| 청소 | 욕실 곰팡이 제거 | (9,3) | FileText | low | T−8d | T+9d | active | — | — | stagnant |
| 청소 | 냉장고 비우기 | (13,1) | Target | high | T−9d | — | active | — | — | stagnant |
| 청소 | 창틀 닦기 | (13,2) | Pin | mid | T−10d | — | complete | — | — | stagnant, complete |
| 청소 | 세탁조 청소 | (13,3) | Star | low | T−11d | T+14d | active | — | — | stagnant |
| 장보기 | 주간 장보기 목록 | (9,1) | Lightbulb | — | T−6d | — | active | — | — | stagnant |
| 장보기 | 세제 재고 확인 | (9,2) | Tag | mid | T−7d | — | active | — | — | stagnant |
| 장보기 | 쌀 주문하기 | (13,1) | Bookmark | — | T−8d | T+21d | active | — | — | stagnant |
| 수리 | 문고리 교체 | (9,1) | ClipboardList | low | T−15d | — | active | — | — | neglected |
| 수리 | 방충망 수선 | (13,1) | Zap | high | T−18d | — | complete | — | — | neglected, complete |
| 밑반찬 | 멸치볶음 레시피 | (9,1) | Heart | mid | T−6d | — | complete | — | — | stagnant, complete |
| 밑반찬 | 장아찌 담그기 | (13,1) | FileText | low | T−7d | — | active | — | — | stagnant |
| 요리 | 주간 식단 짜기 | (9,1) | Target | — | T−6d | — | active | — | — | stagnant |
| 요리 | 냉동 식재료 정리 | (9,2) | Pin | mid | T−7d | T+30d | active | — | — | stagnant |
| 요리 | 밑반찬 만들기 | (13,1) | Star | — | T−8d | — | active | — | — | stagnant |
| 요리 | 조미료 채우기 | (13,2) | Lightbulb | low | T−9d | T+4d | active | 자료 모으기 (incomplete, time T+2d); 초안 쓰기 (incomplete, time T+2d); 검토 받기 (incomplete, time T+2d); 마무리하기 (incomplete, time T+2d) | — | stagnant |
| 행정 | 주민등록 등본 발급 | (9,1) | Tag | high | T−15d | — | active | — | — | neglected |
| 정리 | 옷장 정리하기 | (9,1) | Bookmark | mid | T−15d | — | active | — | — | neglected |
| 정리 | 서류함 비우기 | (9,2) | ClipboardList | low | T−18d | T+45d | active | — | — | neglected |
| 정리 | 책 기부하기 | (13,1) | Zap | — | T−21d | — | complete | — | — | neglected, complete |
| 집안일 | 여권 갱신하기 | (9,1) | Heart | high | T−8d | T+30d | active | — | description | stagnant |
| 집안일 | 치과 예약하기 | (9,2) | FileText | mid | T−8d | T−3d | active | — | — | stagnant, overdue |
| 집안일 | 자전거 고치기 | (9,3) | Target | mid | T−8d | — | active | 자료 모으기 (incomplete); 초안 쓰기 (incomplete); 검토 받기 (incomplete); 마무리하기 (incomplete) | — | stagnant |
| 집안일 | 세탁기 청소 | (9,4) | Pin | — | T−9d | — | active | — | — | stagnant |
| 집안일 | 전구 교체 | (9,5) | Star | low | T−10d | — | complete | — | — | stagnant, complete |
| 집안일 | 택배 반품 | (9,6) | Lightbulb | high | T−11d | — | active | — | — | stagnant |
| 집안일 | 보일러 점검 | (13,1) | Tag | mid | T−6d | — | active | — | description | stagnant |
| 집안일 | 분리배출표 붙이기 | (13,2) | Bookmark | low | T−7d | — | active | — | — | stagnant |
| 집안일 | 공과금 확인 | (13,3) | ClipboardList | — | T−8d | T+45d | active | — | — | stagnant |
| 집안일 | 열쇠 복사 | (13,4) | Zap | mid | T−9d | — | complete | — | — | stagnant, complete |
| 집안일 | 화분 물주기 | (13,5) | Heart | — | T−10d | — | active | — | — | stagnant |
| 집안일 | 신발장 정리 | (13,6) | FileText | low | T−11d | T+60d | active | — | — | stagnant |
| Databases | Vacuum and bloat | (9,1) | Target | high | T−12d | — | complete | — | — | neglected, complete |
| Databases | Read the WAL chapter | (9,2) | Pin | mid | T−14d | — | active | — | — | neglected |
| Databases | Query plan basics | (9,3) | Star | low | T−16d | — | active | — | — | neglected |
| Databases | Locking notes | (13,1) | Lightbulb | — | T−18d | — | active | — | — | neglected |
| Databases | Replication notes | (13,2) | Tag | mid | T−12d | — | active | — | — | neglected |
| Tech books | Reread DDIA chapter 3 | (9,1) | Bookmark | low | T−12d | — | active | — | — | neglected |
| Tech books | Order the Rust book | (9,2) | ClipboardList | — | T−14d | — | active | — | — | neglected |
| Tech books | Compare two SQL books | (13,1) | Zap | low | T−16d | — | active | — | — | neglected |
| Tech books | Index design notes | (13,2) | Heart | high | T−12d | — | active | — | — | neglected |
| Fiction | Finish the novel | (9,1) | FileText | mid | T−6d | — | complete | — | — | stagnant, complete |
| Fiction | Pick a book club title | (9,2) | Target | low | T−8d | — | active | — | — | stagnant |
| Fiction | Reread the first chapter | (13,1) | Pin | — | T−10d | — | active | — | — | stagnant |
| Podcasts | Queue three episodes | (9,1) | Star | mid | T−6d | T+7d | active | Gather the notes (complete); Draft it (incomplete, time T+3.5d); Get a review (incomplete, time T+3.5d) | — | stagnant |
| Podcasts | Find a design podcast | (13,1) | Lightbulb | — | T−8d | — | active | — | — | stagnant |
| Backlog | Sort by topic | (9,1) | Tag | low | T−6d | — | active | — | — | stagnant |
| Backlog | Skim the headlines | (9,2) | Bookmark | high | T−8d | — | active | — | — | stagnant |
| Backlog | Delete the stale ones | (13,1) | ClipboardList | mid | T−10d | — | active | — | — | stagnant |
| Articles | Save the RLS article | (9,1) | Zap | low | T−6d | — | complete | — | — | stagnant, complete |
| Articles | Archive old tabs | (9,2) | Heart | — | T−8d | — | active | — | — | stagnant |
| Articles | Summarize one essay | (9,3) | FileText | mid | T−10d | — | active | — | — | stagnant |
| Articles | Tag the saved links | (9,4) | Target | — | T−12d | — | active | — | — | neglected |
| Articles | Read the long one | (13,1) | Pin | low | T−6d | — | active | — | — | stagnant |
| Articles | Clip a quote | (13,2) | Star | high | T−8d | — | complete | — | — | stagnant, complete |
| Articles | Export the highlights | (13,3) | Lightbulb | mid | T−10d | — | active | — | — | stagnant |
| Papers | Print the Raft paper | (9,1) | Tag | low | T−15d | — | active | Gather the notes (incomplete); Draft it (incomplete); Get a review (incomplete); Wrap it up (incomplete) | — | neglected |
| Wishlist | Add three titles | (9,1) | Bookmark | — | T−15d | — | active | — | — | neglected |
| Wishlist | Compare used prices | (9,2) | ClipboardList | mid | T−18d | — | active | — | — | neglected |
| Wishlist | Share with a friend | (13,1) | Zap | — | T−21d | — | active | — | — | neglected |
| Newsletters | Unsubscribe from five | (9,1) | Heart | low | T−15d | — | active | — | — | neglected |
| Newsletters | Set a Friday slot | (13,1) | FileText | high | T−18d | — | complete | — | — | neglected, complete |
| Reading list | Finish Clean Code | (9,1) | Target | mid | T−5d | — | active | — | description | fresh |
| Reading list | Read the RLS docs | (9,2) | Pin | mid | T−6d | — | active | — | description | stagnant |
| Reading list | Skim React 19 notes | (9,3) | Star | low | T−11d | — | active | — | — | stagnant |
| Reading list | Pick next month's book | (9,4) | Lightbulb | low | T−14d | — | active | — | — | neglected |
| Reading list | Update the reading log | (9,5) | Tag | — | T−18d | — | active | — | — | neglected |
| Reading list | Return the library books | (13,1) | Bookmark | mid | T−5d | — | active | — | — | fresh |
| Reading list | Order the paperback | (13,2) | ClipboardList | — | T−6d | — | active | — | — | stagnant |
| Reading list | Share a book note | (13,3) | Zap | low | T−11d | — | complete | — | — | stagnant, complete |
| Reading list | Set a daily reading time | (13,4) | Heart | high | T−14d | — | complete | Gather the notes (complete); Draft it (complete); Get a review (complete); Wrap it up (complete) | — | neglected, complete |
| 동사 변화 | 불규칙 동사 외우기 | (9,1) | FileText | mid | T−14d | T+2d | complete | 자료 모으기 (complete); 초안 쓰기 (complete); 검토 받기 (complete); 마무리하기 (complete) | — | neglected, urgency 2, complete |
| 동사 변화 | 현재완료 연습 | (13,1) | Target | low | T−16d | — | active | — | — | neglected |
| 문법 | 과거형 정리하기 | (9,1) | Pin | — | T−14d | — | active | — | — | neglected |
| 문법 | 접속법 예문 모으기 | (9,2) | Star | mid | T−16d | — | complete | — | — | neglected, complete |
| 문법 | 전치사 표 만들기 | (13,1) | Lightbulb | — | T−20d | T+2d | active | — | — | neglected, urgency 2 |
| 듣기 | 팟캐스트 구독하기 | (9,1) | Tag | low | T−14d | T+5d | active | — | — | neglected |
| 스페인어 | 5단원 끝내기 | (9,1) | Bookmark | mid | T−14d | — | active | — | — | neglected |
| 스페인어 | 언어 교환 파트너 찾기 | (9,2) | ClipboardList | high | T−16d | T+55d | active | — | — | neglected |
| 스페인어 | 자막 없이 한 편 보기 | (13,1) | Zap | mid | T−20d | — | active | — | — | neglected |
| 기획 | 핵심 기능 3개 고르기 | (9,1) | Heart | low | T−2d | — | active | — | — | fresh |
| 기획 | 경쟁 앱 조사하기 | (9,2) | FileText | — | T−3d | T+8d | active | — | — | fresh |
| 기획 | 사용자 인터뷰 질문 | (13,1) | Target | mid | T−2d | — | active | — | — | fresh |
| 아이콘 | 스트릭 아이콘 | (9,1) | Pin | — | T−2d | — | active | — | — | fresh |
| 아이콘 | 배지 디자인 | (13,1) | Star | low | T−3d | — | active | 자료 모으기 (complete); 초안 쓰기 (complete); 검토 받기 (incomplete); 마무리하기 (incomplete) | — | fresh |
| 화면 | 온보딩 와이어프레임 | (9,1) | Lightbulb | high | T−2d | — | complete | — | — | fresh, complete |
| 화면 | 홈 화면 색상 정하기 | (9,2) | Tag | mid | T−3d | T+12d | active | — | — | fresh |
| 화면 | 아이콘 후보 뽑기 | (13,1) | Bookmark | low | T−2d | — | active | — | — | fresh |
| 습관 앱 | 첫 화면 스케치 | (9,1) | ClipboardList | mid | T−2d | T+5d | active | 종이 와이어프레임 (complete); 폰트 고르기 (incomplete, time T+4d) | description | fresh |
| 습관 앱 | Ship a landing page | (9,2) | Zap | high | T−3d | T+14d | active | — | description | fresh |
| 습관 앱 | README 쓰기 | (13,1) | Heart | — | T−2d | — | complete | — | — | fresh, complete |
| 습관 앱 | 알림 문구 쓰기 | (13,2) | FileText | mid | T−3d | — | active | — | — | fresh |
| 대회 준비 | 접수 확인 | (9,1) | Target | — | T−1d | — | active | — | — | fresh |
| 대회 준비 | 컨디션 관리 | (9,2) | Pin | low | T−2d | — | complete | — | — | fresh, complete |
| 대회 준비 | 보급 계획 | (13,1) | Star | high | T−1d | — | active | — | — | fresh |
| 러닝 | 주 3회 코스 짜기 | (9,1) | Lightbulb | mid | T−1d | — | active | — | — | fresh |
| 러닝 | 페이스 기록하기 | (9,2) | Tag | low | T−2d | — | active | — | — | fresh |
| 러닝 | 공원 코스 탐색 | (13,1) | Bookmark | — | T−1d | T+18d | active | — | — | fresh |
| 근력 | 스쿼트 자세 점검 | (9,1) | ClipboardList | mid | T−1d | T+25d | active | — | — | fresh |
| 운동 | 10km 대회 접수 | (9,1) | Zap | high | T−1d | T+12d | active | — | description | fresh |
| 운동 | 러닝화 사기 | (9,2) | Heart | — | T−1d | T−2d | active | — | — | fresh, overdue |
| 운동 | 스트레칭 루틴 정하기 | (13,1) | FileText | low | T−1d | — | complete | — | — | fresh, complete |
| 개인연금 | 세액공제 한도 확인 | (9,1) | Target | high | T−6d | — | active | — | — | stagnant |
| 연금 | 수령 시기 알아보기 | (9,1) | Pin | mid | T−6d | — | complete | — | — | stagnant, complete |
| 연금 | 납입액 늘리기 | (13,1) | Star | low | T−7d | T+2d | active | 자료 모으기 (incomplete, time T+1d); 초안 쓰기 (incomplete, time T+1d); 검토 받기 (incomplete, time T+1d) | — | stagnant, urgency 2 |
| 보험 | 보험 목록 정리 | (9,1) | Lightbulb | — | T−6d | — | active | — | — | stagnant |
| 재테크 | 연말정산 서류 모으기 | (9,1) | Tag | high | T−6d | T+20d | active | — | description | stagnant |
| 재테크 | 월 예산 정하기 | (9,2) | Bookmark | mid | T−6d | T−6d | active | — | — | stagnant, overdue |
| 재테크 | 비상금 통장 만들기 | (13,1) | ClipboardList | — | T−8d | — | active | — | — | stagnant |
| 재테크 | 구독 서비스 점검 | (13,2) | Zap | low | T−9d | — | active | — | — | stagnant |
| 구독 | OTT 해지 검토 | (9,1) | Heart | high | T−0.5d | — | active | — | — | fresh |
| 구독 | 클라우드 용량 정리 | (9,2) | FileText | mid | T−1d | — | active | — | — | fresh |
| 구독 | 정기결제 알림 켜기 | (13,1) | Target | low | T−2d | — | complete | — | — | fresh, complete |
| 고정비 | 월세 확인하기 | (9,1) | Pin | — | T−0.5d | — | active | — | — | fresh |
| 고정비 | 통신비 비교 | (13,1) | Star | mid | T−1d | T+55d | active | — | — | fresh |
| 변동비 | 식비 한도 정하기 | (9,1) | Lightbulb | — | T−0.5d | T+2d | active | — | — | fresh, urgency 2 |
| 가계부 | 이번 달 지출 입력 | (9,1) | Tag | low | T−0.5d | T+40d | active | — | — | fresh |
| 가계부 | 카드 내역 대조 | (13,1) | Bookmark | high | T−1d | — | complete | — | — | fresh, complete |
| 치료 기록 | 영수증 모으기 | (9,1) | ClipboardList | mid | T−6d | — | active | — | — | stagnant |
| 치과 | 스케일링 예약 | (9,1) | Zap | low | T−6d | — | complete | — | — | stagnant, complete |
| 치과 | 사랑니 상담 | (13,1) | Heart | — | T−7d | — | active | — | — | stagnant |
| 안과 | 시력 검사 예약 | (9,1) | FileText | mid | T−6d | T+8d | active | — | — | stagnant |
| 건강검진 | 검진 예약하기 | (9,1) | Target | — | T−6d | — | active | — | — | stagnant |
| 건강검진 | 결과지 보관하기 | (9,2) | Pin | low | T−7d | — | complete | 자료 모으기 (complete); 초안 쓰기 (complete); 검토 받기 (complete); 마무리하기 (complete) | — | stagnant, complete |
| 건강검진 | 금식 시간 확인 | (13,1) | Star | high | T−8d | T+5d | active | — | — | stagnant |
| 쿨러 | 얼음 준비 | (9,1) | Lightbulb | mid | T−15d | T+2d | active | 자료 모으기 (complete); 초안 쓰기 (complete); 검토 받기 (incomplete, time T+1d); 마무리하기 (incomplete, time T+1d) | — | neglected, urgency 2 |
| 쿨러 | 보냉백 확인 | (9,2) | Tag | low | T−18d | — | active | — | — | neglected |
| 쿨러 | 식음료 담기 | (13,1) | Bookmark | — | T−21d | — | active | — | — | neglected |
| 장비 | 침낭 상태 확인 | (9,1) | ClipboardList | mid | T−15d | — | active | — | — | neglected |
| 장비 | 버너 가스 점검 | (9,2) | Zap | — | T−18d | — | active | — | — | neglected |
| 장비 | 의자 수리 | (13,1) | Heart | low | T−21d | — | active | — | — | neglected |
| 장소 | 근교 캠핑장 찾기 | (9,1) | FileText | high | T−15d | T+18d | active | — | — | neglected |
| 캠핑 | 텐트 방수 점검 | (9,1) | Target | mid | T−15d | — | active | — | — | neglected |
| 캠핑 | 예약 오픈일 알림 | (9,2) | Pin | low | T−18d | — | complete | — | — | neglected, complete |
| 캠핑 | 랜턴 충전 | (13,1) | Star | — | T−21d | T+12d | active | — | — | neglected |
| Kyoto | List the temples | (9,1) | Lightbulb | mid | T−3d | — | active | — | — | fresh |
| Kyoto | Book a tea class | (9,2) | Tag | — | T−6d | — | complete | — | — | stagnant, complete |
| Kyoto | Mark the food streets | (13,1) | Bookmark | low | T−3d | — | active | — | — | fresh |
| Kyoto | Find a ramen shop | (13,2) | ClipboardList | high | T−6d | — | active | Gather the notes (incomplete); Draft it (incomplete); Get a review (incomplete); Wrap it up (incomplete) | — | stagnant |
| Japan | Buy a rail pass | (9,1) | Zap | mid | T−3d | — | active | — | — | fresh |
| Japan | Reserve the ryokan | (9,2) | Heart | low | T−6d | T+25d | active | — | — | stagnant |
| Japan | Save offline maps | (13,1) | FileText | — | T−3d | — | active | — | — | fresh |
| Lisbon | Find a tram route | (9,1) | Target | mid | T−3d | — | active | — | — | fresh |
| Lisbon | Save fado venues | (13,1) | Pin | — | T−6d | T+40d | active | — | — | stagnant |
| Travel | Book the flights | (9,1) | Star | high | T−3d | T+25d | active | — | description | fresh |
| Travel | Check the visa rules | (9,2) | Lightbulb | low | T−6d | — | active | — | — | stagnant |
| Travel | Renew travel insurance | (13,1) | Tag | high | T−3d | — | complete | — | — | fresh, complete |
| Soups | Chicken broth | (9,1) | Bookmark | mid | T−0.5d | — | complete | — | — | fresh, complete |
| Weeknight | Sheet pan dinners | (9,1) | ClipboardList | low | T−0.5d | — | active | — | — | fresh |
| Weeknight | Fifteen minute pasta | (13,1) | Zap | — | T−1d | — | active | — | — | fresh |
| Baking | Feed the starter | (9,1) | Heart | mid | T−0.5d | T+2d | active | — | — | fresh, urgency 2 |
| Cooking | Try the miso soup recipe | (9,1) | FileText | — | T−0.5d | — | complete | — | description | fresh, complete |
| Cooking | Plan the weekly menu | (9,2) | Target | low | T−1d | — | active | — | — | fresh |
| Cooking | Restock the spice shelf | (13,1) | Pin | high | T−2d | T+55d | active | — | — | fresh |
| Lighting | Test the softbox | (9,1) | Star | mid | T−15d | — | active | — | — | neglected |
| Lighting | Note the settings | (9,2) | Lightbulb | low | T−18d | T+5d | active | — | — | neglected |
| Lighting | Pack the diffuser | (13,1) | Tag | — | T−21d | — | active | — | — | neglected |
| Portraits | Book a model day | (9,1) | Bookmark | mid | T−15d | — | complete | — | — | neglected, complete |
| Portraits | Buy a reflector | (13,1) | ClipboardList | — | T−18d | — | active | — | — | neglected |
| Landscapes | Plan the sunrise shoot | (9,1) | Zap | low | T−15d | — | complete | — | — | neglected, complete |
| Photography | Edit the trip photos | (9,1) | Heart | high | T−15d | — | active | — | — | neglected |
| Photography | Back up the SD cards | (9,2) | FileText | mid | T−18d | — | active | — | — | neglected |
| Photography | Clean the lens | (13,1) | Target | low | T−21d | T+2d | complete | Gather the notes (complete); Draft it (complete); Get a review (complete) | — | neglected, urgency 2, complete |
| Examples | Add a minimal repro | (9,1) | Pin | — | T−6d | — | active | Gather the notes (complete); Draft it (complete); Get a review (incomplete); Wrap it up (incomplete) | — | stagnant |
| Examples | Test the snippets | (13,1) | Star | mid | T−7d | — | active | — | — | stagnant |
| Docs | Fix the README typos | (9,1) | Lightbulb | — | T−6d | — | active | — | — | stagnant |
| Docs | Add a quickstart | (13,1) | Tag | low | T−7d | — | complete | — | — | stagnant, complete |
| Releases | Tag the next release | (9,1) | Bookmark | high | T−6d | T+12d | active | — | — | stagnant |
| Open source | Triage the open issues | (9,1) | ClipboardList | mid | T−6d | T+8d | active | — | — | stagnant |
| Open source | Reply to the PR review | (9,2) | Zap | low | T−7d | — | active | — | — | stagnant |
| Open source | Update the changelog | (13,1) | Heart | — | T−8d | — | active | — | — | stagnant |

"색상 팔레트 정하기" is completed by its Chunks; "식단 조사하기" is completed by hand. Chunk times never pass their Bit's deadline; Bit deadlines never pass their Node's.

## Inbox Scratches

| Scratch | Cell | Created | Breakdown rows | Consumed | Staged | Expected state |
|---|---|---|---|---|---|---|
| Plan the field study | (3,0) | T−45min | Review the field notes; Draft the study summary; Book the meeting room; Send the participant list; Archive the old drafts | — | Review the field notes → node; Draft the study summary → bit | open rows, 2 staged |
| 주말 여행 아이디어 | (4,0) | T−1.08d | 기차 시간 확인하기; 반려견 동반 숙소 찾기; 등산화 챙기기; 민수에게 차 빌릴 수 있는지 묻기 | 기차 시간 확인하기; 반려견 동반 숙소 찾기 | — | open and consumed rows |
| 엄마 선물 아이디어 | (5,0) | T−3d | none (empty Scratch) | — | — | empty |
| Questions for Monday's stand-up | (6,0) | T−6d | Is the deploy freeze still on?; Who owns the analytics ticket? | Is the deploy freeze still on? | — | open and consumed rows |
| 새 노트북 고르기 | (7,0) | T−2d | 예산 정하기; 후보 3개 비교하기; 중고 시세 확인하기 | 예산 정하기 | — | open and consumed rows |
| Birthday party checklist | (8,0) | T−4d | Send the invites; Order the cake; Book the room; Buy the decorations | Send the invites; Order the cake | — | open and consumed rows |
| 독서 모임 준비 | (9,0) | T−9d | 다음 책 투표하기; 장소 예약하기; 간식 정하기 | — | 장소 예약하기 → bit | open rows, 1 staged |
