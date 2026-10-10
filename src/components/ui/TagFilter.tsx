'use client';
// 자유 태그 필터 칩 줄 — 목록 위에 둔다. 여러 개를 고르면 방식(모두 포함 / 하나라도)을 고를 수 있고,
// 태그가 많으면 접어서 보여 주며, 태그마다 정해 둔 색을 쓴다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useState } from 'react';
import Link from 'next/link';
import { foldTags, TAG_FOLD_LIMIT, type TagMode } from '@/lib/tagUtil';
import { useTagColors, tagChip } from '@/lib/tagColors';

export function TagFilter({ counts, selected, onToggle, onClear, mode, onToggleMode, showLink = true }: {
  counts: [string, number][];
  selected: string[];
  onToggle: (t: string) => void;
  onClear: () => void;
  mode?: TagMode;
  onToggleMode?: () => void;
  showLink?: boolean;   // 「태그 모아보기」 링크 — 모아보기 화면 자신에서는 끈다
}) {
  const [colors] = useTagColors();
  const [open, setOpen] = useState(false);
  if (counts.length === 0) return null;
  const { shown, hidden } = foldTags(counts, selected, open);
  return (
    <div className="tag-row" style={{ margin: '0 0 14px' }}>
      {selected.length > 0 && <div className="tag" onClick={onClear}>선택 해제 ✕</div>}
      {selected.length > 1 && onToggleMode && (
        <div className="tag" onClick={onToggleMode} data-tip="누르면 전환">
          {mode === 'or' ? '하나라도 포함' : '모두 포함'} ⇄
        </div>
      )}
      {shown.map(([t, n]) => {
        const on = selected.includes(t);
        return (
          <div key={t} className={`tag ${on ? 'on' : ''}`} style={tagChip(colors, t, on)} onClick={() => onToggle(t)}>
            #{t} <small>{n}</small>
          </div>
        );
      })}
      {hidden > 0 && <div className="tag" onClick={() => setOpen(true)}>+{hidden} 더 보기</div>}
      {open && counts.length > TAG_FOLD_LIMIT && <div className="tag" onClick={() => setOpen(false)}>접기 ▴</div>}
      {showLink && <Link href="/tags" className="tag" style={{ textDecoration: 'none' }}>태그 모아보기 →</Link>}
    </div>
  );
}
