'use client';
// 자관 D-day — 편집 칸(자관 편집 폼)과 표시 칩(자관 상세)
import React from 'react';
import type { RelDday } from '@/lib/charStore';
import { ddayInfo } from '@/lib/relDday';
import { newId } from '@/lib/postStore';
import { KInput, KDate, KCheck } from '@/components/ui/Kit';

export function RelDdayEditor({ value, onChange }: { value: RelDday[]; onChange: (v: RelDday[]) => void }) {
  const set = (id: string, p: Partial<RelDday>) => onChange(value.map(d => (d.id === id ? { ...d, ...p } : d)));
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <span className="cp-lb">D-DAY</span>
      {value.map(d => (
        <div key={d.id} style={{ display: 'grid', gap: 6, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <KInput placeholder="제목 (예: 처음 만난 날)" value={d.title} onChange={e => set(d.id, { title: e.target.value })} style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => onChange(value.filter(x => x.id !== d.id))}>삭제</button>
          </div>
          <KDate value={d.date} onChange={v => set(d.id, { date: v })} />
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <KCheck label="+1 Day (당일을 1일째로)" checked={!!d.plusOne} onChange={v => set(d.id, { plusOne: v })} />
            <KCheck label="메인 위젯에도 표시" checked={!!d.widget} onChange={v => set(d.id, { widget: v })} />
          </div>
          {d.date && <span className="hint" style={{ margin: 0 }}>지금은 {ddayInfo(d.date, d.plusOne).label}</span>}
        </div>
      ))}
      <button type="button" className="btn btn-ghost" style={{ justifySelf: 'start', fontSize: 12 }}
        onClick={() => onChange([...value, { id: newId(), title: '', date: '' }])}>＋ D-DAY 추가</button>
    </div>
  );
}

/** 자관 상세의 D-day 칩 — 제목·날짜가 있는 것만 */
export function RelDdayChips({ ddays, style }: { ddays?: RelDday[]; style?: React.CSSProperties }) {
  const list = (ddays ?? []).filter(d => d.title.trim() && d.date);
  if (list.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', ...style }}>
      {list.map(d => {
        const i = ddayInfo(d.date, d.plusOne);
        return (
          <span key={d.id} data-tip={d.date}
            style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline', padding: '4px 13px', borderRadius: 999,
              fontSize: 'calc(12px*var(--fs,1))', color: '#fff', background: 'rgba(20,22,26,.62)',
              border: '1px solid rgba(255,255,255,.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
            <b style={{ fontFamily: 'var(--serif)', letterSpacing: '.04em', display: 'inline' }}>{i.label}</b>
            <span>{d.title.trim()}</span>
          </span>
        );
      })}
    </div>
  );
}
