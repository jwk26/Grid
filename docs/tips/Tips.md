# GridDO Tips

## 작성 의도

Pool, Breakdown, Staging, Finder를 theme별로 순차 구현하면서 얻은 경험 중,
다음 phase/task에서 알고 있으면 시행착오를 줄일 내용을 모은다.
일반적인 개발 절차나 작업 일지를 반복하기보다, 실제 작업에서 뒤늦게
발견한 연결 지점, 화면 상태, 검증의 함정을 짧게 남기는 것이 목적이다.

이 문서는 참고 메모이며 canonical 문서, 승인 receipt, issue ledger를
대신하지 않는다. 제품 계약과 현재 상태는 해당 authority에서 확인한다.
Theme마다 다른 수치·색상·장식을 이 메모만으로 다른 theme에 적용하지 않는다.

사용자 요청으로 Phase34 Control Tower02가 2026-10-06 최초 작성했다.
아래 초기 메모는 Tasks166–168의 경험이며, Task168의 P34-15 motion 관측
교정은 작성 시점에 제안 단계다. 실제 motion 없음이나 task acceptance를
이 문서가 주장하지 않는다.

## 작성·갱신 기준

- 새롭게 남길 만한 경험이 있을 때만 갱신한다. 매 phase/task마다 작성하거나
  분량을 채울 의무는 없다. 내용이 없으면 문서를 수정하지 않아도 된다.
- 다음 Working이 일반적인 추론으로 충분히 해결할 내용, skill의 일반 절차,
  테스트 개수와 commit 목록의 반복은 생략한다.
- 가능하면 **겪은 문제 → 다음 작업에서 확인할 점**으로 쓴다.
  긴 설명이 필요한 내용은 길어도 되지만, 상세 이력은 원래 issue/evidence를
  링크하고 여기에는 재사용할 판단만 남긴다.
- 확인된 사실과 가설·미해결 상태를 구분한다. 가설이 확인되거나 틀린 것으로
  밝혀지면 관련 메모를 보완해, 오래된 추측이 다음 작업의 전제가 되지 않게 한다.
- 기존 항목과 겹치면 합치거나 보완한다. Theme에 한정된 경험은 그 범위를
  명시하고, 제품 결정은 canonical 문서로 연결한다.
- 현재 phase 종료 시 다음 phase 인계 prompt에 이 문서의 경로, 작성 의도,
  위의 선택적 갱신 기준을 포함한다. 후임 Tower도 같은 안내를 이어간다.

## 다음 phase 인계 prompt에 포함할 문구

```text
docs/tips/Tips.md를 참고하라. 이 문서는 반복되는 theme 구현에서 얻은
재사용할 경험과 놓치기 쉬운 요소를 모은 참고 메모이며 canonical authority가 아니다.

작업 중 다음 phase/task에 도움이 될 새 경험을 얻었을 때만, 승인된 문서
작성 범위 안에서 해당 항목을 추가·보완하라. 일반적인 추론으로 해결할 내용과
skill 절차를 반복하지 말고, 문제와 다음에 확인할 점을 중심으로 작성하라.
확인된 사실과 미해결 가설을 구분하고 원래 issue/evidence를 연결하라.
필요하면 길게 써도 되며, 기재할 내용이 없으면 갱신하지 않아도 된다.

Phase 종료 시 다음 phase 인계 prompt에도 이 경로·작성 의도·갱신 기준을 포함하라.
이 안내는 제품 scope, 추가 repair cycle, acceptance 또는 publication 승인이 아니다.
```

## Phase34에서 남길 경험

### 1. 첫 비교에서 실제 drag 상태도 조금 살펴보기

Idle 화면이 비슷해도 drag를 시작하면 새로운 배경, overlay, 아이콘과 색상이
등장한다. Phase34에서는 Staging 구현 뒤에 Remove 투명도, Node/Bit 배경,
Breakdown Return 강조와 패널 사이 패턴 차이가 함께 발견됐다.

해당 region을 처음 비교할 때 drag 시작 → 같은 타입 well → 반대 타입 well →
Remove/Return → 취소까지 한 번 보면 주요 화면 차이를 일찍 발견할 수 있다.
전체 검증을 앞당기거나 큰 matrix를 새로 만들라는 뜻은 아니다.

### 2. 화면 owner는 작업 region 밖에도 있을 수 있음

Staging의 Remove는 Workspace가, Return overlay는 Breakdown이 렌더링한다.
패널 사이 배경은 shell/main이 담당한다. Staging component만 살펴보면
이 요소들을 놓치기 쉽다.

작업 초기에 “이 상태가 화면 어디에 나타나는가”를 따라가며 부모와 이웃
component를 확인한다. 필요한 연결 수정과 이웃 region 전체의 redesign은
별개이며, 발견한 component가 자동으로 write owner가 되지는 않는다.

### 3. Drag 활성·실제 hover·drop 가능 여부를 구분하기

Staged Node는 Nodes에서 neutral이고 Bits에서 unavailable일 수 있다.
이것은 실제 포인터가 그 well 위에 있는지와 별개의 정보다. Semantic state만
배경에 연결하면 drag 시작과 동시에 두 subsection 모두 배경이 달라질 수 있다.

Hover 장식은 실제 hovered target에 연결하고, neutral/unavailable/invalid
의미와 reason은 유지한다. 이 구분은 다른 theme의 음영·테두리·접힘 표현에도
유용하다. P34-15는 이를 shared DOM의 실제-hover metadata로 표현했다.

### 4. 배경을 panel·well·overlay·gap별로 확인하기

Desktop에 패턴이 있어도 중간 layout container의 불투명 배경이 패널 사이
패턴을 가릴 수 있다. 반대로 Remove의 반투명 배경은 뒤 candidate를 비쳐
보이게 한다. 의도한 투명도가 어느 요소에 있어야 하는지 확인한다.

Return의 배경만 반투명하게 하려는데 요소 전체의 opacity를 바꾸면 글자와
테두리도 함께 흐려진다. 내부 well이 투명해도 부모 subsection이 불투명하면
최종 화면은 불투명할 수 있으므로 한 요소의 색상 값만으로 판단하지 않는다.

### 5. 전체 크기와 안쪽 요소의 크기는 별개

Phase34에서는 Node/Bit shape 자체보다 icon frame·내부 glyph·padding·label
line의 차이가 남았다. SVG가 20px이라고 해서 실제 glyph도 20px인 것은 아니다.
Border와 padding이 내부 크기를 바꾼다.

첫 비교에서 작은 crop으로 icon, text baseline, line-height와 border를 보고,
선언한 font가 실제로 로드됐는지도 확인한다. Prototype과 production의
데이터·문구·상태 차이는 외관 차이와 구분해서 남긴다.

### 6. Browser observer가 무엇을 비교하는지 확인하기

P34-14에서는 요청한 fractional pointer 좌표, 센서가 소비한 native mouse
좌표, 아직 이동 중인 preview를 섞어 비교한 문제가 있었다. Pointer 검증은
실제 입력 이벤트와 그 입력을 반영한 preview를 연결하고 초기 frame도 남긴다.

P34-15에서는 전역 reduced-motion CSS의 0.01ms duration과 observer의
`0s` 문자열 기대값이 충돌했다. `transition-property: none`이면 duration
값이 있어도 property transition은 실행되지 않는다.
([CSS Transitions §2.1](https://drafts.csswg.org/css-transitions/#transition-property-property))

Motion 검증은 duration뿐 아니라 적용 대상 property와 실제 effect를 본다.
Frame 사이에 끝날 수 있는 짧은 transition은 RAF sample만으로 놓칠 수 있으므로
입력 전에 관측을 시작하고 event도 확인할 필요가 있다. 검증기가 잘못됐다는
이유로 허용 오차를 넓히거나 실패를 삭제하지 않는다.

**미해결:** P34-15의 실제 무전환 여부는 추가 관측 전이다. 작성 시점에는
observer 교정 제안만 있으며, 6개 실패를 통과로 재분류하지 않았다.

### 7. Dark theme 전환과 최초 로드는 다른 검증

Light에서 dark로 전환할 때는 통과하면서 저장된 dark 설정으로 처음 접속할 때
hydration 오류가 날 수 있다. P34-13에서는 ThemeToggle의 서버/클라이언트
초기 icon tree 차이가 원인이었고, 같은 DOM을 CSS로 표시하는 수정이 검증됐다.

공유 theme infrastructure를 theme마다 다시 구현할 필요는 없다. 다만 저장된
light/dark와 system 설정으로 최초 로드·reload를 조금 확인하면 화면 작업과
무관해 보이는 기존 문제를 일찍 발견할 수 있다. P34-13 사용자 disposition은
이 메모 작성 시점에 별도로 pending이다.

### 8. 같은 count처럼 보여도 서로 다른 상태일 수 있음

Staging의 authoritative membership, 화면에 보이는 Stage projection,
remote-arrival indicator는 서로 다르다. Phase34 count A 계약은 기존
`visibleNodes/visibleBits`로 presentation total을 전달하도록 정리됐다.

다음 theme에서 heading을 구현할 때는 현재 [SPEC](../SPEC.md#durable-staging)과
기존 API를 확인한다. 숫자를 꾸미는 과정에서 저장 성공을 추론하거나 remote
indicator를 total에 합산하거나 terminal/liveQuery 사이의 count 변화를
임의로 숨기지 않는다.

### 9. Capture의 fixture와 사용자가 열어 보는 DB는 다를 수 있음

격리된 browser fixture에서 만든 candidate와 pending 상태는 다른 browser
profile에서 앱을 열었을 때 자동으로 나타나지 않는다. Server가 올바른 build를
제공한다는 사실과 사용자 화면에 같은 상태가 보인다는 사실은 별개다.

검토 자료에 캡처한 데이터·선택·상태를 남기고 재현 방법이 있으면 함께 제공한다.
이전 task의 capture와 실행 결과는 비교 이력으로 활용하되, 새 수정의 검증
결과로 다시 표시하지 않는다.

## 근거 기록

- [Task167 — Context/Breakdown](../verification/inbox-triage/task-167.md)
- [Task168 — Staging, P34-13/14/15](../verification/inbox-triage/task-168.md)
- [Phase34 issue ledger](../issues/Issues_Phase_34.md)
- [기존 cross-phase LEARNINGS](../execution-plan/LEARNINGS.md)

이 링크의 원래 기록을 유지하고, tips에 전체 이력이나 승인 identity를 복제하지 않는다.


구현 중 확인되고 사용자가 채택한 공통 구조·동작은 다음 theme가 추측하지 않도록 canonical에 명시한다. 기존 계약과 새 보완을 구분하고 원래 issue/evidence를 연결한다.
([Task169 issue](../issues/Issues_Phase_34.md), [Task169 evidence](../verification/inbox-triage/task-169.md))
