'use client';
// 자유 태그 필터 칩 줄 — 목록 위에 둔다. 여러 개를 고르면 방식(모두 포함 / 하나라도)을 고를 수 있다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React from 'react';
import type { TagMode } from '@/lib/tagUtil';

export function TagFilter({ counts, selected, onToggle, onClear, mode, onToggleMode }: {
  counts: [string, number][];
  selected: string[];
  onToggle: (t: string) => void;
  onClear: () => void;
  mode?: TagMode;
  onToggleMode?: () => void;
}) {
  if (counts.length === 0) return null;
  return (
    <div className="tag-row" style={{ margin: '0 0 14px' }}>
      {selected.length > 0 && <div className="tag" onClick={onClear}>선택 해제 ✕</div>}
      {selected.length > 1 && onToggleMode && (
        <div className="tag" onClick={onToggleMode} data-tip="누르면 전환">
          {mode === 'or' ? '하나라도 포함' : '모두 포함'} ⇄
        </div>
      )}
      {counts.map(([t, n]) => (
        <div key={t} className={`tag ${selected.includes(t) ? 'on' : ''}`} onClick={() => onToggle(t)}>
          #{t} <small>{n}</small>
        </div>
      ))}
    </div>
  );
}
