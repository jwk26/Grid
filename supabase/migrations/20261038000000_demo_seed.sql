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
      {"key": "n6", "parent": "n3", "title": "인프라", "icon": "Cloud", "color": "hsl(261, 60%, 45%)", "level": 2, "x": 6, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n7", "parent": "n1", "title": "콘텐츠", "icon": "FileText", "color": "hsl(211, 60%, 45%)", "level": 1, "x": 6, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n8", "parent": "n1", "title": "마케팅", "icon": "Zap", "color": "hsl(201, 60%, 45%)", "level": 1, "x": 2, "y": 4, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n9", "parent": "n1", "title": "법무", "icon": "Lock", "color": "hsl(191, 60%, 45%)", "level": 1, "x": 4, "y": 4, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n10", "parent": "n1", "title": "테스트", "icon": "Target", "color": "hsl(181, 60%, 45%)", "level": 1, "x": 6, "y": 4, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n11", "parent": "n1", "title": "운영", "icon": "Settings", "color": "hsl(171, 60%, 45%)", "level": 1, "x": 2, "y": 6, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n12", "parent": "n1", "title": "분석", "icon": "Compass", "color": "hsl(161, 60%, 45%)", "level": 1, "x": 4, "y": 6, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n13", "parent": null, "title": "팀 워크숍", "icon": "Users", "color": "hsl(160, 60%, 45%)", "level": 0, "x": 7, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000},
      {"key": "n14", "parent": "n13", "title": "장소", "icon": "Building2", "color": "hsl(165, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 172800000},
      {"key": "n15", "parent": "n13", "title": "프로그램", "icon": "Target", "color": "hsl(170, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n16", "parent": "n15", "title": "오전 세션", "icon": "Mic", "color": "hsl(170, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n17", "parent": "n15", "title": "오후 세션", "icon": "Gamepad2", "color": "hsl(175, 60%, 45%)", "level": 2, "x": 4, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n18", "parent": "n13", "title": "예산", "icon": "Wallet", "color": "hsl(150, 60%, 45%)", "level": 1, "x": 6, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n19", "parent": "n13", "title": "교통", "icon": "Car", "color": "hsl(145, 60%, 45%)", "level": 1, "x": 2, "y": 4, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n20", "parent": "n13", "title": "식사", "icon": "Coffee", "color": "hsl(140, 60%, 45%)", "level": 1, "x": 4, "y": 4, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n21", "parent": "n13", "title": "숙소", "icon": "Home", "color": "hsl(135, 60%, 45%)", "level": 1, "x": 6, "y": 4, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n22", "parent": "n13", "title": "준비물", "icon": "Box", "color": "hsl(130, 60%, 45%)", "level": 1, "x": 2, "y": 6, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n23", "parent": "n13", "title": "후속", "icon": "Star", "color": "hsl(125, 60%, 45%)", "level": 1, "x": 4, "y": 6, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n24", "parent": null, "title": "집안일", "icon": "Home", "color": "hsl(25, 60%, 45%)", "level": 0, "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 2592000000},
      {"key": "n25", "parent": "n24", "title": "이사", "icon": "ListTodo", "color": "hsl(30, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 1209600000},
      {"key": "n26", "parent": "n25", "title": "짐 싸기", "icon": "Box", "color": "hsl(35, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n27", "parent": "n25", "title": "짐 풀기", "icon": "FolderOpen", "color": "hsl(40, 60%, 45%)", "level": 2, "x": 4, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n28", "parent": "n25", "title": "이사 당일", "icon": "Pin", "color": "hsl(45, 60%, 45%)", "level": 2, "x": 6, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n29", "parent": "n24", "title": "청소", "icon": "Hammer", "color": "hsl(20, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n30", "parent": "n24", "title": "장보기", "icon": "ShoppingCart", "color": "hsl(15, 60%, 45%)", "level": 1, "x": 6, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n31", "parent": "n24", "title": "수리", "icon": "Hammer", "color": "hsl(10, 60%, 45%)", "level": 1, "x": 2, "y": 4, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n32", "parent": "n24", "title": "요리", "icon": "Coffee", "color": "hsl(5, 60%, 45%)", "level": 1, "x": 4, "y": 4, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n33", "parent": "n24", "title": "행정", "icon": "ClipboardList", "color": "hsl(0, 60%, 45%)", "level": 1, "x": 6, "y": 4, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n34", "parent": "n24", "title": "정리", "icon": "FolderOpen", "color": "hsl(355, 60%, 45%)", "level": 1, "x": 2, "y": 6, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n35", "parent": "n24", "title": "계절", "icon": "Moon", "color": "hsl(350, 60%, 45%)", "level": 1, "x": 4, "y": 6, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "n36", "parent": null, "title": "Reading list", "icon": "BookOpen", "color": "hsl(275, 60%, 45%)", "level": 0, "x": 11, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "n37", "parent": "n36", "title": "Tech books", "icon": "Book", "color": "hsl(270, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "n38", "parent": "n37", "title": "Databases", "icon": "Layers", "color": "hsl(265, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "n39", "parent": "n37", "title": "Frontend", "icon": "Code", "color": "hsl(260, 60%, 45%)", "level": 2, "x": 4, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "n40", "parent": "n37", "title": "Rust", "icon": "Hammer", "color": "hsl(255, 60%, 45%)", "level": 2, "x": 6, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "n41", "parent": "n36", "title": "Fiction", "icon": "Bookmark", "color": "hsl(285, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n42", "parent": "n36", "title": "Podcasts", "icon": "Headphones", "color": "hsl(290, 60%, 45%)", "level": 1, "x": 6, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n43", "parent": "n36", "title": "Articles", "icon": "FileText", "color": "hsl(295, 60%, 45%)", "level": 1, "x": 2, "y": 4, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n44", "parent": "n36", "title": "Papers", "icon": "ClipboardList", "color": "hsl(300, 60%, 45%)", "level": 1, "x": 4, "y": 4, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n45", "parent": "n36", "title": "Newsletters", "icon": "MessageSquare", "color": "hsl(305, 60%, 45%)", "level": 1, "x": 6, "y": 4, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n46", "parent": "n36", "title": "Audiobooks", "icon": "Mic", "color": "hsl(310, 60%, 45%)", "level": 1, "x": 2, "y": 6, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n47", "parent": "n36", "title": "Wishlist", "icon": "Gift", "color": "hsl(315, 60%, 45%)", "level": 1, "x": 4, "y": 6, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n48", "parent": null, "title": "스페인어", "icon": "GraduationCap", "color": "hsl(340, 60%, 45%)", "level": 0, "x": 13, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "n49", "parent": "n48", "title": "문법", "icon": "Book", "color": "hsl(335, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "n50", "parent": "n48", "title": "듣기", "icon": "Headphones", "color": "hsl(345, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "n51", "parent": "n50", "title": "드라마", "icon": "Video", "color": "hsl(350, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "n52", "parent": null, "title": "습관 앱", "icon": "Rocket", "color": "hsl(45, 60%, 45%)", "level": 0, "x": 15, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 1209600000},
      {"key": "n53", "parent": "n52", "title": "기획", "icon": "ClipboardList", "color": "hsl(50, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n54", "parent": "n52", "title": "화면", "icon": "PenTool", "color": "hsl(40, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n55", "parent": null, "title": "운동", "icon": "Dumbbell", "color": "hsl(0, 60%, 45%)", "level": 0, "x": 5, "y": 3, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 1036800000},
      {"key": "n56", "parent": "n55", "title": "러닝", "icon": "Timer", "color": "hsl(5, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "n57", "parent": "n55", "title": "근력", "icon": "Dumbbell", "color": "hsl(355, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "n58", "parent": null, "title": "재테크", "icon": "Wallet", "color": "hsl(100, 60%, 45%)", "level": 0, "x": 7, "y": 3, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1728000000},
      {"key": "n59", "parent": "n58", "title": "연금", "icon": "Diamond", "color": "hsl(105, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n60", "parent": null, "title": "Travel", "icon": "Plane", "color": "hsl(190, 60%, 45%)", "level": 0, "x": 9, "y": 3, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 2160000000},
      {"key": "n61", "parent": "n60", "title": "Japan", "icon": "Map", "color": "hsl(195, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "n62", "parent": "n61", "title": "Kyoto", "icon": "Compass", "color": "hsl(200, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "n63", "parent": "n60", "title": "Lisbon", "icon": "Camera", "color": "hsl(185, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "n64", "parent": null, "title": "Cooking", "icon": "Coffee", "color": "hsl(15, 60%, 45%)", "level": 0, "x": 11, "y": 3, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "n65", "parent": "n64", "title": "Weeknight", "icon": "Flame", "color": "hsl(20, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "n66", "parent": null, "title": "자격증", "icon": "Award", "color": "hsl(60, 60%, 45%)", "level": 0, "x": 13, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n67", "parent": null, "title": "블로그", "icon": "PenTool", "color": "hsl(80, 60%, 45%)", "level": 0, "x": 15, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n68", "parent": null, "title": "이직 준비", "icon": "Briefcase", "color": "hsl(120, 60%, 45%)", "level": 0, "x": 5, "y": 4, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n69", "parent": null, "title": "부모님 선물", "icon": "Gift", "color": "hsl(340, 60%, 45%)", "level": 0, "x": 7, "y": 4, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n70", "parent": null, "title": "반려식물", "icon": "Heart", "color": "hsl(140, 60%, 45%)", "level": 0, "x": 9, "y": 4, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n71", "parent": null, "title": "캠핑", "icon": "Compass", "color": "hsl(90, 60%, 45%)", "level": 0, "x": 11, "y": 4, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n72", "parent": null, "title": "영상 편집", "icon": "Video", "color": "hsl(280, 60%, 45%)", "level": 0, "x": 13, "y": 4, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n73", "parent": null, "title": "가계부", "icon": "Calculator", "color": "hsl(110, 60%, 45%)", "level": 0, "x": 15, "y": 4, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n74", "parent": null, "title": "모임 총무", "icon": "Users", "color": "hsl(210, 60%, 45%)", "level": 0, "x": 5, "y": 5, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n75", "parent": null, "title": "인테리어", "icon": "Home", "color": "hsl(30, 60%, 45%)", "level": 0, "x": 7, "y": 5, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n76", "parent": null, "title": "건강검진", "icon": "Heart", "color": "hsl(355, 60%, 45%)", "level": 0, "x": 9, "y": 5, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n77", "parent": null, "title": "취미 도예", "icon": "Palette", "color": "hsl(25, 60%, 45%)", "level": 0, "x": 11, "y": 5, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n78", "parent": null, "title": "Photography", "icon": "Camera", "color": "hsl(225, 60%, 45%)", "level": 0, "x": 13, "y": 5, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n79", "parent": null, "title": "Music", "icon": "Music", "color": "hsl(235, 60%, 45%)", "level": 0, "x": 15, "y": 5, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n80", "parent": null, "title": "Gardening", "icon": "Flame", "color": "hsl(130, 60%, 45%)", "level": 0, "x": 5, "y": 6, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n81", "parent": null, "title": "Movies", "icon": "Clapperboard", "color": "hsl(250, 60%, 45%)", "level": 0, "x": 7, "y": 6, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n82", "parent": null, "title": "Podcast ideas", "icon": "Mic", "color": "hsl(215, 60%, 45%)", "level": 0, "x": 9, "y": 6, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n83", "parent": null, "title": "Open source", "icon": "Code", "color": "hsl(245, 60%, 45%)", "level": 0, "x": 11, "y": 6, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n84", "parent": null, "title": "Side hustle", "icon": "Briefcase", "color": "hsl(55, 60%, 45%)", "level": 0, "x": 13, "y": 6, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n85", "parent": null, "title": "Language notes", "icon": "Book", "color": "hsl(320, 60%, 45%)", "level": 0, "x": 15, "y": 6, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null}
    ],
    "bits": [
      {"key": "b1", "node": "n2", "title": "로고 최종본 고르기", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b2", "node": "n2", "title": "아이콘 세트 정리", "icon": "Target", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b3", "node": "n2", "title": "모바일 시안 검토", "icon": "Pin", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b4", "node": "n2", "title": "예전 로고 시안", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null, "archived_ago": 864000000},
      {"key": "b5", "node": "n4", "title": "헤더 컴포넌트 만들기", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b6", "node": "n4", "title": "이미지 지연 로딩", "icon": "Tag", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b7", "node": "n4", "title": "다크 모드 확인", "icon": "Bookmark", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b8", "node": "n4", "title": "Set up analytics", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 604800000},
      {"key": "b9", "node": "n5", "title": "문의 폼 API 연결", "icon": "Zap", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b10", "node": "n5", "title": "Redirect the old URLs", "icon": "Heart", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": -86400000},
      {"key": "b11", "node": "n5", "title": "캐시 규칙 정하기", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b12", "node": "n5", "title": "백업 주기 정하기", "icon": "Target", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b13", "node": "n6", "title": "도메인 갱신 확인", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b14", "node": "n6", "title": "SSL 인증서 점검", "icon": "Star", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b15", "node": "n6", "title": "CDN 캐시 비우기", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b16", "node": "n3", "title": "배포 파이프라인 점검", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b17", "node": "n3", "title": "성능 예산 정하기", "icon": "Bookmark", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b18", "node": "n3", "title": "에러 모니터링 설정", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b19", "node": "n7", "title": "소개 글 다듬기", "icon": "Zap", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b20", "node": "n7", "title": "사례 3개 정리", "icon": "Heart", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b21", "node": "n8", "title": "뉴스레터 초안", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b22", "node": "n8", "title": "SNS 이미지 만들기", "icon": "Target", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b23", "node": "n9", "title": "약관 검토 요청", "icon": "Pin", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b24", "node": "n9", "title": "저작권 표기 확인", "icon": "Star", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b25", "node": "n10", "title": "크로스 브라우저 확인", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b26", "node": "n10", "title": "모바일 실기기 확인", "icon": "Tag", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b27", "node": "n11", "title": "장애 연락망 정리", "icon": "Bookmark", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b28", "node": "n11", "title": "백업 복구 연습", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b29", "node": "n12", "title": "전환 목표 정하기", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b30", "node": "n12", "title": "방문자 대시보드", "icon": "Heart", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b31", "node": "n1", "title": "홈페이지 문구 쓰기", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 72000000},
      {"key": "b32", "node": "n1", "title": "색상 팔레트 정하기", "icon": "Target", "priority": "mid", "status": "complete", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b33", "node": "n1", "title": "사이트맵 정리", "icon": "Pin", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b34", "node": "n1", "title": "접근성 점검", "icon": "Star", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b35", "node": "n1", "title": "메타 태그 점검", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b36", "node": "n1", "title": "푸터 링크 정리", "icon": "Tag", "priority": null, "status": "active", "x": 13, "y": 3, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b37", "node": "n1", "title": "쿠키 안내 문구", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 4, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b38", "node": "n1", "title": "404 페이지 만들기", "icon": "ClipboardList", "priority": null, "status": "active", "x": 13, "y": 4, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b39", "node": "n1", "title": "파비콘 교체", "icon": "Zap", "priority": "low", "status": "active", "x": 9, "y": 5, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b40", "node": "n1", "title": "검색 노출 확인", "icon": "Heart", "priority": "high", "status": "active", "x": 13, "y": 5, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b41", "node": "n1", "title": "개인정보 처리방침", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 6, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b42", "node": "n1", "title": "배포 일정 공유", "icon": "Target", "priority": "low", "status": "active", "x": 13, "y": 6, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b43", "node": "n14", "title": "장소 예약하기", "icon": "Pin", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 172800000},
      {"key": "b44", "node": "n14", "title": "현장 답사 일정", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b45", "node": "n14", "title": "주차 안내 확인", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b46", "node": "n14", "title": "지난 분기 회고 노트", "icon": "Tag", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null, "archived_ago": 432000000},
      {"key": "b47", "node": "n16", "title": "발표 순서 정하기", "icon": "Bookmark", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b48", "node": "n16", "title": "슬라이드 모으기", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b49", "node": "n16", "title": "마이크 점검", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b50", "node": "n17", "title": "팀 게임 준비하기", "icon": "Heart", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b51", "node": "n17", "title": "토론 주제 정하기", "icon": "FileText", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b52", "node": "n17", "title": "시상 항목 정하기", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b53", "node": "n15", "title": "전체 시간표 짜기", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b54", "node": "n15", "title": "진행자 정하기", "icon": "Star", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b55", "node": "n18", "title": "항목별 견적 받기", "icon": "Lightbulb", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b56", "node": "n18", "title": "카드 한도 확인", "icon": "Tag", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b57", "node": "n19", "title": "버스 대절 문의", "icon": "Bookmark", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b58", "node": "n19", "title": "집합 장소 공지", "icon": "ClipboardList", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b59", "node": "n20", "title": "메뉴 후보 3개", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b60", "node": "n20", "title": "알레르기 표시", "icon": "Heart", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b61", "node": "n21", "title": "방 구성 확인", "icon": "FileText", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b62", "node": "n21", "title": "체크인 시간 확인", "icon": "Target", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b63", "node": "n22", "title": "노트북 충전기 목록", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b64", "node": "n22", "title": "응급 키트", "icon": "Star", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b65", "node": "n23", "title": "사진 공유하기", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b66", "node": "n23", "title": "만족도 조사 분석", "icon": "Tag", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b67", "node": "n13", "title": "일정표 보내기", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000},
      {"key": "b68", "node": "n13", "title": "식단 조사하기", "icon": "ClipboardList", "priority": "low", "status": "complete", "x": 13, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b69", "node": "n13", "title": "참석자 확인하기", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b70", "node": "n13", "title": "이동 수단 정리", "icon": "Heart", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b71", "node": "n13", "title": "비상 연락망 만들기", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b72", "node": "n13", "title": "명찰 준비", "icon": "Target", "priority": "mid", "status": "active", "x": 13, "y": 3, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b73", "node": "n13", "title": "간식 구매", "icon": "Pin", "priority": "low", "status": "active", "x": 9, "y": 4, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b74", "node": "n13", "title": "단체 사진 계획", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 4, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b75", "node": "n13", "title": "날씨 확인", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 5, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b76", "node": "n13", "title": "영수증 정산 방법", "icon": "Tag", "priority": null, "status": "active", "x": 13, "y": 5, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b77", "node": "n13", "title": "후기 설문 만들기", "icon": "Bookmark", "priority": "low", "status": "active", "x": 9, "y": 6, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b78", "node": "n13", "title": "안전 수칙 공유", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 13, "y": 6, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b79", "node": "n26", "title": "책 포장하기", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b80", "node": "n26", "title": "주방 박스 라벨 붙이기", "icon": "Heart", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b81", "node": "n26", "title": "겨울옷 압축하기", "icon": "FileText", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b82", "node": "n26", "title": "깨지기 쉬운 물건 표시", "icon": "Target", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b83", "node": "n27", "title": "침실부터 풀기", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b84", "node": "n27", "title": "가구 위치 정하기", "icon": "Star", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b85", "node": "n27", "title": "빈 박스 내놓기", "icon": "Lightbulb", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b86", "node": "n28", "title": "업체 도착 시간 확인", "icon": "Tag", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b87", "node": "n28", "title": "현관 비밀번호 변경", "icon": "Bookmark", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b88", "node": "n28", "title": "엘리베이터 예약", "icon": "ClipboardList", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b89", "node": "n25", "title": "우편물 전송 신청", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b90", "node": "n25", "title": "기존 인터넷 해지", "icon": "Heart", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": 1209600000},
      {"key": "b91", "node": "n25", "title": "주소 변경 신고", "icon": "FileText", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b92", "node": "n29", "title": "에어컨 필터 씻기", "icon": "Target", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b93", "node": "n29", "title": "베란다 정리", "icon": "Pin", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b94", "node": "n29", "title": "욕실 곰팡이 제거", "icon": "Star", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b95", "node": "n29", "title": "냉장고 비우기", "icon": "Lightbulb", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b96", "node": "n30", "title": "주간 장보기 목록", "icon": "Tag", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b97", "node": "n30", "title": "세제 재고 확인", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b98", "node": "n31", "title": "문고리 교체", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b99", "node": "n31", "title": "방충망 수선", "icon": "Zap", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b100", "node": "n32", "title": "주간 식단 짜기", "icon": "Heart", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b101", "node": "n32", "title": "냉동 식재료 정리", "icon": "FileText", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b102", "node": "n33", "title": "주민등록 등본 발급", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b103", "node": "n33", "title": "자동차 보험 갱신", "icon": "Pin", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b104", "node": "n34", "title": "옷장 정리하기", "icon": "Star", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b105", "node": "n34", "title": "서류함 비우기", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b106", "node": "n35", "title": "겨울 이불 꺼내기", "icon": "Tag", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b107", "node": "n35", "title": "제습기 점검", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b108", "node": "n24", "title": "여권 갱신하기", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 2592000000},
      {"key": "b109", "node": "n24", "title": "치과 예약하기", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b110", "node": "n24", "title": "자전거 고치기", "icon": "Heart", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b111", "node": "n24", "title": "세탁기 청소", "icon": "FileText", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b112", "node": "n24", "title": "전구 교체", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b113", "node": "n24", "title": "택배 반품", "icon": "Pin", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b114", "node": "n24", "title": "보일러 점검", "icon": "Star", "priority": "high", "status": "active", "x": 9, "y": 4, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b115", "node": "n24", "title": "분리배출표 붙이기", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 13, "y": 4, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b116", "node": "n24", "title": "우산 정리", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 5, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b117", "node": "n24", "title": "화분 물주기", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 5, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b118", "node": "n24", "title": "공과금 확인", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 6, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b119", "node": "n24", "title": "열쇠 복사", "icon": "Zap", "priority": null, "status": "active", "x": 13, "y": 6, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b120", "node": "n38", "title": "Index design notes", "icon": "Heart", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b121", "node": "n38", "title": "Isolation levels", "icon": "FileText", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b122", "node": "n38", "title": "Vacuum and bloat", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b123", "node": "n38", "title": "Read the WAL chapter", "icon": "Pin", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b124", "node": "n39", "title": "React Server Components", "icon": "Star", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b125", "node": "n39", "title": "CSS container queries", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b126", "node": "n39", "title": "Web vitals primer", "icon": "Tag", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b127", "node": "n40", "title": "Ownership chapter", "icon": "Bookmark", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b128", "node": "n40", "title": "Lifetimes exercises", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b129", "node": "n40", "title": "Build a small CLI", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b130", "node": "n37", "title": "Reread DDIA chapter 3", "icon": "Heart", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b131", "node": "n37", "title": "Order the Rust book", "icon": "FileText", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b132", "node": "n41", "title": "Finish the novel", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b133", "node": "n41", "title": "Pick a book club title", "icon": "Pin", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b134", "node": "n42", "title": "Queue three episodes", "icon": "Star", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b135", "node": "n42", "title": "Find a design podcast", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b136", "node": "n43", "title": "Save the RLS article", "icon": "Tag", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b137", "node": "n43", "title": "Archive old tabs", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b138", "node": "n44", "title": "Print the Raft paper", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b139", "node": "n44", "title": "Annotate the CRDT paper", "icon": "Zap", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b140", "node": "n45", "title": "Unsubscribe from five", "icon": "Heart", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b141", "node": "n45", "title": "Set a Friday slot", "icon": "FileText", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b142", "node": "n46", "title": "Try a free trial", "icon": "Target", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b143", "node": "n46", "title": "Download for the trip", "icon": "Pin", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b144", "node": "n47", "title": "Add three titles", "icon": "Star", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b145", "node": "n47", "title": "Compare used prices", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b146", "node": "n36", "title": "Finish Clean Code", "icon": "Tag", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b147", "node": "n36", "title": "Read the RLS docs", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b148", "node": "n36", "title": "Skim React 19 notes", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b149", "node": "n36", "title": "Pick next month''s book", "icon": "Zap", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b150", "node": "n36", "title": "Update the reading log", "icon": "Heart", "priority": null, "status": "active", "x": 9, "y": 3, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b151", "node": "n36", "title": "Return the library books", "icon": "FileText", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b152", "node": "n36", "title": "Order the paperback", "icon": "Target", "priority": "high", "status": "active", "x": 9, "y": 4, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b153", "node": "n36", "title": "Review reading goals", "icon": "Pin", "priority": "mid", "status": "active", "x": 13, "y": 4, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b154", "node": "n36", "title": "Share a book note", "icon": "Star", "priority": "low", "status": "active", "x": 9, "y": 5, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b155", "node": "n36", "title": "Renew the library card", "icon": "Lightbulb", "priority": null, "status": "active", "x": 13, "y": 5, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b156", "node": "n36", "title": "Sort the to-read pile", "icon": "Tag", "priority": "mid", "status": "active", "x": 9, "y": 6, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b157", "node": "n36", "title": "Set a daily reading time", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 6, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b158", "node": "n49", "title": "과거형 정리하기", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b159", "node": "n49", "title": "접속법 예문 모으기", "icon": "Zap", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b160", "node": "n49", "title": "전치사 표 만들기", "icon": "Heart", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null},
      {"key": "b161", "node": "n49", "title": "불규칙 동사 외우기", "icon": "FileText", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 2160000000, "created_ago": 2764800000, "deadline_in": null},
      {"key": "b162", "node": "n51", "title": "한 편 자막 없이 보기", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b163", "node": "n51", "title": "대사 10개 적어두기", "icon": "Pin", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b164", "node": "n51", "title": "좋아하는 장면 반복", "icon": "Star", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null},
      {"key": "b165", "node": "n51", "title": "시리즈 고르기", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 2160000000, "created_ago": 2764800000, "deadline_in": null},
      {"key": "b166", "node": "n50", "title": "팟캐스트 구독하기", "icon": "Tag", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b167", "node": "n50", "title": "받아쓰기 연습", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b168", "node": "n48", "title": "5단원 끝내기", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b169", "node": "n48", "title": "언어 교환 파트너 찾기", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b170", "node": "n48", "title": "자막 없이 한 편 보기", "icon": "Heart", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null},
      {"key": "b171", "node": "n53", "title": "핵심 기능 3개 고르기", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b172", "node": "n53", "title": "경쟁 앱 조사하기", "icon": "Target", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b173", "node": "n53", "title": "사용자 인터뷰 질문", "icon": "Pin", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b174", "node": "n53", "title": "로드맵 그리기", "icon": "Star", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b175", "node": "n54", "title": "온보딩 와이어프레임", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b176", "node": "n54", "title": "홈 화면 색상 정하기", "icon": "Tag", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b177", "node": "n54", "title": "아이콘 후보 뽑기", "icon": "Bookmark", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b178", "node": "n54", "title": "빈 상태 문구 쓰기", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b179", "node": "n52", "title": "첫 화면 스케치", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 432000000},
      {"key": "b180", "node": "n52", "title": "Ship a landing page", "icon": "Heart", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 1209600000},
      {"key": "b181", "node": "n52", "title": "README 쓰기", "icon": "FileText", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b182", "node": "n52", "title": "출시 스레드 초안", "icon": "Target", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null, "deleted_ago": 172800000},
      {"key": "b183", "node": "n56", "title": "Plan three weekly routes", "icon": "Pin", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b184", "node": "n56", "title": "Log the pace", "icon": "Star", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b185", "node": "n56", "title": "Scout park routes", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b186", "node": "n56", "title": "Set up the running app", "icon": "Tag", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b187", "node": "n57", "title": "스쿼트 자세 점검", "icon": "Bookmark", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b188", "node": "n57", "title": "상체 루틴 정하기", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b189", "node": "n57", "title": "폼롤러 구입", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b190", "node": "n57", "title": "운동 일지 쓰기", "icon": "Heart", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b191", "node": "n55", "title": "10km 대회 접수", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 1036800000},
      {"key": "b192", "node": "n55", "title": "러닝화 사기", "icon": "Target", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b193", "node": "n55", "title": "스트레칭 루틴 정하기", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b194", "node": "n59", "title": "수령 시기 알아보기", "icon": "Star", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b195", "node": "n59", "title": "납입액 늘리기", "icon": "Lightbulb", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b196", "node": "n59", "title": "세액공제 확인", "icon": "Tag", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b197", "node": "n58", "title": "연말정산 서류 모으기", "icon": "Bookmark", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1728000000},
      {"key": "b198", "node": "n58", "title": "월 예산 정하기", "icon": "ClipboardList", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b199", "node": "n58", "title": "비상금 통장 만들기", "icon": "Zap", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b200", "node": "n58", "title": "구독 서비스 점검", "icon": "Heart", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b201", "node": "n62", "title": "List the temples", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b202", "node": "n62", "title": "Book a tea class", "icon": "Target", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b203", "node": "n62", "title": "Mark the food streets", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b204", "node": "n61", "title": "Buy a rail pass", "icon": "Star", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b205", "node": "n61", "title": "Reserve the ryokan", "icon": "Lightbulb", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b206", "node": "n63", "title": "Find a tram route", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b207", "node": "n63", "title": "Save fado venues", "icon": "Bookmark", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b208", "node": "n60", "title": "Book the flights", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 2160000000},
      {"key": "b209", "node": "n60", "title": "Renew travel insurance", "icon": "Zap", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b210", "node": "n60", "title": "Pick the Kyoto hotel", "icon": "Heart", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b211", "node": "n60", "title": "Check the visa rules", "icon": "FileText", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b212", "node": "n65", "title": "Sheet pan dinners", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b213", "node": "n65", "title": "Fifteen minute pasta", "icon": "Pin", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b214", "node": "n65", "title": "Batch the rice", "icon": "Star", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b215", "node": "n64", "title": "Try the miso soup recipe", "icon": "Lightbulb", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b216", "node": "n64", "title": "Restock the spice shelf", "icon": "Tag", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b217", "node": "n64", "title": "Plan the weekly menu", "icon": "Bookmark", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b218", "node": "n64", "title": "Feed the starter", "icon": "ClipboardList", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b219", "node": "n66", "title": "정보처리 접수일 확인", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b220", "node": "n66", "title": "기출문제 풀기", "icon": "Heart", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b221", "node": "n67", "title": "다음 글 주제 정하기", "icon": "FileText", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b222", "node": "n67", "title": "썸네일 만들기", "icon": "Target", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b223", "node": "n68", "title": "이력서 최신화", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b224", "node": "n68", "title": "포트폴리오 정리", "icon": "Star", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b225", "node": "n69", "title": "생신 선물 후보", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b226", "node": "n69", "title": "안마기 후기 찾기", "icon": "Tag", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b227", "node": "n70", "title": "분갈이 시기 확인", "icon": "Bookmark", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b228", "node": "n70", "title": "새 화분 주문", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b229", "node": "n71", "title": "텐트 방수 점검", "icon": "Zap", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b230", "node": "n71", "title": "예약 오픈일 알림", "icon": "Heart", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b231", "node": "n72", "title": "브이로그 컷 정리", "icon": "FileText", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b232", "node": "n72", "title": "자막 스타일 정하기", "icon": "Target", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b233", "node": "n73", "title": "이번 달 지출 입력", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b234", "node": "n73", "title": "카드 내역 대조", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b235", "node": "n74", "title": "회비 입금 확인", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b236", "node": "n74", "title": "다음 모임 장소", "icon": "Tag", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b237", "node": "n75", "title": "커튼 색상 고르기", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b238", "node": "n75", "title": "조명 후보 비교", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b239", "node": "n76", "title": "검진 예약하기", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b240", "node": "n76", "title": "결과지 보관하기", "icon": "Heart", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b241", "node": "n77", "title": "수강 일정 확인", "icon": "FileText", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b242", "node": "n77", "title": "유약 색 정하기", "icon": "Target", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b243", "node": "n78", "title": "Edit the trip photos", "icon": "Pin", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b244", "node": "n78", "title": "Back up the SD cards", "icon": "Star", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b245", "node": "n79", "title": "Learn the bridge chords", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b246", "node": "n79", "title": "Tune the guitar", "icon": "Tag", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b247", "node": "n80", "title": "Order tomato seeds", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b248", "node": "n80", "title": "Fix the drip line", "icon": "ClipboardList", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b249", "node": "n81", "title": "Watch the director''s cut", "icon": "Zap", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b250", "node": "n81", "title": "Update the watchlist", "icon": "Heart", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b251", "node": "n82", "title": "Draft episode titles", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b252", "node": "n82", "title": "Test the microphone", "icon": "Target", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b253", "node": "n83", "title": "Triage the open issues", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b254", "node": "n83", "title": "Reply to the PR review", "icon": "Star", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b255", "node": "n84", "title": "Price the first offer", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b256", "node": "n84", "title": "Draft the intro email", "icon": "Tag", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b257", "node": "n85", "title": "Sort the vocab cards", "icon": "Bookmark", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b258", "node": "n85", "title": "Record a speaking test", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "s1", "node": "inbox", "title": "Plan the field study", "icon": "sparkles", "priority": null, "status": "active", "x": 3, "y": 0, "mtime_ago": 2700000, "created_ago": 2700000, "deadline_in": null},
      {"key": "s2", "node": "inbox", "title": "주말 여행 아이디어", "icon": "sparkles", "priority": null, "status": "active", "x": 4, "y": 0, "mtime_ago": 93600000, "created_ago": 93600000, "deadline_in": null},
      {"key": "s3", "node": "inbox", "title": "엄마 선물 아이디어", "icon": "sparkles", "priority": null, "status": "active", "x": 5, "y": 0, "mtime_ago": 259200000, "created_ago": 259200000, "deadline_in": null},
      {"key": "s4", "node": "inbox", "title": "Questions for Monday''s stand-up", "icon": "sparkles", "priority": null, "status": "active", "x": 6, "y": 0, "mtime_ago": 518400000, "created_ago": 518400000, "deadline_in": null}
    ],
    "chunks": [
      {"bit": "b31", "title": "히어로 문구 초안", "status": "complete", "order": 0, "time_in": -86400000},
      {"bit": "b31", "title": "후기 3개 고르기", "status": "incomplete", "order": 1, "time_in": 36000000},
      {"bit": "b31", "title": "문구 교정하기", "status": "incomplete", "order": 2, "time_in": 64800000},
      {"bit": "b32", "title": "팔레트 3개 비교하기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b32", "title": "명암비 확인하기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b43", "title": "후보지 3곳 추리기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b43", "title": "1순위 장소에 전화하기", "status": "incomplete", "order": 1, "time_in": 129600000},
      {"bit": "b43", "title": "예약금 내기", "status": "incomplete", "order": 2, "time_in": 172800000},
      {"bit": "b179", "title": "종이 와이어프레임", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b179", "title": "폰트 고르기", "status": "incomplete", "order": 1, "time_in": 345600000}
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
