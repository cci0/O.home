'use client';
// 태그 색상 (v2.0 사용자 요청) — 태그 이름 → 색. 환경설정 「태그 관리」에서 정하고, 모든 태그 칩에 같이 쓰인다.
// 사이트 설정 저장소(ohome.tagcolors.v1)에 둬서 서버 모드에서는 방문자 모두가 같은 색을 본다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import { useCallback, useEffect, useReducer } from 'react';
import type { CSSProperties } from 'react';
import { getRawSetting, setSetting } from './settingStore';

export const TAG_PALETTE = ['#a63a45', '#c9764a', '#b89b3c', '#5e8c6a', '#4a7f9e', '#6a5fa3', '#a05a8c', '#7a8089'];

const KEY = 'ohome.tagcolors.v1';
const EVT = 'ohome-tagcolors';
type ColorMap = Record<string, string>;
let cache: ColorMap | null = null;

function load(): ColorMap {
  if (cache) return cache;
  let v: ColorMap = {};
  try {
    const raw = getRawSetting(KEY);
    const p = raw ? JSON.parse(raw) : {};
    if (p && typeof p === 'object' && !Array.isArray(p)) v = p as ColorMap;
  } catch { /* 기본값(색 없음) */ }
  cache = v;
  return v;
}

function commit(next: ColorMap) {
  cache = next;
  try { setSetting(KEY, next); } catch { /* 무시 */ }
  window.dispatchEvent(new Event(EVT));
}

/** [태그→색 맵, 색 지정(null이면 해제), 이름이 바뀔 때 색 옮기기] */
export function useTagColors(): [ColorMap, (tag: string, color: string | null) => void, (from: string, to: string) => void] {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    load();
    force();
    window.addEventListener(EVT, force);
    return () => window.removeEventListener(EVT, force);
  }, []);
  const setColor = useCallback((tag: string, color: string | null) => {
    const next = { ...load() };
    if (color) next[tag] = color; else delete next[tag];
    commit(next);
  }, []);
  const moveColor = useCallback((from: string, to: string) => {
    const next = { ...load() };
    if (!next[from]) return;
    if (!next[to]) next[to] = next[from];   // 합치는 쪽에 이미 색이 있으면 그걸 우선
    delete next[from];
    commit(next);
  }, []);
  return [cache ?? {}, setColor, moveColor];
}

/** #태그 글자색 (본문·카드 안의 작은 태그) */
export const tagInk = (colors: ColorMap, t: string): CSSProperties | undefined =>
  colors[t] ? { color: colors[t] } : undefined;

/** 필터 칩 색 — 선택되면 색으로 채운다 */
export const tagChip = (colors: ColorMap, t: string, on: boolean): CSSProperties | undefined =>
  colors[t] ? (on ? { borderColor: colors[t], background: colors[t], color: '#fff' } : { borderColor: colors[t], color: colors[t] }) : undefined;
