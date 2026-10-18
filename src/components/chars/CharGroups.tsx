'use client';
// 캐릭터 묶음 (포크 기능) — 가족·소속·팀처럼 여러 캐릭터를 한 번에 묶는 가벼운 관계.
// 자관(페이지·글·AU·로그가 붙는 무거운 단위)과 따로, 목록이나 페이지 없이 「누가 어디에 속하는지」만.
//   · 묶음 = 이름 · 종류(가족/소속/팀…) · 세계관(선택) · 공개범위 · 멤버(각자 역할)
//   · 캐릭터 상세: 그 캐릭터가 속한 묶음만 한 줄씩, 눌러야 멤버가 펼쳐진다 (NPC가 묶음 여러 개여도 짧게)
//   · 세계관 상세: 「세계관 관계」 칸에 그 세계관 묶음 전부 — 세계관 전체의 큰 그림
//   · 편집(관리자): 캐릭터 상세의 ＋ / ✎ · 세계관 상세의 ＋ 묶음 / ✎ → 같은 편집 창
//   · 공개범위는 서버(char_groups 표 RLS)에서 걸러진다 — 비공개 묶음은 방문자에게 아예 안 내려간다
//   · 볼 수 없는 캐릭터는 멤버 목록에서 빠진다
// 표: supabase/char_groups.sql (한 번 실행) · 저장 키 ohome.cgroups.v1 → char_groups
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게 (원작 파일에는 몇 줄만).
import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useLocalList, newId } from '@/lib/postStore';
import { charPath, type Character, type Visibility } from '@/lib/charStore';
import { useVisibleWorlds } from '@/lib/worldStore';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { KInput, KSelect } from '@/components/ui/Kit';

export const GROUP_KEY = 'ohome.cgroups.v1';

export interface GroupMember { charId: string; role?: string }
export interface CharGroup {
  id: string;
  name: string;
  kind?: string;              // 가족 · 소속 · 팀 … (자유 입력)
  worldId?: string;
  visibility: Visibility;
  members: GroupMember[];
}

const KIND_PRESETS = ['가족', '소속', '팀', '친구', '연인', '기타'];
const VIS_OPTS = [
  { value: 'public', label: '전체공개' },
  { value: 'member', label: '멤버공개' },
  { value: 'private', label: '나만보기' },
];

export function useCharGroups() {
  const [groups, setGroups, loaded] = useLocalList<CharGroup>(GROUP_KEY, []);
  return { groups, setGroups, loaded };
}

const CSS = `
.cg-box{margin:2px 0 14px}
.cg-lb{display:flex;align-items:center;gap:8px;font-size:calc(10.5px*var(--fs,1));letter-spacing:.16em;color:var(--faint);margin-bottom:6px}
.cg-lb button{border:0;background:transparent;color:var(--faint);cursor:var(--cur-pointer,pointer);font-size:13px;line-height:1;padding:2px 5px;border-radius:6px}
.cg-lb button:hover{color:var(--ink);background:rgba(127,127,127,.12)}
.cg-row{border-top:1px dashed var(--line)}
.cg-row:last-child{border-bottom:1px dashed var(--line)}
.cg-head{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;color:var(--ink);text-align:left;
  padding:8px 2px;cursor:var(--cur-pointer,pointer);font-size:calc(13px*var(--fs,1));min-width:0}
.cg-head:hover .cg-name{text-decoration:underline;text-underline-offset:3px}
.cg-kind{flex-shrink:0;font-size:calc(10.5px*var(--fs,1));padding:2px 8px;border-radius:999px;color:var(--accent,#a63a45);box-shadow:inset 0 0 0 1px currentColor;line-height:1.5}
.cg-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.cg-role{flex-shrink:0;color:var(--faint);font-size:calc(12px*var(--fs,1))}
.cg-n{margin-left:auto;flex-shrink:0;color:var(--faint);font-size:calc(11px*var(--fs,1));font-variant-numeric:tabular-nums}
.cg-arrow{flex-shrink:0;color:var(--faint);transition:transform .15s;font-size:11px}
.cg-row.open .cg-arrow{transform:rotate(90deg)}
.cg-lock{flex-shrink:0;font-size:11px;opacity:.6}
.cg-edit{flex-shrink:0;border:0;background:transparent;color:var(--faint);cursor:var(--cur-pointer,pointer);padding:2px 6px;border-radius:6px;font-size:12px}
.cg-edit:hover{color:var(--ink);background:rgba(127,127,127,.12)}
.cg-mem{display:flex;flex-wrap:wrap;gap:8px 10px;padding:2px 2px 12px}
.cg-chip{display:flex;align-items:center;gap:7px;min-width:0;max-width:100%;padding:3px 10px 3px 3px;border-radius:999px;background:rgba(127,127,127,.09);color:var(--ink);
  text-decoration:none;font-size:calc(12px*var(--fs,1))}
.cg-chip:hover{background:rgba(127,127,127,.17)}
.cg-chip .av{width:26px;height:26px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative}
.cg-chip b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cg-chip small{color:var(--faint);white-space:nowrap}
.cg-chip.me{box-shadow:inset 0 0 0 1.5px var(--accent,#a63a45)}
.cg-world .cg-card{border:1px solid var(--line);border-radius:12px;padding:10px 14px 4px;margin-bottom:10px}
.cg-world .cg-card .cg-headline{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:calc(13.5px*var(--fs,1))}
/* 편집 창 */
.cg-ed{display:grid;gap:14px}
.cg-ed .lb{font-size:calc(11.5px*var(--fs,1));color:var(--faint);margin-bottom:5px}
.cg-ed .presets{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.cg-ed .presets button{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:3px 10px;font-size:12px;cursor:var(--cur-pointer,pointer)}
.cg-ed .presets button.on{background:var(--ink);color:var(--panel-solid,#fff);border-color:transparent}
.cg-ed .mrow{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dashed var(--line)}
.cg-ed .mrow .av{width:30px;height:30px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative}
.cg-ed .mrow b{width:110px;flex-shrink:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cg-ed .mrow .k-input{flex:1;min-width:0}
.cg-ed .mrow button{border:0;background:transparent;color:var(--faint);cursor:var(--cur-pointer,pointer);padding:4px 6px;border-radius:6px}
.cg-ed .mrow button:hover{color:var(--ink);background:rgba(127,127,127,.12)}
.cg-ed .pick{position:relative}
.cg-ed .pick-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:5;max-height:240px;overflow:auto;padding:4px;border-radius:10px;
  background:var(--panel-solid,#fff);border:1px solid var(--line);box-shadow:var(--sh-dd,0 8px 24px rgba(0,0,0,.2))}
.cg-ed .pick-list button{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;color:var(--ink);text-align:left;padding:5px 7px;border-radius:7px;cursor:var(--cur-pointer,pointer);font-size:13px}
.cg-ed .pick-list button:hover{background:rgba(127,127,127,.12)}
.cg-ed .pick-list .av{width:24px;height:24px;border-radius:50%;overflow:hidden;flex-shrink:0;position:relative}
.cg-ed .pick-list small{margin-left:auto;color:var(--faint);font-size:11px}
`;

function Avatar({ c }: { c: Character }) {
  return (
    <span className="av">
      <CroppedBlobImg fileRef={c.thumbId ?? c.arts?.[0]} crop={c.thumbCrop} ph={c.thumbClass} />
    </span>
  );
}

function MemberChips({ g, byId, me }: { g: CharGroup; byId: Map<string, Character>; me?: string }) {
  const shown = g.members.filter(m => byId.has(m.charId));
  if (!shown.length) return <p className="hint" style={{ margin: '0 0 12px' }}>볼 수 있는 멤버가 없어요</p>;
  return (
    <div className="cg-mem">
      {shown.map(m => {
        const c = byId.get(m.charId)!;
        return (
          <Link key={m.charId} href={charPath(c)} className={`cg-chip${m.charId === me ? ' me' : ''}`} title={m.role ? `${c.name} · ${m.role}` : c.name}>
            <Avatar c={c} />
            <b>{c.name}</b>
            {m.role && <small>{m.role}</small>}
          </Link>
        );
      })}
    </div>
  );
}

/* ---------- 편집 창 ---------- */
function GroupEditor({ init, chars, onClose, onSave, onDelete }: {
  init: CharGroup; chars: Character[]; onClose: () => void;
  onSave: (g: CharGroup) => void; onDelete?: () => void;
}) {
  const worlds = useVisibleWorlds();
  const [g, setG] = useState<CharGroup>(init);
  const [q, setQ] = useState('');
  const [pickOpen, setPickOpen] = useState(false);
  const blurT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);   // 칸을 벗어날 때 목록 닫기 (다시 들어오면 취소)
  const [delAsk, setDelAsk] = useState(false);
  const byId = useMemo(() => new Map(chars.map(c => [c.id, c])), [chars]);
  const set = (p: Partial<CharGroup>) => setG(x => ({ ...x, ...p }));
  const inGroup = new Set(g.members.map(m => m.charId));

  // 고를 캐릭터 — 같은 세계관 먼저, 이름 검색
  const cands = useMemo(() => {
    const lq = q.trim().toLowerCase();
    return chars
      .filter(c => !inGroup.has(c.id))
      .filter(c => !lq || c.name.toLowerCase().includes(lq) || (c.sub ?? '').toLowerCase().includes(lq))
      .sort((a, b) => Number(b.worldId === g.worldId && !!g.worldId) - Number(a.worldId === g.worldId && !!g.worldId))
      .slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars, q, g.members, g.worldId]);
  const worldName = (id?: string) => worlds.list.find(w => w.id === id)?.name;

  const add = (id: string) => { set({ members: [...g.members, { charId: id }] }); setQ(''); setPickOpen(false); };   // 고르면 목록을 닫는다 (저장 버튼을 가리지 않게)
  const move = (i: number, d: number) => {
    const m = [...g.members]; const j = i + d;
    if (j < 0 || j >= m.length) return;
    [m[i], m[j]] = [m[j], m[i]]; set({ members: m });
  };
  const ok = g.name.trim().length > 0 && g.members.length > 0;

  return (
    <>
      <Modal open onClose={onClose} title={init.name ? '묶음 편집' : '새 묶음'} dirty
        desc="가족·소속·팀처럼 여러 캐릭터를 한 번에 묶어요 — 자관 목록에는 나오지 않아요"
        actions={<>
          {onDelete && <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => setDelAsk(true)}>삭제</button>}
          <button className="btn btn-ghost" onClick={onClose}>취소</button>
          <button className="btn btn-dark" disabled={!ok} onClick={() => onSave({ ...g, name: g.name.trim(), kind: g.kind?.trim() || undefined,
            members: g.members.map(m => ({ charId: m.charId, ...(m.role?.trim() ? { role: m.role.trim() } : {}) })) })}>저장</button>
        </>}>
        <style>{CSS}</style>
        <div className="cg-ed">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 150px', gap: 10 }}>
            <label><div className="lb">이름</div>
              <KInput value={g.name} placeholder="예: 유씨 가문" maxLength={40} onChange={e => set({ name: e.target.value })} autoFocus /></label>
            <div><div className="lb">공개범위</div>
              <KSelect value={g.visibility} onChange={v => set({ visibility: v as Visibility })} options={VIS_OPTS} minWidth={150} /></div>
          </div>
          <div>
            <div className="lb">종류</div>
            <KInput value={g.kind ?? ''} placeholder="예: 가족" maxLength={16} onChange={e => set({ kind: e.target.value })} />
            <div className="presets">
              {KIND_PRESETS.map(k => <button key={k} type="button" className={g.kind === k ? 'on' : ''} onClick={() => set({ kind: k })}>{k}</button>)}
            </div>
          </div>
          <div>
            <div className="lb">세계관 — 고르면 그 세계관 페이지의 「세계관 관계」에도 나와요</div>
            <KSelect value={g.worldId ?? ''} onChange={v => set({ worldId: v || undefined })} minWidth={220}
              options={[{ value: '', label: '세계관 없음' }, ...worlds.visible.map(w => ({ value: w.id, label: w.name }))]} />
          </div>
          <div>
            <div className="lb">멤버 · {g.members.length} — 역할은 비워도 돼요 (예: 첫째, 단장)</div>
            {g.members.map((m, i) => {
              const c = byId.get(m.charId);
              return (
                <div key={m.charId} className="mrow">
                  {c ? <Avatar c={c} /> : <span className="av" style={{ background: 'rgba(127,127,127,.2)' }} />}
                  <b>{c?.name ?? '(볼 수 없는 캐릭터)'}</b>
                  <KInput value={m.role ?? ''} placeholder="역할" maxLength={20}
                    onChange={e => set({ members: g.members.map((x, k) => (k === i ? { ...x, role: e.target.value } : x)) })} />
                  <button type="button" title="위로" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button type="button" title="빼기" onClick={() => set({ members: g.members.filter((_, k) => k !== i) })}>✕</button>
                </div>
              );
            })}
            <div className="pick" style={{ marginTop: 8 }}>
              <KInput value={q} placeholder="＋ 캐릭터 이름으로 찾아 넣기" onChange={e => { setQ(e.target.value); setPickOpen(true); }}
                onFocus={() => { clearTimeout(blurT.current); setPickOpen(true); }}
                onBlur={() => { blurT.current = setTimeout(() => setPickOpen(false), 150); }} />
              {pickOpen && cands.length > 0 && (
                <div className="pick-list">
                  {cands.map(c => (
                    <button key={c.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => add(c.id)}>
                      <Avatar c={c} /><span>{c.name}</span><small>{worldName(c.worldId) ?? ''}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmModal open={delAsk} title="이 묶음을 삭제할까요?" body="캐릭터는 그대로 두고 묶음만 지워져요."
        onClose={() => setDelAsk(false)}
        buttons={[
          { label: '삭제', kind: 'accent', onClick: () => { setDelAsk(false); onDelete?.(); } },
          { label: '취소', kind: 'ghost', onClick: () => setDelAsk(false) },
        ]} />
    </>
  );
}

/** 편집 창 열기·저장을 묶어 둔 훅 — 캐릭터 상세·세계관 상세가 함께 쓴다 */
function useGroupEditing(chars: Character[]) {
  const { groups, setGroups, loaded } = useCharGroups();
  const [editing, setEditing] = useState<{ g: CharGroup; isNew: boolean } | null>(null);
  const open = (g: CharGroup | null, preset?: Partial<CharGroup>) =>
    setEditing(g ? { g, isNew: false } : { g: { id: newId(), name: '', visibility: 'public', members: [], ...preset }, isNew: true });
  const editor = editing && (
    <GroupEditor init={editing.g} chars={chars} onClose={() => setEditing(null)}
      onSave={g => { setGroups(editing.isNew ? [...groups, g] : groups.map(x => (x.id === g.id ? g : x))); setEditing(null); }}
      onDelete={editing.isNew ? undefined : () => { setGroups(groups.filter(x => x.id !== editing.g.id)); setEditing(null); }} />
  );
  return { groups, loaded, open, editor };
}

/* ---------- 캐릭터 상세 ---------- */
export function CharGroupsBlock({ ch, chars }: { ch: Character; chars: Character[] }) {
  const { isAdmin } = useAuth();
  const { groups, loaded, open, editor } = useGroupEditing(chars);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const byId = useMemo(() => new Map(chars.map(c => [c.id, c])), [chars]);
  const mine = groups.filter(g => g.members.some(m => m.charId === ch.id));
  if (!loaded || (!mine.length && !isAdmin)) return null;
  const toggle = (id: string) => setOpenIds(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="cg-box">
      <style>{CSS}</style>
      <div className="cg-lb">
        <span>관계</span>
        {isAdmin && <button type="button" title="이 캐릭터가 들어간 새 묶음" onClick={() => open(null, { worldId: ch.worldId, members: [{ charId: ch.id }] })}>＋</button>}
      </div>
      {mine.length === 0 && <p className="hint" style={{ margin: 0 }}>가족·소속·팀 같은 묶음을 ＋로 만들 수 있어요 (관리자만 보임)</p>}
      {mine.map(g => {
        const on = openIds.has(g.id);
        const role = g.members.find(m => m.charId === ch.id)?.role;
        const n = g.members.filter(m => byId.has(m.charId)).length;
        return (
          <div key={g.id} className={`cg-row${on ? ' open' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button type="button" className="cg-head" aria-expanded={on} onClick={() => toggle(g.id)}>
                <span className="cg-arrow">▸</span>
                {g.kind && <span className="cg-kind">{g.kind}</span>}
                <span className="cg-name">{g.name}</span>
                {role && <span className="cg-role">· {role}</span>}
                {g.visibility !== 'public' && <span className="cg-lock" title={g.visibility === 'private' ? '나만보기' : '멤버공개'}>🔒</span>}
                <span className="cg-n">{n}명</span>
              </button>
              {isAdmin && on && <button type="button" className="cg-edit" title="묶음 편집" onClick={() => open(g)}>✎</button>}
            </div>
            {on && <MemberChips g={g} byId={byId} me={ch.id} />}
          </div>
        );
      })}
      {editor}
    </div>
  );
}

/* ---------- 세계관 상세 ---------- */
export function WorldGroupsBlock({ worldId, chars, labelStyle }: { worldId: string; chars: Character[]; labelStyle?: React.CSSProperties }) {
  const { isAdmin } = useAuth();
  const { groups, loaded, open, editor } = useGroupEditing(chars);
  const byId = useMemo(() => new Map(chars.map(c => [c.id, c])), [chars]);
  const list = groups.filter(g => g.worldId === worldId);
  if (!loaded || (!list.length && !isAdmin)) return null;
  return (
    <div className="cg-world">
      <style>{CSS}</style>
      <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>세계관 관계 · {list.length}</span>
        {isAdmin && <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11.5, letterSpacing: 0 }} onClick={() => open(null, { worldId })}>＋ 묶음</button>}
      </div>
      {list.length === 0 && <p className="hint">가족·소속·팀처럼 이 세계관 캐릭터들을 묶어 보여 줄 수 있어요 (관리자만 보임)</p>}
      {list.map(g => (
        <div key={g.id} className="cg-card">
          <div className="cg-headline">
            {g.kind && <span className="cg-kind">{g.kind}</span>}
            <b className="cg-name">{g.name}</b>
            {g.visibility !== 'public' && <span className="cg-lock" title={g.visibility === 'private' ? '나만보기' : '멤버공개'}>🔒</span>}
            <span className="cg-n">{g.members.filter(m => byId.has(m.charId)).length}명</span>
            {isAdmin && <button type="button" className="cg-edit" title="묶음 편집" onClick={() => open(g)}>✎</button>}
          </div>
          <MemberChips g={g} byId={byId} />
        </div>
      ))}
      {editor}
    </div>
  );
}
