'use client';
// 휴대폰 햄버거 메뉴 (포크 기능) — 휴대폰 폭(620px 이하)에서는 상단 메뉴가 숨고, 메뉴는 메인의 「메뉴리스트」
// 위젯에만 있어서 다른 게시판으로 가려면 매번 메인으로 돌아가야 했다.
// 이제 상단바 왼쪽 ☰ → 왼쪽에서 메뉴 서랍이 열린다. 내용은 메인 메뉴리스트 위젯과 똑같다
// (메뉴 관리의 순서·이름·공개범위·여러 게시판·섹션·커스텀 링크가 그대로 반영 — 같은 buildMenu를 쓴다).
//   · 지금 보고 있는 메뉴는 강조 · 그 메뉴가 든 묶음은 펼친 채로 열림
//   · 메뉴를 고르면 저절로 닫힘 · 바깥 누르기 · Esc · ✕로 닫기
//   · PC 폭에서는 버튼 자체가 안 보인다 (상단 메뉴가 있으므로)
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게 (원작 TopBar에는 한 줄만).
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { boardEntries, useMenuSettings, buildMenu } from '@/lib/menuStore';
import { useSections, sectionMenuEntries } from '@/lib/sectionStore';
import { useCustomLinks, linkEntries } from '@/lib/linkStore';
import { useBoards } from '@/lib/boardStore';

const CSS = `
.mm-btn{display:none;flex-shrink:0;width:34px;height:34px;margin-left:-6px;border:0;border-radius:9px;background:transparent;color:inherit;
  cursor:var(--cur-pointer,pointer);place-items:center}
.mm-btn:hover{background:rgba(255,255,255,.1)}
.mm-btn svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round}
@media (max-width:620px){.mm-btn{display:grid}}
.mm-ov{position:fixed;inset:0;z-index:130;background:rgba(0,0,0,.42);animation:mm-fade .18s ease}
.mm-dr{position:fixed;top:0;bottom:0;left:0;z-index:131;width:min(300px,84vw);display:flex;flex-direction:column;
  background:var(--panel-solid,#fff);color:var(--ink,#222);box-shadow:8px 0 30px rgba(0,0,0,.25);animation:mm-in .2s ease}
.mm-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px 20px;border-bottom:1px solid var(--line)}
.mm-hd b{font-family:var(--serif);letter-spacing:.2em;font-size:13px}
.mm-hd button{width:34px;height:34px;border:0;border-radius:9px;background:transparent;color:inherit;cursor:var(--cur-pointer,pointer);display:grid;place-items:center}
.mm-hd button:hover{background:rgba(127,127,127,.12)}
.mm-hd svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round}
.mm-body{flex:1;overflow-y:auto;padding:10px 8px calc(16px + var(--bgm-h,0px))}
.mm-body a{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 12px;font-size:calc(13.5px*var(--fs,1));color:var(--ink);
  border-radius:8px;cursor:var(--cur-pointer,pointer);text-decoration:none}
.mm-body a:hover{background:rgba(127,127,127,.1)}
.mm-body a.on{color:var(--accent,#a63a45);font-weight:600;background:rgba(127,127,127,.08)}
.mm-body .mm-grp > a::after{content:"▾";font-size:10px;color:var(--faint);transition:transform .2s}
.mm-body .mm-grp.open > a::after{transform:rotate(180deg)}
.mm-body .mm-sub{display:none;padding:0 0 4px 12px}
.mm-body .mm-grp.open .mm-sub{display:block}
.mm-body .mm-sub a{font-size:calc(12.5px*var(--fs,1));color:var(--sub,var(--faint));padding:8px 12px}
.mm-body .mm-sub a.on{color:var(--accent,#a63a45)}
@keyframes mm-in{from{transform:translateX(-100%)}to{transform:none}}
@keyframes mm-fade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.mm-dr,.mm-ov{animation:none}}
`;

type Item = { label: string; href?: string; children?: { label: string; href: string }[] };

/** 지금 주소에 가장 잘 맞는 메뉴 주소 — 주소·?쿼리까지 같으면 우선, 아니면 앞부분이 가장 길게 겹치는 것 (상세 페이지 → 그 목록) */
function activeHref(items: Item[], path: string, search: string): string | null {
  const all = items.flatMap(m => (m.children ?? (m.href ? [{ label: m.label, href: m.href }] : [])));
  const full = path + search;
  const exact = all.find(c => c.href === full);
  if (exact) return exact.href;
  let best: string | null = null; let bestLen = 0;
  for (const c of all) {
    if (/^https?:/.test(c.href)) continue;
    const [p, q] = c.href.split('?');
    if (q && !search.includes(q)) continue;
    const hit = p === '/' ? path === '/' : (path === p || path.startsWith(p + '/'));
    if (hit && p.length + (q ? q.length : 0) > bestLen) { best = c.href; bestLen = p.length + (q ? q.length : 0); }
  }
  return best;
}

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  const [openGrp, setOpenGrp] = useState<string | null>(null);
  const path = usePathname() ?? '/';
  const router = useRouter();
  const [menuSet, , menuLoaded] = useMenuSettings();
  const { boards, loaded: boardsLoaded } = useBoards();
  const { user, isAdmin } = useAuth();
  const { map: secMap } = useSections();
  const { links } = useCustomLinks();
  const items: Item[] = menuLoaded && boardsLoaded
    ? buildMenu(menuSet, [...boardEntries(boards), ...sectionMenuEntries(secMap), ...linkEntries(links)], { loggedIn: !!user, isAdmin, id: user?.id })
    : [];
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const on = open ? activeHref(items, path, search) : null;

  // 페이지가 바뀌면 닫는다 (메뉴를 고르면 저절로 닫힘)
  useEffect(() => { setOpen(false); }, [path]);
  // 열 때 — 지금 메뉴가 든 묶음을 펼쳐 둔다
  useEffect(() => {
    if (!open) return;
    const g = items.find(m => m.children?.some(c => c.href === on));
    setOpenGrp(g?.label ?? null);
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const go = (href: string) => {
    if (/^https?:\/\//.test(href)) { window.open(href, '_blank'); return; }
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <style>{CSS}</style>
      <button type="button" className="mm-btn" aria-label="메뉴 열기" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div className="mm-ov" onClick={() => setOpen(false)} />
          <nav className="mm-dr" aria-label="메뉴">
            <div className="mm-hd">
              <b>MENU</b>
              <button type="button" aria-label="메뉴 닫기" onClick={() => setOpen(false)}>
                <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="mm-body">
              <a className={path === '/' ? 'on' : ''} onClick={() => go('/')}>HOME</a>
              {items.map(m => (m.children ? (
                <div key={m.label} className={`mm-grp${openGrp === m.label ? ' open' : ''}`}>
                  <a onClick={() => setOpenGrp(g => (g === m.label ? null : m.label))}>{m.label}</a>
                  <div className="mm-sub">
                    {m.children.map(c => <a key={c.href} className={c.href === on ? 'on' : ''} onClick={() => go(c.href)}>{c.label}</a>)}
                  </div>
                </div>
              ) : (
                <a key={m.label} className={m.href === on ? 'on' : ''} onClick={() => go(m.href!)}>{m.label}</a>
              )))}
            </div>
          </nav>
        </>,
        document.body,
      )}
    </>
  );
}
