'use client';
// 자유 태그 표시 — #태그 로 나열한다. 상세는 전부, 카드(목록)는 max개까지만 보이고 나머지는 +n.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React from 'react';

export function TagList({ tags, style, max }: { tags?: string[]; style?: React.CSSProperties; max?: number }) {
  if (!tags || tags.length === 0) return null;
  const shown = max ? tags.slice(0, max) : tags;
  const rest = tags.length - shown.length;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 12, ...style }}>
      {shown.map(t => <i key={t} className="tag-in" style={{ marginLeft: 0 }}>#{t}</i>)}
      {rest > 0 && <i className="tag-in" style={{ marginLeft: 0 }}>+{rest}</i>}
    </div>
  );
}
