'use client';
// RECENT 위젯 (v2.0 사용자 요청) — 최근 올라온 캐릭터·자관·로그·갤러리·기록·도토리 모아보기.
// 「올라온」 순서다: 항목을 만든 시각 기준이라 나중에 고친 글은 올라가지 않는다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSiteEntries, ENTRY_LABEL } from '@/lib/siteEntries';

const SHOW = 6;

const fmt = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export function RecentWidget() {
  const router = useRouter();
  const { loaded, entries } = useSiteEntries();
  const recent = useMemo(
    () => entries.filter(e => e.at > 0).sort((a, b) => b.at - a.at).slice(0, SHOW),
    [entries],
  );
  return (
    <div className="panel widget" style={{ margin: 0 }}>
      <h4>RECENT <span className="more" onClick={() => router.push('/search')}>검색 ›</span></h4>
      {!loaded && <p style={{ fontSize: 11, color: 'var(--faint)', margin: '6px 0' }}>불러오는 중…</p>}
      {loaded && recent.length === 0 && <p style={{ fontSize: 11, color: 'var(--faint)', margin: '6px 0' }}>아직 올라온 것이 없어요</p>}
      {recent.map(e => (
        <div key={`${e.kind}-${e.id}`} onClick={() => router.push(e.href)}
          style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '6px 0', borderTop: '1px solid var(--line)', cursor: 'var(--cur-pointer,pointer)' }}>
          <small style={{ color: 'var(--faint)', whiteSpace: 'nowrap', fontSize: 10 }}>{ENTRY_LABEL[e.kind]}</small>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
          <small style={{ color: 'var(--faint)', fontSize: 10 }}>{fmt(e.at)}</small>
        </div>
      ))}
    </div>
  );
}
