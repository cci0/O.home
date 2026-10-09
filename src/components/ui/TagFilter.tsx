'use client';
// 자유 태그 필터 칩 줄 — 목록 위에 둔다. 여러 개를 고르면 모두 달린 항목만 (AND).
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React from 'react';

export function TagFilter({ counts, selected, onToggle, onClear }: {
  counts: [string, number][];
  selected: string[];
  onToggle: (t: string) => void;
  onClear: () => void;
}) {
  if (counts.length === 0) return null;
  return (
    <div className="tag-row" style={{ margin: '0 0 14px' }}>
      {selected.length > 0 && <div className="tag" onClick={onClear}>선택 해제 ✕</div>}
      {counts.map(([t, n]) => (
        <div key={t} className={`tag ${selected.includes(t) ? 'on' : ''}`} onClick={() => onToggle(t)}>
          #{t} <small>{n}</small>
        </div>
      ))}
    </div>
  );
}
