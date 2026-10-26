'use client';
// 칩 하나만 고르는 필터 줄 (포크 기능) — 태그 필터(TagFilter)와 똑같은 모양·동작:
//   기본은 한 줄만 보이고, 넘치면 오른쪽 끝 「펼치기 ▾」로 전부 / 「접기 ▴」로 다시 한 줄.
//   접힌 상태에서도 고른 칩은 앞쪽으로 당겨 늘 보이게. 펼침 여부는 보는 사람 브라우저에 기억.
// 지금은 TRPG 로그 목록의 휴대폰 「자관」 필터에 쓴다 (PC는 오른쪽 사이드 그대로).
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useLayoutEffect, useRef, useState } from 'react';

export type ChipItem = { id: string; label: string; count?: number };

export function ChipFilter({ items, value, onChange, storeKey, pinFirst = true }: {
  items: ChipItem[];
  value: string;
  onChange: (id: string) => void;
  storeKey: string;      // 펼침 여부를 기억할 이름
  pinFirst?: boolean;    // 첫 칩(「전체」)은 접혀도 늘 맨 앞
}) {
  const [open, setOpenState] = useState(false);
  const [more, setMore] = useState(false);
  const [rowH, setRowH] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => { try { setOpenState(localStorage.getItem(storeKey) === '1'); } catch { /* 무시 */ } }, [storeKey]);
  const setOpen = (v: boolean) => {
    setOpenState(v);
    try { localStorage.setItem(storeKey, v ? '1' : '0'); } catch { /* 무시 */ }
  };

  // 한 줄 높이를 재고 넘치는지 확인 (TagFilter와 같은 방식)
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const first = box.firstElementChild as HTMLElement | null;
      if (!first) { setMore(false); return; }
      setRowH(first.offsetHeight + 4);
      const top = first.offsetTop;
      setMore(Array.from(box.children).some(c => (c as HTMLElement).offsetTop > top + 2));
    };
    measure();
    let ro: ResizeObserver | null = null;
    try { ro = new ResizeObserver(measure); ro.observe(box); } catch { /* 무시 */ }
    return () => { ro?.disconnect(); };
  }, [items, value, open]);

  if (items.length <= 1) return null;

  // 접혀 있으면 고른 칩을 앞으로 (「전체」 다음)
  const head = pinFirst ? items.slice(0, 1) : [];
  const rest = pinFirst ? items.slice(1) : items;
  const ordered = open ? items : [...head, ...rest.filter(i => i.id === value), ...rest.filter(i => i.id !== value)];

  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', margin: '0 0 10px' }}>
      <div ref={boxRef} className="tag-row"
        style={{ flex: 1, minWidth: 0, paddingTop: 2, ...(!open && rowH ? { maxHeight: rowH, overflow: 'hidden' } : null) }}>
        {ordered.map(i => (
          <div key={i.id} className={`tag ${i.id === value ? 'on' : ''}`} onClick={() => onChange(i.id)}>
            {i.label}{i.count != null && <> <small>{i.count}</small></>}
          </div>
        ))}
        {open && more && <div className="tag" onClick={() => setOpen(false)}>접기 ▴</div>}
      </div>
      {!open && more && (
        <div className="tag-row" style={{ flexWrap: 'nowrap', flexShrink: 0, paddingTop: 2 }}>
          <div className="tag" onClick={() => setOpen(true)}>펼치기 ▾</div>
        </div>
      )}
    </div>
  );
}
