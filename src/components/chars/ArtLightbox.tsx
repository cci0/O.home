'use client';
// 캐릭터 아트 크게 보기 (포크 기능) — 상세 페이지 그림을 누르면 화면 가득, 잘리지 않은 원래 비율로.
//   · 여러 장이면 ‹ › 버튼 · 키보드 ← → · 휴대폰은 좌우로 밀어서 넘기기 · 아래 「2 / 3」
//   · 닫기: ✕ · Esc · 그림 바깥(어두운 곳) 누르기
//   · 이미지 저장 방지(메뉴 관리 > 권한)는 문서 전체에 걸리므로 여기서도 그대로 적용된다
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게 (원작 상세 페이지에는 몇 줄만).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBlobUrl } from '@/lib/blobStore';

const CSS = `
.alb{position:fixed;inset:0;z-index:120;background:rgba(8,9,12,.93);display:flex;align-items:center;justify-content:center;
  animation:alb-in .16s ease;touch-action:pan-y;user-select:none;-webkit-user-select:none}
@keyframes alb-in{from{opacity:0}to{opacity:1}}
.alb-stage{position:absolute;inset:56px 72px 56px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.alb-stage img{max-width:100%;max-height:100%;object-fit:contain;pointer-events:auto;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.alb-stage .ld{color:rgba(255,255,255,.5);font-size:12px;letter-spacing:.2em}
.alb button{position:absolute;border:0;background:rgba(255,255,255,.08);color:#fff;cursor:var(--cur-pointer,pointer);display:grid;place-items:center;
  border-radius:50%;transition:background .15s}
.alb button:hover{background:rgba(255,255,255,.18)}
.alb .x{top:14px;right:14px;width:40px;height:40px}
.alb .nav{top:50%;transform:translateY(-50%);width:46px;height:46px}
.alb .nav.p{left:14px}.alb .nav.n{right:14px}
.alb .cnt{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.75);font-size:12px;letter-spacing:.12em;
  font-variant-numeric:tabular-nums;pointer-events:none}
.alb svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
@media (max-width:640px){
  .alb-stage{inset:52px 8px 48px}
  .alb .nav{width:40px;height:40px;background:rgba(0,0,0,.35)}
  .alb .nav.p{left:6px}.alb .nav.n{right:6px}
}
@media (prefers-reduced-motion:reduce){.alb{animation:none}}
`;

function Pic({ fileRef }: { fileRef: string }) {
  const url = useBlobUrl(fileRef);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" draggable={false} decoding="async" /> : <span className="ld">LOADING</span>;
}

/** 다음/이전 그림을 미리 받아 둔다 (넘길 때 기다리지 않게) */
function Preload({ fileRef }: { fileRef?: string }) {
  const url = useBlobUrl(fileRef);
  useEffect(() => { if (url) { const im = new Image(); im.decoding = 'async'; im.src = url; } }, [url]);
  return null;
}

export function ArtLightbox({ refs, start, onClose }: { refs: string[]; start: number; onClose: (last: number) => void }) {
  const n = refs.length;
  const [i, setI] = useState(() => Math.min(Math.max(0, start), n - 1));
  const go = useCallback((d: number) => setI(x => (x + d + n) % n), [n]);
  const close = useCallback(() => onClose(i), [onClose, i]);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);   // 밀어서 넘긴 직후의 클릭은 「닫기」로 치지 않는다

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight' && n > 1) { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' && n > 1) { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [close, go, n]);

  if (typeof document === 'undefined' || !n) return null;
  return createPortal(
    <div className="alb" role="dialog" aria-modal="true" aria-label="그림 크게 보기"
      onClick={e => { if (swiped.current) { swiped.current = false; return; } if ((e.target as HTMLElement).tagName !== 'IMG' && !(e.target as HTMLElement).closest('button')) close(); }}
      onPointerDown={e => { swipe.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={e => {
        const s = swipe.current; swipe.current = null;
        if (!s || n < 2) return;
        const dx = e.clientX - s.x, dy = e.clientY - s.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); swiped.current = true; go(dx < 0 ? 1 : -1); }
      }}>
      <style>{CSS}</style>
      <div className="alb-stage"><Pic key={refs[i]} fileRef={refs[i]} /></div>
      {n > 1 && <>
        <Preload fileRef={refs[(i + 1) % n]} />
        <Preload fileRef={refs[(i - 1 + n) % n]} />
        <button type="button" className="nav p" aria-label="이전 그림" onClick={() => go(-1)}><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>
        <button type="button" className="nav n" aria-label="다음 그림" onClick={() => go(1)}><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
        <div className="cnt">{i + 1} / {n}</div>
      </>}
      <button type="button" className="x" aria-label="닫기 (Esc)" title="닫기 (Esc)" onClick={close}><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
    </div>,
    document.body,
  );
}
