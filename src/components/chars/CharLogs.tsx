'use client';
// 캐릭터 상세 — 출현 로그 자동 표시 (v2.0 사용자 요청)
// 로그는 자관(relId)에 연결돼 있고 자관에는 멤버(캐릭터)가 있으므로, 이 캐릭터가 멤버인 자관의 로그를 모아 보여 준다.
// 따로 입력할 것은 없다 — 로그를 자관에 연결해 두면 그 자관 멤버들의 페이지에 자동으로 뜬다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useMenuSettings, canViewHref } from '@/lib/menuStore';
import { sectionHref, MAIN_SEC } from '@/lib/sectionStore';
import { useRawList } from '@/lib/rawList';
import { REL_SEED, type Relation } from '@/lib/charStore';
import { TRPG_SEED, type TrpgLog } from '@/lib/galleryStore';
import { idMs } from '@/lib/siteEntries';

export function CharLogs({ charId }: { charId: string }) {
  const { isAdmin, user } = useAuth();
  const [menuSet] = useMenuSettings();
  const rels = useRawList<Relation>('ohome.rels.v1', REL_SEED);
  const logs = useRawList<TrpgLog>('ohome.trpg.v1', TRPG_SEED);

  const rows = useMemo(() => {
    const viewer = { loggedIn: !!user, isAdmin, id: user?.id };
    // 이 캐릭터가 멤버인 자관 (보이는 것만)
    const myRels = new Map(
      rels.list
        .filter(r => (isAdmin || r.visibility !== 'private') && (r.members ?? []).some(m => m.charId === charId))
        .map(r => [r.id, r.name] as const),
    );
    if (myRels.size === 0) return [];
    return logs.list
      .filter(l => l.relId && myRels.has(l.relId) && !l.listHidden
        && (isAdmin || l.visibility === 'public' || (l.visibility === 'member' && !!user))
        && canViewHref(menuSet, sectionHref('trpg', l.secId ?? MAIN_SEC), viewer))
      .map(l => ({ log: l, rel: myRels.get(l.relId!)!, at: idMs(l.id) }))
      // 세션 날짜가 있으면 그 순서(최신 먼저), 없으면 올린 순서
      .sort((a, b) => (b.log.date ?? '').localeCompare(a.log.date ?? '') || b.at - a.at);
  }, [rels.list, logs.list, charId, isAdmin, user, menuSet]);

  if (!rels.loaded || !logs.loaded || rows.length === 0) return null;
  // 글자는 위의 스펙 목록(.spec)과 같은 크기·색을 쓴다 — 환경설정의 글자 크기 배율(--fs)도 따라간다
  const fs = (px: number) => `calc(${px}px*var(--fs,1))`;
  return (
    <div style={{ marginTop: 22, fontFamily: 'inherit', fontWeight: 400 }}>
      <div style={{ fontSize: fs(11), color: 'var(--faint)', letterSpacing: '.1em', marginBottom: 6 }}>
        출현 로그 · {rows.length}
      </div>
      {rows.map(({ log, rel }) => (
        <div key={log.id} style={{ padding: '7px 0', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <Link href={`/trpg/${log.id}`}
            style={{ fontSize: fs(12.5), fontWeight: 400, color: 'var(--ink)', minWidth: 0, flex: 1, lineHeight: 1.5 }}>{log.title}</Link>
          <span style={{ fontSize: fs(11), color: 'var(--faint)', whiteSpace: 'nowrap' }}>
            {rel}{log.date ? ` · ${log.date.replace(/-/g, '.')}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
