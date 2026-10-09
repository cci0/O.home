'use client';
// 자유 태그 공용 도구 — 갤러리·캐릭터·자관·TRPG 로그가 같이 쓴다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 이 파일은 충돌하지 않는다.
import { useCallback, useState } from 'react';

/** 「쉼표로 구분」 입력 → 태그 배열 (공백 정리 · # 제거 · 중복 제거) */
export const parseTags = (v: string): string[] =>
  [...new Set(v.split(',').map(t => t.trim().replace(/^#+/, '').trim()).filter(Boolean))];

/** 쓰인 태그와 개수 — 많이 쓴 순 */
export function tagCounts(items: { tags?: string[] }[]): [string, number][] {
  const m: Record<string, number> = {};
  items.forEach(it => (it.tags ?? []).forEach(t => { m[t] = (m[t] ?? 0) + 1; }));
  return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** 고른 태그가 전부 달려 있는가 (AND) — 고른 게 없으면 항상 true */
export const hasAllTags = (item: { tags?: string[] }, selected: string[]): boolean =>
  selected.every(t => (item.tags ?? []).includes(t));

/** 검색어가 태그에 걸리는가 */
export const tagMatches = (item: { tags?: string[] }, q: string): boolean =>
  !!q && (item.tags ?? []).some(t => t.toLowerCase().includes(q.toLowerCase()));

/** 선택한 태그 상태 — [고른 태그, 토글, 전체 해제] */
export function useTagFilter(): [string[], (t: string) => void, () => void] {
  const [sel, setSel] = useState<string[]>([]);
  const toggle = useCallback((t: string) => setSel(s => (s.includes(t) ? s.filter(x => x !== t) : [...s, t])), []);
  const clear = useCallback(() => setSel([]), []);
  return [sel, toggle, clear];
}
