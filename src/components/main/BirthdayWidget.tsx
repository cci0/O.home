'use client';
// 메인 위젯 「BIRTHDAY」 (포크 기능) — 다가오는 캐릭터 생일을 D-day로.
// 생일은 따로 칸을 만들지 않고, 캐릭터 「기본 정보 항목」에 「생일」 칸을 쓰면 읽어 온다.
//   · 항목 이름: 생일 · 생년월일 · 탄생일 · Birthday · B-day (띄어쓰기·대소문자 무시)
//   · 값: 3월 14일 · 3/14 · 03.14 · 3-14 · 1998-03-14 · 1998.3.14 처럼 숫자로 된 날짜 (그 밖의 값은 건너뜀)
//   · 2월 29일생은 평년에는 2월 28일로
//   · 오늘이면 TODAY 🎂 · 아니면 D-n · 누르면 그 캐릭터로
//   · 설정(편집모드 우클릭 > 설정): 위젯 제목 · 며칠 앞까지 · 몇 명까지 · OC만
//   · 보는 사람이 볼 수 있는 캐릭터만 (비공개 캐릭터는 관리자만) · AU 말고 원본 프로필 기준
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게 (원작 파일에는 등록 몇 줄만).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WidgetConf } from '@/lib/mainStore';
import { useMainStore } from '@/lib/mainStore';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, charPath, type Character } from '@/lib/charStore';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { Modal } from '@/components/ui/Modal';
import { KStep, KInput, KCheck } from '@/components/ui/Kit';
import { useOcTag, hasOcTag } from '@/components/chars/OcFilter';

const LABEL_RE = /^(생일|생년월일|탄생일|birthday|bday|b-day)$/i;

/** 「생일」 값 → 월·일 (못 읽으면 null) */
export function parseBirthday(v: string): { m: number; d: number } | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  let m: number | undefined, d: number | undefined;
  const ko = s.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일?/);
  const ymd = s.match(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/);
  const md = s.match(/(?:^|[^\d])(\d{1,2})\s*[-./]\s*(\d{1,2})(?![\d])/);
  if (ko) { m = +ko[1]; d = +ko[2]; }
  else if (ymd) { m = +ymd[2]; d = +ymd[3]; }
  else if (md) { m = +md[1]; d = +md[2]; }
  if (!m || !d || m < 1 || m > 12 || d < 1) return null;
  const maxD = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  if (d > maxD) return null;
  return { m, d };
}

/** 캐릭터의 생일 (기본 정보 항목에서) */
export function birthdayOf(c: Character): { m: number; d: number; raw: string } | null {
  const row = (c.specs ?? []).find(s => LABEL_RE.test((s.label ?? '').replace(/[\s()]/g, '')));
  if (!row) return null;
  const p = parseBirthday(row.value);
  return p ? { ...p, raw: row.value } : null;
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** 오늘부터 다음 생일까지 며칠 (오늘이면 0) */
export function daysUntil(b: { m: number; d: number }, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const at = (y: number) => new Date(y, b.m - 1, b.m === 2 && b.d === 29 && !isLeap(y) ? 28 : b.d);
  let next = at(today.getFullYear());
  if (next < today) next = at(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function useEditEvent(id: string, onOpen: () => void) {
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail?.id === id) onOpen(); };
    window.addEventListener('ohome-widget-edit', h);
    return () => window.removeEventListener('ohome-widget-edit', h);
  }, [id, onOpen]);
}

const CSS = `
/* 막 추가해 크기를 아직 안 정한 상태(절대배치)에서 내용 폭으로 쪼그라들지 않게 — 크기를 정하면 그 크기를 따른다 */
.wgt:not(.sized) > .bd-panel{width:260px;max-width:100%}
.wgt.sized > .widget.bd-panel{display:flex;flex-direction:column;overflow:hidden}
.bd-panel > h4{flex-shrink:0}
.bd-list{min-height:0}
.wgt.sized > .widget.bd-panel .bd-list{flex:1;overflow-y:auto;scrollbar-width:none}
.wgt.sized > .widget.bd-panel .bd-list::-webkit-scrollbar{display:none}
.bd-row{display:flex;align-items:center;gap:10px;padding:6px 2px;border-bottom:1px dashed var(--line);cursor:var(--cur-pointer,pointer);min-width:0}
.bd-row:last-of-type{border-bottom:0}
.bd-row:hover .nm{text-decoration:underline;text-underline-offset:3px}
.bd-row .av{width:30px;height:30px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative}
.bd-row .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.bd-row .nm{font-size:calc(12.5px*var(--fs,1));font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bd-row .dt{font-size:calc(10.5px*var(--fs,1));color:var(--faint)}
.bd-row .dd{flex-shrink:0;font-size:calc(11px*var(--fs,1));font-variant-numeric:tabular-nums;color:var(--faint);letter-spacing:.04em}
.bd-row.today .dd{color:#fff;background:var(--accent,#a63a45);padding:3px 8px;border-radius:999px;font-weight:700}
.bd-row.today .av{box-shadow:0 0 0 2px var(--accent,#a63a45)}
`;

export function BirthdayWidget({ conf }: { conf: WidgetConf }) {
  const router = useRouter();
  const { isAdmin, user } = useAuth();
  const { editOn, updateWidget } = useMainStore();
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const ocTag = useOcTag();
  const [open, setOpen] = useState(false);
  useEditEvent(conf.id, useCallback(() => setOpen(true), []));

  const st = conf.settings as { title?: string; days?: number; count?: number; ocOnly?: boolean };
  const days = Math.max(1, Math.min(366, st.days ?? 60));
  const count = Math.max(1, Math.min(15, st.count ?? 5));
  const title = (st.title ?? '').trim() || 'BIRTHDAY';
  const set = (p: Partial<typeof st>) => updateWidget(conf.id, { settings: { ...conf.settings, ...p } }, { persist: true });

  // 날짜가 바뀌면(자정을 넘겨 열어 둔 경우) 다시 계산
  const [dayKey, setDayKey] = useState(() => new Date().toDateString());
  useEffect(() => {
    const t = setInterval(() => { const k = new Date().toDateString(); setDayKey(p => (p === k ? p : k)); }, 60_000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => chars
    .filter(c => c.own)
    .filter(c => isAdmin || c.visibility === 'public' || (c.visibility === 'member' && !!user))
    .filter(c => !st.ocOnly || hasOcTag(c.tags, ocTag))
    .map(c => { const b = birthdayOf(c); return b ? { c, b, n: daysUntil(b) } : null; })
    .filter((x): x is { c: Character; b: { m: number; d: number; raw: string }; n: number } => !!x && x.n <= days)
    .sort((a, b) => a.n - b.n || a.c.name.localeCompare(b.c.name))
    .slice(0, count),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chars, isAdmin, user, st.ocOnly, ocTag, days, count, dayKey]);

  return (
    <div className="panel widget bd-panel" style={{ margin: 0 }}>
      <style>{CSS}</style>
      <h4>{title}</h4>
      <div className="bd-list">
      {rows.map(({ c, b, n }) => (
        <div key={c.id} className={`bd-row${n === 0 ? ' today' : ''}`} onClick={() => { if (!editOn) router.push(charPath(c)); }}
          title={`${c.name} · ${b.raw}`}>
          <span className="av"><CroppedBlobImg fileRef={c.thumbId ?? c.arts?.[0]} crop={c.thumbCrop} ph={c.thumbClass} /></span>
          <span className="tx"><span className="nm">{c.name}</span><span className="dt">{b.m}월 {b.d}일</span></span>
          <span className="dd">{n === 0 ? 'TODAY 🎂' : `D-${n}`}</span>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="hint">{days}일 안에 다가오는 생일이 없어요{isAdmin ? ' — 캐릭터 기본 정보 항목에 「생일」 칸을 넣어 주세요 (예: 3월 14일)' : ''}</p>
      )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} small title="BIRTHDAY 위젯"
        desc="캐릭터 기본 정보 항목의 「생일」(예: 3월 14일 · 3/14 · 1998-03-14)을 읽어 다가오는 순서로 보여 줘요"
        actions={<button className="btn btn-dark" onClick={() => setOpen(false)}>확인</button>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span className="cp-lb">위젯 제목</span>
            <KInput value={st.title ?? ''} placeholder="BIRTHDAY" maxLength={24} onChange={e => set({ title: e.target.value })} />
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="cp-lb">며칠 앞까지</span>
            <KStep value={days} min={1} max={366} step={7} suffix="일" onChange={v => set({ days: v })} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="cp-lb">몇 명까지</span>
            <KStep value={count} min={1} max={15} suffix="명" onChange={v => set({ count: v })} />
          </div>
          <KCheck label={`${ocTag} 캐릭터만`} checked={!!st.ocOnly} onChange={v => set({ ocOnly: v })} />
        </div>
      </Modal>
    </div>
  );
}
