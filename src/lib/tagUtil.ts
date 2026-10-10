'use client';
// 자유 태그 공용 도구 — 갤러리·캐릭터·자관·TRPG 로그가 같이 쓴다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 이 파일은 충돌하지 않는다.
import { useCallback, useEffect, useRef, useState } from 'react';

/** 「쉼표로 구분」 입력 → 태그 배열 (공백 정리 · # 제거 · 중복 제거) */
export const parseTags = (v: string): string[] =>
  [...new Set(v.split(',').map(t => t.trim().replace(/^#+/, '').trim()).filter(Boolean))];

/** 쓰인 태그와 개수 — 많이 쓴 순 */
export function tagCounts(items: { tags?: string[] }[]): [string, number][] {
  const m: Record<string, number> = {};
  items.forEach(it => (it.tags ?? []).forEach(t => { m[t] = (m[t] ?? 0) + 1; }));
  return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** 필터 방식 — and: 고른 태그가 전부 달린 것 · or: 하나라도 달린 것 */
export type TagMode = 'and' | 'or';

/** 고른 태그에 맞는가 — 고른 게 없으면 항상 true */
export const matchTags = (item: { tags?: string[] }, selected: string[], mode: TagMode = 'and'): boolean => {
  if (selected.length === 0) return true;
  const mine = item.tags ?? [];
  return mode === 'or' ? selected.some(t => mine.includes(t)) : selected.every(t => mine.includes(t));
};

/** (구) 전부 달려 있는가 — matchTags의 and와 같다 */
export const hasAllTags = (item: { tags?: string[] }, selected: string[]): boolean =>
  matchTags(item, selected, 'and');

/** 검색어가 태그에 걸리는가 */
export const tagMatches = (item: { tags?: string[] }, q: string): boolean =>
  !!q && (item.tags ?? []).some(t => t.toLowerCase().includes(q.toLowerCase()));

/**
 * 선택한 태그 상태 — [고른 태그, 토글, 전체 해제, 방식, 방식 전환]
 *
 * 주소(?tag=a,b&tagmode=or)와 이어져 있다 — 상세에 들어갔다 뒤로 가도, 새로고침해도 필터가 남고,
 * 필터된 목록의 주소를 그대로 공유할 수 있다. 다른 주소 값(?s= 섹션 등)은 건드리지 않는다.
 * 앞의 세 값만 받는 화면은 그대로 동작한다.
 */
export function useTagFilter(): [string[], (t: string) => void, () => void, TagMode, () => void] {
  const [sel, setSel] = useState<string[]>([]);
  const [mode, setMode] = useState<TagMode>('and');
  const first = useRef(true);

  // 처음 열 때 주소에서 읽는다
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('tag');
      if (t) setSel(parseTags(t));
      if (sp.get('tagmode') === 'or') setMode('or');
    } catch { /* 무시 */ }
  }, []);

  // 바뀌면 주소에 반영 (기록을 쌓지 않고 교체)
  useEffect(() => {
    if (first.current) { first.current = false; return; }   // 읽기 전의 빈 값으로 주소를 지우지 않게
    try {
      const url = new URL(window.location.href);
      if (sel.length) url.searchParams.set('tag', sel.join(',')); else url.searchParams.delete('tag');
      if (sel.length > 1 && mode === 'or') url.searchParams.set('tagmode', 'or'); else url.searchParams.delete('tagmode');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch { /* 무시 */ }
  }, [sel, mode]);

  const toggle = useCallback((t: string) => setSel(s => (s.includes(t) ? s.filter(x => x !== t) : [...s, t])), []);
  const clear = useCallback(() => setSel([]), []);
  const toggleMode = useCallback(() => setMode(m => (m === 'and' ? 'or' : 'and')), []);
  return [sel, toggle, clear, mode, toggleMode];
}

/** 태그가 많을 때 접기 — 앞쪽 limit개만 보이고 나머지는 숨긴다. 이미 고른 태그는 접혀 있어도 항상 보인다 */
export function foldTags(counts: [string, number][], selected: string[], open: boolean, limit = 24): { shown: [string, number][]; hidden: number } {
  if (open || counts.length <= limit) return { shown: counts, hidden: 0 };
  const shown = [...counts.slice(0, limit), ...counts.slice(limit).filter(([t]) => selected.includes(t))];
  return { shown, hidden: counts.length - shown.length };
}

export const TAG_FOLD_LIMIT = 24;
