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
      {"key": "n1", "parent": null, "title": "사이트 개편", "icon": "Globe", "color": "hsl(221, 60%, 45%)", "level": 0, "x": 5, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 1209600000},
      {"key": "n2", "parent": "n1", "title": "디자인", "icon": "Palette", "color": "hsl(231, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 432000000},
      {"key": "n3", "parent": "n1", "title": "개발", "icon": "Code", "color": "hsl(241, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 864000000},
      {"key": "n4", "parent": "n3", "title": "Frontend", "icon": "Layers", "color": "hsl(241, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 864000000},
      {"key": "n5", "parent": "n1", "title": "콘텐츠", "icon": "FileText", "color": "hsl(211, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 1209600000},
      {"key": "n6", "parent": "n5", "title": "블로그", "icon": "PenTool", "color": "hsl(215, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 1209600000},
      {"key": "n7", "parent": "n1", "title": "마케팅", "icon": "Zap", "color": "hsl(201, 60%, 45%)", "level": 1, "x": 5, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n8", "parent": "n1", "title": "운영", "icon": "Settings", "color": "hsl(171, 60%, 45%)", "level": 1, "x": 6, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "n9", "parent": "n1", "title": "법무", "icon": "Lock", "color": "hsl(191, 60%, 45%)", "level": 1, "x": 7, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 86400000},
      {"key": "n10", "parent": "n1", "title": "분석", "icon": "Compass", "color": "hsl(161, 60%, 45%)", "level": 1, "x": 2, "y": 3, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "n11", "parent": null, "title": "팀 워크숍", "icon": "Users", "color": "hsl(160, 60%, 45%)", "level": 0, "x": 6, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000},
      {"key": "n12", "parent": "n11", "title": "장소", "icon": "Building2", "color": "hsl(165, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000},
      {"key": "n13", "parent": "n12", "title": "현장 점검", "icon": "ClipboardList", "color": "hsl(168, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n14", "parent": "n11", "title": "프로그램", "icon": "Target", "color": "hsl(170, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 86400000},
      {"key": "n15", "parent": "n14", "title": "팀 게임", "icon": "Gamepad2", "color": "hsl(175, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 43200000},
      {"key": "n16", "parent": "n11", "title": "예산", "icon": "Wallet", "color": "hsl(150, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n17", "parent": "n11", "title": "교통", "icon": "Car", "color": "hsl(145, 60%, 45%)", "level": 1, "x": 5, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n18", "parent": "n11", "title": "식사", "icon": "Coffee", "color": "hsl(140, 60%, 45%)", "level": 1, "x": 6, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "n19", "parent": "n11", "title": "준비물", "icon": "Box", "color": "hsl(130, 60%, 45%)", "level": 1, "x": 7, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 129600000},
      {"key": "n20", "parent": "n11", "title": "후속", "icon": "Star", "color": "hsl(125, 60%, 45%)", "level": 1, "x": 2, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 172800000},
      {"key": "n21", "parent": null, "title": "집안일", "icon": "Home", "color": "hsl(25, 60%, 45%)", "level": 0, "x": 8, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 5184000000},
      {"key": "n22", "parent": "n21", "title": "이사", "icon": "ListTodo", "color": "hsl(30, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1209600000},
      {"key": "n23", "parent": "n22", "title": "짐 싸기", "icon": "Box", "color": "hsl(35, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 518400000},
      {"key": "n24", "parent": "n21", "title": "청소", "icon": "Hammer", "color": "hsl(20, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1209600000},
      {"key": "n25", "parent": "n24", "title": "대청소", "icon": "FolderOpen", "color": "hsl(22, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n26", "parent": "n21", "title": "장보기", "icon": "ShoppingCart", "color": "hsl(15, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1814400000},
      {"key": "n27", "parent": "n21", "title": "수리", "icon": "Hammer", "color": "hsl(10, 60%, 45%)", "level": 1, "x": 5, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "n28", "parent": "n21", "title": "요리", "icon": "Coffee", "color": "hsl(5, 60%, 45%)", "level": 1, "x": 6, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 2592000000},
      {"key": "n29", "parent": "n28", "title": "밑반찬", "icon": "Coffee", "color": "hsl(8, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n30", "parent": "n21", "title": "행정", "icon": "ClipboardList", "color": "hsl(0, 60%, 45%)", "level": 1, "x": 7, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "n31", "parent": "n21", "title": "정리", "icon": "FolderOpen", "color": "hsl(355, 60%, 45%)", "level": 1, "x": 2, "y": 3, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 3888000000},
      {"key": "n32", "parent": null, "title": "Reading list", "icon": "BookOpen", "color": "hsl(275, 60%, 45%)", "level": 0, "x": 12, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": 604800000},
      {"key": "n33", "parent": "n32", "title": "Tech books", "icon": "Book", "color": "hsl(270, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "n34", "parent": "n33", "title": "Databases", "icon": "Layers", "color": "hsl(265, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "n35", "parent": "n32", "title": "Fiction", "icon": "Bookmark", "color": "hsl(285, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n36", "parent": "n32", "title": "Podcasts", "icon": "Headphones", "color": "hsl(290, 60%, 45%)", "level": 1, "x": 4, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 604800000},
      {"key": "n37", "parent": "n32", "title": "Articles", "icon": "FileText", "color": "hsl(295, 60%, 45%)", "level": 1, "x": 5, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n38", "parent": "n37", "title": "Backlog", "icon": "FolderOpen", "color": "hsl(296, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n39", "parent": "n32", "title": "Papers", "icon": "ClipboardList", "color": "hsl(300, 60%, 45%)", "level": 1, "x": 6, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "n40", "parent": "n32", "title": "Wishlist", "icon": "Gift", "color": "hsl(315, 60%, 45%)", "level": 1, "x": 7, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "n41", "parent": "n32", "title": "Newsletters", "icon": "MessageSquare", "color": "hsl(305, 60%, 45%)", "level": 1, "x": 2, "y": 3, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "n42", "parent": null, "title": "스페인어", "icon": "GraduationCap", "color": "hsl(340, 60%, 45%)", "level": 0, "x": 13, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": 4752000000},
      {"key": "n43", "parent": "n42", "title": "문법", "icon": "Book", "color": "hsl(345, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": 172800000},
      {"key": "n44", "parent": "n43", "title": "동사 변화", "icon": "Book", "color": "hsl(349, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": 172800000},
      {"key": "n45", "parent": "n42", "title": "듣기", "icon": "Headphones", "color": "hsl(345, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": 432000000},
      {"key": "n46", "parent": null, "title": "습관 앱", "icon": "Rocket", "color": "hsl(45, 60%, 45%)", "level": 0, "x": 5, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 1209600000},
      {"key": "n47", "parent": "n46", "title": "기획", "icon": "ClipboardList", "color": "hsl(50, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 691200000},
      {"key": "n48", "parent": "n46", "title": "화면", "icon": "PenTool", "color": "hsl(50, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 1036800000},
      {"key": "n49", "parent": "n48", "title": "아이콘", "icon": "Image", "color": "hsl(54, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "n50", "parent": null, "title": "운동", "icon": "Dumbbell", "color": "hsl(0, 60%, 45%)", "level": 0, "x": 9, "y": 3, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 2160000000},
      {"key": "n51", "parent": "n50", "title": "러닝", "icon": "Timer", "color": "hsl(5, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 1555200000},
      {"key": "n52", "parent": "n51", "title": "대회 준비", "icon": "Target", "color": "hsl(9, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "n53", "parent": "n50", "title": "근력", "icon": "Dumbbell", "color": "hsl(5, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 2160000000},
      {"key": "n54", "parent": null, "title": "재테크", "icon": "Wallet", "color": "hsl(100, 60%, 45%)", "level": 0, "x": 10, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1728000000},
      {"key": "n55", "parent": "n54", "title": "연금", "icon": "Diamond", "color": "hsl(105, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 172800000},
      {"key": "n56", "parent": "n55", "title": "개인연금", "icon": "Diamond", "color": "hsl(109, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n57", "parent": "n54", "title": "보험", "icon": "Lock", "color": "hsl(105, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n58", "parent": null, "title": "가계부", "icon": "Calculator", "color": "hsl(110, 60%, 45%)", "level": 0, "x": 9, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 4752000000},
      {"key": "n59", "parent": "n58", "title": "고정비", "icon": "CreditCard", "color": "hsl(115, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 4752000000},
      {"key": "n60", "parent": "n59", "title": "구독", "icon": "Video", "color": "hsl(119, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n61", "parent": "n58", "title": "변동비", "icon": "ShoppingCart", "color": "hsl(115, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 172800000},
      {"key": "n62", "parent": null, "title": "건강검진", "icon": "Heart", "color": "hsl(355, 60%, 45%)", "level": 0, "x": 8, "y": 3, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 691200000},
      {"key": "n63", "parent": "n62", "title": "치과", "icon": "Heart", "color": "hsl(360, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n64", "parent": "n63", "title": "치료 기록", "icon": "ClipboardList", "color": "hsl(364, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n65", "parent": "n62", "title": "안과", "icon": "Image", "color": "hsl(360, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 691200000},
      {"key": "n66", "parent": null, "title": "캠핑", "icon": "Compass", "color": "hsl(90, 60%, 45%)", "level": 0, "x": 6, "y": 5, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 1555200000},
      {"key": "n67", "parent": "n66", "title": "장비", "icon": "Box", "color": "hsl(95, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 172800000},
      {"key": "n68", "parent": "n67", "title": "쿨러", "icon": "Box", "color": "hsl(99, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 172800000},
      {"key": "n69", "parent": "n66", "title": "장소", "icon": "Map", "color": "hsl(95, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 1555200000},
      {"key": "n70", "parent": null, "title": "Travel", "icon": "Plane", "color": "hsl(190, 60%, 45%)", "level": 0, "x": 5, "y": 5, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 3456000000},
      {"key": "n71", "parent": "n70", "title": "Japan", "icon": "Map", "color": "hsl(195, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 2160000000},
      {"key": "n72", "parent": "n71", "title": "Kyoto", "icon": "Compass", "color": "hsl(199, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "n73", "parent": "n70", "title": "Lisbon", "icon": "Camera", "color": "hsl(195, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 3456000000},
      {"key": "n74", "parent": null, "title": "Cooking", "icon": "Coffee", "color": "hsl(15, 60%, 45%)", "level": 0, "x": 6, "y": 6, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 4752000000},
      {"key": "n75", "parent": "n74", "title": "Weeknight", "icon": "Flame", "color": "hsl(20, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n76", "parent": "n75", "title": "Soups", "icon": "Coffee", "color": "hsl(24, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "n77", "parent": "n74", "title": "Baking", "icon": "Coffee", "color": "hsl(20, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 172800000},
      {"key": "n78", "parent": null, "title": "Photography", "icon": "Camera", "color": "hsl(225, 60%, 45%)", "level": 0, "x": 5, "y": 6, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 432000000},
      {"key": "n79", "parent": "n78", "title": "Portraits", "icon": "Image", "color": "hsl(230, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 432000000},
      {"key": "n80", "parent": "n79", "title": "Lighting", "icon": "Lightbulb", "color": "hsl(234, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 432000000},
      {"key": "n81", "parent": "n78", "title": "Landscapes", "icon": "Map", "color": "hsl(230, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "n82", "parent": null, "title": "Open source", "icon": "Code", "color": "hsl(245, 60%, 45%)", "level": 0, "x": 6, "y": 3, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1036800000},
      {"key": "n83", "parent": "n82", "title": "Docs", "icon": "FileText", "color": "hsl(250, 60%, 45%)", "level": 1, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n84", "parent": "n83", "title": "Examples", "icon": "Code", "color": "hsl(254, 60%, 45%)", "level": 2, "x": 2, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "n85", "parent": "n82", "title": "Releases", "icon": "Rocket", "color": "hsl(250, 60%, 45%)", "level": 1, "x": 3, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1036800000}
    ],
    "bits": [
      {"key": "b1", "node": "n2", "title": "로고 최종본 고르기", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b2", "node": "n2", "title": "아이콘 세트 정리", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b3", "node": "n2", "title": "모바일 시안 검토", "icon": "Pin", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 432000000},
      {"key": "b4", "node": "n2", "title": "예전 로고 시안", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null, "archived_ago": 864000000},
      {"key": "b5", "node": "n4", "title": "Build the header", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 604800000},
      {"key": "b6", "node": "n4", "title": "Lazy load images", "icon": "Tag", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b7", "node": "n4", "title": "Check dark mode", "icon": "Bookmark", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b8", "node": "n4", "title": "Audit the bundle size", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 864000000},
      {"key": "b9", "node": "n3", "title": "Redirect the old URLs", "icon": "Zap", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": -86400000, "description": "Map every old path to the new one and test the top twenty by hand."},
      {"key": "b10", "node": "n3", "title": "Set up analytics", "icon": "Heart", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 604800000},
      {"key": "b11", "node": "n3", "title": "Audit the CI pipeline", "icon": "FileText", "priority": "mid", "status": "complete", "x": 9, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b12", "node": "n3", "title": "Update dependencies", "icon": "Target", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b13", "node": "n3", "title": "Cut the build time", "icon": "Pin", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b14", "node": "n6", "title": "첫 글 초안", "icon": "Star", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 1209600000},
      {"key": "b15", "node": "n5", "title": "소개 글 다듬기", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b16", "node": "n5", "title": "사례 3개 정리", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b17", "node": "n5", "title": "블로그 일정 잡기", "icon": "Bookmark", "priority": "high", "status": "active", "x": 9, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b18", "node": "n5", "title": "보도 자료 확인", "icon": "ClipboardList", "priority": "mid", "status": "complete", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b19", "node": "n5", "title": "번역 감수", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b20", "node": "n5", "title": "이미지 라이선스 확인", "icon": "Heart", "priority": null, "status": "active", "x": 13, "y": 3, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b21", "node": "n5", "title": "삭제한 소개 초안", "icon": "FileText", "priority": "mid", "status": "active", "x": 13, "y": 4, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null, "deleted_ago": 172800000},
      {"key": "b22", "node": "n7", "title": "뉴스레터 초안", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b23", "node": "n7", "title": "SNS 이미지 만들기", "icon": "Pin", "priority": "low", "status": "complete", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b24", "node": "n8", "title": "장애 연락망 정리", "icon": "Star", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b25", "node": "n9", "title": "약관 검토 요청", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 86400000},
      {"key": "b26", "node": "n9", "title": "저작권 표기 확인", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b27", "node": "n9", "title": "개인정보 동의 문구", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 1814400000, "created_ago": 2419200000, "deadline_in": null},
      {"key": "b28", "node": "n10", "title": "전환 목표 정하기", "icon": "ClipboardList", "priority": "mid", "status": "complete", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b29", "node": "n10", "title": "방문자 대시보드", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b30", "node": "n10", "title": "주간 리포트 틀", "icon": "Heart", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 1814400000, "created_ago": 2419200000, "deadline_in": null},
      {"key": "b31", "node": "n1", "title": "홈페이지 문구 쓰기", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 72000000, "description": "히어로 문구는 한 줄로, 후기는 실제 고객 말투 그대로 쓰기. 마감 전에 팀 리뷰 한 번."},
      {"key": "b32", "node": "n1", "title": "색상 팔레트 정하기", "icon": "Target", "priority": "mid", "status": "complete", "x": 9, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b33", "node": "n1", "title": "사이트맵 정리", "icon": "Pin", "priority": "high", "status": "active", "x": 9, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b34", "node": "n1", "title": "접근성 점검", "icon": "Star", "priority": "mid", "status": "active", "x": 9, "y": 4, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 86400000},
      {"key": "b35", "node": "n1", "title": "메타 태그 점검", "icon": "Lightbulb", "priority": "low", "status": "complete", "x": 9, "y": 5, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b36", "node": "n1", "title": "푸터 링크 정리", "icon": "Tag", "priority": null, "status": "active", "x": 9, "y": 6, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b37", "node": "n1", "title": "쿠키 안내 문구", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 172800000},
      {"key": "b38", "node": "n1", "title": "404 페이지 만들기", "icon": "ClipboardList", "priority": null, "status": "complete", "x": 13, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 86400000},
      {"key": "b39", "node": "n1", "title": "파비콘 교체", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b40", "node": "n1", "title": "배포 일정 공유", "icon": "Heart", "priority": "high", "status": "complete", "x": 13, "y": 4, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b41", "node": "n1", "title": "검색 노출 확인", "icon": "FileText", "priority": "mid", "status": "active", "x": 13, "y": 5, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000},
      {"key": "b42", "node": "n13", "title": "비상구 위치 확인", "icon": "Target", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b43", "node": "n13", "title": "와이파이 확인", "icon": "Pin", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b44", "node": "n12", "title": "장소 예약하기", "icon": "Star", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 172800000, "description": "후보 세 곳 중 1순위에 먼저 전화. 예약금 규정과 취소 기한을 꼭 물어보기."},
      {"key": "b45", "node": "n12", "title": "현장 답사 일정", "icon": "Lightbulb", "priority": "mid", "status": "complete", "x": 9, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b46", "node": "n12", "title": "주차 안내 확인", "icon": "Tag", "priority": null, "status": "complete", "x": 13, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b47", "node": "n12", "title": "방 구성 확인", "icon": "Bookmark", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": 259200000},
      {"key": "b48", "node": "n12", "title": "지난 분기 회고 노트", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 13, "y": 3, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null, "archived_ago": 432000000},
      {"key": "b49", "node": "n15", "title": "규칙 정리", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b50", "node": "n15", "title": "도구 준비", "icon": "Heart", "priority": "low", "status": "complete", "x": 9, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b51", "node": "n15", "title": "심판 정하기", "icon": "FileText", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 43200000},
      {"key": "b52", "node": "n15", "title": "점수판 만들기", "icon": "Target", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b53", "node": "n14", "title": "전체 시간표 짜기", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 43200000},
      {"key": "b54", "node": "n14", "title": "진행자 정하기", "icon": "Star", "priority": "low", "status": "complete", "x": 9, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b55", "node": "n14", "title": "대체 프로그램", "icon": "Lightbulb", "priority": "high", "status": "active", "x": 9, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b56", "node": "n14", "title": "시상 계획", "icon": "Tag", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b57", "node": "n14", "title": "사진 담당 정하기", "icon": "Bookmark", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 86400000},
      {"key": "b58", "node": "n16", "title": "항목별 견적 받기", "icon": "ClipboardList", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b59", "node": "n16", "title": "카드 한도 확인", "icon": "Zap", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b60", "node": "n17", "title": "버스 대절 문의", "icon": "Heart", "priority": null, "status": "complete", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b61", "node": "n17", "title": "집합 장소 공지", "icon": "FileText", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b62", "node": "n18", "title": "메뉴 후보 3개", "icon": "Target", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b63", "node": "n19", "title": "노트북 충전기 목록", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 129600000},
      {"key": "b64", "node": "n19", "title": "응급 키트", "icon": "Star", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b65", "node": "n19", "title": "현수막 제작", "icon": "Lightbulb", "priority": null, "status": "complete", "x": 13, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b66", "node": "n20", "title": "사진 공유하기", "icon": "Tag", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b67", "node": "n20", "title": "만족도 조사 분석", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": 172800000},
      {"key": "b68", "node": "n11", "title": "일정표 보내기", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 259200000, "description": "시간표 확정본을 PDF로. 변경 가능성이 있는 세션은 따로 표시."},
      {"key": "b69", "node": "n11", "title": "식단 조사하기", "icon": "Zap", "priority": "low", "status": "complete", "x": 9, "y": 2, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b70", "node": "n11", "title": "참석자 확인하기", "icon": "Heart", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b71", "node": "n11", "title": "이동 수단 정리", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 4, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 129600000},
      {"key": "b72", "node": "n11", "title": "비상 연락망 만들기", "icon": "Target", "priority": "mid", "status": "complete", "x": 13, "y": 1, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": null},
      {"key": "b73", "node": "n11", "title": "명찰 준비", "icon": "Pin", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b74", "node": "n11", "title": "간식 구매", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 3, "mtime_ago": 345600000, "created_ago": 950400000, "deadline_in": 172800000},
      {"key": "b75", "node": "n11", "title": "단체 사진 계획", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 13, "y": 4, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b76", "node": "n23", "title": "책 포장하기", "icon": "Tag", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 345600000},
      {"key": "b77", "node": "n23", "title": "주방 박스 라벨 붙이기", "icon": "Bookmark", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b78", "node": "n23", "title": "겨울옷 압축하기", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 9, "y": 3, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b79", "node": "n23", "title": "깨지기 쉬운 물건 표시", "icon": "Zap", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": 518400000},
      {"key": "b80", "node": "n23", "title": "박스 번호 매기기", "icon": "Heart", "priority": "low", "status": "complete", "x": 13, "y": 2, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b81", "node": "n22", "title": "우편물 전송 신청", "icon": "FileText", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b82", "node": "n22", "title": "기존 인터넷 해지", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": 1209600000, "description": "해지 신청은 이사 2주 전. 공유기 반납 방법도 같이 물어보기."},
      {"key": "b83", "node": "n22", "title": "주소 변경 신고", "icon": "Pin", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b84", "node": "n22", "title": "이사 업체 비교", "icon": "Star", "priority": "low", "status": "complete", "x": 13, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": 345600000},
      {"key": "b85", "node": "n25", "title": "커튼 빨기", "icon": "Lightbulb", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b86", "node": "n25", "title": "매트 털기", "icon": "Tag", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b87", "node": "n25", "title": "바닥 왁스", "icon": "Bookmark", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b88", "node": "n25", "title": "창문 닦기", "icon": "ClipboardList", "priority": null, "status": "complete", "x": 13, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b89", "node": "n24", "title": "에어컨 필터 씻기", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b90", "node": "n24", "title": "베란다 정리", "icon": "Heart", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b91", "node": "n24", "title": "욕실 곰팡이 제거", "icon": "FileText", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 777600000},
      {"key": "b92", "node": "n24", "title": "냉장고 비우기", "icon": "Target", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b93", "node": "n24", "title": "창틀 닦기", "icon": "Pin", "priority": "mid", "status": "complete", "x": 13, "y": 2, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b94", "node": "n24", "title": "세탁조 청소", "icon": "Star", "priority": "low", "status": "active", "x": 13, "y": 3, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": 1209600000},
      {"key": "b95", "node": "n26", "title": "주간 장보기 목록", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b96", "node": "n26", "title": "세제 재고 확인", "icon": "Tag", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b97", "node": "n26", "title": "쌀 주문하기", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 1814400000},
      {"key": "b98", "node": "n27", "title": "문고리 교체", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b99", "node": "n27", "title": "방충망 수선", "icon": "Zap", "priority": "high", "status": "complete", "x": 13, "y": 1, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b100", "node": "n29", "title": "멸치볶음 레시피", "icon": "Heart", "priority": "mid", "status": "complete", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b101", "node": "n29", "title": "장아찌 담그기", "icon": "FileText", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b102", "node": "n28", "title": "주간 식단 짜기", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b103", "node": "n28", "title": "냉동 식재료 정리", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": 2592000000},
      {"key": "b104", "node": "n28", "title": "밑반찬 만들기", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b105", "node": "n28", "title": "조미료 채우기", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": 345600000},
      {"key": "b106", "node": "n30", "title": "주민등록 등본 발급", "icon": "Tag", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b107", "node": "n31", "title": "옷장 정리하기", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b108", "node": "n31", "title": "서류함 비우기", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": 3888000000},
      {"key": "b109", "node": "n31", "title": "책 기부하기", "icon": "Zap", "priority": null, "status": "complete", "x": 13, "y": 1, "mtime_ago": 1814400000, "created_ago": 2419200000, "deadline_in": null},
      {"key": "b110", "node": "n21", "title": "여권 갱신하기", "icon": "Heart", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 2592000000, "description": "사진 규격 확인하고 구청 방문 예약. 만료일 6개월 전에는 끝내기."},
      {"key": "b111", "node": "n21", "title": "치과 예약하기", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": -259200000},
      {"key": "b112", "node": "n21", "title": "자전거 고치기", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 3, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b113", "node": "n21", "title": "세탁기 청소", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 4, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b114", "node": "n21", "title": "전구 교체", "icon": "Star", "priority": "low", "status": "complete", "x": 9, "y": 5, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b115", "node": "n21", "title": "택배 반품", "icon": "Lightbulb", "priority": "high", "status": "active", "x": 9, "y": 6, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b116", "node": "n21", "title": "보일러 점검", "icon": "Tag", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null, "description": "겨울 전에 점검 예약. 작년 점검 기록은 서랍 첫 칸 파일에 있음."},
      {"key": "b117", "node": "n21", "title": "분리배출표 붙이기", "icon": "Bookmark", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b118", "node": "n21", "title": "공과금 확인", "icon": "ClipboardList", "priority": null, "status": "active", "x": 13, "y": 3, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 3888000000},
      {"key": "b119", "node": "n21", "title": "열쇠 복사", "icon": "Zap", "priority": "mid", "status": "complete", "x": 13, "y": 4, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b120", "node": "n21", "title": "화분 물주기", "icon": "Heart", "priority": null, "status": "active", "x": 13, "y": 5, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b121", "node": "n21", "title": "신발장 정리", "icon": "FileText", "priority": "low", "status": "active", "x": 13, "y": 6, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": 5184000000},
      {"key": "b122", "node": "n34", "title": "Vacuum and bloat", "icon": "Target", "priority": "high", "status": "complete", "x": 9, "y": 1, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b123", "node": "n34", "title": "Read the WAL chapter", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b124", "node": "n34", "title": "Query plan basics", "icon": "Star", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b125", "node": "n34", "title": "Locking notes", "icon": "Lightbulb", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b126", "node": "n34", "title": "Replication notes", "icon": "Tag", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b127", "node": "n33", "title": "Reread DDIA chapter 3", "icon": "Bookmark", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b128", "node": "n33", "title": "Order the Rust book", "icon": "ClipboardList", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b129", "node": "n33", "title": "Compare two SQL books", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b130", "node": "n33", "title": "Index design notes", "icon": "Heart", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b131", "node": "n35", "title": "Finish the novel", "icon": "FileText", "priority": "mid", "status": "complete", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b132", "node": "n35", "title": "Pick a book club title", "icon": "Target", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b133", "node": "n35", "title": "Reread the first chapter", "icon": "Pin", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b134", "node": "n36", "title": "Queue three episodes", "icon": "Star", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 604800000},
      {"key": "b135", "node": "n36", "title": "Find a design podcast", "icon": "Lightbulb", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b136", "node": "n38", "title": "Sort by topic", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b137", "node": "n38", "title": "Skim the headlines", "icon": "Bookmark", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b138", "node": "n38", "title": "Delete the stale ones", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b139", "node": "n37", "title": "Save the RLS article", "icon": "Zap", "priority": "low", "status": "complete", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b140", "node": "n37", "title": "Archive old tabs", "icon": "Heart", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b141", "node": "n37", "title": "Summarize one essay", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 3, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b142", "node": "n37", "title": "Tag the saved links", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 4, "mtime_ago": 1036800000, "created_ago": 1641600000, "deadline_in": null},
      {"key": "b143", "node": "n37", "title": "Read the long one", "icon": "Pin", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b144", "node": "n37", "title": "Clip a quote", "icon": "Star", "priority": "high", "status": "complete", "x": 13, "y": 2, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b145", "node": "n37", "title": "Export the highlights", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 13, "y": 3, "mtime_ago": 864000000, "created_ago": 1468800000, "deadline_in": null},
      {"key": "b146", "node": "n39", "title": "Print the Raft paper", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b147", "node": "n40", "title": "Add three titles", "icon": "Bookmark", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b148", "node": "n40", "title": "Compare used prices", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b149", "node": "n40", "title": "Share with a friend", "icon": "Zap", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 1814400000, "created_ago": 2419200000, "deadline_in": null},
      {"key": "b150", "node": "n41", "title": "Unsubscribe from five", "icon": "Heart", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b151", "node": "n41", "title": "Set a Friday slot", "icon": "FileText", "priority": "high", "status": "complete", "x": 13, "y": 1, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b152", "node": "n32", "title": "Finish Clean Code", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null, "description": "Two chapters left. Read one before work and take notes on naming."},
      {"key": "b153", "node": "n32", "title": "Read the RLS docs", "icon": "Pin", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null, "description": "Focus on policies with joins and the performance notes at the end."},
      {"key": "b154", "node": "n32", "title": "Skim React 19 notes", "icon": "Star", "priority": "low", "status": "active", "x": 9, "y": 3, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b155", "node": "n32", "title": "Pick next month''s book", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 9, "y": 4, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b156", "node": "n32", "title": "Update the reading log", "icon": "Tag", "priority": null, "status": "active", "x": 9, "y": 5, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b157", "node": "n32", "title": "Return the library books", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 432000000, "created_ago": 1036800000, "deadline_in": null},
      {"key": "b158", "node": "n32", "title": "Order the paperback", "icon": "ClipboardList", "priority": null, "status": "active", "x": 13, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b159", "node": "n32", "title": "Share a book note", "icon": "Zap", "priority": "low", "status": "complete", "x": 13, "y": 3, "mtime_ago": 950400000, "created_ago": 1555200000, "deadline_in": null},
      {"key": "b160", "node": "n32", "title": "Set a daily reading time", "icon": "Heart", "priority": "high", "status": "complete", "x": 13, "y": 4, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b161", "node": "n44", "title": "불규칙 동사 외우기", "icon": "FileText", "priority": "mid", "status": "complete", "x": 9, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": 172800000},
      {"key": "b162", "node": "n44", "title": "현재완료 연습", "icon": "Target", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b163", "node": "n43", "title": "과거형 정리하기", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b164", "node": "n43", "title": "접속법 예문 모으기", "icon": "Star", "priority": "mid", "status": "complete", "x": 9, "y": 2, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": null},
      {"key": "b165", "node": "n43", "title": "전치사 표 만들기", "icon": "Lightbulb", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": 172800000},
      {"key": "b166", "node": "n45", "title": "팟캐스트 구독하기", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": 432000000},
      {"key": "b167", "node": "n42", "title": "5단원 끝내기", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 1209600000, "created_ago": 1814400000, "deadline_in": null},
      {"key": "b168", "node": "n42", "title": "언어 교환 파트너 찾기", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 1382400000, "created_ago": 1987200000, "deadline_in": 4752000000},
      {"key": "b169", "node": "n42", "title": "자막 없이 한 편 보기", "icon": "Zap", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 1728000000, "created_ago": 2332800000, "deadline_in": null},
      {"key": "b170", "node": "n47", "title": "핵심 기능 3개 고르기", "icon": "Heart", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b171", "node": "n47", "title": "경쟁 앱 조사하기", "icon": "FileText", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 691200000},
      {"key": "b172", "node": "n47", "title": "사용자 인터뷰 질문", "icon": "Target", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b173", "node": "n49", "title": "스트릭 아이콘", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b174", "node": "n49", "title": "배지 디자인", "icon": "Star", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b175", "node": "n48", "title": "온보딩 와이어프레임", "icon": "Lightbulb", "priority": "high", "status": "complete", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b176", "node": "n48", "title": "홈 화면 색상 정하기", "icon": "Tag", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 1036800000},
      {"key": "b177", "node": "n48", "title": "아이콘 후보 뽑기", "icon": "Bookmark", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b178", "node": "n46", "title": "첫 화면 스케치", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 432000000, "description": "처음 열었을 때 할 일 한 가지만 보이게. 종이로 먼저 그리고 나서 피그마로."},
      {"key": "b179", "node": "n46", "title": "Ship a landing page", "icon": "Zap", "priority": "high", "status": "active", "x": 9, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 1209600000, "description": "One page, one call to action. Ship it ugly, then iterate."},
      {"key": "b180", "node": "n46", "title": "README 쓰기", "icon": "Heart", "priority": null, "status": "complete", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b181", "node": "n46", "title": "알림 문구 쓰기", "icon": "FileText", "priority": "mid", "status": "active", "x": 13, "y": 2, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b182", "node": "n52", "title": "접수 확인", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b183", "node": "n52", "title": "컨디션 관리", "icon": "Pin", "priority": "low", "status": "complete", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b184", "node": "n52", "title": "보급 계획", "icon": "Star", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b185", "node": "n51", "title": "주 3회 코스 짜기", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b186", "node": "n51", "title": "페이스 기록하기", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b187", "node": "n51", "title": "공원 코스 탐색", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 1555200000},
      {"key": "b188", "node": "n53", "title": "스쿼트 자세 점검", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 2160000000},
      {"key": "b189", "node": "n50", "title": "10km 대회 접수", "icon": "Zap", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 1036800000, "description": "선착순이라 오픈 시각에 맞춰 접속. 기록 인증용 시계 충전해 두기."},
      {"key": "b190", "node": "n50", "title": "러닝화 사기", "icon": "Heart", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": -172800000},
      {"key": "b191", "node": "n50", "title": "스트레칭 루틴 정하기", "icon": "FileText", "priority": "low", "status": "complete", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b192", "node": "n56", "title": "세액공제 한도 확인", "icon": "Target", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b193", "node": "n55", "title": "수령 시기 알아보기", "icon": "Pin", "priority": "mid", "status": "complete", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b194", "node": "n55", "title": "납입액 늘리기", "icon": "Star", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": 172800000},
      {"key": "b195", "node": "n57", "title": "보험 목록 정리", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b196", "node": "n54", "title": "연말정산 서류 모으기", "icon": "Tag", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1728000000, "description": "의료비, 기부금, 월세 영수증부터. 빠진 항목은 1월에 다시 내려받기."},
      {"key": "b197", "node": "n54", "title": "월 예산 정하기", "icon": "Bookmark", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": -518400000},
      {"key": "b198", "node": "n54", "title": "비상금 통장 만들기", "icon": "ClipboardList", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "b199", "node": "n54", "title": "구독 서비스 점검", "icon": "Zap", "priority": "low", "status": "active", "x": 13, "y": 2, "mtime_ago": 777600000, "created_ago": 1382400000, "deadline_in": null},
      {"key": "b200", "node": "n60", "title": "OTT 해지 검토", "icon": "Heart", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b201", "node": "n60", "title": "클라우드 용량 정리", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b202", "node": "n60", "title": "정기결제 알림 켜기", "icon": "Target", "priority": "low", "status": "complete", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": null},
      {"key": "b203", "node": "n59", "title": "월세 확인하기", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b204", "node": "n59", "title": "통신비 비교", "icon": "Star", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": 4752000000},
      {"key": "b205", "node": "n61", "title": "식비 한도 정하기", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 172800000},
      {"key": "b206", "node": "n58", "title": "이번 달 지출 입력", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 3456000000},
      {"key": "b207", "node": "n58", "title": "카드 내역 대조", "icon": "Bookmark", "priority": "high", "status": "complete", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b208", "node": "n64", "title": "영수증 모으기", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b209", "node": "n63", "title": "스케일링 예약", "icon": "Zap", "priority": "low", "status": "complete", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b210", "node": "n63", "title": "사랑니 상담", "icon": "Heart", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b211", "node": "n65", "title": "시력 검사 예약", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 691200000},
      {"key": "b212", "node": "n62", "title": "검진 예약하기", "icon": "Target", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b213", "node": "n62", "title": "결과지 보관하기", "icon": "Pin", "priority": "low", "status": "complete", "x": 9, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b214", "node": "n62", "title": "금식 시간 확인", "icon": "Star", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": 432000000},
      {"key": "b215", "node": "n68", "title": "얼음 준비", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 172800000},
      {"key": "b216", "node": "n68", "title": "보냉백 확인", "icon": "Tag", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b217", "node": "n68", "title": "식음료 담기", "icon": "Bookmark", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 1814400000, "created_ago": 2419200000, "deadline_in": null},
      {"key": "b218", "node": "n67", "title": "침낭 상태 확인", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b219", "node": "n67", "title": "버너 가스 점검", "icon": "Zap", "priority": null, "status": "active", "x": 9, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b220", "node": "n67", "title": "의자 수리", "icon": "Heart", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 1814400000, "created_ago": 2419200000, "deadline_in": null},
      {"key": "b221", "node": "n69", "title": "근교 캠핑장 찾기", "icon": "FileText", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": 1555200000},
      {"key": "b222", "node": "n66", "title": "텐트 방수 점검", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b223", "node": "n66", "title": "예약 오픈일 알림", "icon": "Pin", "priority": "low", "status": "complete", "x": 9, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b224", "node": "n66", "title": "랜턴 충전", "icon": "Star", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 1814400000, "created_ago": 2419200000, "deadline_in": 1036800000},
      {"key": "b225", "node": "n72", "title": "List the temples", "icon": "Lightbulb", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b226", "node": "n72", "title": "Book a tea class", "icon": "Tag", "priority": null, "status": "complete", "x": 9, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b227", "node": "n72", "title": "Mark the food streets", "icon": "Bookmark", "priority": "low", "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b228", "node": "n72", "title": "Find a ramen shop", "icon": "ClipboardList", "priority": "high", "status": "active", "x": 13, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b229", "node": "n71", "title": "Buy a rail pass", "icon": "Zap", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b230", "node": "n71", "title": "Reserve the ryokan", "icon": "Heart", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 2160000000},
      {"key": "b231", "node": "n71", "title": "Save offline maps", "icon": "FileText", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b232", "node": "n73", "title": "Find a tram route", "icon": "Target", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b233", "node": "n73", "title": "Save fado venues", "icon": "Pin", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 3456000000},
      {"key": "b234", "node": "n70", "title": "Book the flights", "icon": "Star", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": 2160000000, "description": "Compare the two airlines, check the baggage rules, then book before the fare window closes."},
      {"key": "b235", "node": "n70", "title": "Check the visa rules", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b236", "node": "n70", "title": "Renew travel insurance", "icon": "Tag", "priority": "high", "status": "complete", "x": 13, "y": 1, "mtime_ago": 259200000, "created_ago": 864000000, "deadline_in": null},
      {"key": "b237", "node": "n76", "title": "Chicken broth", "icon": "Bookmark", "priority": "mid", "status": "complete", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b238", "node": "n75", "title": "Sheet pan dinners", "icon": "ClipboardList", "priority": "low", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null},
      {"key": "b239", "node": "n75", "title": "Fifteen minute pasta", "icon": "Zap", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b240", "node": "n77", "title": "Feed the starter", "icon": "Heart", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": 172800000},
      {"key": "b241", "node": "n74", "title": "Try the miso soup recipe", "icon": "FileText", "priority": null, "status": "complete", "x": 9, "y": 1, "mtime_ago": 43200000, "created_ago": 648000000, "deadline_in": null, "description": "Use white miso, add the tofu last, and keep the broth below a boil."},
      {"key": "b242", "node": "n74", "title": "Plan the weekly menu", "icon": "Target", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 86400000, "created_ago": 691200000, "deadline_in": null},
      {"key": "b243", "node": "n74", "title": "Restock the spice shelf", "icon": "Pin", "priority": "high", "status": "active", "x": 13, "y": 1, "mtime_ago": 172800000, "created_ago": 777600000, "deadline_in": 4752000000},
      {"key": "b244", "node": "n80", "title": "Test the softbox", "icon": "Star", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b245", "node": "n80", "title": "Note the settings", "icon": "Lightbulb", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": 432000000},
      {"key": "b246", "node": "n80", "title": "Pack the diffuser", "icon": "Tag", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 1814400000, "created_ago": 2419200000, "deadline_in": null},
      {"key": "b247", "node": "n79", "title": "Book a model day", "icon": "Bookmark", "priority": "mid", "status": "complete", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b248", "node": "n79", "title": "Buy a reflector", "icon": "ClipboardList", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b249", "node": "n81", "title": "Plan the sunrise shoot", "icon": "Zap", "priority": "low", "status": "complete", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b250", "node": "n78", "title": "Edit the trip photos", "icon": "Heart", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 1296000000, "created_ago": 1900800000, "deadline_in": null},
      {"key": "b251", "node": "n78", "title": "Back up the SD cards", "icon": "FileText", "priority": "mid", "status": "active", "x": 9, "y": 2, "mtime_ago": 1555200000, "created_ago": 2160000000, "deadline_in": null},
      {"key": "b252", "node": "n78", "title": "Clean the lens", "icon": "Target", "priority": "low", "status": "complete", "x": 13, "y": 1, "mtime_ago": 1814400000, "created_ago": 2419200000, "deadline_in": 172800000},
      {"key": "b253", "node": "n84", "title": "Add a minimal repro", "icon": "Pin", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b254", "node": "n84", "title": "Test the snippets", "icon": "Star", "priority": "mid", "status": "active", "x": 13, "y": 1, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b255", "node": "n83", "title": "Fix the README typos", "icon": "Lightbulb", "priority": null, "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": null},
      {"key": "b256", "node": "n83", "title": "Add a quickstart", "icon": "Tag", "priority": "low", "status": "complete", "x": 13, "y": 1, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b257", "node": "n85", "title": "Tag the next release", "icon": "Bookmark", "priority": "high", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 1036800000},
      {"key": "b258", "node": "n82", "title": "Triage the open issues", "icon": "ClipboardList", "priority": "mid", "status": "active", "x": 9, "y": 1, "mtime_ago": 518400000, "created_ago": 1123200000, "deadline_in": 691200000},
      {"key": "b259", "node": "n82", "title": "Reply to the PR review", "icon": "Zap", "priority": "low", "status": "active", "x": 9, "y": 2, "mtime_ago": 604800000, "created_ago": 1209600000, "deadline_in": null},
      {"key": "b260", "node": "n82", "title": "Update the changelog", "icon": "Heart", "priority": null, "status": "active", "x": 13, "y": 1, "mtime_ago": 691200000, "created_ago": 1296000000, "deadline_in": null},
      {"key": "s1", "node": "inbox", "title": "Plan the field study", "icon": "sparkles", "priority": null, "status": "active", "x": 3, "y": 0, "mtime_ago": 2700000, "created_ago": 2700000, "deadline_in": null},
      {"key": "s2", "node": "inbox", "title": "주말 여행 아이디어", "icon": "sparkles", "priority": null, "status": "active", "x": 4, "y": 0, "mtime_ago": 93600000, "created_ago": 93600000, "deadline_in": null},
      {"key": "s3", "node": "inbox", "title": "엄마 선물 아이디어", "icon": "sparkles", "priority": null, "status": "active", "x": 5, "y": 0, "mtime_ago": 259200000, "created_ago": 259200000, "deadline_in": null},
      {"key": "s4", "node": "inbox", "title": "Questions for Monday''s stand-up", "icon": "sparkles", "priority": null, "status": "active", "x": 6, "y": 0, "mtime_ago": 518400000, "created_ago": 518400000, "deadline_in": null},
      {"key": "s5", "node": "inbox", "title": "새 노트북 고르기", "icon": "sparkles", "priority": null, "status": "active", "x": 7, "y": 0, "mtime_ago": 172800000, "created_ago": 172800000, "deadline_in": null},
      {"key": "s6", "node": "inbox", "title": "Birthday party checklist", "icon": "sparkles", "priority": null, "status": "active", "x": 8, "y": 0, "mtime_ago": 345600000, "created_ago": 345600000, "deadline_in": null},
      {"key": "s7", "node": "inbox", "title": "독서 모임 준비", "icon": "sparkles", "priority": null, "status": "active", "x": 9, "y": 0, "mtime_ago": 777600000, "created_ago": 777600000, "deadline_in": null}
    ],
    "chunks": [
      {"bit": "b7", "title": "Gather the notes", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b7", "title": "Draft it", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b7", "title": "Get a review", "status": "incomplete", "order": 2, "time_in": null},
      {"bit": "b7", "title": "Wrap it up", "status": "incomplete", "order": 3, "time_in": null},
      {"bit": "b25", "title": "자료 모으기", "status": "incomplete", "order": 0, "time_in": 43200000},
      {"bit": "b25", "title": "초안 쓰기", "status": "incomplete", "order": 1, "time_in": 43200000},
      {"bit": "b25", "title": "검토 받기", "status": "incomplete", "order": 2, "time_in": 43200000},
      {"bit": "b31", "title": "히어로 문구 초안", "status": "complete", "order": 0, "time_in": -86400000},
      {"bit": "b31", "title": "후기 3개 고르기", "status": "incomplete", "order": 1, "time_in": 36000000},
      {"bit": "b31", "title": "문구 교정하기", "status": "incomplete", "order": 2, "time_in": 64800000},
      {"bit": "b32", "title": "팔레트 3개 비교하기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b32", "title": "명암비 확인하기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b38", "title": "자료 모으기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b38", "title": "초안 쓰기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b38", "title": "검토 받기", "status": "complete", "order": 2, "time_in": null},
      {"bit": "b38", "title": "마무리하기", "status": "complete", "order": 3, "time_in": null},
      {"bit": "b44", "title": "후보지 3곳 추리기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b44", "title": "1순위 장소에 전화하기", "status": "incomplete", "order": 1, "time_in": 129600000},
      {"bit": "b44", "title": "예약금 내기", "status": "incomplete", "order": 2, "time_in": 172800000},
      {"bit": "b45", "title": "자료 모으기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b45", "title": "초안 쓰기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b45", "title": "검토 받기", "status": "complete", "order": 2, "time_in": null},
      {"bit": "b45", "title": "마무리하기", "status": "complete", "order": 3, "time_in": null},
      {"bit": "b51", "title": "자료 모으기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b51", "title": "초안 쓰기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b51", "title": "검토 받기", "status": "incomplete", "order": 2, "time_in": 21600000},
      {"bit": "b51", "title": "마무리하기", "status": "incomplete", "order": 3, "time_in": 21600000},
      {"bit": "b84", "title": "자료 모으기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b84", "title": "초안 쓰기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b84", "title": "검토 받기", "status": "complete", "order": 2, "time_in": null},
      {"bit": "b85", "title": "자료 모으기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b85", "title": "초안 쓰기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b85", "title": "검토 받기", "status": "incomplete", "order": 2, "time_in": null},
      {"bit": "b85", "title": "마무리하기", "status": "incomplete", "order": 3, "time_in": null},
      {"bit": "b105", "title": "자료 모으기", "status": "incomplete", "order": 0, "time_in": 172800000},
      {"bit": "b105", "title": "초안 쓰기", "status": "incomplete", "order": 1, "time_in": 172800000},
      {"bit": "b105", "title": "검토 받기", "status": "incomplete", "order": 2, "time_in": 172800000},
      {"bit": "b105", "title": "마무리하기", "status": "incomplete", "order": 3, "time_in": 172800000},
      {"bit": "b112", "title": "자료 모으기", "status": "incomplete", "order": 0, "time_in": null},
      {"bit": "b112", "title": "초안 쓰기", "status": "incomplete", "order": 1, "time_in": null},
      {"bit": "b112", "title": "검토 받기", "status": "incomplete", "order": 2, "time_in": null},
      {"bit": "b112", "title": "마무리하기", "status": "incomplete", "order": 3, "time_in": null},
      {"bit": "b134", "title": "Gather the notes", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b134", "title": "Draft it", "status": "incomplete", "order": 1, "time_in": 302400000},
      {"bit": "b134", "title": "Get a review", "status": "incomplete", "order": 2, "time_in": 302400000},
      {"bit": "b146", "title": "Gather the notes", "status": "incomplete", "order": 0, "time_in": null},
      {"bit": "b146", "title": "Draft it", "status": "incomplete", "order": 1, "time_in": null},
      {"bit": "b146", "title": "Get a review", "status": "incomplete", "order": 2, "time_in": null},
      {"bit": "b146", "title": "Wrap it up", "status": "incomplete", "order": 3, "time_in": null},
      {"bit": "b160", "title": "Gather the notes", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b160", "title": "Draft it", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b160", "title": "Get a review", "status": "complete", "order": 2, "time_in": null},
      {"bit": "b160", "title": "Wrap it up", "status": "complete", "order": 3, "time_in": null},
      {"bit": "b161", "title": "자료 모으기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b161", "title": "초안 쓰기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b161", "title": "검토 받기", "status": "complete", "order": 2, "time_in": null},
      {"bit": "b161", "title": "마무리하기", "status": "complete", "order": 3, "time_in": null},
      {"bit": "b174", "title": "자료 모으기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b174", "title": "초안 쓰기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b174", "title": "검토 받기", "status": "incomplete", "order": 2, "time_in": null},
      {"bit": "b174", "title": "마무리하기", "status": "incomplete", "order": 3, "time_in": null},
      {"bit": "b178", "title": "종이 와이어프레임", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b178", "title": "폰트 고르기", "status": "incomplete", "order": 1, "time_in": 345600000},
      {"bit": "b194", "title": "자료 모으기", "status": "incomplete", "order": 0, "time_in": 86400000},
      {"bit": "b194", "title": "초안 쓰기", "status": "incomplete", "order": 1, "time_in": 86400000},
      {"bit": "b194", "title": "검토 받기", "status": "incomplete", "order": 2, "time_in": 86400000},
      {"bit": "b213", "title": "자료 모으기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b213", "title": "초안 쓰기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b213", "title": "검토 받기", "status": "complete", "order": 2, "time_in": null},
      {"bit": "b213", "title": "마무리하기", "status": "complete", "order": 3, "time_in": null},
      {"bit": "b215", "title": "자료 모으기", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b215", "title": "초안 쓰기", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b215", "title": "검토 받기", "status": "incomplete", "order": 2, "time_in": 86400000},
      {"bit": "b215", "title": "마무리하기", "status": "incomplete", "order": 3, "time_in": 86400000},
      {"bit": "b228", "title": "Gather the notes", "status": "incomplete", "order": 0, "time_in": null},
      {"bit": "b228", "title": "Draft it", "status": "incomplete", "order": 1, "time_in": null},
      {"bit": "b228", "title": "Get a review", "status": "incomplete", "order": 2, "time_in": null},
      {"bit": "b228", "title": "Wrap it up", "status": "incomplete", "order": 3, "time_in": null},
      {"bit": "b252", "title": "Gather the notes", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b252", "title": "Draft it", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b252", "title": "Get a review", "status": "complete", "order": 2, "time_in": null},
      {"bit": "b253", "title": "Gather the notes", "status": "complete", "order": 0, "time_in": null},
      {"bit": "b253", "title": "Draft it", "status": "complete", "order": 1, "time_in": null},
      {"bit": "b253", "title": "Get a review", "status": "incomplete", "order": 2, "time_in": null},
      {"bit": "b253", "title": "Wrap it up", "status": "incomplete", "order": 3, "time_in": null}
    ],
    "rows": [
      {"key": "r1", "scratch": "s1", "content": "Review the field notes", "order": 0, "created_ago": 2700000},
      {"key": "r2", "scratch": "s1", "content": "Draft the study summary", "order": 1, "created_ago": 2699000},
      {"key": "r3", "scratch": "s1", "content": "Book the meeting room", "order": 2, "created_ago": 2698000},
      {"key": "r4", "scratch": "s1", "content": "Send the participant list", "order": 3, "created_ago": 2697000},
      {"key": "r5", "scratch": "s1", "content": "Archive the old drafts", "order": 4, "created_ago": 2696000},
      {"key": "r6", "scratch": "s2", "content": "기차 시간 확인하기", "order": 0, "created_ago": 93600000, "consumed_ago": 46800000},
      {"key": "r7", "scratch": "s2", "content": "반려견 동반 숙소 찾기", "order": 1, "created_ago": 93599000, "consumed_ago": 46799500},
      {"key": "r8", "scratch": "s2", "content": "등산화 챙기기", "order": 2, "created_ago": 93598000},
      {"key": "r9", "scratch": "s2", "content": "민수에게 차 빌릴 수 있는지 묻기", "order": 3, "created_ago": 93597000},
      {"key": "r10", "scratch": "s4", "content": "Is the deploy freeze still on?", "order": 0, "created_ago": 518400000, "consumed_ago": 259200000},
      {"key": "r11", "scratch": "s4", "content": "Who owns the analytics ticket?", "order": 1, "created_ago": 518399000},
      {"key": "r12", "scratch": "s5", "content": "예산 정하기", "order": 0, "created_ago": 172800000, "consumed_ago": 86400000},
      {"key": "r13", "scratch": "s5", "content": "후보 3개 비교하기", "order": 1, "created_ago": 172799000},
      {"key": "r14", "scratch": "s5", "content": "중고 시세 확인하기", "order": 2, "created_ago": 172798000},
      {"key": "r15", "scratch": "s6", "content": "Send the invites", "order": 0, "created_ago": 345600000, "consumed_ago": 172800000},
      {"key": "r16", "scratch": "s6", "content": "Order the cake", "order": 1, "created_ago": 345599000, "consumed_ago": 172799500},
      {"key": "r17", "scratch": "s6", "content": "Book the room", "order": 2, "created_ago": 345598000},
      {"key": "r18", "scratch": "s6", "content": "Buy the decorations", "order": 3, "created_ago": 345597000},
      {"key": "r19", "scratch": "s7", "content": "다음 책 투표하기", "order": 0, "created_ago": 777600000},
      {"key": "r20", "scratch": "s7", "content": "장소 예약하기", "order": 1, "created_ago": 777599000},
      {"key": "r21", "scratch": "s7", "content": "간식 정하기", "order": 2, "created_ago": 777598000}
    ],
    "candidates": [
      {"row": "r1", "type": "node", "created_ago": 2640000},
      {"row": "r2", "type": "bit", "created_ago": 2639000},
      {"row": "r20", "type": "bit", "created_ago": 777539000}
    ]
  }'::jsonb $seed$;

-- Copies the seed into p_user's account (Bit descriptions and consumed Breakdown rows included; a
-- candidate is never copied onto a consumed row, Hook 13). p_inbox is the account's active Inbox Node, or null (the
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
    insert into app.bits (id, user_id, title, description, icon, priority, status, deadline, mtime, created_at,
                          parent_id, x, y, archived_at, deleted_at)
    values (v_id, p_user, v_item ->> 'title', coalesce(v_item ->> 'description', ''), v_item ->> 'icon',
            v_item ->> 'priority', v_item ->> 'status',
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
    insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at, consumed_at)
    values (v_id, p_user, (v_ids ->> (v_item ->> 'scratch'))::uuid, v_item ->> 'content',
            (v_item ->> 'order')::integer, p_now - (v_item ->> 'created_ago')::bigint,
            p_now - (v_item ->> 'consumed_ago')::bigint)
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
     where r.user_id = p_user and r.id = (v_ids ->> (v_item ->> 'row'))::uuid and r.consumed_at is null
    returning to_jsonb(app.staged_candidates.*) into v_row;
    if v_row is not null then
      v_candidates := v_candidates || jsonb_build_array(v_row);
    end if;
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
