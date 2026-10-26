'use client';
// 자관 상세의 떠 있는 이동 버튼 — 맨 위로 · 이전 자관 · 다음 자관 · 목록
// 모양·위치는 공통 DetailNav. 이전/다음은 자관 목록 순서 그대로, 이 사람이 열 수 있는 자관만.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { relPath, type Relation } from '@/lib/charStore';
import { DetailNav, neighbors } from '@/components/ui/DetailNav';

export function RelNav({ rels, cur, listHref = '/rels' }: { rels: Relation[]; cur: Relation; listHref?: string }) {
  const { user, isAdmin } = useAuth();
  // 목록과 같은 기준 — 나만보기는 관리자만, 멤버공개는 로그인한 사람만 (지금 보고 있는 자관은 늘 포함)
  const { prev, next } = useMemo(() => neighbors(
    rels.filter(r => r.id === cur.id || isAdmin || r.visibility === 'public' || (r.visibility === 'member' && !!user)), cur.id),
  [rels, cur, user, isAdmin]);
  const it = (r?: Relation) => r && { href: relPath(r), title: r.name };
  return <DetailNav noun="자관" prev={it(prev)} next={it(next)} listHref={listHref} listLabel="자관 목록으로" />;
}
