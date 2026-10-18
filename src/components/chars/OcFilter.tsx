'use client';
// OC / NPC 구분 (포크 기능) — 「구분 태그」(기본 OC)가 달린 캐릭터 = OC(자캐), 없으면 NPC.
// 새 칸을 만들지 않고 이미 달아 둔 태그를 그대로 쓴다 — 데이터는 바뀌지 않는다.
//   · 캐릭터 목록 머리(검색 버튼 왼쪽)에 「전체 | OC | NPC」 전환 — 세계관 탭·태그와 함께 걸린다
//     (구분 태그가 달린 캐릭터가 하나도 없으면 전환 자체를 그리지 않는다)
//   · OC 카드 썸네일 왼쪽 위에 작은 OC 표시 · 캐릭터 상세 소개 아래에도 OC 표시
//   · 구분 태그는 태그 줄·카드·상세의 태그 목록에서는 빼서 두 번 보이지 않게
//   · 고른 보기는 이 브라우저에 기억 (보는 사람마다 따로)
// 구분 태그 이름은 환경설정 > 메뉴 관리 > 권한 「OC 구분 태그」에서 바꾼다
// (메뉴 설정 ohome.menuset.v1 안 ocTag — 원작 SETTING_KEYS를 건드리지 않으려고).
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게 (원작 파일에는 몇 줄만).
import React, { useCallback, useEffect, useState } from 'react';
import { useMenuSettings, type MenuSettings } from '@/lib/menuStore';
import type { Character } from '@/lib/charStore';
import { KInput } from '@/components/ui/Kit';

export type OcMode = 'all' | 'oc' | 'npc';
type WithOc = MenuSettings & { ocTag?: string };
const DEFAULT_TAG = 'OC';
const MODE_KEY = 'ohome.ocmode.v1';

const norm = (t: string) => t.trim().replace(/^#/, '').toLowerCase();

/** 지금 쓰는 구분 태그 (빈 값이면 기본 OC) */
export function useOcTag(): string {
  const [ms] = useMenuSettings();
  return ((ms as WithOc).ocTag ?? '').trim().replace(/^#/, '') || DEFAULT_TAG;
}

export const hasOcTag = (tags: string[] | undefined, ocTag: string) =>
  !!tags?.some(t => norm(t) === norm(ocTag));

/** 태그 목록에서 구분 태그만 뺀다 */
export const stripOcTag = (tags: string[] | undefined, ocTag: string) =>
  tags?.filter(t => norm(t) !== norm(ocTag));

const CSS = `
.oc-seg{display:inline-flex;flex-shrink:0;gap:2px;padding:3px;border-radius:999px;background:rgba(127,127,127,.16);vertical-align:middle}
.oc-seg button{border:0;background:transparent;color:var(--page-desc,#889);font-size:calc(12px*var(--fs,1));padding:5px 12px;border-radius:999px;
  cursor:var(--cur-pointer,pointer);white-space:nowrap;line-height:1.2;transition:background .15s,color .15s}
.oc-seg button:hover:not(.on){color:var(--page-title,inherit)}
.oc-seg button.on{background:var(--panel-solid,#fff);color:var(--ink,#222);box-shadow:0 1px 3px rgba(0,0,0,.15)}
.oc-seg small{margin-left:4px;font-size:.85em;opacity:.55;font-variant-numeric:tabular-nums}
.oc-badge{position:absolute;left:8px;top:8px;z-index:3;font-size:10px;font-weight:700;letter-spacing:.08em;line-height:1;padding:4px 7px;
  border-radius:999px;background:rgba(20,22,27,.62);color:#fff;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);pointer-events:none}
.oc-mark{display:inline-block;font-size:calc(10.5px*var(--fs,1));font-weight:700;letter-spacing:.1em;line-height:1;padding:4px 8px;margin-bottom:8px;
  border-radius:999px;color:var(--accent,#a63a45);box-shadow:inset 0 0 0 1px currentColor}
@media (max-width:560px){.oc-seg button{padding:5px 10px}}
`;

/** 캐릭터 목록용 — 전환 버튼 · 거르기 · 태그 정리를 한 번에
 *  all: 볼 수 있는 캐릭터 전부(버튼을 띄울지 판단) · base: 지금 세계관 탭의 캐릭터(숫자) */
export function useOcFilter(all: Character[], base: Character[]) {
  const ocTag = useOcTag();
  const [mode, setModeState] = useState<OcMode>('all');
  useEffect(() => {
    try { const v = localStorage.getItem(MODE_KEY); if (v === 'oc' || v === 'npc') setModeState(v); } catch { /* 무시 */ }
  }, []);
  const setMode = useCallback((m: OcMode) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* 무시 */ }
  }, []);

  const nOc = base.filter(c => hasOcTag(c.tags, ocTag)).length;
  // 구분 태그를 하나도 안 쓰면 전환을 숨기고 거르지도 않는다 — 세계관 탭마다 사라졌다 나타나지 않게 전체 기준
  const enabled = all.some(c => hasOcTag(c.tags, ocTag));
  const cur: OcMode = enabled ? mode : 'all';

  const match = (c: Character) => cur === 'all' || (cur === 'oc') === hasOcTag(c.tags, ocTag);
  const strip = (tags: string[] | undefined) => stripOcTag(tags, ocTag);
  const isOc = (c: Character) => hasOcTag(c.tags, ocTag);

  const btn = (m: OcMode, label: string, n: number) => (
    <button key={m} type="button" role="tab" aria-selected={cur === m} className={cur === m ? 'on' : ''} onClick={() => setMode(m)}>
      {label}<small>{n}</small>
    </button>
  );
  const element = enabled ? (
    <div className="oc-seg" role="tablist" aria-label={`${ocTag} / NPC 보기`}>
      <style>{CSS}</style>
      {btn('all', '전체', base.length)}
      {btn('oc', ocTag, nOc)}
      {btn('npc', 'NPC', base.length - nOc)}
    </div>
  ) : null;

  return { mode: cur, match, strip, isOc, ocTag, element };
}

/** 카드 썸네일 구석 표시 (썸네일이 position:relative 여야 한다) */
export function OcBadge({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;
  return <><style>{CSS}</style><span className="oc-badge">{label}</span></>;
}

/** 캐릭터 상세 — 소개 아래 작은 OC 표시 */
export function OcMark({ tags }: { tags?: string[] }) {
  const ocTag = useOcTag();
  if (!hasOcTag(tags, ocTag)) return null;
  return <div><style>{CSS}</style><span className="oc-mark" title={`#${ocTag} 태그가 달린 캐릭터`}>{ocTag}</span></div>;
}

/** 상세 태그 목록에서 구분 태그 빼기 (훅) */
export function useStripOc(tags: string[] | undefined) {
  const ocTag = useOcTag();
  return stripOcTag(tags, ocTag);
}

/** 환경설정 > 메뉴 관리 > 권한 — 구분 태그 이름 */
export function OcTagOptions() {
  const [ms, patch] = useMenuSettings();
  const cur = (ms as WithOc).ocTag ?? '';
  const [text, setText] = useState(cur);
  useEffect(() => { setText(cur); }, [cur]);
  const commit = () => {
    const v = text.trim().replace(/^#/, '');
    if (v === cur) return;
    patch({ ocTag: v || undefined } as unknown as Partial<MenuSettings>);
  };
  return (
    <div style={{ marginTop: 18 }}>
      <b style={{ fontSize: 13 }}>OC 구분 태그</b>
      <div className="d" style={{ marginTop: 4 }}>
        이 태그가 달린 캐릭터를 OC(자캐)로, 없는 캐릭터를 NPC로 구분합니다 — 캐릭터 목록의 「전체 | OC | NPC」 전환 · 카드와 상세의 OC 표시.
        비우면 기본값 OC · 이 태그는 태그 목록에서는 빠집니다
      </div>
      <div style={{ marginTop: 8, maxWidth: 220 }}>
        <KInput value={text} placeholder={DEFAULT_TAG} maxLength={20} onChange={e => setText(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); }} />
      </div>
    </div>
  );
}
