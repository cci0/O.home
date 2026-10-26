'use client';
// 캐릭터 상세의 떠 있는 이동 버튼 — 맨 위로 · 이전 캐릭터 · 다음 캐릭터 · 목록
// 모양·위치는 공통 DetailNav. 이전/다음은 캐릭터 목록과 같은 기준: 같은 섹션(목록)의 내 캐릭터, 목록 순서 그대로,
// 비공개는 관리자만 (지금 보고 있는 캐릭터는 늘 포함). 세계관·태그 거르기는 따르지 않는다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { charPath, type Character } from '@/lib/charStore';
import { inSection, MAIN_SEC } from '@/lib/sectionStore';
import { DetailNav, neighbors } from '@/components/ui/DetailNav';

export function CharNav({ chars, cur, listHref }: { chars: Character[]; cur: Character; listHref: string }) {
  const { isAdmin } = useAuth();
  const { prev, next } = useMemo(() => neighbors(chars
    .filter(c => inSection(c.secId, cur.secId ?? MAIN_SEC))
    .filter(c => c.id === cur.id || (c.own && (isAdmin || c.visibility === 'public'))), cur.id), [chars, cur, isAdmin]);
  const it = (c?: Character) => c && { href: charPath(c), title: c.name };
  return <DetailNav noun="캐릭터" prev={it(prev)} next={it(next)} listHref={listHref} />;
}
