-- Task 237: the demo seed DP-SAAS-02 and ensure_account() step 3 (SCHEMA §Account preparation).
-- `internal.demo_seed()` holds the approved seed as data (docs/brainstorming/2026-10-21-saas-conversion/
-- DP-SAAS-02.md): symbolic keys for parents and sources, and times as offsets from the copy time, so
-- urgency and aging look alive whenever a visitor arrives (S42 (2)). `internal.copy_demo_seed()`
-- gives every row a new id, remaps parent and candidate-to-source references, and places each active
-- row with `internal.pick_free_cell` at its original cell, so a free cell is kept and a reserved one
-- is never used. Nothing here references the `dev` schema, which production does not have.
-- The copy writes rows directly, so it skips the write functions' checks: the seed is validated as
-- data by supabase/tests/demo-seed.db.test.ts. It returns every row it wrote, for the `changes` of
-- ensure_account(). The Inbox and Archive cells are never used by a seed row (SCHEMA §Account preparation).

grant create on schema internal to griddo_writer;

create function internal.demo_seed() returns jsonb
  language sql immutable security invoker set search_path = ''
  as $seed$ select '{
    "nodes": [
      {"key": "n1", "parent": null, "title": "사이트 개편", "icon": "Globe", "color": "hsl(221, 60%, 45%)", "level": 0, "x": 5, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 604800000},
      {"key": "n2", "parent": "n1", "title": "디자인", "icon": "Palette", "color": "hsl(231, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n3", "parent": "n1", "title": "개발", "icon": "Code", "color": "hsl(241, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 604800000},
      {"key": "n4", "parent": "n3", "title": "프런트", "icon": "Layers", "color": "hsl(241, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 604800000},
      {"key": "n5", "parent": "n3", "title": "백엔드", "icon": "Settings", "color": "hsl(251, 60%, 45%)", "level": 2, "x": 4, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": -86400000},
      {"key": "n6", "parent": "n1", "title": "콘텐츠", "icon": "FileText", "color": "hsl(211, 60%, 45%)", "level": 1, "x": 6, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n7", "parent": null, "title": "팀 워크숍", "icon": "Users", "color": "hsl(160, 60%, 45%)", "level": 0, "x": 7, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000},
      {"key": "n8", "parent": "n7", "title": "장소", "icon": "Building2", "color": "hsl(165, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 172800000},
      {"key": "n9", "parent": "n7", "title": "프로그램", "icon": "Target", "color": "hsl(170, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n10", "parent": null, "title": "집안일", "icon": "Home", "color": "hsl(25, 60%, 45%)", "level": 0, "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 2592000000},
      {"key": "n11", "parent": "n10", "title": "이사", "icon": "ListTodo", "color": "hsl(30, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 1209600000},
      {"key": "n12", "parent": "n11", "title": "짐 싸기", "icon": "Box", "color": "hsl(35, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n13", "parent": "n10", "title": "청소", "icon": "Hammer", "color": "hsl(20, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n14", "parent": null, "title": "스페인어", "icon": "GraduationCap", "color": "hsl(340, 60%, 45%)", "level": 0, "x": 11, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "n15", "parent": "n14", "title": "문법", "icon": "Book", "color": "hsl(335, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "n16", "parent": "n14", "title": "듣기", "icon": "Headphones", "color": "hsl(345, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "n17", "parent": "n16", "title": "드라마", "icon": "Video", "color": "hsl(350, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "n18", "parent": null, "title": "Reading list", "icon": "BookOpen", "color": "hsl(275, 60%, 45%)", "level": 0, "x": 13, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "n19", "parent": "n18", "title": "Tech books", "icon": "Book", "color": "hsl(270, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "n20", "parent": "n19", "title": "Databases", "icon": "Layers", "color": "hsl(265, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "n21", "parent": "n18", "title": "Fiction", "icon": "Bookmark", "color": "hsl(285, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n22", "parent": null, "title": "습관 앱", "icon": "Rocket", "color": "hsl(45, 60%, 45%)", "level": 0, "x": 5, "y": 4, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 1209600000},
      {"key": "n23", "parent": "n22", "title": "기획", "icon": "ClipboardList", "color": "hsl(50, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n24", "parent": "n22", "title": "화면", "icon": "PenTool", "color": "hsl(40, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n25", "parent": null, "title": "운동", "icon": "Dumbbell", "color": "hsl(0, 60%, 45%)", "level": 0, "x": 7, "y": 4, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 1036800000},
      {"key": "n26", "parent": "n25", "title": "러닝", "icon": "Timer", "color": "hsl(5, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "n27", "parent": "n25", "title": "근력", "icon": "Dumbbell", "color": "hsl(355, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "n28", "parent": null, "title": "재테크", "icon": "Wallet", "color": "hsl(100, 60%, 45%)", "level": 0, "x": 9, "y": 4, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1728000000},
      {"key": "n29", "parent": null, "title": "Cooking", "icon": "Coffee", "color": "hsl(15, 60%, 45%)", "level": 0, "x": 11, "y": 4, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "n30", "parent": null, "title": "Travel", "icon": "Plane", "color": "hsl(190, 60%, 45%)", "level": 0, "x": 13, "y": 4, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 2160000000}
    ],
    "bits": [
      {"key": "b1", "node": "n2", "title": "로고 최종본 고르기", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b2", "node": "n2", "title": "아이콘 세트 정리", "icon": "Target", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b3", "node": "n2", "title": "버튼 스타일 정하기", "icon": "Pin", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b4", "node": "n2", "title": "모바일 시안 검토", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 3, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b5", "node": "n2", "title": "예전 로고 시안", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 4, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null, "archived_ago": 864000000},
      {"key": "b6", "node": "n4", "title": "헤더 컴포넌트 만들기", "icon": "Tag", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b7", "node": "n4", "title": "이미지 지연 로딩", "icon": "Bookmark", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b8", "node": "n4", "title": "다크 모드 확인", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 9, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b9", "node": "n4", "title": "Set up analytics", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 604800000},
      {"key": "b10", "node": "n5", "title": "문의 폼 API 연결", "icon": "Heart", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b11", "node": "n5", "title": "Redirect the old URLs", "icon": "FileText", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": -86400000},
      {"key": "b12", "node": "n5", "title": "캐시 규칙 정하기", "icon": "Target", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b13", "node": "n5", "title": "백업 주기 정하기", "icon": "Pin", "priority": null, "status": "active", "x": 13, "y": 3, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b14", "node": "n3", "title": "배포 파이프라인 점검", "icon": "Star", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b15", "node": "n3", "title": "성능 예산 정하기", "icon": "Lightbulb", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b16", "node": "n6", "title": "소개 글 다듬기", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b17", "node": "n6", "title": "사례 3개 정리", "icon": "Bookmark", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b18", "node": "n6", "title": "블로그 일정 잡기", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b19", "node": "n1", "title": "홈페이지 문구 쓰기", "icon": "Zap", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 72000000},
      {"key": "b20", "node": "n1", "title": "색상 팔레트 정하기", "icon": "Heart", "priority": "mid", "status": "complete", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b21", "node": "n1", "title": "사이트맵 정리", "icon": "FileText", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b22", "node": "n1", "title": "접근성 점검", "icon": "Target", "priority": null, "status": "active", "x": 13, "y": 3, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b23", "node": "n8", "title": "장소 예약하기", "icon": "Pin", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 172800000},
      {"key": "b24", "node": "n8", "title": "교통편 알아보기", "icon": "Star", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b25", "node": "n8", "title": "숙소 후보 비교", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b26", "node": "n8", "title": "주차 안내 확인", "icon": "Tag", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b27", "node": "n8", "title": "지난 분기 회고 노트", "icon": "Bookmark", "priority": "high", "status": "active", "x": 9, "y": 4, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null, "archived_ago": 432000000},
      {"key": "b28", "node": "n9", "title": "Pick an icebreaker", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b29", "node": "n9", "title": "Prepare the team game", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b30", "node": "n9", "title": "Split the talk slots", "icon": "Heart", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b31", "node": "n9", "title": "Assign a photographer", "icon": "FileText", "priority": "mid", "status": "active", "x": 13, "y": 3, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b32", "node": "n7", "title": "일정표 보내기", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000},
      {"key": "b33", "node": "n7", "title": "식단 조사하기", "icon": "Pin", "priority": "low", "status": "complete", "x": 13, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b34", "node": "n7", "title": "참석자 확인하기", "icon": "Star", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b35", "node": "n12", "title": "책 포장하기", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b36", "node": "n12", "title": "주방 박스 라벨 붙이기", "icon": "Tag", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b37", "node": "n12", "title": "겨울옷 압축하기", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 3, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b38", "node": "n12", "title": "깨지기 쉬운 물건 표시", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b39", "node": "n11", "title": "우편물 전송 신청", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b40", "node": "n11", "title": "기존 인터넷 해지", "icon": "Heart", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": 1209600000},
      {"key": "b41", "node": "n11", "title": "주소 변경 신고", "icon": "FileText", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b42", "node": "n13", "title": "에어컨 필터 씻기", "icon": "Target", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b43", "node": "n13", "title": "베란다 정리", "icon": "Pin", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b44", "node": "n13", "title": "욕실 곰팡이 제거", "icon": "Star", "priority": "mid", "status": "active", "x": 9, "y": 3, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b45", "node": "n13", "title": "냉장고 비우기", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b46", "node": "n10", "title": "여권 갱신하기", "icon": "Tag", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 2592000000},
      {"key": "b47", "node": "n10", "title": "치과 예약하기", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b48", "node": "n10", "title": "자전거 고치기", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 3, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b49", "node": "n15", "title": "과거형 정리하기", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b50", "node": "n15", "title": "접속법 예문 모으기", "icon": "Heart", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b51", "node": "n15", "title": "전치사 표 만들기", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 3, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null},
      {"key": "b52", "node": "n15", "title": "불규칙 동사 외우기", "icon": "Target", "priority": "mid", "status": "active", "x": 13, "y": 3, "mtime_ago": 2160000000, "created_ago": 2764800000, "deadline_in": null},
      {"key": "b53", "node": "n17", "title": "한 편 자막 없이 보기", "icon": "Pin", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b54", "node": "n17", "title": "대사 10개 적어두기", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b55", "node": "n17", "title": "좋아하는 장면 반복", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 3, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null},
      {"key": "b56", "node": "n17", "title": "시리즈 고르기", "icon": "Tag", "priority": null, "status": "active", "x": 13, "y": 3, "mtime_ago": 2160000000, "created_ago": 2764800000, "deadline_in": null},
      {"key": "b57", "node": "n16", "title": "팟캐스트 구독하기", "icon": "Bookmark", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b58", "node": "n16", "title": "받아쓰기 연습", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b59", "node": "n14", "title": "5단원 끝내기", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b60", "node": "n14", "title": "언어 교환 파트너 찾기", "icon": "Heart", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b61", "node": "n14", "title": "자막 없이 한 편 보기", "icon": "FileText", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null},
      {"key": "b62", "node": "n20", "title": "Index design notes", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b63", "node": "n20", "title": "Isolation levels", "icon": "Pin", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b64", "node": "n20", "title": "Vacuum and bloat", "icon": "Star", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b65", "node": "n20", "title": "Read the WAL chapter", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b66", "node": "n19", "title": "Reread DDIA chapter 3", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b67", "node": "n19", "title": "Order the Rust book", "icon": "Bookmark", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b68", "node": "n21", "title": "Finish the novel", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b69", "node": "n21", "title": "Pick a book club title", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b70", "node": "n21", "title": "Return the library books", "icon": "Heart", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b71", "node": "n21", "title": "Reread the first chapter", "icon": "FileText", "priority": "mid", "status": "active", "x": 13, "y": 3, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b72", "node": "n18", "title": "Finish Clean Code", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b73", "node": "n18", "title": "Read the RLS docs", "icon": "Pin", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b74", "node": "n18", "title": "Skim React 19 notes", "icon": "Star", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b75", "node": "n23", "title": "핵심 기능 3개 고르기", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b76", "node": "n23", "title": "경쟁 앱 조사하기", "icon": "Tag", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b77", "node": "n23", "title": "사용자 인터뷰 질문", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b78", "node": "n23", "title": "로드맵 그리기", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b79", "node": "n24", "title": "온보딩 와이어프레임", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b80", "node": "n24", "title": "홈 화면 색상 정하기", "icon": "Heart", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b81", "node": "n24", "title": "아이콘 후보 뽑기", "icon": "FileText", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b82", "node": "n24", "title": "빈 상태 문구 쓰기", "icon": "Target", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b83", "node": "n22", "title": "첫 화면 스케치", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 432000000},
      {"key": "b84", "node": "n22", "title": "Ship a landing page", "icon": "Star", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 1209600000},
      {"key": "b85", "node": "n22", "title": "README 쓰기", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b86", "node": "n22", "title": "출시 스레드 초안", "icon": "Tag", "priority": "high", "status": "active", "x": 13, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null, "deleted_ago": 172800000},
      {"key": "b87", "node": "n26", "title": "Plan three weekly routes", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b88", "node": "n26", "title": "Log the pace", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b89", "node": "n26", "title": "Scout park routes", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b90", "node": "n26", "title": "Set up the running app", "icon": "Heart", "priority": "mid", "status": "active", "x": 13, "y": 3, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b91", "node": "n27", "title": "스쿼트 자세 점검", "icon": "FileText", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b92", "node": "n27", "title": "상체 루틴 정하기", "icon": "Target", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b93", "node": "n27", "title": "폼롤러 구입", "icon": "Pin", "priority": "high", "status": "active", "x": 9, "y": 3, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b94", "node": "n27", "title": "운동 일지 쓰기", "icon": "Star", "priority": "mid", "status": "active", "x": 13, "y": 3, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b95", "node": "n25", "title": "10km 대회 접수", "icon": "Lightbulb", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 1036800000},
      {"key": "b96", "node": "n25", "title": "러닝화 사기", "icon": "Tag", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b97", "node": "n25", "title": "스트레칭 루틴 정하기", "icon": "Bookmark", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b98", "node": "n28", "title": "연말정산 서류 모으기", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1728000000},
      {"key": "b99", "node": "n28", "title": "월 예산 정하기", "icon": "Zap", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b100", "node": "n28", "title": "비상금 통장 만들기", "icon": "Heart", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b101", "node": "n28", "title": "보험 목록 정리", "icon": "FileText", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b102", "node": "n28", "title": "구독 서비스 점검", "icon": "Target", "priority": "high", "status": "active", "x": 9, "y": 4, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b103", "node": "n29", "title": "Try the miso soup recipe", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b104", "node": "n29", "title": "Restock the spice shelf", "icon": "Star", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b105", "node": "n29", "title": "Plan the weekly menu", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b106", "node": "n29", "title": "Feed the starter", "icon": "Tag", "priority": "mid", "status": "active", "x": 13, "y": 3, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b107", "node": "n29", "title": "Clean the oven", "icon": "Bookmark", "priority": null, "status": "active", "x": 9, "y": 4, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b108", "node": "n30", "title": "Book the flights", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 2160000000},
      {"key": "b109", "node": "n30", "title": "Renew travel insurance", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b110", "node": "n30", "title": "Pick the Kyoto hotel", "icon": "Heart", "priority": "high", "status": "active", "x": 9, "y": 3, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b111", "node": "n30", "title": "Draft a day-by-day plan", "icon": "FileText", "priority": "mid", "status": "active", "x": 13, "y": 3, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b112", "node": "n30", "title": "Check the visa rules", "icon": "Target", "priority": "low", "status": "active", "x": 9, "y": 4, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "s1", "node": "inbox", "title": "Plan the field study", "icon": "sparkles", "priority": null, "status": "active", "x": 3, "y": 0, "mtime_ago": 2700000, "created_ago": 2700000, "deadline_in": null},
      {"key": "s2", "node": "inbox", "title": "주말 여행 아이디어", "icon": "sparkles", "priority": null, "status": "active", "x": 4, "y": 0, "mtime_ago": 93600000, "created_ago": 93600000, "deadline_in": null},
      {"key": "s3", "node": "inbox", "title": "엄마 선물 아이디어", "icon": "sparkles", "priority": null, "status": "active", "x": 5, "y": 0, "mtime_ago": 259200000, "created_ago": 259200000, "deadline_in": null},
      {"key": "s4", "node": "inbox", "title": "Questions for Monday''s stand-up", "icon": "sparkles", "priority": null, "status": "active", "x": 6, "y": 0, "mtime_ago": 518400000, "created_ago": 518400000, "deadline_in": null}
    ],
    "chunks": [
      {"bit": "b19", "title": "히어로 문구 초안", "status": "complete", "order": 0, "time_in": -86400000},
      {"bit": "b19", "title": "후기 3개 고르기", "status": "incomplete", "order": 1, "time_in": 36000000},
      {"bit": "b19", "title": "문구 교정하기", "status": "incomplete", "order": 2, "time_in": 64800000},
      {"bit": "b20", "title": "팔레트 3개 비교하기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b20", "title": "명암비 확인하기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b23", "title": "후보지 3곳 추리기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b23", "title": "1순위 장소에 전화하기", "status": "incomplete", "order": 1, "time_in": 129600000},
      {"bit": "b23", "title": "예약금 내기", "status": "incomplete", "order": 2, "time_in": 172800000},
      {"bit": "b83", "title": "종이 와이어프레임", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b83", "title": "폰트 고르기", "status": "incomplete", "order": 1, "time_in": 345600000}
    ],
    "rows": [
      {"key": "r1", "scratch": "s1", "content": "Review the field notes", "order": 0, "created_ago": 2700000},
      {"key": "r2", "scratch": "s1", "content": "Draft the study summary", "order": 1, "created_ago": 2699000},
      {"key": "r3", "scratch": "s1", "content": "Book the meeting room", "order": 2, "created_ago": 2698000},
      {"key": "r4", "scratch": "s1", "content": "Send the participant list", "order": 3, "created_ago": 2697000},
      {"key": "r5", "scratch": "s1", "content": "Archive the old drafts", "order": 4, "created_ago": 2696000},
      {"key": "r6", "scratch": "s2", "content": "기차 시간 확인하기", "order": 0, "created_ago": 93600000},
      {"key": "r7", "scratch": "s2", "content": "반려견 동반 숙소 찾기", "order": 1, "created_ago": 93599000},
      {"key": "r8", "scratch": "s2", "content": "등산화 챙기기", "order": 2, "created_ago": 93598000},
      {"key": "r9", "scratch": "s2", "content": "민수에게 차 빌릴 수 있는지 묻기", "order": 3, "created_ago": 93597000},
      {"key": "r10", "scratch": "s4", "content": "Is the deploy freeze still on?", "order": 0, "created_ago": 518400000},
      {"key": "r11", "scratch": "s4", "content": "Who owns the analytics ticket?", "order": 1, "created_ago": 518399000}
    ],
    "candidates": [
      {"row": "r1", "type": "node", "created_ago": 2640000},
      {"row": "r2", "type": "bit", "created_ago": 2639000}
    ]
  }'::jsonb $seed$;

-- Copies the seed into p_user's account. p_inbox is the account's active Inbox Node, or null (the
-- Scratches and their Breakdown rows are then skipped). A seed Node whose parent was skipped, or
-- that finds no free cell, is skipped with its descendants: entry is never blocked.
create function internal.copy_demo_seed(p_user uuid, p_now bigint, p_inbox uuid, p_reserved jsonb)
  returns jsonb
  language plpgsql volatile security invoker set search_path = ''
  as $copy$
declare
  v_seed jsonb := internal.demo_seed();
  v_ids jsonb := '{}'::jsonb;
  v_item jsonb;
  v_id uuid;
  v_parent uuid;
  v_x integer;
  v_y integer;
  v_row jsonb;
  v_nodes jsonb := '[]'::jsonb;
  v_bits jsonb := '[]'::jsonb;
  v_chunks jsonb := '[]'::jsonb;
  v_rows jsonb := '[]'::jsonb;
  v_candidates jsonb := '[]'::jsonb;
  v_chunk jsonb;
  v_archived bigint;
  v_deleted bigint;
begin
  if p_inbox is not null then
    v_ids := jsonb_build_object('inbox', p_inbox);
  end if;

  for v_item in select value from jsonb_array_elements(v_seed -> 'nodes') loop
    v_parent := null;
    if v_item ->> 'parent' is not null then
      if not v_ids ? (v_item ->> 'parent') then
        continue;
      end if;
      v_parent := (v_ids ->> (v_item ->> 'parent'))::uuid;
    end if;
    v_x := null;
    select f.x, f.y into v_x, v_y
      from internal.pick_free_cell(p_user, v_parent, p_reserved, (v_item ->> 'x')::integer, (v_item ->> 'y')::integer) f;
    if v_x is null then
      continue;
    end if;
    v_id := gen_random_uuid();
    insert into app.nodes (id, user_id, title, color, icon, deadline, mtime, created_at, parent_id, level, x, y)
    values (v_id, p_user, v_item ->> 'title', v_item ->> 'color', v_item ->> 'icon',
            p_now + (v_item ->> 'deadline_in')::bigint,
            p_now - (v_item ->> 'mtime_ago')::bigint, p_now - (v_item ->> 'created_ago')::bigint,
            v_parent, (v_item ->> 'level')::integer, v_x, v_y)
    returning to_jsonb(app.nodes.*) into v_row;
    v_nodes := v_nodes || jsonb_build_array(v_row);
    v_ids := v_ids || jsonb_build_object(v_item ->> 'key', v_id);
  end loop;

  for v_item in select value from jsonb_array_elements(v_seed -> 'bits') loop
    if not v_ids ? (v_item ->> 'node') or (v_item ->> 'node' = 'inbox' and p_inbox is null) then
      continue;
    end if;
    v_parent := (v_ids ->> (v_item ->> 'node'))::uuid;
    v_archived := p_now - (v_item ->> 'archived_ago')::bigint;
    v_deleted := p_now - (v_item ->> 'deleted_ago')::bigint;
    v_x := (v_item ->> 'x')::integer;
    v_y := (v_item ->> 'y')::integer;
    if v_archived is null and v_deleted is null then
      v_x := null;
      select f.x, f.y into v_x, v_y
        from internal.pick_free_cell(p_user, v_parent, p_reserved, (v_item ->> 'x')::integer, (v_item ->> 'y')::integer) f;
      if v_x is null then
        continue;
      end if;
    end if;
    v_id := gen_random_uuid();
    insert into app.bits (id, user_id, title, icon, priority, status, deadline, mtime, created_at,
                          parent_id, x, y, archived_at, deleted_at)
    values (v_id, p_user, v_item ->> 'title', v_item ->> 'icon', v_item ->> 'priority', v_item ->> 'status',
            p_now + (v_item ->> 'deadline_in')::bigint,
            p_now - (v_item ->> 'mtime_ago')::bigint, p_now - (v_item ->> 'created_ago')::bigint,
            v_parent, v_x, v_y, v_archived, v_deleted)
    returning to_jsonb(app.bits.*) into v_row;
    v_bits := v_bits || jsonb_build_array(v_row);
    v_ids := v_ids || jsonb_build_object(v_item ->> 'key', v_id);
  end loop;

  for v_chunk in select value from jsonb_array_elements(v_seed -> 'chunks') loop
    if not v_ids ? (v_chunk ->> 'bit') then
      continue;
    end if;
    insert into app.chunks (id, user_id, title, status, time, "order", parent_id)
    values (gen_random_uuid(), p_user, v_chunk ->> 'title', v_chunk ->> 'status',
            p_now + (v_chunk ->> 'time_in')::bigint, (v_chunk ->> 'order')::integer,
            (v_ids ->> (v_chunk ->> 'bit'))::uuid)
    returning to_jsonb(app.chunks.*) into v_row;
    v_chunks := v_chunks || jsonb_build_array(v_row);
  end loop;

  for v_item in select value from jsonb_array_elements(v_seed -> 'rows') loop
    if not v_ids ? (v_item ->> 'scratch') then
      continue;
    end if;
    v_id := gen_random_uuid();
    insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at)
    values (v_id, p_user, (v_ids ->> (v_item ->> 'scratch'))::uuid, v_item ->> 'content',
            (v_item ->> 'order')::integer, p_now - (v_item ->> 'created_ago')::bigint)
    returning to_jsonb(app.scratch_breakdowns.*) into v_row;
    v_rows := v_rows || jsonb_build_array(v_row);
    v_ids := v_ids || jsonb_build_object(v_item ->> 'key', v_id);
  end loop;

  for v_item in select value from jsonb_array_elements(v_seed -> 'candidates') loop
    if not v_ids ? (v_item ->> 'row') then
      continue;
    end if;
    insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type,
                                       created_at, updated_at)
    select gen_random_uuid(), p_user, r.scratch_bit_id, r.id, v_item ->> 'type',
           p_now - (v_item ->> 'created_ago')::bigint, p_now - (v_item ->> 'created_ago')::bigint
      from app.scratch_breakdowns r
     where r.user_id = p_user and r.id = (v_ids ->> (v_item ->> 'row'))::uuid
    returning to_jsonb(app.staged_candidates.*) into v_row;
    v_candidates := v_candidates || jsonb_build_array(v_row);
  end loop;

  return jsonb_build_object('nodes', v_nodes, 'bits', v_bits, 'chunks', v_chunks,
                            'scratch_breakdowns', v_rows, 'staged_candidates', v_candidates);
end
$copy$;

alter function internal.demo_seed() owner to griddo_writer;
alter function internal.copy_demo_seed(uuid, bigint, uuid, jsonb) owner to griddo_writer;
revoke all on function internal.demo_seed() from public;
revoke all on function internal.copy_demo_seed(uuid, bigint, uuid, jsonb) from public;
grant execute on function internal.demo_seed() to griddo_writer;
grant execute on function internal.copy_demo_seed(uuid, bigint, uuid, jsonb) to griddo_writer;

-- ensure_account() with step 3. Same signature, owner and grants as Task 235's definition.
create or replace FUNCTION public.ensure_account(p_reserved_cells jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_role text;
  v_node app.nodes;
  v_x integer;
  v_y integer;
  v_written jsonb := '[]'::jsonb;
  v_row jsonb;
  v_inbox uuid;
  v_seeded jsonb := null;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;

  -- Lock order: the L0 Grid lock, then the account row, then the system Node rows.
  perform internal.lock_grid(v_user, null);

  if exists (select 1 from app.accounts where user_id = v_user and deletion_requested_at is not null) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_deleting'));
  end if;

  begin
    insert into app.accounts (user_id, created_at, last_visit_at)
    values (v_user, v_now, v_now)
    on conflict (user_id) do update
      set last_visit_at = greatest(app.accounts.last_visit_at, excluded.last_visit_at);
  exception when foreign_key_violation then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end;

  -- A trashed or archived system Node returns to active in place, in its own cell when
  -- that is free, otherwise in the first free cell; a hidden one stays where it is. When no
  -- cell is free it is skipped and the rest of the call still applies.
  foreach v_role in array array['inbox', 'archive_view'] loop
    select * into v_node from app.nodes
     where user_id = v_user and system_role = v_role
       and (deleted_at is not null or archived_at is not null)
     for update;
    if found then
      if v_node.hidden_from_grid then
        v_x := v_node.x;
        v_y := v_node.y;
      else
        v_x := null;
        select f.x, f.y into v_x, v_y
          from internal.pick_free_cell(v_user, null, p_reserved_cells, v_node.x, v_node.y) f;
        if v_x is distinct from v_node.x or v_y is distinct from v_node.y then
          v_x := null;
          select f.x, f.y into v_x, v_y from internal.pick_free_cell(v_user, null, p_reserved_cells) f;
          if v_x is null then
            continue;
          end if;
        end if;
      end if;
      update app.nodes
         set deleted_at = null, archived_at = null, x = v_x, y = v_y,
             mtime = v_now, version = version + 1
       where id = v_node.id and user_id = v_user
      returning to_jsonb(app.nodes.*) into v_row;
      v_written := v_written || jsonb_build_array(v_row);
    end if;
  end loop;

  foreach v_role in array array['inbox', 'archive_view'] loop
    if exists (select 1 from app.nodes where user_id = v_user and system_role = v_role) then
      continue;
    end if;
    v_x := null;
    select f.x, f.y into v_x, v_y from internal.pick_free_cell(v_user, null, p_reserved_cells) f;
    if v_x is null then
      continue;
    end if;
    insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y, system_role)
    select gen_random_uuid(), v_user,
           case v_role when 'inbox' then 'Inbox' else 'Archive' end,
           case v_role when 'inbox' then 'hsl(221, 83%, 53%)' else 'hsl(240, 4%, 46%)' end,
           case v_role when 'inbox' then 'inbox' else 'layers' end,
           v_now, v_now, 0, v_x, v_y, v_role
    on conflict do nothing
    returning to_jsonb(app.nodes.*) into v_row;
    if v_row is not null then
      v_written := v_written || jsonb_build_array(v_row);
      v_row := null;
    end if;
  end loop;

  -- Step 3 (Task 237): the demo seed, for a guest that has not been seeded and holds no row
  -- besides its system Nodes. The L0 Grid lock and the account row are held; the Inbox Grid lock
  -- comes next, and only for a guest that looks empty, so no Scratch exists whose command could
  -- hold the Inbox lock and wait for the L0 lock (SCHEMA §Locks, Order). The emptiness is
  -- checked again once the Inbox lock is held.
  if internal.is_guest()
     and exists (select 1 from app.accounts where user_id = v_user and seeded_at is null)
     and not exists (select 1 from app.nodes where user_id = v_user and system_role is null)
     and not exists (select 1 from app.bits where user_id = v_user) then
    select id into v_inbox from app.nodes
     where user_id = v_user and system_role = 'inbox' and deleted_at is null and archived_at is null;
    if v_inbox is not null then
      perform internal.lock_grid(v_user, v_inbox);
    end if;
    if not exists (select 1 from app.bits where user_id = v_user) then
      v_seeded := internal.copy_demo_seed(v_user, v_now, v_inbox, p_reserved_cells);
      update app.accounts set seeded_at = v_now where user_id = v_user;
      -- Hook 1: the Inbox is not older than its Scratches. An Inbox made by this call already
      -- carries v_now; one that an earlier call made is touched here and returned in the changes.
      if v_inbox is not null then
        update app.nodes set mtime = v_now where id = v_inbox and user_id = v_user and mtime < v_now
        returning to_jsonb(app.nodes.*) into v_row;
        if v_row is not null then
          v_written := v_written || jsonb_build_array(v_row);
        end if;
      end if;
    end if;
  end if;

  return internal.envelope(
    'applied', null,
    case when jsonb_array_length(v_written) = 0 and v_seeded is null then '{}'::jsonb
         else jsonb_build_object('nodes', jsonb_build_object(
                'upserted', v_written || coalesce(v_seeded -> 'nodes', '[]'::jsonb), 'deleted', '[]'::jsonb))
           || case when v_seeded is null then '{}'::jsonb else jsonb_build_object(
                'bits', jsonb_build_object('upserted', v_seeded -> 'bits', 'deleted', '[]'::jsonb),
                'chunks', jsonb_build_object('upserted', v_seeded -> 'chunks', 'deleted', '[]'::jsonb),
                'scratch_breakdowns', jsonb_build_object('upserted', v_seeded -> 'scratch_breakdowns', 'deleted', '[]'::jsonb),
                'staged_candidates', jsonb_build_object('upserted', v_seeded -> 'staged_candidates', 'deleted', '[]'::jsonb)) end
    end
  );
end
$function$;

revoke create on schema internal from griddo_writer;
