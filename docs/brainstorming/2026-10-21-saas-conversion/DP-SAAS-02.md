# DP-SAAS-02 — Demo seed for new guests

Status: approved by the owner (Task 237, Stage 1, 2026-10-31); reworked 2026-10-31 after the visual check (the seed had too few Nodes and Bits at every level and its Bits crowded the left near the breadcrumb; user, advisory review at the Task finish). The rework awaits the owner's visual check.

Times: T is the copy time; `mtime` is `T − n days`, deadlines are `T + n days` with `deadline_all_day = false`. Aging and urgency are computed from these at render time, so they move while the visitor stays (aging: fresh ≤ 5 days, stagnant ≤ 11, neglected beyond; urgency 1/2/3 at ≤ 3/2/1 days).

## Rules

- **Reserved block:** every Node and Bit cell has `x` ≥ 3 or `y` ≥ 2 at every level (F34). The L0 cells (3,0) and (4,0), where Inbox and Archive land while the block is reserved, hold no seed item; after Task 249 they move to (0,0) and (1,0).
- **Placement (SPEC `/grid/[nodeId]` Level 1-2 content):** inside a Node, sub-Nodes sit in the left zone at `x` ≤ 7 (cells (2,2), (4,2), (6,2), as the auto-placement origin (2,2) does) and Bits in the right zone in two columns at `x` 9 and 13 (a Bit card spans two cells, so 9–10 and 13–14), stacked from `y` 2, as the origin (15,2) does. A Node at level 2 holds Bits only. L0 holds Nodes only.
- **Shape:** 10 L0 seed Nodes (7 Korean, 3 English; with Inbox and Archive 7:5); 7 of them hold sub-Nodes (15 at level 1, 5 at level 2, in the trees of 사이트 개편, 집안일, 스페인어, Reading list); 재테크, Cooking, Travel hold Bits only. About 4 Bits per Grid.
- **Totals:** 30 Nodes (+ Inbox, Archive), 112 Bits (2 archived, 1 trashed) + 4 Scratches, 10 Chunks, 11 Scratch rows, 2 staged candidates. Guest limits: 100 / 300 / 1,000 / 300.
- **Language (user, 2026-10-31):** one seed for every visitor, mostly Korean with some English, no variants. Inside Nodes (20 sub-Nodes, 112 Bits, 4 Scratches = 136 items): 97 Korean, 39 English (about 7:3). Chunks and Breakdown rows follow their parent; a Korean sentence with an English proper noun counts as Korean. Korean Node titles stay around 6 characters; Bit titles stay within 14 Korean or 24 English characters.
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
| 콘텐츠 | 사이트 개편 (L0) | (6,2) | FileText | T−0.5d | — | fresh |
| 팀 워크숍 | L0 | (7,2) | Users | T−4d | T+3d | fresh, urgency 1 |
| 장소 | 팀 워크숍 (L0) | (2,2) | Building2 | T−4d | T+2d | fresh, urgency 2 |
| 프로그램 | 팀 워크숍 (L0) | (4,2) | Target | T−4d | — | fresh |
| 집안일 | L0 | (9,2) | Home | T−8d | T+30d | stagnant |
| 이사 | 집안일 (L0) | (2,2) | ListTodo | T−8d | T+14d | stagnant |
| 짐 싸기 | 이사 (L1) | (2,2) | Box | T−8d | — | stagnant |
| 청소 | 집안일 (L0) | (4,2) | Hammer | T−8d | — | stagnant |
| 스페인어 | L0 | (11,2) | GraduationCap | T−14d | — | neglected |
| 문법 | 스페인어 (L0) | (2,2) | Book | T−14d | — | neglected |
| 듣기 | 스페인어 (L0) | (4,2) | Headphones | T−14d | — | neglected |
| 드라마 | 듣기 (L1) | (2,2) | Video | T−14d | — | neglected |
| Reading list | L0 | (13,2) | BookOpen | T−5d | — | fresh |
| Tech books | Reading list (L0) | (2,2) | Book | T−12d | — | neglected |
| Databases | Tech books (L1) | (2,2) | Layers | T−12d | — | neglected |
| Fiction | Reading list (L0) | (4,2) | Bookmark | T−6d | — | stagnant |
| 습관 앱 | L0 | (5,4) | Rocket | T−2d | T+14d | fresh |
| 기획 | 습관 앱 (L0) | (2,2) | ClipboardList | T−2d | — | fresh |
| 화면 | 습관 앱 (L0) | (4,2) | PenTool | T−2d | — | fresh |
| 운동 | L0 | (7,4) | Dumbbell | T−1d | T+12d | fresh |
| 러닝 | 운동 (L0) | (2,2) | Timer | T−1d | — | fresh |
| 근력 | 운동 (L0) | (4,2) | Dumbbell | T−1d | — | fresh |
| 재테크 | L0 | (9,4) | Wallet | T−6d | T+20d | stagnant |
| Cooking | L0 | (11,4) | Coffee | T−1d | — | fresh |
| Travel | L0 | (13,4) | Plane | T−3d | T+25d | fresh |

## Bits

| Node | Bit | Cell | Icon | Priority | mtime | Deadline | Status | Chunks | Expected state |
|---|---|---|---|---|---|---|---|---|---|
| 디자인 | 로고 최종본 고르기 | (9,2) | FileText | high | T−0.5d | — | active | — | fresh |
| 디자인 | 아이콘 세트 정리 | (13,2) | Target | mid | T−1d | — | active | — | fresh |
| 디자인 | 버튼 스타일 정하기 | (9,3) | Pin | low | T−2d | — | active | — | fresh |
| 디자인 | 모바일 시안 검토 | (13,3) | Star | — | T−3d | — | active | — | fresh |
| 디자인 | 예전 로고 시안 | (9,4) | Lightbulb | mid | T−12d | — | archived T−10d | — | hidden from the Grid |
| 프런트 | 헤더 컴포넌트 만들기 | (9,2) | Tag | — | T−0.5d | — | active | — | fresh |
| 프런트 | 이미지 지연 로딩 | (13,2) | Bookmark | low | T−1d | — | active | — | fresh |
| 프런트 | 다크 모드 확인 | (9,3) | ClipboardList | high | T−2d | — | active | — | fresh |
| 프런트 | Set up analytics | (13,3) | Zap | low | T−2d | T+7d | active | — | fresh |
| 백엔드 | 문의 폼 API 연결 | (9,2) | Heart | mid | T−0.5d | — | active | — | fresh |
| 백엔드 | Redirect the old URLs | (13,2) | FileText | high | T−1d | T−1d | active | — | fresh, overdue |
| 백엔드 | 캐시 규칙 정하기 | (9,3) | Target | low | T−2d | — | active | — | fresh |
| 백엔드 | 백업 주기 정하기 | (13,3) | Pin | — | T−3d | — | active | — | fresh |
| 개발 | 배포 파이프라인 점검 | (9,2) | Star | mid | T−0.5d | — | active | — | fresh |
| 개발 | 성능 예산 정하기 | (13,2) | Lightbulb | — | T−1d | — | active | — | fresh |
| 콘텐츠 | 소개 글 다듬기 | (9,2) | Tag | low | T−0.5d | — | active | — | fresh |
| 콘텐츠 | 사례 3개 정리 | (13,2) | Bookmark | high | T−1d | — | active | — | fresh |
| 콘텐츠 | 블로그 일정 잡기 | (9,3) | ClipboardList | mid | T−2d | — | active | — | fresh |
| 사이트 개편 | 홈페이지 문구 쓰기 | (9,2) | Zap | high | T−1d | T+0.83d | active | 히어로 문구 초안 (complete, time T−1d); 후기 3개 고르기 (incomplete, time T+0.42d); 문구 교정하기 (incomplete, time T+0.75d) | fresh, urgency 3 |
| 사이트 개편 | 색상 팔레트 정하기 | (13,2) | Heart | mid | T−3d | — | complete | 팔레트 3개 비교하기 (complete); 명암비 확인하기 (complete) | fresh, complete |
| 사이트 개편 | 사이트맵 정리 | (9,3) | FileText | low | T−2d | — | active | — | fresh |
| 사이트 개편 | 접근성 점검 | (13,3) | Target | — | T−3d | — | active | — | fresh |
| 장소 | 장소 예약하기 | (9,2) | Pin | high | T−4d | T+2d | active | 후보지 3곳 추리기 (complete); 1순위 장소에 전화하기 (incomplete, time T+1.5d); 예약금 내기 (incomplete, time T+2d) | fresh, urgency 2 |
| 장소 | 교통편 알아보기 | (13,2) | Star | mid | T−5d | — | active | — | fresh |
| 장소 | 숙소 후보 비교 | (9,3) | Lightbulb | — | T−4d | — | active | — | fresh |
| 장소 | 주차 안내 확인 | (13,3) | Tag | low | T−5d | — | active | — | fresh |
| 장소 | 지난 분기 회고 노트 | (9,4) | Bookmark | high | T−20d | — | archived T−5d | — | hidden from the Grid |
| 프로그램 | Pick an icebreaker | (9,2) | ClipboardList | mid | T−4d | — | active | — | fresh |
| 프로그램 | Prepare the team game | (13,2) | Zap | low | T−5d | — | active | — | fresh |
| 프로그램 | Split the talk slots | (9,3) | Heart | — | T−4d | — | active | — | fresh |
| 프로그램 | Assign a photographer | (13,3) | FileText | mid | T−5d | — | active | — | fresh |
| 팀 워크숍 | 일정표 보내기 | (9,2) | Target | mid | T−4d | T+3d | active | — | fresh, urgency 1 |
| 팀 워크숍 | 식단 조사하기 | (13,2) | Pin | low | T−4d | — | complete | — | fresh, complete |
| 팀 워크숍 | 참석자 확인하기 | (9,3) | Star | — | T−4d | — | active | — | fresh |
| 짐 싸기 | 책 포장하기 | (9,2) | Lightbulb | low | T−8d | — | active | — | stagnant |
| 짐 싸기 | 주방 박스 라벨 붙이기 | (13,2) | Tag | high | T−9d | — | active | — | stagnant |
| 짐 싸기 | 겨울옷 압축하기 | (9,3) | Bookmark | mid | T−10d | — | active | — | stagnant |
| 짐 싸기 | 깨지기 쉬운 물건 표시 | (13,3) | ClipboardList | low | T−11d | — | active | — | stagnant |
| 이사 | 우편물 전송 신청 | (9,2) | Zap | — | T−8d | — | active | — | stagnant |
| 이사 | 기존 인터넷 해지 | (13,2) | Heart | mid | T−9d | T+14d | active | — | stagnant |
| 이사 | 주소 변경 신고 | (9,3) | FileText | — | T−10d | — | active | — | stagnant |
| 청소 | 에어컨 필터 씻기 | (9,2) | Target | low | T−8d | — | active | — | stagnant |
| 청소 | 베란다 정리 | (13,2) | Pin | high | T−9d | — | active | — | stagnant |
| 청소 | 욕실 곰팡이 제거 | (9,3) | Star | mid | T−10d | — | active | — | stagnant |
| 청소 | 냉장고 비우기 | (13,3) | Lightbulb | low | T−11d | — | active | — | stagnant |
| 집안일 | 여권 갱신하기 | (9,2) | Tag | high | T−8d | T+30d | active | — | stagnant |
| 집안일 | 치과 예약하기 | (13,2) | Bookmark | — | T−9d | — | active | — | stagnant |
| 집안일 | 자전거 고치기 | (9,3) | ClipboardList | mid | T−10d | — | active | — | stagnant |
| 문법 | 과거형 정리하기 | (9,2) | Zap | — | T−14d | — | active | — | neglected |
| 문법 | 접속법 예문 모으기 | (13,2) | Heart | low | T−16d | — | active | — | neglected |
| 문법 | 전치사 표 만들기 | (9,3) | FileText | high | T−20d | — | active | — | neglected |
| 문법 | 불규칙 동사 외우기 | (13,3) | Target | mid | T−25d | — | active | — | neglected |
| 드라마 | 한 편 자막 없이 보기 | (9,2) | Pin | low | T−14d | — | active | — | neglected |
| 드라마 | 대사 10개 적어두기 | (13,2) | Star | — | T−16d | — | active | — | neglected |
| 드라마 | 좋아하는 장면 반복 | (9,3) | Lightbulb | mid | T−20d | — | active | — | neglected |
| 드라마 | 시리즈 고르기 | (13,3) | Tag | — | T−25d | — | active | — | neglected |
| 듣기 | 팟캐스트 구독하기 | (9,2) | Bookmark | low | T−14d | — | active | — | neglected |
| 듣기 | 받아쓰기 연습 | (13,2) | ClipboardList | high | T−16d | — | active | — | neglected |
| 스페인어 | 5단원 끝내기 | (9,2) | Zap | mid | T−14d | — | active | — | neglected |
| 스페인어 | 언어 교환 파트너 찾기 | (13,2) | Heart | mid | T−16d | — | active | — | neglected |
| 스페인어 | 자막 없이 한 편 보기 | (9,3) | FileText | low | T−20d | — | active | — | neglected |
| Databases | Index design notes | (9,2) | Target | — | T−12d | — | active | — | neglected |
| Databases | Isolation levels | (13,2) | Pin | mid | T−14d | — | active | — | neglected |
| Databases | Vacuum and bloat | (9,3) | Star | — | T−16d | — | active | — | neglected |
| Databases | Read the WAL chapter | (13,3) | Lightbulb | low | T−18d | — | active | — | neglected |
| Tech books | Reread DDIA chapter 3 | (9,2) | Tag | low | T−12d | — | active | — | neglected |
| Tech books | Order the Rust book | (13,2) | Bookmark | high | T−14d | — | active | — | neglected |
| Fiction | Finish the novel | (9,2) | ClipboardList | mid | T−6d | — | active | — | stagnant |
| Fiction | Pick a book club title | (13,2) | Zap | low | T−8d | — | active | — | stagnant |
| Fiction | Return the library books | (9,3) | Heart | — | T−10d | — | active | — | stagnant |
| Fiction | Reread the first chapter | (13,3) | FileText | mid | T−12d | — | active | — | neglected |
| Reading list | Finish Clean Code | (9,2) | Target | mid | T−5d | — | active | — | fresh |
| Reading list | Read the RLS docs | (13,2) | Pin | — | T−6d | — | active | — | stagnant |
| Reading list | Skim React 19 notes | (9,3) | Star | low | T−11d | — | active | — | stagnant |
| 기획 | 핵심 기능 3개 고르기 | (9,2) | Lightbulb | low | T−2d | — | active | — | fresh |
| 기획 | 경쟁 앱 조사하기 | (13,2) | Tag | high | T−3d | — | active | — | fresh |
| 기획 | 사용자 인터뷰 질문 | (9,3) | Bookmark | mid | T−4d | — | active | — | fresh |
| 기획 | 로드맵 그리기 | (13,3) | ClipboardList | low | T−2d | — | active | — | fresh |
| 화면 | 온보딩 와이어프레임 | (9,2) | Zap | — | T−2d | — | active | — | fresh |
| 화면 | 홈 화면 색상 정하기 | (13,2) | Heart | mid | T−3d | — | active | — | fresh |
| 화면 | 아이콘 후보 뽑기 | (9,3) | FileText | — | T−4d | — | active | — | fresh |
| 화면 | 빈 상태 문구 쓰기 | (13,3) | Target | low | T−2d | — | active | — | fresh |
| 습관 앱 | 첫 화면 스케치 | (9,2) | Pin | mid | T−2d | T+5d | active | 종이 와이어프레임 (complete); 폰트 고르기 (incomplete, time T+4d) | fresh |
| 습관 앱 | Ship a landing page | (13,2) | Star | high | T−3d | T+14d | active | — | fresh |
| 습관 앱 | README 쓰기 | (9,3) | Lightbulb | low | T−2d | — | active | — | fresh |
| 습관 앱 | 출시 스레드 초안 | (13,3) | Tag | high | T−4d | — | trashed T−2d | — | hidden from the Grid |
| 러닝 | Plan three weekly routes | (9,2) | Bookmark | mid | T−1d | — | active | — | fresh |
| 러닝 | Log the pace | (13,2) | ClipboardList | low | T−2d | — | active | — | fresh |
| 러닝 | Scout park routes | (9,3) | Zap | — | T−3d | — | active | — | fresh |
| 러닝 | Set up the running app | (13,3) | Heart | mid | T−1d | — | active | — | fresh |
| 근력 | 스쿼트 자세 점검 | (9,2) | FileText | — | T−1d | — | active | — | fresh |
| 근력 | 상체 루틴 정하기 | (13,2) | Target | low | T−2d | — | active | — | fresh |
| 근력 | 폼롤러 구입 | (9,3) | Pin | high | T−3d | — | active | — | fresh |
| 근력 | 운동 일지 쓰기 | (13,3) | Star | mid | T−1d | — | active | — | fresh |
| 운동 | 10km 대회 접수 | (9,2) | Lightbulb | high | T−1d | T+12d | active | — | fresh |
| 운동 | 러닝화 사기 | (13,2) | Tag | low | T−2d | — | active | — | fresh |
| 운동 | 스트레칭 루틴 정하기 | (9,3) | Bookmark | — | T−3d | — | active | — | fresh |
| 재테크 | 연말정산 서류 모으기 | (9,2) | ClipboardList | high | T−6d | T+20d | active | — | stagnant |
| 재테크 | 월 예산 정하기 | (13,2) | Zap | mid | T−9d | — | active | — | stagnant |
| 재테크 | 비상금 통장 만들기 | (9,3) | Heart | — | T−11d | — | active | — | stagnant |
| 재테크 | 보험 목록 정리 | (13,3) | FileText | low | T−6d | — | active | — | stagnant |
| 재테크 | 구독 서비스 점검 | (9,4) | Target | high | T−9d | — | active | — | stagnant |
| Cooking | Try the miso soup recipe | (9,2) | Pin | mid | T−1d | — | active | — | fresh |
| Cooking | Restock the spice shelf | (13,2) | Star | low | T−3d | — | active | — | fresh |
| Cooking | Plan the weekly menu | (9,3) | Lightbulb | — | T−5d | — | active | — | fresh |
| Cooking | Feed the starter | (13,3) | Tag | mid | T−1d | — | active | — | fresh |
| Cooking | Clean the oven | (9,4) | Bookmark | — | T−3d | — | active | — | fresh |
| Travel | Book the flights | (9,2) | ClipboardList | high | T−3d | T+25d | active | — | fresh |
| Travel | Renew travel insurance | (13,2) | Zap | low | T−6d | — | active | — | stagnant |
| Travel | Pick the Kyoto hotel | (9,3) | Heart | high | T−7d | — | active | — | stagnant |
| Travel | Draft a day-by-day plan | (13,3) | FileText | mid | T−3d | — | active | — | fresh |
| Travel | Check the visa rules | (9,4) | Target | low | T−6d | — | active | — | stagnant |

"색상 팔레트 정하기" is completed by its Chunks; "식단 조사하기" is completed by hand. Chunk times never pass their Bit's deadline; Bit deadlines never pass their Node's.

## Inbox Scratches

| Scratch | Cell | Created | Breakdown rows | Staged | Expected state |
|---|---|---|---|---|---|
| Plan the field study | (3,0) | T−45min | Review the field notes; Draft the study summary; Book the meeting room; Send the participant list; Archive the old drafts | Review the field notes → node; Draft the study summary → bit | open rows, 2 staged |
| 주말 여행 아이디어 | (4,0) | T−1.08d | 기차 시간 확인하기; 반려견 동반 숙소 찾기; 등산화 챙기기; 민수에게 차 빌릴 수 있는지 묻기 | — | open rows |
| 엄마 선물 아이디어 | (5,0) | T−3d | none (empty Scratch) | — | empty |
| Questions for Monday's stand-up | (6,0) | T−6d | Is the deploy freeze still on?; Who owns the analytics ticket? | — | open rows |
