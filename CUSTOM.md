# CUSTOM.md — 내가 원작에서 직접 바꾼 곳

이 포크(`cci0/O.home`)는 원작(`w00j00working/O.home`)에 **태그·검색·RECENT 위젯 등**을 얹은 것입니다.
원작을 [Sync fork]로 업데이트하다 충돌이 나면 이 문서를 보고 어디를 다시 얹을지 확인하세요.

- 바뀐 파일: **새 파일 21 + 기존 파일 수정 27 (세계관 추가로 기존 4개 더 수정)**
- DB(SQL) 변경: 태그는 **없음**(항목 jsonb 안에 저장). **세계관은 `worlds` 테이블 추가 필요** → `supabase/worlds.sql` 실행 (아래 5번).
- 태그 색은 설정 키 `ohome.tagcolors.v1`에 저장됩니다 (아래 ⚠️ 참고).

---

## ⚠️ 가장 먼저 확인할 것

**`src/lib/settingStore.ts`** — 원작이 자주 고치는 핵심 파일이라, 덮어쓰지 말고 **한 줄만** 추가합니다.
`SETTING_KEYS` 목록 맨 끝에 아래 키가 있어야 태그 색이 서버에 저장됩니다.

```ts
'ohome.tagcolors.v1',
```

원작 업데이트 후 이 줄이 사라졌는지 가장 먼저 확인하세요. 없어도 앱은 열리지만 태그 색이 서버에 저장되지 않습니다.

---

## 1. 새 파일 (13개) — 원작과 충돌하지 않음

원작에 없는 파일이라 업데이트로 덮어써지거나 충돌하지 않습니다. 단, 이 파일들이 의존하는 **원작 쪽 함수·타입 이름이 바뀌면** 빌드가 깨질 수 있습니다.

| 파일 | 역할 |
|---|---|
| `lib/tagUtil.ts` | 태그 공용 도구: 파싱, 개수 세기, AND/OR 필터, 접기, 주소(`?tag=`) 연동 |
| `lib/tagColors.ts` | 태그 색상 저장·읽기 |
| `lib/rawList.ts` | 목록 한 번 읽기 + 바뀐 것만 저장 (실시간 구독 없음) |
| `lib/siteEntries.ts` | 전체 항목 모음 (공개 범위·메뉴 비공개 규칙 적용). 태그 모아보기·검색·RECENT가 사용 |
| `components/ui/TagFilter.tsx` | 목록 위 태그 필터 칩 줄 |
| `components/ui/TagList.tsx` | `#태그` 표시 (카드·상세) |
| `components/ui/TagInput.tsx` | 태그 입력 + 자동완성 칩 |
| `components/ui/HtmlRichEditor.tsx` | 리치 에디터 ↔ HTML 코드 전환 |
| `components/settings/TagPane.tsx` | 환경설정 「태그 관리」 탭 |
| `components/chars/CharLogs.tsx` | 캐릭터 상세의 출현 로그 |
| `components/main/RecentWidget.tsx` | 메인 RECENT 위젯 |
| `app/tags/page.tsx` | 태그 모아보기 (`/tags`) |
| `app/search/page.tsx` | 전체 검색 (`/search`) |

---

## 2. 기존 파일 수정 (27개) — 충돌 가능성 있음

원작이 같은 파일의 같은 부분을 고치면 충돌합니다. 충돌 가능성이 높은 순서로 적었습니다.
(모두 「한 곳당 몇 줄 추가」 수준이라, 충돌이 나면 그 줄만 다시 얹으면 됩니다.)

### 🔴 원작이 자주 고칠 만한 파일

| 파일 | 바꾼 내용 |
|---|---|
| `lib/settingStore.ts` | `SETTING_KEYS`에 `'ohome.tagcolors.v1'` 한 줄 추가 |
| `lib/mainStore.tsx` | `WidgetType`에 `'recent'` 추가, `WIDGET_META`에 RECENT 항목 추가 |
| `components/main/widgets.tsx` | `RecentWidget` import + `renderWidget`에 `case 'recent'` 추가 |
| `app/page.tsx` | `ADDABLE` 목록에 `'recent'` 추가 |
| `components/shell/TopBar.tsx` | 상단바에 「검색」 버튼(`/search`) 추가 |
| `app/settings/page.tsx` | import 한 줄 + 탭 이름 `'태그 관리'` + 표시 부분 3줄 (`TagPane`) |

### 🟡 목록 페이지 — 필터 칩 + 태그 표시 추가

`app/chars/page.tsx`, `app/rels/page.tsx`, `app/gallery/page.tsx`, `app/trpg/page.tsx`, `app/playlog/page.tsx`, `app/dotori/page.tsx`, `app/board/page.tsx`

공통으로 바꾼 것: `useTagFilter()`로 선택 태그 상태 추가 → 목록 `.filter()`에 태그 조건 한 줄 → 목록 위에 `<TagFilter .../>` 한 줄 → 카드에 `<TagList .../>` 한 줄.
`app/trpg/page.tsx`는 필터가 오른쪽 사이드에 있어서 칩을 직접 그려 변경량이 가장 큽니다 (등록 모달 태그 칸 포함).

### 🟡 작성·수정 폼 — 태그 입력칸 추가

| 파일 | 바꾼 내용 |
|---|---|
| `components/chars/CharEditForm.tsx` | 태그 입력칸, 저장 시 `tags`, 소개 본문·추가 탭을 `HtmlRichEditor`로 교체 |
| `components/rels/RelForm.tsx` | 태그 입력칸, 저장 시 `tags` |
| `components/trpg/PlaylogForm.tsx` | 태그 입력칸(Tags), 저장 시 `tags` |
| `components/trpg/DotoriForm.tsx` | 기존 태그 칸을 `TagInput`으로 교체 |
| `components/backup/BackupForm.tsx` | 기존 태그 칸을 `TagInput`으로 교체 (갤러리 글 작성) |
| `app/board/write/page.tsx` | 기존 태그 칸을 `TagInput`으로 교체 |
| `app/rels/new/page.tsx`, `app/rels/[id]/edit/page.tsx` | 저장 값에 `tags` 전달 (AU 편집에서는 제외) |

### 🟢 상세 페이지 — 태그 표시 추가

| 파일 | 바꾼 내용 |
|---|---|
| `app/chars/[id]/page.tsx` | 이름 아래 `TagList`, 소개 본문 아래 `CharLogs` |
| `app/rels/[id]/page.tsx` | 자관명 아래 `TagList` |
| `app/trpg/[id]/page.tsx` | 제목 아래 `TagList`(`gridColumn: 1` 포함), 수정 모달 태그 칸 |
| `app/gallery/[id]/page.tsx` | 기존 태그를 눌러서 목록으로 이동 + 태그 색 |

### 🟢 타입만 추가

| 파일 | 바꾼 내용 |
|---|---|
| `lib/charStore.ts` | `Character`, `Relation`에 `tags?: string[]` |
| `lib/galleryStore.ts` | `TrpgLog`, `PlayRecord`에 `tags?: string[]` |

---

## 3. 원작 업데이트 후 확인 순서

1. [Sync fork] / Update branch 누르기 (먼저 환경설정 → 데이터 백업).
2. **충돌 없음** → 배포가 끝나면 아래 5가지만 확인:
   - TRPG 로그 목록에서 태그 필터가 되는지
   - 환경설정에 「태그 관리」 탭이 보이는지
   - `/tags`, `/search`가 열리는지
   - 메인 위젯 추가 목록에 RECENT가 있는지
   - 캐릭터 편집에서 HTML 모드 전환이 보이는지
3. **충돌 있음** → 충돌난 파일 이름을 확인해 위 2번 표에서 그 파일의 「바꾼 내용」만 다시 얹기.
   원작 쪽 최신 파일과 이 문서를 같이 Claude에게 붙여넣으면 맞춰 줄 수 있습니다.
4. **빌드(Vercel) 실패** → 새 파일이 쓰는 원작 함수·타입 이름이 바뀐 경우입니다. Vercel 오류 메시지를 확인하세요.
   (새 파일이 의존하는 주요 원작 요소: `useLocalList`, `fetchList`, `syncList`, `TABLE_OF`, `useAuth`, `useMenuSettings`, `canViewHref`, `sectionHref`, `getRawSetting`/`setSetting`, `RichEditor`, `Kit`의 `KInput`/`KTextarea`/`KCheck`)

## 4. 알아둘 점

- **구독 중복 주의**: 새 파일은 `useLocalList`가 아니라 `useRawList`(한 번 읽기)를 씁니다. 서버(Supabase) 모드에서 같은 목록에 실시간 구독이 두 번 열리면 페이지가 안 열리는 오류가 있었기 때문입니다. 새 기능을 더할 때도 이 점을 지키세요.
- **게시판**은 글마다 읽기 권한이 달라서 `/tags`·`/search`에서 제외했습니다 (게시판 목록 안에서는 태그 필터가 동작).
- **TRPG 로그 본문**은 따로 저장돼서 전체 검색 대상이 아닙니다.
- **출현 로그**는 로그가 자관에 연결돼 있어야 자관 멤버의 캐릭터 상세에 뜹니다.
- 백업 알림은 로컬에만 기록돼서 뺐습니다. (원래 계획에 있었지만 적용하지 않음)

## 5. 세계관 기능 (`/worlds`)

**DB**: Supabase SQL Editor에 `supabase/worlds.sql` 전체를 붙여넣고 Run (여러 번 실행해도 안전). 원작 `schema.sql`은 건드리지 않았고, 원작 SQL을 다시 돌려도 `worlds`는 지워지지 않습니다.
읽기는 공개범위(전체/멤버/나만)를 서버가 지키고, 등록은 관리자만 됩니다.

**새 파일 (충돌 없음)**: `lib/worldStore.ts`, `components/worlds/WorldForm.tsx`, `components/worlds/CharWorld.tsx`, `app/worlds/page.tsx`, `app/worlds/new/page.tsx`, `app/worlds/[id]/page.tsx`, `app/worlds/[id]/edit/page.tsx`, `supabase/worlds.sql`

**기존 파일 수정 (각 1~몇 줄)**
| 파일 | 바꾼 내용 |
|---|---|
| `lib/backend/types.ts` | `COLLECTION_OF`에 `'ohome.worlds.v1': 'worlds'` 한 줄 (백업·이전에 자동 포함) |
| `lib/visFloor.ts` | `AREA`에 `worlds: { href: '/worlds' }` 한 줄 |
| `lib/menu.ts` | `FEATURES`에 `{ href: '/worlds', label: '세계관' }` 한 줄 |
| `lib/charStore.ts` | `Character`에 `worldId?: string` |
| `components/chars/CharEditForm.tsx` | import 1줄, `worldId` 상태, 저장 시 `worldId`, 「소속 세계관」 선택칸 |
| `app/chars/[id]/page.tsx` | `CharWorld` import 1줄 + 이름 아래 `<CharWorld .../>` 1줄 |

**메뉴**: 환경설정 → 메뉴 관리에서 「세계관」을 원하는 곳에 추가해야 상단 메뉴에 보입니다.
**자관**: 세계관 필드가 따로 없고, 세계관 상세에서 소속 캐릭터가 멤버인 자관을 자동으로 모아 보여 줍니다.

## 6. 구독 중복 오류 수정 (갤러리 수정 화면)

| 파일 | 바꾼 내용 |
|---|---|
| `lib/backend/supabaseBackend.ts` | `subscribe()`의 채널 이름에 무작위 꼬리표 추가 (한 줄). 수정 화면처럼 한 화면이 같은 목록을 두 번 읽어도 「구독 후 콜백 추가 불가」 오류가 나지 않음 |

## 7. 세계관 JSON 가져오기

`/worlds` 목록의 관리자용 **IMPORT** 버튼 — 세계관 문서를 JSON 파일(`worlds-import.json`)로 한꺼번에 등록합니다. 새 파일(`app/worlds/page.tsx`) 안의 기능이라 원작과 충돌하지 않습니다. 가져온 세계관은 기본 **나만보기**로 들어오니, 확인 후 각 수정 화면에서 공개범위를 바꾸세요.

## 8. 자관 D-day

자관마다 D-day를 여러 개 걸 수 있고(제목·날짜·+1 Day·「메인 위젯에도 표시」), 자관 상세 이름 아래에 칩으로 보입니다. 위젯 표시를 켠 것은 메인 D-DAY 위젯에 「자관명 · 제목」으로 같이 뜹니다. DB 변경 없음 (자관 데이터 안에 `ddays`로 저장).

**새 파일**: `lib/relDday.ts`, `components/rels/RelDday.tsx`

**기존 파일 수정**
| 파일 | 바꾼 내용 |
|---|---|
| `lib/charStore.ts` | `RelDday` 타입 + `Relation`에 `ddays?` |
| `components/rels/RelForm.tsx` | import 2줄, `ddays` 상태·저장값, D-DAY 편집칸 (AU 편집에서는 숨김) |
| `app/rels/new/page.tsx` | 저장 값에 `ddays` 전달 |
| `app/rels/[id]/edit/page.tsx` | 저장 값에 `ddays` 전달 (AU 편집 제외) |
| `app/rels/[id]/page.tsx` | import 1줄 + 이름 아래 `<RelDdayChips/>` 1줄 |
| `components/main/widgets.tsx` | import 1줄, `DdayWidget`의 `items`에 자관 D-day를 이어 붙임, 행 `key` 변경 |

## 9. 위젯 스크롤 · RECENT 5개 · D-day 칩 색

| 파일 | 바꾼 내용 |
|---|---|
| `app/globals.css` | `.wgt.sized > .widget`에 `overflow-y:auto` 두 줄 추가 — 크기를 줄인 위젯이 잘리지 않고 안에서 스크롤 (원작에는 없음, 충돌 시 이 줄만 다시 얹기) |
| `components/main/RecentWidget.tsx` | 보이는 개수 6 → 5 (새 파일) |
| `components/rels/RelDday.tsx` | 자관 D-day 칩을 어두운 반투명 배경 + 흰 글씨로 (밝은 배경에서도 보이게) (새 파일) |
