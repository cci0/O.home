'use client';
// 상세 페이지 공통 이동 버튼 (포크 기능) — 맨 위로 ↑ · 이전 ‹ · 다음 › · 목록 ☰
// 로그(LogNav)·캐릭터(CharNav)·(예전) 자관이 각자 같은 모양을 따로 그리던 것을 한 곳으로 모았고,
// 게시글·갤러리·TRPG 캐릭터·세계관·커미션 상세에도 같은 버튼을 단다.
//   · 이전/다음 = 그 목록에서 바로 위/아래 항목 (목록에 보이는 순서 그대로) · 끝이면 흐리게
//   · 버튼에 마우스를 올리면 「이전 글 · 제목」처럼 어디로 가는지 보인다
//   · PC: 오른쪽 아래 세로 줄 (예전 그대로)
//   · 휴대폰(620px 이하): 오른쪽 아래 가로 한 줄 알약 — 세로로 길게 서서 본문 오른쪽을 가리던 것을 줄였다.
//     BGM 바가 있으면 그 위로 올라가고, 본문 맨 끝이 버튼에 가리지 않게 아래에 빈 자리를 둔다
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

export type NavItem = { href: string; title: string };

/** 목록(seq)에서 지금 항목의 바로 앞·뒤 */
export function neighbors<T extends { id: string }>(seq: T[], curId: string): { prev?: T; next?: T } {
  const i = seq.findIndex(x => x.id === curId);
  if (i < 0) return {};
  return { prev: i > 0 ? seq[i - 1] : undefined, next: i < seq.length - 1 ? seq[i + 1] : undefined };
}

const CSS = `
.dnav{position:fixed;right:22px;bottom:max(92px, calc(var(--bgm-h,0px) + 16px));z-index:30;display:flex;flex-direction:column;gap:8px;align-items:center}
.dnav-b{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-size:16px;line-height:1;padding:0;
  background:var(--panel-solid,#fff);color:var(--ink,#333);border:1px solid var(--line,rgba(0,0,0,.14));
  box-shadow:var(--sh-dd,0 4px 14px rgba(0,0,0,.16));cursor:var(--cur-pointer,pointer);transition:transform .12s}
.dnav-b:not(:disabled):hover{transform:translateY(-1px)}
.dnav-b:disabled{opacity:.35;cursor:default}
.dnav-b svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.dnav-sp{display:none}
@media (max-width:620px){
  .dnav{right:12px;bottom:calc(var(--bgm-h,0px) + 12px + env(safe-area-inset-bottom,0px));flex-direction:row;gap:2px;padding:4px;
    border-radius:999px;background:var(--panel-solid,#fff);border:1px solid var(--line,rgba(0,0,0,.14));
    box-shadow:var(--sh-dd,0 4px 14px rgba(0,0,0,.16))}
  /* 알약 안의 버튼은 테두리·그림자 없이 (책갈피·검색처럼 밖에서 붙는 버튼도 같이) */
  .dnav > button{width:36px !important;height:36px !important;border:0 !important;box-shadow:none !important;background:transparent !important}
  .dnav > button:not(:disabled):active{background:rgba(127,127,127,.14) !important}
  .dnav-sp{display:block;height:64px}
}
`;

const Ico = {
  up: <svg viewBox="0 0 16 16" aria-hidden><path d="M8 13V3.5M3.5 8 8 3.5 12.5 8" /></svg>,
  prev: <svg viewBox="0 0 16 16" aria-hidden><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>,
  next: <svg viewBox="0 0 16 16" aria-hidden><path d="M6 3.5 10.5 8 6 12.5" /></svg>,
  list: <svg viewBox="0 0 16 16" aria-hidden><path d="M3 4.5h10M3 8h10M3 11.5h10" /></svg>,
};

/**
 * noun: 「글」·「로그」 같은 이름 (안내 문구용)
 * prev/next: 생략하면(undefined 아님 — 아예 안 넘기면) ‹ › 버튼 자체를 안 그린다 → pager={false}
 * extra: 맨 앞(PC는 맨 위)에 붙일 버튼 (로그 검색·책갈피)
 */
export function DetailNav({ noun, prev, next, listHref, listLabel, pager = true, extra }: {
  noun: string;
  prev?: NavItem; next?: NavItem;
  listHref: string; listLabel?: string;
  pager?: boolean;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  // 버튼 줄은 문서 맨 바깥(body)에 그린다 — 자관 상세처럼 페이지 안에 transform·filter가 걸린 상자가 있으면
  // position:fixed가 화면이 아니라 그 상자 기준이 돼서 버튼이 화면 가운데쯤에 떠 있었다 (사용자 제보)
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(document.body); }, []);

  // 스크롤은 페이지 전체가 아니라 #appMain 안에서 일어난다
  useEffect(() => {
    const el = document.getElementById('appMain');
    if (!el) return;
    const on = () => setScrolled(el.scrollTop > 300);
    on();
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, []);

  const top = () => document.getElementById('appMain')?.scrollTo({ top: 0, behavior: 'smooth' });
  const lst = listLabel ?? '목록으로';

  return (
    <>
      <style>{CSS}</style>
      {/* 휴대폰에서 본문 맨 끝(수정·삭제 버튼 등)이 알약에 가리지 않게 */}
      <div className="dnav-sp" aria-hidden />
      {host && createPortal(<nav className="dnav" aria-label={`${noun} 이동`}>
        {extra}
        {scrolled && <button type="button" className="dnav-b" onClick={top} title="맨 위로" aria-label="맨 위로">{Ico.up}</button>}
        {pager && <>
          <button type="button" className="dnav-b" disabled={!prev} title={prev ? `이전 ${noun} · ${prev.title}` : `이전 ${noun} 없음`}
            aria-label={`이전 ${noun}`} onClick={() => prev && router.push(prev.href)}>{Ico.prev}</button>
          <button type="button" className="dnav-b" disabled={!next} title={next ? `다음 ${noun} · ${next.title}` : `다음 ${noun} 없음`}
            aria-label={`다음 ${noun}`} onClick={() => next && router.push(next.href)}>{Ico.next}</button>
        </>}
        <button type="button" className="dnav-b" onClick={() => router.push(listHref)} title={lst} aria-label={lst}>{Ico.list}</button>
      </nav>, host)}
    </>
  );
}
