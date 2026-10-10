'use client';
// 캐릭터 상세의 「소속 세계관」 링크 — 보는 사람이 볼 수 있는 세계관일 때만 보인다
import React from 'react';
import Link from 'next/link';
import { useVisibleWorlds, worldPath } from '@/lib/worldStore';

export function CharWorld({ worldId, style }: { worldId?: string; style?: React.CSSProperties }) {
  const { visible } = useVisibleWorlds();
  const w = worldId ? visible.find(x => x.id === worldId) : undefined;
  if (!w) return null;
  return (
    <div style={{ fontSize: 'calc(12px*var(--fs,1))', color: 'var(--faint)', ...style }}>
      WORLD · <Link href={worldPath(w)} style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}>{w.name}</Link>
    </div>
  );
}
