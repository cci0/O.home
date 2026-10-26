'use client';
// 상세 페이지별 이동 버튼 (포크 기능) — 공통 DetailNav에 「이전/다음 기준」만 붙인 것들.
//   · 게시글: 같은 게시판, 목록과 같은 순서(공지 먼저 → 최신순) · 열 수 없는 비밀글은 건너뜀
//            (비밀번호가 걸린 비밀글은 포함 — 들어가면 비밀번호 입력 화면)
//   · 갤러리: 같은 갤러리(섹션), 목록 순서 그대로 · 볼 수 있는 것만
//   · TRPG 캐릭터: 목록 순서 그대로
//   · 세계관: 목록 순서 그대로 · 볼 수 있는 것만
//   · 커미션: 한 장짜리라 ‹ › 없이 ↑ ☰만
// 목록 화면의 검색·태그 거르기는 따르지 않는다 (상세에서는 그 상태를 알 수 없음).
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게 (원작 상세 페이지에는 한두 줄만).
import React, { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import type { Post } from '@/lib/postStore';
import type { BackupPost } from '@/lib/galleryStore';
import type { TrpgChar } from '@/lib/tcharStore';
import { worldPath, type World } from '@/lib/worldStore';
import { MAIN_BOARD_ID } from '@/lib/boardStore';
import { inSection, MAIN_SEC } from '@/lib/sectionStore';
import { DetailNav, neighbors } from '@/components/ui/DetailNav';

export function PostNav({ posts, cur, listHref }: { posts: Post[]; cur: Post; listHref: string }) {
  const { user, isAdmin } = useAuth();
  const mine = (p: Post) => isAdmin || (!!p.authorId && p.authorId === user?.id);
  const { prev, next } = useMemo(() => neighbors(posts
    .filter(p => (p.boardId ?? MAIN_BOARD_ID) === (cur.boardId ?? MAIN_BOARD_ID))
    .filter(p => p.id === cur.id || !p.secret || mine(p) || !!(p as Post & { secretPass?: boolean }).secretPass)
    .sort((a, b) => (b.notice ? 1 : 0) - (a.notice ? 1 : 0) || b.date.localeCompare(a.date)), cur.id),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [posts, cur, user, isAdmin]);
  const it = (p?: Post) => p && { href: `/board/${p.id}`, title: p.secret && !mine(p) ? '🔒 비밀글' : p.title };
  return <DetailNav noun="글" prev={it(prev)} next={it(next)} listHref={listHref} />;
}

export function GalleryNav({ posts, cur, listHref }: { posts: BackupPost[]; cur: BackupPost; listHref: string }) {
  const { user, isAdmin } = useAuth();
  const { prev, next } = useMemo(() => neighbors(posts
    .filter(p => inSection(p.secId, cur.secId ?? MAIN_SEC))
    .filter(p => p.id === cur.id || isAdmin || p.visibility === 'public' || (p.visibility === 'member' && !!user)), cur.id),
  [posts, cur, user, isAdmin]);
  const it = (p?: BackupPost) => p && { href: `/gallery/${p.id}`, title: p.title };
  return <DetailNav noun="게시물" prev={it(prev)} next={it(next)} listHref={listHref} />;
}

export function TCharNav({ tchars, cur }: { tchars: TrpgChar[]; cur: TrpgChar }) {
  const { prev, next } = useMemo(() => neighbors(tchars, cur.id), [tchars, cur]);
  const it = (c?: TrpgChar) => c && { href: `/tchars/${c.id}`, title: c.name };
  return <DetailNav noun="캐릭터" prev={it(prev)} next={it(next)} listHref="/tchars" />;
}

export function WorldNav({ worlds, cur }: { worlds: World[]; cur: World }) {
  const { prev, next } = useMemo(() => neighbors(worlds, cur.id), [worlds, cur]);
  const it = (w?: World) => w && { href: worldPath(w), title: w.name };
  return <DetailNav noun="세계관" prev={it(prev)} next={it(next)} listHref="/worlds" />;
}

export function TopListNav({ listHref }: { listHref: string }) {
  return <DetailNav noun="페이지" pager={false} listHref={listHref} />;
}
