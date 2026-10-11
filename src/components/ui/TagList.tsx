'use client';
// 자유 태그 표시 — #태그 로 나열한다. 상세는 전부, 카드(목록)는 max개까지만 보이고 나머지는 +n.
// 누를 수 있다: onPick이 있으면 그 태그를 고르고(목록 화면), href가 있으면 그 목록으로 가서 그 태그로 걸러 본다(상세 화면).
// 태그마다 정해 둔 색을 쓴다.
// chip을 켜면 어두운 반투명 칩 + 흰 글씨로 그린다 — 헤더 이미지처럼 밝거나 복잡한 배경 위에서도 읽히게
// (자관 상세 히어로 아래 등, D-day 칩과 같은 모양). 태그 색은 글씨 대신 앞의 작은 점으로 보여 준다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTagColors, tagInk } from '@/lib/tagColors';

export function TagList({ tags, style, max, onPick, href, chip }: {
  tags?: string[]; style?: React.CSSProperties; max?: number;
  chip?: boolean;                 // 어두운 반투명 칩으로 (배경 위에서 잘 보이게)
  onPick?: (t: string) => void;   // 목록 화면 — 눌러서 그 태그로 걸러 본다
  href?: string;                  // 상세 화면 — 이 목록 주소로 이동해 그 태그로 걸러 본다
}) {
  const router = useRouter();
  const [colors] = useTagColors();
  if (!tags || tags.length === 0) return null;
  const shown = max ? tags.slice(0, max) : tags;
  const rest = tags.length - shown.length;
  const clickable = !!(onPick || href);
  const go = (e: React.MouseEvent, t: string) => {
    e.stopPropagation();   // 카드 자체의 「상세로 이동」이 같이 눌리지 않게
    if (onPick) { onPick(t); return; }
    if (href) router.push(`${href}${href.includes('?') ? '&' : '?'}tag=${encodeURIComponent(t)}`);
  };
  if (chip) {
    const chipSt: React.CSSProperties = {
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 11px', borderRadius: 999,
      fontSize: 'calc(11.5px*var(--fs,1))', fontStyle: 'normal', lineHeight: 1.4, color: '#fff',
      background: 'rgba(20,22,26,.55)', border: '1px solid rgba(255,255,255,.3)',
    };
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, ...style }}>
        {shown.map(t => (
          <i key={t} style={{ ...chipSt, ...(clickable ? { cursor: 'var(--cur-pointer,pointer)' } : null) }}
            onClick={clickable ? e => go(e, t) : undefined}>
            {colors[t] && <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[t], flexShrink: 0 }} />}
            #{t}
          </i>
        ))}
        {rest > 0 && <i style={chipSt}>+{rest}</i>}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 12, ...style }}>
      {shown.map(t => (
        <i key={t} className="tag-in"
          style={{ marginLeft: 0, ...tagInk(colors, t), ...(clickable ? { cursor: 'var(--cur-pointer,pointer)' } : null) }}
          onClick={clickable ? e => go(e, t) : undefined}>#{t}</i>
      ))}
      {rest > 0 && <i className="tag-in" style={{ marginLeft: 0 }}>+{rest}</i>}
    </div>
  );
}
