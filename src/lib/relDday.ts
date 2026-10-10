'use client';
// 자관 D-day — 자관마다 여러 개를 걸 수 있고, 「메인 위젯에도 표시」를 켠 것은 메인 D-DAY 위젯에 같이 뜬다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import { useMemo } from 'react';
import { useAuth } from './auth';
import { useRawList } from './rawList';
import { Relation, REL_SEED, RelDday } from './charStore';

/** D-day 문구 — 메인 D-DAY 위젯과 같은 규칙. plusOne이면 시작일 당일을 D+1로 센다 */
export function ddayInfo(date: string, plusOne?: boolean): { label: string; near: boolean; passed: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date + 'T00:00:00');
  if (isNaN(d.getTime())) return { label: '—', near: false, passed: false };
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (plusOne && diff <= 0) return { label: `D+${-diff + 1}`, near: false, passed: true };
  if (diff === 0) return { label: 'D-DAY', near: true, passed: false };
  return diff > 0 ? { label: `D-${diff}`, near: diff <= 7, passed: false } : { label: `D+${-diff}`, near: false, passed: true };
}

/** 메인 D-DAY 위젯에 같이 보일 자관 D-day — 보는 사람이 볼 수 있는 자관의 것만 */
export function useRelWidgetDdays(): { title: string; date: string; plusOne?: boolean }[] {
  const { user, isAdmin } = useAuth();
  const { list } = useRawList<Relation>('ohome.rels.v1', REL_SEED);
  return useMemo(() => list
    .filter(r => isAdmin || r.visibility === 'public' || (r.visibility === 'member' && !!user))
    .flatMap(r => (r.ddays ?? []).filter(d => d.widget && d.date && d.title.trim())
      .map(d => ({ title: `${r.name} · ${d.title.trim()}`, date: d.date, plusOne: d.plusOne }))),
  [list, user, isAdmin]);
}
