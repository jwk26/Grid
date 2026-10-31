# DP-SAAS-02 — Demo seed for new guests

Status: approved by the owner (Task 237, Stage 1, 2026-10-31); reworked four times on 2026-10-31 after the visual checks: for placement (the Bits crowded the left near the breadcrumb), for quantity (the seed was too thin), for grouping and the per-Grid counts, and for the L0 count (15 Nodes, each with sub-Nodes) (user, advisory reviews at the Task finish). The fourth rework awaits the owner's visual check.

Times: T is the copy time; `mtime` is `T − n days`, deadlines are `T + n days` with `deadline_all_day = false`. Aging and urgency are computed from these at render time, so they move while the visitor stays (aging: fresh ≤ 5 days, stagnant ≤ 11, neglected beyond; urgency 1/2/3 at ≤ 3/2/1 days).

## Rules

- **Reserved block:** every Node and Bit cell has `x` ≥ 3 or `y` ≥ 2 at every level (F34). The L0 cells (3,0) and (4,0), where Inbox and Archive land while the block is reserved, hold no seed item; after Task 249 they move to (0,0) and (1,0).
- **Placement (SPEC `/grid/[nodeId]` Level 1-2 content):** inside a Node, sub-Nodes fill the left zone with no gap, row by row from (2,2) (`x` 2 to 7 on `y` 2, a seventh at (2,3)), related ones adjacent; Bits fill the right zone in two columns at `x` 9 and 13 (a Bit card spans two cells, so 9–10 and 13–14), from `y` 1 with no empty row in a column, the first half of a list in the `x` 9 column and the rest in the `x` 13 column, so related Bits stay together. The columns stay at 9 and 13 until the `2026-10-31-grid-bit-card-footprint` phase, since a Bit card still grows with its title. A Node at level 2 holds Bits only. On L0, related Nodes sit next to each other in four blocks with one empty cell between blocks (blocks at `x` 5–6, 8–10 and 12–13, rows `y` 2–3 and 5–6), outside the reserved block and (3,0), (4,0): work and projects (사이트 개편, 팀 워크숍, 습관 앱, Open source); home, money and health (집안일, 가계부, 재테크, 건강검진, 운동); learning (Reading list, 스페인어); leisure (Travel, 캠핑, Photography, Cooking).
- **Shape:** 15 L0 seed Nodes (10 Korean, 5 English; with Inbox and Archive 10:7); every one holds at least 2 sub-Nodes. The four Nodes a visitor opens first (사이트 개편, 팀 워크숍, 집안일, Reading list) hold seven sub-Nodes and 10 Bits each; each of their 28 level-1 Nodes holds 5 Bits; 6 level-2 Nodes (3 under each of 개발 and 이사) hold 5 Bits each. The other 11 L0 Nodes hold 2 sub-Nodes and 3 Bits each, and each of those 22 level-1 Nodes holds 1 Bit. A Node's Bit count includes an archived or trashed Bit it holds (디자인, 콘텐츠, 장소 hold one each).
- **Totals:** 71 Nodes (+ Inbox, Archive), 265 Bits (2 archived, 1 trashed) + 4 Scratches, 10 Chunks, 11 Scratch rows, 2 staged candidates. Guest limits: 100 / 300 / 1,000 / 300.
- **Language (user, 2026-10-31):** one seed for every visitor, mostly Korean with some English, no variants. Inside Nodes (56 sub-Nodes, 265 Bits, 4 Scratches = 325 items): 225 Korean, 100 English (about 7:3). Chunks and Breakdown rows follow their parent; a Korean sentence with an English proper noun counts as Korean. Korean Node titles stay around 6 characters; Bit titles stay within 14 Korean or 24 English characters.
- **Icons:** every Node and Bit icon is in `NODE_ICON_NAMES` (a test checks it); Scratches use `sparkles`, what capture writes.
- **Chunks:** only four Bits carry Chunks; `time` is set on open Chunks and on the first Chunk of "홈페이지 문구 쓰기" (a past time, T−1d), every other Chunk has none; times never pass their Bit's deadline. `time_all_day = false`.
- **Hook 1:** a Node's `mtime` is the newest `mtime`, `archived_at` or `deleted_at` of what it holds (Nodes and Bits); a Node's deadline is the latest deadline below it (Hook 2), or none.
- **Scratches** belong to the guest's own Inbox and take cells (3,0)–(6,0) outside the reserved block (as the fixture does, not the Hook 8 sentinel); Triage ignores their cells. Archived and trashed Bits keep their original parents; nothing is parented to Archive.
- **Covered on purpose:** aging on both sides of the 5- and 11-day boundaries (the four Reading list Bits at 5, 6, 11 and 12 days), urgency 1, 2, 3 and overdue, a Bit completed by Chunks ("색상 팔레트 정하기") and one by hand ("식단 조사하기"), a three-level Node tree, Korean and English titles, Trash, Archive, Scratches with open and staged Breakdown rows, and an empty Scratch.

## Nodes

| Node | Parent | Cell | Icon | mtime | Deadline | Expected state |
|---|---|---|---|---|---|---|
| 사이트 개편 | L0 | (5,2) | Globe | T−0.5d | T+7d | fresh |
| 디자인 | 사이트 개편 (L0) | (2,2) | Palette | T−0.5d | — | fresh |
| 개발 | 사이트 개편 (L0) | (3,2) | Code | T−0.5d | T+7d | fresh |
| Frontend | 개발 (L1) | (2,2) | Layers | T−0.5d | T+7d | fresh |
| Backend | 개발 (L1) | (3,2) | Settings | T−0.5d | T−1d | fresh, overdue |
| 인프라 | 개발 (L1) | (4,2) | Cloud | T−0.5d | — | fresh |
| 콘텐츠 | 사이트 개편 (L0) | (4,2) | FileText | T−0.5d | — | fresh |
| 마케팅 | 사이트 개편 (L0) | (5,2) | Zap | T−0.5d | — | fresh |
| 운영 | 사이트 개편 (L0) | (6,2) | Settings | T−0.5d | — | fresh |
| 법무 | 사이트 개편 (L0) | (7,2) | Lock | T−0.5d | — | fresh |
| 분석 | 사이트 개편 (L0) | (2,3) | Compass | T−0.5d | — | fresh |
| 팀 워크숍 | L0 | (6,2) | Users | T−4d | T+3d | fresh, urgency 1 |
| 장소 | 팀 워크숍 (L0) | (2,2) | Building2 | T−4d | T+2d | fresh, urgency 2 |
| 프로그램 | 팀 워크숍 (L0) | (3,2) | Target | T−4d | — | fresh |
| 예산 | 팀 워크숍 (L0) | (4,2) | Wallet | T−4d | — | fresh |
| 교통 | 팀 워크숍 (L0) | (5,2) | Car | T−4d | — | fresh |
| 식사 | 팀 워크숍 (L0) | (6,2) | Coffee | T−4d | — | fresh |
| 준비물 | 팀 워크숍 (L0) | (7,2) | Box | T−4d | — | fresh |
| 후속 | 팀 워크숍 (L0) | (2,3) | Star | T−4d | — | fresh |
| 집안일 | L0 | (8,2) | Home | T−8d | T+30d | stagnant |
| 이사 | 집안일 (L0) | (2,2) | ListTodo | T−8d | T+14d | stagnant |
| 짐 싸기 | 이사 (L1) | (2,2) | Box | T−8d | — | stagnant |
| 짐 풀기 | 이사 (L1) | (3,2) | FolderOpen | T−8d | — | stagnant |
| 이사 당일 | 이사 (L1) | (4,2) | Pin | T−8d | — | stagnant |
| 청소 | 집안일 (L0) | (3,2) | Hammer | T−8d | — | stagnant |
| 장보기 | 집안일 (L0) | (4,2) | ShoppingCart | T−8d | — | stagnant |
| 수리 | 집안일 (L0) | (5,2) | Hammer | T−8d | — | stagnant |
| 요리 | 집안일 (L0) | (6,2) | Coffee | T−8d | — | stagnant |
| 행정 | 집안일 (L0) | (7,2) | ClipboardList | T−8d | — | stagnant |
| 정리 | 집안일 (L0) | (2,3) | FolderOpen | T−8d | — | stagnant |
| Reading list | L0 | (12,2) | BookOpen | T−5d | — | fresh |
| Tech books | Reading list (L0) | (2,2) | Book | T−12d | — | neglected |
| Fiction | Reading list (L0) | (3,2) | Bookmark | T−6d | — | stagnant |
| Podcasts | Reading list (L0) | (4,2) | Headphones | T−6d | — | stagnant |
| Articles | Reading list (L0) | (5,2) | FileText | T−6d | — | stagnant |
| Papers | Reading list (L0) | (6,2) | ClipboardList | T−6d | — | stagnant |
| Wishlist | Reading list (L0) | (7,2) | Gift | T−6d | — | stagnant |
| Newsletters | Reading list (L0) | (2,3) | MessageSquare | T−6d | — | stagnant |
| 스페인어 | L0 | (13,2) | GraduationCap | T−14d | — | neglected |
| 문법 | 스페인어 (L0) | (2,2) | Book | T−14d | — | neglected |
| 듣기 | 스페인어 (L0) | (3,2) | Headphones | T−14d | — | neglected |
| 습관 앱 | L0 | (5,3) | Rocket | T−2d | T+14d | fresh |
| 기획 | 습관 앱 (L0) | (2,2) | ClipboardList | T−2d | — | fresh |
| 화면 | 습관 앱 (L0) | (3,2) | PenTool | T−2d | — | fresh |
| 운동 | L0 | (9,3) | Dumbbell | T−1d | T+12d | fresh |
| 러닝 | 운동 (L0) | (2,2) | Timer | T−1d | — | fresh |
| 근력 | 운동 (L0) | (3,2) | Dumbbell | T−1d | — | fresh |
| 재테크 | L0 | (10,2) | Wallet | T−6d | T+20d | stagnant |
| 연금 | 재테크 (L0) | (2,2) | Diamond | T−6d | — | stagnant |
| 보험 | 재테크 (L0) | (3,2) | Lock | T−6d | — | stagnant |
| 가계부 | L0 | (9,2) | Calculator | T−6d | — | stagnant |
| 고정비 | 가계부 (L0) | (2,2) | CreditCard | T−6d | — | stagnant |
| 변동비 | 가계부 (L0) | (3,2) | ShoppingCart | T−6d | — | stagnant |
| 건강검진 | L0 | (8,3) | Heart | T−6d | — | stagnant |
| 치과 | 건강검진 (L0) | (2,2) | Heart | T−6d | — | stagnant |
| 안과 | 건강검진 (L0) | (3,2) | Image | T−6d | — | stagnant |
| 캠핑 | L0 | (6,5) | Compass | T−6d | — | stagnant |
| 장비 | 캠핑 (L0) | (2,2) | Box | T−6d | — | stagnant |
| 장소 | 캠핑 (L0) | (3,2) | Map | T−6d | — | stagnant |
| Travel | L0 | (5,5) | Plane | T−3d | T+25d | fresh |
| Japan | Travel (L0) | (2,2) | Map | T−3d | — | fresh |
| Lisbon | Travel (L0) | (3,2) | Camera | T−3d | — | fresh |
| Cooking | L0 | (6,6) | Coffee | T−1d | — | fresh |
| Weeknight | Cooking (L0) | (2,2) | Flame | T−1d | — | fresh |
| Baking | Cooking (L0) | (3,2) | Coffee | T−1d | — | fresh |
| Photography | L0 | (5,6) | Camera | T−6d | — | stagnant |
| Portraits | Photography (L0) | (2,2) | Image | T−6d | — | stagnant |
| Landscapes | Photography (L0) | (3,2) | Map | T−6d | — | stagnant |
| Open source | L0 | (6,3) | Code | T−6d | — | stagnant |
| Docs | Open source (L0) | (2,2) | FileText | T−6d | — | stagnant |
| Releases | Open source (L0) | (3,2) | Rocket | T−6d | — | stagnant |

## Bits

| Node | Bit | Cell | Icon | Priority | mtime | Deadline | Status | Chunks | Expected state |
|---|---|---|---|---|---|---|---|---|---|
| 디자인 | 로고 최종본 고르기 | (9,1) | FileText | high | T−0.5d | — | active | — | fresh |
| 디자인 | 아이콘 세트 정리 | (9,2) | Target | mid | T−1d | — | active | — | fresh |
| 디자인 | 모바일 시안 검토 | (13,1) | Pin | low | T−2d | — | active | — | fresh |
| 디자인 | 버튼 스타일 정하기 | (13,2) | Star | — | T−3d | — | active | — | fresh |
| 디자인 | 예전 로고 시안 | (13,3) | Lightbulb | mid | T−12d | — | archived T−10d | — | hidden from the Grid |
| Frontend | Build the header | (9,1) | Tag | — | T−0.5d | — | active | — | fresh |
| Frontend | Lazy load images | (9,2) | Bookmark | low | T−1d | — | active | — | fresh |
| Frontend | Check dark mode | (9,3) | ClipboardList | high | T−2d | — | active | — | fresh |
| Frontend | Set up analytics | (13,1) | Zap | low | T−2d | T+7d | active | — | fresh |
| Frontend | Audit the bundle size | (13,2) | Heart | mid | T−4d | — | active | — | fresh |
| Backend | Connect the contact API | (9,1) | FileText | low | T−0.5d | — | active | — | fresh |
| Backend | Redirect the old URLs | (9,2) | Target | high | T−1d | T−1d | active | — | fresh, overdue |
| Backend | Set cache rules | (9,3) | Pin | — | T−2d | — | active | — | fresh |
| Backend | Pick a backup schedule | (13,1) | Star | mid | T−3d | — | active | — | fresh |
| Backend | Set log retention | (13,2) | Lightbulb | — | T−4d | — | active | — | fresh |
| 인프라 | 도메인 갱신 확인 | (9,1) | Tag | low | T−0.5d | — | active | — | fresh |
| 인프라 | SSL 인증서 점검 | (9,2) | Bookmark | high | T−1d | — | active | — | fresh |
| 인프라 | CDN 캐시 비우기 | (9,3) | ClipboardList | mid | T−2d | — | active | — | fresh |
| 인프라 | 모니터 알림 설정 | (13,1) | Zap | low | T−3d | — | active | — | fresh |
| 인프라 | 비용 한도 정하기 | (13,2) | Heart | — | T−4d | — | active | — | fresh |
| 개발 | Audit the CI pipeline | (9,1) | FileText | mid | T−0.5d | — | active | — | fresh |
| 개발 | Set a performance budget | (9,2) | Target | — | T−1d | — | active | — | fresh |
| 개발 | Wire up error tracking | (9,3) | Pin | low | T−2d | — | active | — | fresh |
| 개발 | Update dependencies | (13,1) | Star | high | T−3d | — | active | — | fresh |
| 개발 | Cut the build time | (13,2) | Lightbulb | mid | T−4d | — | active | — | fresh |
| 콘텐츠 | 소개 글 다듬기 | (9,1) | Tag | low | T−0.5d | — | active | — | fresh |
| 콘텐츠 | 사례 3개 정리 | (9,2) | Bookmark | — | T−1d | — | active | — | fresh |
| 콘텐츠 | 블로그 일정 잡기 | (13,1) | ClipboardList | mid | T−2d | — | active | — | fresh |
| 콘텐츠 | 보도 자료 확인 | (13,2) | Zap | — | T−3d | — | active | — | fresh |
| 콘텐츠 | 삭제한 소개 초안 | (13,3) | Heart | low | T−4d | — | trashed T−2d | — | hidden from the Grid |
| 마케팅 | 뉴스레터 초안 | (9,1) | FileText | high | T−0.5d | — | active | — | fresh |
| 마케팅 | SNS 이미지 만들기 | (9,2) | Target | mid | T−1d | — | active | — | fresh |
| 마케팅 | 보도자료 쓰기 | (9,3) | Pin | low | T−2d | — | active | — | fresh |
| 마케팅 | 광고 문구 테스트 | (13,1) | Star | — | T−3d | — | active | — | fresh |
| 마케팅 | 인플루언서 목록 | (13,2) | Lightbulb | mid | T−4d | — | active | — | fresh |
| 운영 | 장애 연락망 정리 | (9,1) | Tag | — | T−0.5d | — | active | — | fresh |
| 운영 | 백업 복구 연습 | (9,2) | Bookmark | low | T−1d | — | active | — | fresh |
| 운영 | 업데이트 공지 | (9,3) | ClipboardList | high | T−2d | — | active | — | fresh |
| 운영 | 점검 시간 정하기 | (13,1) | Zap | mid | T−3d | — | active | — | fresh |
| 운영 | 문의 응대 규칙 | (13,2) | Heart | low | T−4d | — | active | — | fresh |
| 법무 | 약관 검토 요청 | (9,1) | FileText | — | T−0.5d | — | active | — | fresh |
| 법무 | 저작권 표기 확인 | (9,2) | Target | mid | T−1d | — | active | — | fresh |
| 법무 | 개인정보 동의 문구 | (9,3) | Pin | — | T−2d | — | active | — | fresh |
| 법무 | 쿠키 정책 갱신 | (13,1) | Star | low | T−3d | — | active | — | fresh |
| 법무 | 계약서 보관 위치 | (13,2) | Lightbulb | high | T−4d | — | active | — | fresh |
| 분석 | 전환 목표 정하기 | (9,1) | Tag | mid | T−0.5d | — | active | — | fresh |
| 분석 | 방문자 대시보드 | (9,2) | Bookmark | low | T−1d | — | active | — | fresh |
| 분석 | 주간 리포트 틀 | (9,3) | ClipboardList | — | T−2d | — | active | — | fresh |
| 분석 | 이벤트 추적 정리 | (13,1) | Zap | mid | T−3d | — | active | — | fresh |
| 분석 | 지표 정의서 | (13,2) | Heart | — | T−4d | — | active | — | fresh |
| 사이트 개편 | 홈페이지 문구 쓰기 | (9,1) | FileText | high | T−1d | T+0.83d | active | 히어로 문구 초안 (complete, time T−1d); 후기 3개 고르기 (incomplete, time T+0.42d); 문구 교정하기 (incomplete, time T+0.75d) | fresh, urgency 3 |
| 사이트 개편 | 색상 팔레트 정하기 | (9,2) | Target | mid | T−3d | — | complete | 팔레트 3개 비교하기 (complete); 명암비 확인하기 (complete) | fresh, complete |
| 사이트 개편 | 사이트맵 정리 | (9,3) | Pin | low | T−2d | — | active | — | fresh |
| 사이트 개편 | 접근성 점검 | (9,4) | Star | high | T−3d | — | active | — | fresh |
| 사이트 개편 | 메타 태그 점검 | (9,5) | Lightbulb | mid | T−4d | — | active | — | fresh |
| 사이트 개편 | 푸터 링크 정리 | (13,1) | Tag | low | T−5d | — | active | — | fresh |
| 사이트 개편 | 쿠키 안내 문구 | (13,2) | Bookmark | — | T−0.5d | — | active | — | fresh |
| 사이트 개편 | 404 페이지 만들기 | (13,3) | ClipboardList | mid | T−1d | — | active | — | fresh |
| 사이트 개편 | 파비콘 교체 | (13,4) | Zap | — | T−2d | — | active | — | fresh |
| 사이트 개편 | 배포 일정 공유 | (13,5) | Heart | low | T−3d | — | active | — | fresh |
| 장소 | 장소 예약하기 | (9,1) | FileText | high | T−4d | T+2d | active | 후보지 3곳 추리기 (complete); 1순위 장소에 전화하기 (incomplete, time T+1.5d); 예약금 내기 (incomplete, time T+2d) | fresh, urgency 2 |
| 장소 | 현장 답사 일정 | (9,2) | Target | high | T−5d | — | active | — | fresh |
| 장소 | 주차 안내 확인 | (13,1) | Pin | mid | T−4d | — | active | — | fresh |
| 장소 | 방 구성 확인 | (13,2) | Star | low | T−5d | — | active | — | fresh |
| 장소 | 지난 분기 회고 노트 | (13,3) | Lightbulb | — | T−20d | — | archived T−5d | — | hidden from the Grid |
| 프로그램 | 전체 시간표 짜기 | (9,1) | Tag | mid | T−4d | — | active | — | fresh |
| 프로그램 | 진행자 정하기 | (9,2) | Bookmark | — | T−5d | — | active | — | fresh |
| 프로그램 | 대체 프로그램 | (9,3) | ClipboardList | low | T−4d | — | active | — | fresh |
| 프로그램 | 시상 계획 | (13,1) | Zap | high | T−5d | — | active | — | fresh |
| 프로그램 | 사진 담당 정하기 | (13,2) | Heart | mid | T−4d | — | active | — | fresh |
| 예산 | 항목별 견적 받기 | (9,1) | FileText | low | T−4d | — | active | — | fresh |
| 예산 | 카드 한도 확인 | (9,2) | Target | — | T−5d | — | active | — | fresh |
| 예산 | 지출 기록표 | (9,3) | Pin | mid | T−4d | — | active | — | fresh |
| 예산 | 환불 규정 확인 | (13,1) | Star | — | T−5d | — | active | — | fresh |
| 예산 | 현금 영수증 요청 | (13,2) | Lightbulb | low | T−4d | — | active | — | fresh |
| 교통 | 버스 대절 문의 | (9,1) | Tag | high | T−4d | — | active | — | fresh |
| 교통 | 집합 장소 공지 | (9,2) | Bookmark | mid | T−5d | — | active | — | fresh |
| 교통 | 카풀 명단 | (9,3) | ClipboardList | low | T−4d | — | active | — | fresh |
| 교통 | 톨게이트 비용 | (13,1) | Zap | — | T−5d | — | active | — | fresh |
| 교통 | 귀가 시간 확인 | (13,2) | Heart | mid | T−4d | — | active | — | fresh |
| 식사 | 메뉴 후보 3개 | (9,1) | FileText | — | T−4d | — | active | — | fresh |
| 식사 | 알레르기 표시 | (9,2) | Target | low | T−5d | — | active | — | fresh |
| 식사 | 도시락 주문 | (9,3) | Pin | high | T−4d | — | active | — | fresh |
| 식사 | 음료 수량 | (13,1) | Star | mid | T−5d | — | active | — | fresh |
| 식사 | 식기 준비 | (13,2) | Lightbulb | low | T−4d | — | active | — | fresh |
| 준비물 | 노트북 충전기 목록 | (9,1) | Tag | — | T−4d | — | active | — | fresh |
| 준비물 | 응급 키트 | (9,2) | Bookmark | mid | T−5d | — | active | — | fresh |
| 준비물 | 현수막 제작 | (9,3) | ClipboardList | — | T−4d | — | active | — | fresh |
| 준비물 | 필기구 준비 | (13,1) | Zap | low | T−5d | — | active | — | fresh |
| 준비물 | 쓰레기봉투 | (13,2) | Heart | high | T−4d | — | active | — | fresh |
| 후속 | 사진 공유하기 | (9,1) | FileText | mid | T−4d | — | active | — | fresh |
| 후속 | 만족도 조사 분석 | (9,2) | Target | low | T−5d | — | active | — | fresh |
| 후속 | 다음 일정 제안 | (9,3) | Pin | — | T−4d | — | active | — | fresh |
| 후속 | 비용 정산 마무리 | (13,1) | Star | mid | T−5d | — | active | — | fresh |
| 후속 | 감사 메시지 보내기 | (13,2) | Lightbulb | — | T−4d | — | active | — | fresh |
| 팀 워크숍 | 일정표 보내기 | (9,1) | Tag | mid | T−4d | T+3d | active | — | fresh, urgency 1 |
| 팀 워크숍 | 식단 조사하기 | (9,2) | Bookmark | low | T−4d | — | complete | — | fresh, complete |
| 팀 워크숍 | 참석자 확인하기 | (9,3) | ClipboardList | low | T−4d | — | active | — | fresh |
| 팀 워크숍 | 이동 수단 정리 | (9,4) | Zap | high | T−6d | — | active | — | stagnant |
| 팀 워크숍 | 비상 연락망 만들기 | (9,5) | Heart | mid | T−4d | — | active | — | fresh |
| 팀 워크숍 | 명찰 준비 | (13,1) | FileText | low | T−5d | — | active | — | fresh |
| 팀 워크숍 | 간식 구매 | (13,2) | Target | — | T−4d | — | active | — | fresh |
| 팀 워크숍 | 단체 사진 계획 | (13,3) | Pin | mid | T−6d | — | active | — | stagnant |
| 팀 워크숍 | 날씨 확인 | (13,4) | Star | — | T−4d | — | active | — | fresh |
| 팀 워크숍 | 안전 수칙 공유 | (13,5) | Lightbulb | low | T−5d | — | active | — | fresh |
| 짐 싸기 | 책 포장하기 | (9,1) | Tag | high | T−8d | — | active | — | stagnant |
| 짐 싸기 | 주방 박스 라벨 붙이기 | (9,2) | Bookmark | mid | T−9d | — | active | — | stagnant |
| 짐 싸기 | 겨울옷 압축하기 | (9,3) | ClipboardList | low | T−10d | — | active | — | stagnant |
| 짐 싸기 | 깨지기 쉬운 물건 표시 | (13,1) | Zap | — | T−11d | — | active | — | stagnant |
| 짐 싸기 | 박스 번호 매기기 | (13,2) | Heart | mid | T−8d | — | active | — | stagnant |
| 짐 풀기 | 침실부터 풀기 | (9,1) | FileText | — | T−8d | — | active | — | stagnant |
| 짐 풀기 | 가구 위치 정하기 | (9,2) | Target | low | T−9d | — | active | — | stagnant |
| 짐 풀기 | 빈 박스 내놓기 | (9,3) | Pin | high | T−10d | — | active | — | stagnant |
| 짐 풀기 | 주방 용품 정리 | (13,1) | Star | mid | T−11d | — | active | — | stagnant |
| 짐 풀기 | 옷장 채우기 | (13,2) | Lightbulb | low | T−8d | — | active | — | stagnant |
| 이사 당일 | 업체 도착 시간 확인 | (9,1) | Tag | — | T−8d | — | active | — | stagnant |
| 이사 당일 | 현관 비밀번호 변경 | (9,2) | Bookmark | mid | T−9d | — | active | — | stagnant |
| 이사 당일 | 엘리베이터 예약 | (9,3) | ClipboardList | — | T−10d | — | active | — | stagnant |
| 이사 당일 | 계량기 사진 찍기 | (13,1) | Zap | low | T−11d | — | active | — | stagnant |
| 이사 당일 | 열쇠 인계 | (13,2) | Heart | high | T−8d | — | active | — | stagnant |
| 이사 | 우편물 전송 신청 | (9,1) | FileText | mid | T−8d | — | active | — | stagnant |
| 이사 | 기존 인터넷 해지 | (9,2) | Target | low | T−9d | T+14d | active | — | stagnant |
| 이사 | 주소 변경 신고 | (9,3) | Pin | — | T−10d | — | active | — | stagnant |
| 이사 | 이사 업체 비교 | (13,1) | Star | mid | T−11d | — | active | — | stagnant |
| 이사 | 폐기물 신고 | (13,2) | Lightbulb | — | T−8d | — | active | — | stagnant |
| 청소 | 에어컨 필터 씻기 | (9,1) | Tag | low | T−8d | — | active | — | stagnant |
| 청소 | 베란다 정리 | (9,2) | Bookmark | high | T−9d | — | active | — | stagnant |
| 청소 | 욕실 곰팡이 제거 | (9,3) | ClipboardList | mid | T−10d | — | active | — | stagnant |
| 청소 | 냉장고 비우기 | (13,1) | Zap | low | T−11d | — | active | — | stagnant |
| 청소 | 창틀 닦기 | (13,2) | Heart | — | T−8d | — | active | — | stagnant |
| 장보기 | 주간 장보기 목록 | (9,1) | FileText | mid | T−8d | — | active | — | stagnant |
| 장보기 | 세제 재고 확인 | (9,2) | Target | — | T−9d | — | active | — | stagnant |
| 장보기 | 쌀 주문하기 | (9,3) | Pin | low | T−10d | — | active | — | stagnant |
| 장보기 | 과일 사기 | (13,1) | Star | high | T−11d | — | active | — | stagnant |
| 장보기 | 생수 배송 | (13,2) | Lightbulb | mid | T−8d | — | active | — | stagnant |
| 수리 | 문고리 교체 | (9,1) | Tag | low | T−8d | — | active | — | stagnant |
| 수리 | 방충망 수선 | (9,2) | Bookmark | — | T−9d | — | active | — | stagnant |
| 수리 | 싱크대 배수 점검 | (9,3) | ClipboardList | mid | T−10d | — | active | — | stagnant |
| 수리 | 벽지 얼룩 제거 | (13,1) | Zap | — | T−11d | — | active | — | stagnant |
| 수리 | 서랍 레일 교체 | (13,2) | Heart | low | T−8d | — | active | — | stagnant |
| 요리 | 주간 식단 짜기 | (9,1) | FileText | high | T−8d | — | active | — | stagnant |
| 요리 | 냉동 식재료 정리 | (9,2) | Target | mid | T−9d | — | active | — | stagnant |
| 요리 | 밑반찬 만들기 | (9,3) | Pin | low | T−10d | — | active | — | stagnant |
| 요리 | 조미료 채우기 | (13,1) | Star | — | T−11d | — | active | — | stagnant |
| 요리 | 도시락통 씻기 | (13,2) | Lightbulb | mid | T−8d | — | active | — | stagnant |
| 행정 | 주민등록 등본 발급 | (9,1) | Tag | — | T−8d | — | active | — | stagnant |
| 행정 | 자동차 보험 갱신 | (9,2) | Bookmark | low | T−9d | — | active | — | stagnant |
| 행정 | 건강보험 확인 | (9,3) | ClipboardList | high | T−10d | — | active | — | stagnant |
| 행정 | 세금 고지서 확인 | (13,1) | Zap | mid | T−11d | — | active | — | stagnant |
| 행정 | 이사 신고 | (13,2) | Heart | low | T−8d | — | active | — | stagnant |
| 정리 | 옷장 정리하기 | (9,1) | FileText | — | T−8d | — | active | — | stagnant |
| 정리 | 서류함 비우기 | (9,2) | Target | mid | T−9d | — | active | — | stagnant |
| 정리 | 책 기부하기 | (9,3) | Pin | — | T−10d | — | active | — | stagnant |
| 정리 | 사진 백업하기 | (13,1) | Star | low | T−11d | — | active | — | stagnant |
| 정리 | 계절 옷 바꾸기 | (13,2) | Lightbulb | high | T−8d | — | active | — | stagnant |
| 집안일 | 여권 갱신하기 | (9,1) | Tag | high | T−8d | T+30d | active | — | stagnant |
| 집안일 | 치과 예약하기 | (9,2) | Bookmark | mid | T−9d | — | active | — | stagnant |
| 집안일 | 자전거 고치기 | (9,3) | ClipboardList | low | T−10d | — | active | — | stagnant |
| 집안일 | 세탁기 청소 | (9,4) | Zap | — | T−11d | — | active | — | stagnant |
| 집안일 | 전구 교체 | (9,5) | Heart | mid | T−8d | — | active | — | stagnant |
| 집안일 | 택배 반품 | (13,1) | FileText | — | T−8d | — | active | — | stagnant |
| 집안일 | 보일러 점검 | (13,2) | Target | low | T−9d | — | active | — | stagnant |
| 집안일 | 분리배출표 붙이기 | (13,3) | Pin | high | T−10d | — | active | — | stagnant |
| 집안일 | 공과금 확인 | (13,4) | Star | mid | T−11d | — | active | — | stagnant |
| 집안일 | 열쇠 복사 | (13,5) | Lightbulb | low | T−8d | — | active | — | stagnant |
| Tech books | Reread DDIA chapter 3 | (9,1) | Tag | low | T−12d | — | active | — | neglected |
| Tech books | Order the Rust book | (9,2) | Bookmark | — | T−14d | — | active | — | neglected |
| Tech books | Compare two SQL books | (9,3) | ClipboardList | mid | T−16d | — | active | — | neglected |
| Tech books | Index design notes | (13,1) | Zap | — | T−12d | — | active | — | neglected |
| Tech books | Isolation levels | (13,2) | Heart | low | T−14d | — | active | — | neglected |
| Fiction | Finish the novel | (9,1) | FileText | high | T−6d | — | active | — | stagnant |
| Fiction | Pick a book club title | (9,2) | Target | mid | T−8d | — | active | — | stagnant |
| Fiction | Reread the first chapter | (9,3) | Pin | low | T−10d | — | active | — | stagnant |
| Fiction | Find a translated poet | (13,1) | Star | — | T−12d | — | active | — | neglected |
| Fiction | Mark favorite quotes | (13,2) | Lightbulb | mid | T−6d | — | active | — | stagnant |
| Podcasts | Queue three episodes | (9,1) | Tag | — | T−6d | — | active | — | stagnant |
| Podcasts | Find a design podcast | (9,2) | Bookmark | low | T−8d | — | active | — | stagnant |
| Podcasts | Clean the playlist | (9,3) | ClipboardList | high | T−10d | — | active | — | stagnant |
| Podcasts | Rate last week's picks | (13,1) | Zap | mid | T−12d | — | active | — | neglected |
| Podcasts | Share one episode | (13,2) | Heart | low | T−6d | — | active | — | stagnant |
| Articles | Save the RLS article | (9,1) | FileText | — | T−6d | — | active | — | stagnant |
| Articles | Archive old tabs | (9,2) | Target | mid | T−8d | — | active | — | stagnant |
| Articles | Summarize one essay | (9,3) | Pin | — | T−10d | — | active | — | stagnant |
| Articles | Tag the saved links | (13,1) | Star | low | T−12d | — | active | — | neglected |
| Articles | Read the long one | (13,2) | Lightbulb | high | T−6d | — | active | — | stagnant |
| Papers | Print the Raft paper | (9,1) | Tag | mid | T−6d | — | active | — | stagnant |
| Papers | Annotate the CRDT paper | (9,2) | Bookmark | low | T−8d | — | active | — | stagnant |
| Papers | List open questions | (9,3) | ClipboardList | — | T−10d | — | active | — | stagnant |
| Papers | Find the follow-up paper | (13,1) | Zap | mid | T−12d | — | active | — | neglected |
| Papers | Share notes with team | (13,2) | Heart | — | T−6d | — | active | — | stagnant |
| Wishlist | Add three titles | (9,1) | FileText | low | T−6d | — | active | — | stagnant |
| Wishlist | Compare used prices | (9,2) | Target | high | T−8d | — | active | — | stagnant |
| Wishlist | Share with a friend | (9,3) | Pin | mid | T−10d | — | active | — | stagnant |
| Wishlist | Check the library stock | (13,1) | Star | low | T−12d | — | active | — | neglected |
| Wishlist | Set a price alert | (13,2) | Lightbulb | — | T−6d | — | active | — | stagnant |
| Newsletters | Unsubscribe from five | (9,1) | Tag | mid | T−6d | — | active | — | stagnant |
| Newsletters | Pick two favorites | (9,2) | Bookmark | — | T−8d | — | active | — | stagnant |
| Newsletters | Set a Friday slot | (9,3) | ClipboardList | low | T−10d | — | active | — | stagnant |
| Newsletters | Reply to one author | (13,1) | Zap | high | T−12d | — | active | — | neglected |
| Newsletters | Clear the inbox | (13,2) | Heart | mid | T−6d | — | active | — | stagnant |
| Reading list | Finish Clean Code | (9,1) | FileText | mid | T−5d | — | active | — | fresh |
| Reading list | Read the RLS docs | (9,2) | Target | low | T−6d | — | active | — | stagnant |
| Reading list | Skim React 19 notes | (9,3) | Pin | low | T−11d | — | active | — | stagnant |
| Reading list | Pick next month's book | (9,4) | Star | — | T−14d | — | active | — | neglected |
| Reading list | Update the reading log | (9,5) | Lightbulb | mid | T−18d | — | active | — | neglected |
| Reading list | Return the library books | (13,1) | Tag | — | T−5d | — | active | — | fresh |
| Reading list | Order the paperback | (13,2) | Bookmark | low | T−6d | — | active | — | stagnant |
| Reading list | Review reading goals | (13,3) | ClipboardList | high | T−11d | — | active | — | stagnant |
| Reading list | Share a book note | (13,4) | Zap | mid | T−14d | — | active | — | neglected |
| Reading list | Set a daily reading time | (13,5) | Heart | low | T−18d | — | active | — | neglected |
| 문법 | 과거형 정리하기 | (9,1) | FileText | — | T−14d | — | active | — | neglected |
| 듣기 | 팟캐스트 구독하기 | (9,1) | Target | mid | T−14d | — | active | — | neglected |
| 스페인어 | 5단원 끝내기 | (9,1) | Pin | mid | T−14d | — | active | — | neglected |
| 스페인어 | 언어 교환 파트너 찾기 | (9,2) | Star | — | T−16d | — | active | — | neglected |
| 스페인어 | 자막 없이 한 편 보기 | (13,1) | Lightbulb | low | T−20d | — | active | — | neglected |
| 기획 | 핵심 기능 3개 고르기 | (9,1) | Tag | high | T−2d | — | active | — | fresh |
| 화면 | 온보딩 와이어프레임 | (9,1) | Bookmark | mid | T−2d | — | active | — | fresh |
| 습관 앱 | 첫 화면 스케치 | (9,1) | ClipboardList | mid | T−2d | T+5d | active | 종이 와이어프레임 (complete); 폰트 고르기 (incomplete, time T+4d) | fresh |
| 습관 앱 | Ship a landing page | (9,2) | Zap | high | T−3d | T+14d | active | — | fresh |
| 습관 앱 | README 쓰기 | (13,1) | Heart | low | T−2d | — | active | — | fresh |
| 러닝 | 주 3회 코스 짜기 | (9,1) | FileText | low | T−1d | — | active | — | fresh |
| 근력 | 스쿼트 자세 점검 | (9,1) | Target | — | T−1d | — | active | — | fresh |
| 운동 | 10km 대회 접수 | (9,1) | Pin | high | T−1d | T+12d | active | — | fresh |
| 운동 | 러닝화 사기 | (9,2) | Star | mid | T−2d | — | active | — | fresh |
| 운동 | 스트레칭 루틴 정하기 | (13,1) | Lightbulb | — | T−1d | — | active | — | fresh |
| 연금 | 수령 시기 알아보기 | (9,1) | Tag | low | T−6d | — | active | — | stagnant |
| 보험 | 보험 목록 정리 | (9,1) | Bookmark | high | T−6d | — | active | — | stagnant |
| 재테크 | 연말정산 서류 모으기 | (9,1) | ClipboardList | high | T−6d | T+20d | active | — | stagnant |
| 재테크 | 월 예산 정하기 | (9,2) | Zap | mid | T−9d | — | active | — | stagnant |
| 재테크 | 비상금 통장 만들기 | (13,1) | Heart | low | T−6d | — | active | — | stagnant |
| 고정비 | 월세 확인하기 | (9,1) | FileText | — | T−6d | — | active | — | stagnant |
| 변동비 | 식비 한도 정하기 | (9,1) | Target | mid | T−6d | — | active | — | stagnant |
| 가계부 | 이번 달 지출 입력 | (9,1) | Pin | — | T−6d | — | active | — | stagnant |
| 가계부 | 카드 내역 대조 | (9,2) | Star | low | T−9d | — | active | — | stagnant |
| 가계부 | 영수증 정리 | (13,1) | Lightbulb | high | T−6d | — | active | — | stagnant |
| 치과 | 스케일링 예약 | (9,1) | Tag | mid | T−6d | — | active | — | stagnant |
| 안과 | 시력 검사 예약 | (9,1) | Bookmark | low | T−6d | — | active | — | stagnant |
| 건강검진 | 검진 예약하기 | (9,1) | ClipboardList | — | T−6d | — | active | — | stagnant |
| 건강검진 | 결과지 보관하기 | (9,2) | Zap | mid | T−9d | — | active | — | stagnant |
| 건강검진 | 병원 위치 확인 | (13,1) | Heart | — | T−6d | — | active | — | stagnant |
| 장비 | 침낭 상태 확인 | (9,1) | FileText | low | T−6d | — | active | — | stagnant |
| 장소 | 근교 캠핑장 찾기 | (9,1) | Target | high | T−6d | — | active | — | stagnant |
| 캠핑 | 텐트 방수 점검 | (9,1) | Pin | mid | T−6d | — | active | — | stagnant |
| 캠핑 | 예약 오픈일 알림 | (9,2) | Star | low | T−9d | — | active | — | stagnant |
| 캠핑 | 랜턴 충전 | (13,1) | Lightbulb | — | T−6d | — | active | — | stagnant |
| Japan | Buy a rail pass | (9,1) | Tag | mid | T−3d | — | active | — | fresh |
| Lisbon | Find a tram route | (9,1) | Bookmark | — | T−3d | — | active | — | fresh |
| Travel | Book the flights | (9,1) | ClipboardList | high | T−3d | T+25d | active | — | fresh |
| Travel | Check the visa rules | (9,2) | Zap | low | T−6d | — | active | — | stagnant |
| Travel | Renew travel insurance | (13,1) | Heart | high | T−3d | — | active | — | fresh |
| Weeknight | Sheet pan dinners | (9,1) | FileText | mid | T−1d | — | active | — | fresh |
| Baking | Feed the starter | (9,1) | Target | low | T−1d | — | active | — | fresh |
| Cooking | Try the miso soup recipe | (9,1) | Pin | — | T−1d | — | active | — | fresh |
| Cooking | Plan the weekly menu | (9,2) | Star | mid | T−3d | — | active | — | fresh |
| Cooking | Restock the spice shelf | (13,1) | Lightbulb | — | T−1d | — | active | — | fresh |
| Portraits | Book a model day | (9,1) | Tag | low | T−6d | — | active | — | stagnant |
| Landscapes | Plan the sunrise shoot | (9,1) | Bookmark | high | T−6d | — | active | — | stagnant |
| Photography | Edit the trip photos | (9,1) | ClipboardList | mid | T−6d | — | active | — | stagnant |
| Photography | Back up the SD cards | (9,2) | Zap | low | T−9d | — | active | — | stagnant |
| Photography | Clean the lens | (13,1) | Heart | — | T−6d | — | active | — | stagnant |
| Docs | Fix the README typos | (9,1) | FileText | mid | T−6d | — | active | — | stagnant |
| Releases | Tag the next release | (9,1) | Target | — | T−6d | — | active | — | stagnant |
| Open source | Triage the open issues | (9,1) | Pin | low | T−6d | — | active | — | stagnant |
| Open source | Reply to the PR review | (9,2) | Star | high | T−9d | — | active | — | stagnant |
| Open source | Update the changelog | (13,1) | Lightbulb | mid | T−6d | — | active | — | stagnant |

"색상 팔레트 정하기" is completed by its Chunks; "식단 조사하기" is completed by hand. Chunk times never pass their Bit's deadline; Bit deadlines never pass their Node's.

## Inbox Scratches

| Scratch | Cell | Created | Breakdown rows | Staged | Expected state |
|---|---|---|---|---|---|
| Plan the field study | (3,0) | T−45min | Review the field notes; Draft the study summary; Book the meeting room; Send the participant list; Archive the old drafts | Review the field notes → node; Draft the study summary → bit | open rows, 2 staged |
| 주말 여행 아이디어 | (4,0) | T−1.08d | 기차 시간 확인하기; 반려견 동반 숙소 찾기; 등산화 챙기기; 민수에게 차 빌릴 수 있는지 묻기 | — | open rows |
| 엄마 선물 아이디어 | (5,0) | T−3d | none (empty Scratch) | — | empty |
| Questions for Monday's stand-up | (6,0) | T−6d | Is the deploy freeze still on?; Who owns the analytics ticket? | — | open rows |
