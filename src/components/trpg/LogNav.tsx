'use client';
// TRPG 로그 상세의 떠 있는 이동 버튼 — 맨 위로 · 이전 로그 · 다음 로그 · 목록
// 모양·위치는 공통 DetailNav (게시글·갤러리 등 다른 상세와 같다). 여기서는 이전/다음 기준만 정한다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import type { TrpgLog } from '@/lib/galleryStore';
import { inSection, MAIN_SEC } from '@/lib/sectionStore';
import { DetailNav, neighbors } from '@/components/ui/DetailNav';

/** extra: 맨 앞에 붙일 버튼 (로그 검색 · 책갈피) */
export function LogNav({ logs, cur, listHref, extra }: { logs: TrpgLog[]; cur: TrpgLog; listHref: string; extra?: React.ReactNode }) {
  const { user, isAdmin } = useAuth();

  // 같은 갤러리(섹션)에서 이 사람이 볼 수 있는 로그 — 번호 순으로 이전/다음
  const { prev, next } = useMemo(() => neighbors(logs
    .filter(x => inSection(x.secId, cur.secId ?? MAIN_SEC))
    .filter(x => isAdmin || (!x.listHidden && (x.visibility === 'public' || (x.visibility === 'member' && !!user))) || x.id === cur.id)
    .sort((a, b) => (a.no - b.no) || (a.date ?? '').localeCompare(b.date ?? '')), cur.id), [logs, cur, user, isAdmin]);

  const it = (x?: TrpgLog) => x && { href: `/trpg/${x.id}`, title: x.title };
  return <DetailNav noun="로그" prev={it(prev)} next={it(next)} listHref={listHref} extra={extra} />;
}
