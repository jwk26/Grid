# DP-SAAS-02 — Demo seed for new guests

Status: approved by the owner (Task 237, Stage 1, 2026-10-31); reworked twice on 2026-10-31 after the visual check: first for placement (the Bits crowded the left near the breadcrumb), then for quantity (the seed was still too thin; the guest limits stay, the seed fills the screens a visitor opens first; user, advisory reviews at the Task finish). The second rework awaits the owner's visual check.

Times: T is the copy time; `mtime` is `T − n days`, deadlines are `T + n days` with `deadline_all_day = false`. Aging and urgency are computed from these at render time, so they move while the visitor stays (aging: fresh ≤ 5 days, stagnant ≤ 11, neglected beyond; urgency 1/2/3 at ≤ 3/2/1 days).

## Rules

- **Reserved block:** every Node and Bit cell has `x` ≥ 3 or `y` ≥ 2 at every level (F34). The L0 cells (3,0) and (4,0), where Inbox and Archive land while the block is reserved, hold no seed item; after Task 249 they move to (0,0) and (1,0).
- **Placement (SPEC `/grid/[nodeId]` Level 1-2 content):** inside a Node, sub-Nodes sit in the left zone at `x` ≤ 7 (up to eight cells: (2,2), (4,2), (6,2), (2,4), (4,4), (6,4), (2,6), (4,6); the auto-placement origin is (2,2)) and Bits in the right zone in two columns at `x` 9 and 13 (a Bit card spans two cells, so 9–10 and 13–14), stacked from `y` 1 (at most 16 Bits per Grid, 18 is the zone's own limit). L0 seed Nodes take the cells `x` 5, 7, 9, 11, 13, 15 by `y` 2 to 6. A Node at level 2 holds Bits only. L0 holds Nodes only.
- **Shape:** 30 L0 seed Nodes (19 Korean, 11 English; with Inbox and Archive 19:13); 10 of them hold sub-Nodes (42 at level 1, 13 at level 2, in the trees of 사이트 개편, 팀 워크숍, 집안일, Reading list, 스페인어, Travel); 자격증, 블로그, 이직 준비, 부모님 선물, 반려식물, 캠핑, 영상 편집, 가계부, 모임 총무, 인테리어, 건강검진, 취미 도예, Photography, Music, Gardening, Movies, Podcast ideas, Open source, Side hustle, Language notes hold Bits only. The four Nodes a visitor opens first (사이트 개편, 팀 워크숍, 집안일, Reading list) hold eight sub-Nodes and 12 Bits each; every other Node holds a few.
- **Totals:** 85 Nodes (+ Inbox, Archive), 258 Bits (2 archived, 1 trashed) + 4 Scratches, 10 Chunks, 11 Scratch rows, 2 staged candidates. Guest limits: 100 / 300 / 1,000 / 300.
- **Language (user, 2026-10-31):** one seed for every visitor, mostly Korean with some English, no variants. Inside Nodes (55 sub-Nodes, 258 Bits, 4 Scratches = 317 items): 221 Korean, 96 English (about 7:3). Chunks and Breakdown rows follow their parent; a Korean sentence with an English proper noun counts as Korean. Korean Node titles stay around 6 characters; Bit titles stay within 14 Korean or 24 English characters.
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
| 개발 | 사이트 개편 (L0) | (4,2) | Code | T−0.5d | T+7d | fresh |
| 프런트 | 개발 (L1) | (2,2) | Layers | T−0.5d | T+7d | fresh |
| 백엔드 | 개발 (L1) | (4,2) | Settings | T−0.5d | T−1d | fresh, overdue |
| 인프라 | 개발 (L1) | (6,2) | Cloud | T−0.5d | — | fresh |
| 콘텐츠 | 사이트 개편 (L0) | (6,2) | FileText | T−0.5d | — | fresh |
| 마케팅 | 사이트 개편 (L0) | (2,4) | Zap | T−0.5d | — | fresh |
| 법무 | 사이트 개편 (L0) | (4,4) | Lock | T−0.5d | — | fresh |
| 테스트 | 사이트 개편 (L0) | (6,4) | Target | T−0.5d | — | fresh |
| 운영 | 사이트 개편 (L0) | (2,6) | Settings | T−0.5d | — | fresh |
| 분석 | 사이트 개편 (L0) | (4,6) | Compass | T−0.5d | — | fresh |
| 팀 워크숍 | L0 | (7,2) | Users | T−4d | T+3d | fresh, urgency 1 |
| 장소 | 팀 워크숍 (L0) | (2,2) | Building2 | T−4d | T+2d | fresh, urgency 2 |
| 프로그램 | 팀 워크숍 (L0) | (4,2) | Target | T−4d | — | fresh |
| 오전 세션 | 프로그램 (L1) | (2,2) | Mic | T−4d | — | fresh |
| 오후 세션 | 프로그램 (L1) | (4,2) | Gamepad2 | T−4d | — | fresh |
| 예산 | 팀 워크숍 (L0) | (6,2) | Wallet | T−4d | — | fresh |
| 교통 | 팀 워크숍 (L0) | (2,4) | Car | T−4d | — | fresh |
| 식사 | 팀 워크숍 (L0) | (4,4) | Coffee | T−4d | — | fresh |
| 숙소 | 팀 워크숍 (L0) | (6,4) | Home | T−4d | — | fresh |
| 준비물 | 팀 워크숍 (L0) | (2,6) | Box | T−4d | — | fresh |
| 후속 | 팀 워크숍 (L0) | (4,6) | Star | T−4d | — | fresh |
| 집안일 | L0 | (9,2) | Home | T−8d | T+30d | stagnant |
| 이사 | 집안일 (L0) | (2,2) | ListTodo | T−8d | T+14d | stagnant |
| 짐 싸기 | 이사 (L1) | (2,2) | Box | T−8d | — | stagnant |
| 짐 풀기 | 이사 (L1) | (4,2) | FolderOpen | T−8d | — | stagnant |
| 이사 당일 | 이사 (L1) | (6,2) | Pin | T−8d | — | stagnant |
| 청소 | 집안일 (L0) | (4,2) | Hammer | T−8d | — | stagnant |
| 장보기 | 집안일 (L0) | (6,2) | ShoppingCart | T−8d | — | stagnant |
| 수리 | 집안일 (L0) | (2,4) | Hammer | T−8d | — | stagnant |
| 요리 | 집안일 (L0) | (4,4) | Coffee | T−8d | — | stagnant |
| 행정 | 집안일 (L0) | (6,4) | ClipboardList | T−8d | — | stagnant |
| 정리 | 집안일 (L0) | (2,6) | FolderOpen | T−8d | — | stagnant |
| 계절 | 집안일 (L0) | (4,6) | Moon | T−8d | — | stagnant |
| Reading list | L0 | (11,2) | BookOpen | T−5d | — | fresh |
| Tech books | Reading list (L0) | (2,2) | Book | T−12d | — | neglected |
| Databases | Tech books (L1) | (2,2) | Layers | T−12d | — | neglected |
| Frontend | Tech books (L1) | (4,2) | Code | T−12d | — | neglected |
| Rust | Tech books (L1) | (6,2) | Hammer | T−12d | — | neglected |
| Fiction | Reading list (L0) | (4,2) | Bookmark | T−6d | — | stagnant |
| Podcasts | Reading list (L0) | (6,2) | Headphones | T−6d | — | stagnant |
| Articles | Reading list (L0) | (2,4) | FileText | T−6d | — | stagnant |
| Papers | Reading list (L0) | (4,4) | ClipboardList | T−6d | — | stagnant |
| Newsletters | Reading list (L0) | (6,4) | MessageSquare | T−6d | — | stagnant |
| Audiobooks | Reading list (L0) | (2,6) | Mic | T−6d | — | stagnant |
| Wishlist | Reading list (L0) | (4,6) | Gift | T−6d | — | stagnant |
| 스페인어 | L0 | (13,2) | GraduationCap | T−14d | — | neglected |
| 문법 | 스페인어 (L0) | (2,2) | Book | T−14d | — | neglected |
| 듣기 | 스페인어 (L0) | (4,2) | Headphones | T−14d | — | neglected |
| 드라마 | 듣기 (L1) | (2,2) | Video | T−14d | — | neglected |
| 습관 앱 | L0 | (15,2) | Rocket | T−2d | T+14d | fresh |
| 기획 | 습관 앱 (L0) | (2,2) | ClipboardList | T−2d | — | fresh |
| 화면 | 습관 앱 (L0) | (4,2) | PenTool | T−2d | — | fresh |
| 운동 | L0 | (5,3) | Dumbbell | T−1d | T+12d | fresh |
| 러닝 | 운동 (L0) | (2,2) | Timer | T−1d | — | fresh |
| 근력 | 운동 (L0) | (4,2) | Dumbbell | T−1d | — | fresh |
| 재테크 | L0 | (7,3) | Wallet | T−6d | T+20d | stagnant |
| 연금 | 재테크 (L0) | (2,2) | Diamond | T−6d | — | stagnant |
| Travel | L0 | (9,3) | Plane | T−3d | T+25d | fresh |
| Japan | Travel (L0) | (2,2) | Map | T−3d | — | fresh |
| Kyoto | Japan (L1) | (2,2) | Compass | T−3d | — | fresh |
| Lisbon | Travel (L0) | (4,2) | Camera | T−3d | — | fresh |
| Cooking | L0 | (11,3) | Coffee | T−1d | — | fresh |
| Weeknight | Cooking (L0) | (2,2) | Flame | T−1d | — | fresh |
| 자격증 | L0 | (13,3) | Award | T−2d | — | fresh |
| 블로그 | L0 | (15,3) | PenTool | T−2d | — | fresh |
| 이직 준비 | L0 | (5,4) | Briefcase | T−2d | — | fresh |
| 부모님 선물 | L0 | (7,4) | Gift | T−2d | — | fresh |
| 반려식물 | L0 | (9,4) | Heart | T−2d | — | fresh |
| 캠핑 | L0 | (11,4) | Compass | T−2d | — | fresh |
| 영상 편집 | L0 | (13,4) | Video | T−2d | — | fresh |
| 가계부 | L0 | (15,4) | Calculator | T−2d | — | fresh |
| 모임 총무 | L0 | (5,5) | Users | T−2d | — | fresh |
| 인테리어 | L0 | (7,5) | Home | T−2d | — | fresh |
| 건강검진 | L0 | (9,5) | Heart | T−2d | — | fresh |
| 취미 도예 | L0 | (11,5) | Palette | T−2d | — | fresh |
| Photography | L0 | (13,5) | Camera | T−2d | — | fresh |
| Music | L0 | (15,5) | Music | T−2d | — | fresh |
| Gardening | L0 | (5,6) | Flame | T−2d | — | fresh |
| Movies | L0 | (7,6) | Clapperboard | T−2d | — | fresh |
| Podcast ideas | L0 | (9,6) | Mic | T−2d | — | fresh |
| Open source | L0 | (11,6) | Code | T−2d | — | fresh |
| Side hustle | L0 | (13,6) | Briefcase | T−2d | — | fresh |
| Language notes | L0 | (15,6) | Book | T−2d | — | fresh |

## Bits

| Node | Bit | Cell | Icon | Priority | mtime | Deadline | Status | Chunks | Expected state |
|---|---|---|---|---|---|---|---|---|---|
| 디자인 | 로고 최종본 고르기 | (9,1) | FileText | high | T−0.5d | — | active | — | fresh |
| 디자인 | 아이콘 세트 정리 | (13,1) | Target | mid | T−1d | — | active | — | fresh |
| 디자인 | 모바일 시안 검토 | (9,2) | Pin | low | T−2d | — | active | — | fresh |
| 디자인 | 예전 로고 시안 | (13,2) | Star | — | T−12d | — | archived T−10d | — | hidden from the Grid |
| 프런트 | 헤더 컴포넌트 만들기 | (9,1) | Lightbulb | mid | T−0.5d | — | active | — | fresh |
| 프런트 | 이미지 지연 로딩 | (13,1) | Tag | — | T−1d | — | active | — | fresh |
| 프런트 | 다크 모드 확인 | (9,2) | Bookmark | low | T−2d | — | active | — | fresh |
| 프런트 | Set up analytics | (13,2) | ClipboardList | low | T−2d | T+7d | active | — | fresh |
| 백엔드 | 문의 폼 API 연결 | (9,1) | Zap | high | T−0.5d | — | active | — | fresh |
| 백엔드 | Redirect the old URLs | (13,1) | Heart | high | T−1d | T−1d | active | — | fresh, overdue |
| 백엔드 | 캐시 규칙 정하기 | (9,2) | FileText | mid | T−2d | — | active | — | fresh |
| 백엔드 | 백업 주기 정하기 | (13,2) | Target | low | T−3d | — | active | — | fresh |
| 인프라 | 도메인 갱신 확인 | (9,1) | Pin | — | T−0.5d | — | active | — | fresh |
| 인프라 | SSL 인증서 점검 | (13,1) | Star | mid | T−1d | — | active | — | fresh |
| 인프라 | CDN 캐시 비우기 | (9,2) | Lightbulb | — | T−2d | — | active | — | fresh |
| 개발 | 배포 파이프라인 점검 | (9,1) | Tag | low | T−0.5d | — | active | — | fresh |
| 개발 | 성능 예산 정하기 | (13,1) | Bookmark | high | T−1d | — | active | — | fresh |
| 개발 | 에러 모니터링 설정 | (9,2) | ClipboardList | mid | T−2d | — | active | — | fresh |
| 콘텐츠 | 소개 글 다듬기 | (9,1) | Zap | low | T−0.5d | — | active | — | fresh |
| 콘텐츠 | 사례 3개 정리 | (13,1) | Heart | — | T−1d | — | active | — | fresh |
| 마케팅 | 뉴스레터 초안 | (9,1) | FileText | mid | T−0.5d | — | active | — | fresh |
| 마케팅 | SNS 이미지 만들기 | (13,1) | Target | — | T−1d | — | active | — | fresh |
| 법무 | 약관 검토 요청 | (9,1) | Pin | low | T−0.5d | — | active | — | fresh |
| 법무 | 저작권 표기 확인 | (13,1) | Star | high | T−1d | — | active | — | fresh |
| 테스트 | 크로스 브라우저 확인 | (9,1) | Lightbulb | mid | T−0.5d | — | active | — | fresh |
| 테스트 | 모바일 실기기 확인 | (13,1) | Tag | low | T−1d | — | active | — | fresh |
| 운영 | 장애 연락망 정리 | (9,1) | Bookmark | — | T−0.5d | — | active | — | fresh |
| 운영 | 백업 복구 연습 | (13,1) | ClipboardList | mid | T−1d | — | active | — | fresh |
| 분석 | 전환 목표 정하기 | (9,1) | Zap | — | T−0.5d | — | active | — | fresh |
| 분석 | 방문자 대시보드 | (13,1) | Heart | low | T−1d | — | active | — | fresh |
| 사이트 개편 | 홈페이지 문구 쓰기 | (9,1) | FileText | high | T−1d | T+0.83d | active | 히어로 문구 초안 (complete, time T−1d); 후기 3개 고르기 (incomplete, time T+0.42d); 문구 교정하기 (incomplete, time T+0.75d) | fresh, urgency 3 |
| 사이트 개편 | 색상 팔레트 정하기 | (13,1) | Target | mid | T−3d | — | complete | 팔레트 3개 비교하기 (complete); 명암비 확인하기 (complete) | fresh, complete |
| 사이트 개편 | 사이트맵 정리 | (9,2) | Pin | high | T−2d | — | active | — | fresh |
| 사이트 개편 | 접근성 점검 | (13,2) | Star | mid | T−3d | — | active | — | fresh |
| 사이트 개편 | 메타 태그 점검 | (9,3) | Lightbulb | low | T−4d | — | active | — | fresh |
| 사이트 개편 | 푸터 링크 정리 | (13,3) | Tag | — | T−5d | — | active | — | fresh |
| 사이트 개편 | 쿠키 안내 문구 | (9,4) | Bookmark | mid | T−0.5d | — | active | — | fresh |
| 사이트 개편 | 404 페이지 만들기 | (13,4) | ClipboardList | — | T−1d | — | active | — | fresh |
| 사이트 개편 | 파비콘 교체 | (9,5) | Zap | low | T−2d | — | active | — | fresh |
| 사이트 개편 | 검색 노출 확인 | (13,5) | Heart | high | T−3d | — | active | — | fresh |
| 사이트 개편 | 개인정보 처리방침 | (9,6) | FileText | mid | T−4d | — | active | — | fresh |
| 사이트 개편 | 배포 일정 공유 | (13,6) | Target | low | T−5d | — | active | — | fresh |
| 장소 | 장소 예약하기 | (9,1) | Pin | high | T−4d | T+2d | active | 후보지 3곳 추리기 (complete); 1순위 장소에 전화하기 (incomplete, time T+1.5d); 예약금 내기 (incomplete, time T+2d) | fresh, urgency 2 |
| 장소 | 현장 답사 일정 | (13,1) | Star | — | T−5d | — | active | — | fresh |
| 장소 | 주차 안내 확인 | (9,2) | Lightbulb | mid | T−4d | — | active | — | fresh |
| 장소 | 지난 분기 회고 노트 | (13,2) | Tag | — | T−20d | — | archived T−5d | — | hidden from the Grid |
| 오전 세션 | 발표 순서 정하기 | (9,1) | Bookmark | low | T−4d | — | active | — | fresh |
| 오전 세션 | 슬라이드 모으기 | (13,1) | ClipboardList | high | T−5d | — | active | — | fresh |
| 오전 세션 | 마이크 점검 | (9,2) | Zap | mid | T−4d | — | active | — | fresh |
| 오후 세션 | 팀 게임 준비하기 | (9,1) | Heart | low | T−4d | — | active | — | fresh |
| 오후 세션 | 토론 주제 정하기 | (13,1) | FileText | — | T−5d | — | active | — | fresh |
| 오후 세션 | 시상 항목 정하기 | (9,2) | Target | mid | T−4d | — | active | — | fresh |
| 프로그램 | 전체 시간표 짜기 | (9,1) | Pin | — | T−4d | — | active | — | fresh |
| 프로그램 | 진행자 정하기 | (13,1) | Star | low | T−5d | — | active | — | fresh |
| 예산 | 항목별 견적 받기 | (9,1) | Lightbulb | high | T−4d | — | active | — | fresh |
| 예산 | 카드 한도 확인 | (13,1) | Tag | mid | T−5d | — | active | — | fresh |
| 교통 | 버스 대절 문의 | (9,1) | Bookmark | low | T−4d | — | active | — | fresh |
| 교통 | 집합 장소 공지 | (13,1) | ClipboardList | — | T−5d | — | active | — | fresh |
| 식사 | 메뉴 후보 3개 | (9,1) | Zap | mid | T−4d | — | active | — | fresh |
| 식사 | 알레르기 표시 | (13,1) | Heart | — | T−5d | — | active | — | fresh |
| 숙소 | 방 구성 확인 | (9,1) | FileText | low | T−4d | — | active | — | fresh |
| 숙소 | 체크인 시간 확인 | (13,1) | Target | high | T−5d | — | active | — | fresh |
| 준비물 | 노트북 충전기 목록 | (9,1) | Pin | mid | T−4d | — | active | — | fresh |
| 준비물 | 응급 키트 | (13,1) | Star | low | T−5d | — | active | — | fresh |
| 후속 | 사진 공유하기 | (9,1) | Lightbulb | — | T−4d | — | active | — | fresh |
| 후속 | 만족도 조사 분석 | (13,1) | Tag | mid | T−5d | — | active | — | fresh |
| 팀 워크숍 | 일정표 보내기 | (9,1) | Bookmark | mid | T−4d | T+3d | active | — | fresh, urgency 1 |
| 팀 워크숍 | 식단 조사하기 | (13,1) | ClipboardList | low | T−4d | — | complete | — | fresh, complete |
| 팀 워크숍 | 참석자 확인하기 | (9,2) | Zap | — | T−4d | — | active | — | fresh |
| 팀 워크숍 | 이동 수단 정리 | (13,2) | Heart | low | T−6d | — | active | — | stagnant |
| 팀 워크숍 | 비상 연락망 만들기 | (9,3) | FileText | high | T−4d | — | active | — | fresh |
| 팀 워크숍 | 명찰 준비 | (13,3) | Target | mid | T−5d | — | active | — | fresh |
| 팀 워크숍 | 간식 구매 | (9,4) | Pin | low | T−4d | — | active | — | fresh |
| 팀 워크숍 | 단체 사진 계획 | (13,4) | Star | — | T−6d | — | active | — | stagnant |
| 팀 워크숍 | 날씨 확인 | (9,5) | Lightbulb | mid | T−4d | — | active | — | fresh |
| 팀 워크숍 | 영수증 정산 방법 | (13,5) | Tag | — | T−5d | — | active | — | fresh |
| 팀 워크숍 | 후기 설문 만들기 | (9,6) | Bookmark | low | T−4d | — | active | — | fresh |
| 팀 워크숍 | 안전 수칙 공유 | (13,6) | ClipboardList | high | T−6d | — | active | — | stagnant |
| 짐 싸기 | 책 포장하기 | (9,1) | Zap | mid | T−8d | — | active | — | stagnant |
| 짐 싸기 | 주방 박스 라벨 붙이기 | (13,1) | Heart | low | T−9d | — | active | — | stagnant |
| 짐 싸기 | 겨울옷 압축하기 | (9,2) | FileText | — | T−10d | — | active | — | stagnant |
| 짐 싸기 | 깨지기 쉬운 물건 표시 | (13,2) | Target | mid | T−11d | — | active | — | stagnant |
| 짐 풀기 | 침실부터 풀기 | (9,1) | Pin | — | T−8d | — | active | — | stagnant |
| 짐 풀기 | 가구 위치 정하기 | (13,1) | Star | low | T−9d | — | active | — | stagnant |
| 짐 풀기 | 빈 박스 내놓기 | (9,2) | Lightbulb | high | T−10d | — | active | — | stagnant |
| 이사 당일 | 업체 도착 시간 확인 | (9,1) | Tag | mid | T−8d | — | active | — | stagnant |
| 이사 당일 | 현관 비밀번호 변경 | (13,1) | Bookmark | low | T−9d | — | active | — | stagnant |
| 이사 당일 | 엘리베이터 예약 | (9,2) | ClipboardList | — | T−10d | — | active | — | stagnant |
| 이사 | 우편물 전송 신청 | (9,1) | Zap | mid | T−8d | — | active | — | stagnant |
| 이사 | 기존 인터넷 해지 | (13,1) | Heart | — | T−9d | T+14d | active | — | stagnant |
| 이사 | 주소 변경 신고 | (9,2) | FileText | low | T−10d | — | active | — | stagnant |
| 청소 | 에어컨 필터 씻기 | (9,1) | Target | high | T−8d | — | active | — | stagnant |
| 청소 | 베란다 정리 | (13,1) | Pin | mid | T−9d | — | active | — | stagnant |
| 청소 | 욕실 곰팡이 제거 | (9,2) | Star | low | T−10d | — | active | — | stagnant |
| 청소 | 냉장고 비우기 | (13,2) | Lightbulb | — | T−11d | — | active | — | stagnant |
| 장보기 | 주간 장보기 목록 | (9,1) | Tag | mid | T−8d | — | active | — | stagnant |
| 장보기 | 세제 재고 확인 | (13,1) | Bookmark | — | T−9d | — | active | — | stagnant |
| 수리 | 문고리 교체 | (9,1) | ClipboardList | low | T−8d | — | active | — | stagnant |
| 수리 | 방충망 수선 | (13,1) | Zap | high | T−9d | — | active | — | stagnant |
| 요리 | 주간 식단 짜기 | (9,1) | Heart | mid | T−8d | — | active | — | stagnant |
| 요리 | 냉동 식재료 정리 | (13,1) | FileText | low | T−9d | — | active | — | stagnant |
| 행정 | 주민등록 등본 발급 | (9,1) | Target | — | T−8d | — | active | — | stagnant |
| 행정 | 자동차 보험 갱신 | (13,1) | Pin | mid | T−9d | — | active | — | stagnant |
| 정리 | 옷장 정리하기 | (9,1) | Star | — | T−8d | — | active | — | stagnant |
| 정리 | 서류함 비우기 | (13,1) | Lightbulb | low | T−9d | — | active | — | stagnant |
| 계절 | 겨울 이불 꺼내기 | (9,1) | Tag | high | T−8d | — | active | — | stagnant |
| 계절 | 제습기 점검 | (13,1) | Bookmark | mid | T−9d | — | active | — | stagnant |
| 집안일 | 여권 갱신하기 | (9,1) | ClipboardList | high | T−8d | T+30d | active | — | stagnant |
| 집안일 | 치과 예약하기 | (13,1) | Zap | low | T−9d | — | active | — | stagnant |
| 집안일 | 자전거 고치기 | (9,2) | Heart | — | T−10d | — | active | — | stagnant |
| 집안일 | 세탁기 청소 | (13,2) | FileText | mid | T−11d | — | active | — | stagnant |
| 집안일 | 전구 교체 | (9,3) | Target | — | T−8d | — | active | — | stagnant |
| 집안일 | 택배 반품 | (13,3) | Pin | low | T−8d | — | active | — | stagnant |
| 집안일 | 보일러 점검 | (9,4) | Star | high | T−9d | — | active | — | stagnant |
| 집안일 | 분리배출표 붙이기 | (13,4) | Lightbulb | mid | T−10d | — | active | — | stagnant |
| 집안일 | 우산 정리 | (9,5) | Tag | low | T−11d | — | active | — | stagnant |
| 집안일 | 화분 물주기 | (13,5) | Bookmark | — | T−8d | — | active | — | stagnant |
| 집안일 | 공과금 확인 | (9,6) | ClipboardList | mid | T−8d | — | active | — | stagnant |
| 집안일 | 열쇠 복사 | (13,6) | Zap | — | T−9d | — | active | — | stagnant |
| Databases | Index design notes | (9,1) | Heart | low | T−12d | — | active | — | neglected |
| Databases | Isolation levels | (13,1) | FileText | high | T−14d | — | active | — | neglected |
| Databases | Vacuum and bloat | (9,2) | Target | mid | T−16d | — | active | — | neglected |
| Databases | Read the WAL chapter | (13,2) | Pin | low | T−18d | — | active | — | neglected |
| Frontend | React Server Components | (9,1) | Star | — | T−12d | — | active | — | neglected |
| Frontend | CSS container queries | (13,1) | Lightbulb | mid | T−14d | — | active | — | neglected |
| Frontend | Web vitals primer | (9,2) | Tag | — | T−16d | — | active | — | neglected |
| Rust | Ownership chapter | (9,1) | Bookmark | low | T−12d | — | active | — | neglected |
| Rust | Lifetimes exercises | (13,1) | ClipboardList | high | T−14d | — | active | — | neglected |
| Rust | Build a small CLI | (9,2) | Zap | mid | T−16d | — | active | — | neglected |
| Tech books | Reread DDIA chapter 3 | (9,1) | Heart | low | T−12d | — | active | — | neglected |
| Tech books | Order the Rust book | (13,1) | FileText | low | T−14d | — | active | — | neglected |
| Fiction | Finish the novel | (9,1) | Target | — | T−6d | — | active | — | stagnant |
| Fiction | Pick a book club title | (13,1) | Pin | mid | T−8d | — | active | — | stagnant |
| Podcasts | Queue three episodes | (9,1) | Star | — | T−6d | — | active | — | stagnant |
| Podcasts | Find a design podcast | (13,1) | Lightbulb | low | T−8d | — | active | — | stagnant |
| Articles | Save the RLS article | (9,1) | Tag | high | T−6d | — | active | — | stagnant |
| Articles | Archive old tabs | (13,1) | Bookmark | mid | T−8d | — | active | — | stagnant |
| Papers | Print the Raft paper | (9,1) | ClipboardList | low | T−6d | — | active | — | stagnant |
| Papers | Annotate the CRDT paper | (13,1) | Zap | — | T−8d | — | active | — | stagnant |
| Newsletters | Unsubscribe from five | (9,1) | Heart | mid | T−6d | — | active | — | stagnant |
| Newsletters | Set a Friday slot | (13,1) | FileText | — | T−8d | — | active | — | stagnant |
| Audiobooks | Try a free trial | (9,1) | Target | low | T−6d | — | active | — | stagnant |
| Audiobooks | Download for the trip | (13,1) | Pin | high | T−8d | — | active | — | stagnant |
| Wishlist | Add three titles | (9,1) | Star | mid | T−6d | — | active | — | stagnant |
| Wishlist | Compare used prices | (13,1) | Lightbulb | low | T−8d | — | active | — | stagnant |
| Reading list | Finish Clean Code | (9,1) | Tag | mid | T−5d | — | active | — | fresh |
| Reading list | Read the RLS docs | (13,1) | Bookmark | — | T−6d | — | active | — | stagnant |
| Reading list | Skim React 19 notes | (9,2) | ClipboardList | low | T−11d | — | active | — | stagnant |
| Reading list | Pick next month's book | (13,2) | Zap | mid | T−14d | — | active | — | neglected |
| Reading list | Update the reading log | (9,3) | Heart | — | T−18d | — | active | — | neglected |
| Reading list | Return the library books | (13,3) | FileText | low | T−5d | — | active | — | fresh |
| Reading list | Order the paperback | (9,4) | Target | high | T−6d | — | active | — | stagnant |
| Reading list | Review reading goals | (13,4) | Pin | mid | T−11d | — | active | — | stagnant |
| Reading list | Share a book note | (9,5) | Star | low | T−14d | — | active | — | neglected |
| Reading list | Renew the library card | (13,5) | Lightbulb | — | T−18d | — | active | — | neglected |
| Reading list | Sort the to-read pile | (9,6) | Tag | mid | T−5d | — | active | — | fresh |
| Reading list | Set a daily reading time | (13,6) | Bookmark | — | T−6d | — | active | — | stagnant |
| 문법 | 과거형 정리하기 | (9,1) | ClipboardList | low | T−14d | — | active | — | neglected |
| 문법 | 접속법 예문 모으기 | (13,1) | Zap | high | T−16d | — | active | — | neglected |
| 문법 | 전치사 표 만들기 | (9,2) | Heart | mid | T−20d | — | active | — | neglected |
| 문법 | 불규칙 동사 외우기 | (13,2) | FileText | low | T−25d | — | active | — | neglected |
| 드라마 | 한 편 자막 없이 보기 | (9,1) | Target | — | T−14d | — | active | — | neglected |
| 드라마 | 대사 10개 적어두기 | (13,1) | Pin | mid | T−16d | — | active | — | neglected |
| 드라마 | 좋아하는 장면 반복 | (9,2) | Star | — | T−20d | — | active | — | neglected |
| 드라마 | 시리즈 고르기 | (13,2) | Lightbulb | low | T−25d | — | active | — | neglected |
| 듣기 | 팟캐스트 구독하기 | (9,1) | Tag | high | T−14d | — | active | — | neglected |
| 듣기 | 받아쓰기 연습 | (13,1) | Bookmark | mid | T−16d | — | active | — | neglected |
| 스페인어 | 5단원 끝내기 | (9,1) | ClipboardList | mid | T−14d | — | active | — | neglected |
| 스페인어 | 언어 교환 파트너 찾기 | (13,1) | Zap | low | T−16d | — | active | — | neglected |
| 스페인어 | 자막 없이 한 편 보기 | (9,2) | Heart | — | T−20d | — | active | — | neglected |
| 기획 | 핵심 기능 3개 고르기 | (9,1) | FileText | mid | T−2d | — | active | — | fresh |
| 기획 | 경쟁 앱 조사하기 | (13,1) | Target | — | T−3d | — | active | — | fresh |
| 기획 | 사용자 인터뷰 질문 | (9,2) | Pin | low | T−4d | — | active | — | fresh |
| 기획 | 로드맵 그리기 | (13,2) | Star | high | T−2d | — | active | — | fresh |
| 화면 | 온보딩 와이어프레임 | (9,1) | Lightbulb | mid | T−2d | — | active | — | fresh |
| 화면 | 홈 화면 색상 정하기 | (13,1) | Tag | low | T−3d | — | active | — | fresh |
| 화면 | 아이콘 후보 뽑기 | (9,2) | Bookmark | — | T−4d | — | active | — | fresh |
| 화면 | 빈 상태 문구 쓰기 | (13,2) | ClipboardList | mid | T−2d | — | active | — | fresh |
| 습관 앱 | 첫 화면 스케치 | (9,1) | Zap | mid | T−2d | T+5d | active | 종이 와이어프레임 (complete); 폰트 고르기 (incomplete, time T+4d) | fresh |
| 습관 앱 | Ship a landing page | (13,1) | Heart | high | T−3d | T+14d | active | — | fresh |
| 습관 앱 | README 쓰기 | (9,2) | FileText | low | T−2d | — | active | — | fresh |
| 습관 앱 | 출시 스레드 초안 | (13,2) | Target | — | T−4d | — | trashed T−2d | — | hidden from the Grid |
| 러닝 | Plan three weekly routes | (9,1) | Pin | low | T−1d | — | active | — | fresh |
| 러닝 | Log the pace | (13,1) | Star | high | T−2d | — | active | — | fresh |
| 러닝 | Scout park routes | (9,2) | Lightbulb | mid | T−3d | — | active | — | fresh |
| 러닝 | Set up the running app | (13,2) | Tag | low | T−1d | — | active | — | fresh |
| 근력 | 스쿼트 자세 점검 | (9,1) | Bookmark | — | T−1d | — | active | — | fresh |
| 근력 | 상체 루틴 정하기 | (13,1) | ClipboardList | mid | T−2d | — | active | — | fresh |
| 근력 | 폼롤러 구입 | (9,2) | Zap | — | T−3d | — | active | — | fresh |
| 근력 | 운동 일지 쓰기 | (13,2) | Heart | low | T−1d | — | active | — | fresh |
| 운동 | 10km 대회 접수 | (9,1) | FileText | high | T−1d | T+12d | active | — | fresh |
| 운동 | 러닝화 사기 | (13,1) | Target | high | T−2d | — | active | — | fresh |
| 운동 | 스트레칭 루틴 정하기 | (9,2) | Pin | mid | T−3d | — | active | — | fresh |
| 연금 | 수령 시기 알아보기 | (9,1) | Star | low | T−6d | — | active | — | stagnant |
| 연금 | 납입액 늘리기 | (13,1) | Lightbulb | — | T−9d | — | active | — | stagnant |
| 연금 | 세액공제 확인 | (9,2) | Tag | mid | T−11d | — | active | — | stagnant |
| 재테크 | 연말정산 서류 모으기 | (9,1) | Bookmark | high | T−6d | T+20d | active | — | stagnant |
| 재테크 | 월 예산 정하기 | (13,1) | ClipboardList | — | T−9d | — | active | — | stagnant |
| 재테크 | 비상금 통장 만들기 | (9,2) | Zap | low | T−11d | — | active | — | stagnant |
| 재테크 | 구독 서비스 점검 | (13,2) | Heart | high | T−6d | — | active | — | stagnant |
| Kyoto | List the temples | (9,1) | FileText | mid | T−3d | — | active | — | fresh |
| Kyoto | Book a tea class | (13,1) | Target | low | T−6d | — | active | — | stagnant |
| Kyoto | Mark the food streets | (9,2) | Pin | — | T−7d | — | active | — | stagnant |
| Japan | Buy a rail pass | (9,1) | Star | mid | T−3d | — | active | — | fresh |
| Japan | Reserve the ryokan | (13,1) | Lightbulb | — | T−6d | — | active | — | stagnant |
| Lisbon | Find a tram route | (9,1) | Tag | low | T−3d | — | active | — | fresh |
| Lisbon | Save fado venues | (13,1) | Bookmark | high | T−6d | — | active | — | stagnant |
| Travel | Book the flights | (9,1) | ClipboardList | high | T−3d | T+25d | active | — | fresh |
| Travel | Renew travel insurance | (13,1) | Zap | mid | T−6d | — | active | — | stagnant |
| Travel | Pick the Kyoto hotel | (9,2) | Heart | low | T−7d | — | active | — | stagnant |
| Travel | Check the visa rules | (13,2) | FileText | — | T−3d | — | active | — | fresh |
| Weeknight | Sheet pan dinners | (9,1) | Target | mid | T−1d | — | active | — | fresh |
| Weeknight | Fifteen minute pasta | (13,1) | Pin | — | T−3d | — | active | — | fresh |
| Weeknight | Batch the rice | (9,2) | Star | low | T−5d | — | active | — | fresh |
| Cooking | Try the miso soup recipe | (9,1) | Lightbulb | high | T−1d | — | active | — | fresh |
| Cooking | Restock the spice shelf | (13,1) | Tag | mid | T−3d | — | active | — | fresh |
| Cooking | Plan the weekly menu | (9,2) | Bookmark | low | T−5d | — | active | — | fresh |
| Cooking | Feed the starter | (13,2) | ClipboardList | — | T−1d | — | active | — | fresh |
| 자격증 | 정보처리 접수일 확인 | (9,1) | Zap | mid | T−2d | — | active | — | fresh |
| 자격증 | 기출문제 풀기 | (13,1) | Heart | — | T−3d | — | active | — | fresh |
| 블로그 | 다음 글 주제 정하기 | (9,1) | FileText | low | T−2d | — | active | — | fresh |
| 블로그 | 썸네일 만들기 | (13,1) | Target | high | T−3d | — | active | — | fresh |
| 이직 준비 | 이력서 최신화 | (9,1) | Pin | mid | T−2d | — | active | — | fresh |
| 이직 준비 | 포트폴리오 정리 | (13,1) | Star | low | T−3d | — | active | — | fresh |
| 부모님 선물 | 생신 선물 후보 | (9,1) | Lightbulb | — | T−2d | — | active | — | fresh |
| 부모님 선물 | 안마기 후기 찾기 | (13,1) | Tag | mid | T−3d | — | active | — | fresh |
| 반려식물 | 분갈이 시기 확인 | (9,1) | Bookmark | — | T−2d | — | active | — | fresh |
| 반려식물 | 새 화분 주문 | (13,1) | ClipboardList | low | T−3d | — | active | — | fresh |
| 캠핑 | 텐트 방수 점검 | (9,1) | Zap | high | T−2d | — | active | — | fresh |
| 캠핑 | 예약 오픈일 알림 | (13,1) | Heart | mid | T−3d | — | active | — | fresh |
| 영상 편집 | 브이로그 컷 정리 | (9,1) | FileText | low | T−2d | — | active | — | fresh |
| 영상 편집 | 자막 스타일 정하기 | (13,1) | Target | — | T−3d | — | active | — | fresh |
| 가계부 | 이번 달 지출 입력 | (9,1) | Pin | mid | T−2d | — | active | — | fresh |
| 가계부 | 카드 내역 대조 | (13,1) | Star | — | T−3d | — | active | — | fresh |
| 모임 총무 | 회비 입금 확인 | (9,1) | Lightbulb | low | T−2d | — | active | — | fresh |
| 모임 총무 | 다음 모임 장소 | (13,1) | Tag | high | T−3d | — | active | — | fresh |
| 인테리어 | 커튼 색상 고르기 | (9,1) | Bookmark | mid | T−2d | — | active | — | fresh |
| 인테리어 | 조명 후보 비교 | (13,1) | ClipboardList | low | T−3d | — | active | — | fresh |
| 건강검진 | 검진 예약하기 | (9,1) | Zap | — | T−2d | — | active | — | fresh |
| 건강검진 | 결과지 보관하기 | (13,1) | Heart | mid | T−3d | — | active | — | fresh |
| 취미 도예 | 수강 일정 확인 | (9,1) | FileText | — | T−2d | — | active | — | fresh |
| 취미 도예 | 유약 색 정하기 | (13,1) | Target | low | T−3d | — | active | — | fresh |
| Photography | Edit the trip photos | (9,1) | Pin | high | T−2d | — | active | — | fresh |
| Photography | Back up the SD cards | (13,1) | Star | mid | T−3d | — | active | — | fresh |
| Music | Learn the bridge chords | (9,1) | Lightbulb | low | T−2d | — | active | — | fresh |
| Music | Tune the guitar | (13,1) | Tag | — | T−3d | — | active | — | fresh |
| Gardening | Order tomato seeds | (9,1) | Bookmark | mid | T−2d | — | active | — | fresh |
| Gardening | Fix the drip line | (13,1) | ClipboardList | — | T−3d | — | active | — | fresh |
| Movies | Watch the director's cut | (9,1) | Zap | low | T−2d | — | active | — | fresh |
| Movies | Update the watchlist | (13,1) | Heart | high | T−3d | — | active | — | fresh |
| Podcast ideas | Draft episode titles | (9,1) | FileText | mid | T−2d | — | active | — | fresh |
| Podcast ideas | Test the microphone | (13,1) | Target | low | T−3d | — | active | — | fresh |
| Open source | Triage the open issues | (9,1) | Pin | — | T−2d | — | active | — | fresh |
| Open source | Reply to the PR review | (13,1) | Star | mid | T−3d | — | active | — | fresh |
| Side hustle | Price the first offer | (9,1) | Lightbulb | — | T−2d | — | active | — | fresh |
| Side hustle | Draft the intro email | (13,1) | Tag | low | T−3d | — | active | — | fresh |
| Language notes | Sort the vocab cards | (9,1) | Bookmark | high | T−2d | — | active | — | fresh |
| Language notes | Record a speaking test | (13,1) | ClipboardList | mid | T−3d | — | active | — | fresh |

"색상 팔레트 정하기" is completed by its Chunks; "식단 조사하기" is completed by hand. Chunk times never pass their Bit's deadline; Bit deadlines never pass their Node's.

## Inbox Scratches

| Scratch | Cell | Created | Breakdown rows | Staged | Expected state |
|---|---|---|---|---|---|
| Plan the field study | (3,0) | T−45min | Review the field notes; Draft the study summary; Book the meeting room; Send the participant list; Archive the old drafts | Review the field notes → node; Draft the study summary → bit | open rows, 2 staged |
| 주말 여행 아이디어 | (4,0) | T−1.08d | 기차 시간 확인하기; 반려견 동반 숙소 찾기; 등산화 챙기기; 민수에게 차 빌릴 수 있는지 묻기 | — | open rows |
| 엄마 선물 아이디어 | (5,0) | T−3d | none (empty Scratch) | — | empty |
| Questions for Monday's stand-up | (6,0) | T−6d | Is the deploy freeze still on?; Who owns the analytics ticket? | — | open rows |
