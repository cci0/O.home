'use client';
// 환경설정 「태그 관리」 탭 (v2.0 사용자 요청)
//  1) 태그 목록 — 이름 바꾸기 · 합치기 · 삭제 · 색 지정 (캐릭터·자관·TRPG 로그·갤러리·플레이기록·도토리·게시판 전체에 한 번에 적용)
//  2) 여러 항목에 태그 일괄 추가/제거
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
//
// 목록은 useLocalList를 쓰지 않고 한 번 읽어 직접 저장한다 (lib/rawList) — 서버 모드의 useLocalList는
// 목록마다 실시간 구독을 여는데, 같은 목록을 쓰는 곳과 겹치면 Supabase가 오류를 내며 화면이 안 열린다.
import React, { useMemo, useState } from 'react';
import { KInput, KCheck } from '@/components/ui/Kit';
import { TagInput } from '@/components/ui/TagInput';
import { useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useRawList, runTags, uniq, type RawList, type Tagged } from '@/lib/rawList';
import { CHAR_SEED, REL_SEED, type Character, type Relation } from '@/lib/charStore';
import { TRPG_SEED, BACKUP_SEED, PLAYLOG_SEED, DOTORI_SEED, type TrpgLog, type BackupPost, type PlayRecord, type DotoriItem } from '@/lib/galleryStore';
import { BOARD_SEED, type Post } from '@/lib/postStore';
import { parseTags } from '@/lib/tagUtil';
import { useTagColors, TAG_PALETTE } from '@/lib/tagColors';

type Kind = 'chars' | 'rels' | 'trpg' | 'gallery' | 'playlog' | 'dotori' | 'board';
const KINDS: Kind[] = ['chars', 'rels', 'trpg', 'gallery', 'playlog', 'dotori', 'board'];
const KIND_LABEL: Record<Kind, string> = {
  chars: '캐릭터', rels: '자관', trpg: '로그', gallery: '갤러리', playlog: '플레이기록', dotori: '도토리', board: '게시판',
};
const KIND_SHORT: Record<Kind, string> = {
  chars: '캐릭터', rels: '자관', trpg: 'TRPG', gallery: '갤러리', playlog: '기록', dotori: '도토리', board: '게시판',
};

export function TagPane() {
  const toast = useToast();
  const del = useConfirmDelete();
  const [colors, setColor, moveColor] = useTagColors();
  const chars = useRawList<Character>('ohome.chars.v1', CHAR_SEED);
  const rels = useRawList<Relation>('ohome.rels.v1', REL_SEED);
  const logs = useRawList<TrpgLog>('ohome.trpg.v1', TRPG_SEED);
  const posts = useRawList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  const records = useRawList<PlayRecord>('ohome.playlog.v1', PLAYLOG_SEED);
  const dotori = useRawList<DotoriItem>('ohome.dotori.v1', DOTORI_SEED);
  const board = useRawList<Post>('ohome.board.v1', BOARD_SEED);
  const lists: Record<Kind, RawList<Tagged>> = {
    chars: chars as unknown as RawList<Tagged>, rels: rels as unknown as RawList<Tagged>,
    trpg: logs as unknown as RawList<Tagged>, gallery: posts as unknown as RawList<Tagged>,
    playlog: records as unknown as RawList<Tagged>, dotori: dotori as unknown as RawList<Tagged>,
    board: board as unknown as RawList<Tagged>,
  };
  const ready = KINDS.every(k => lists[k].loaded);
  const [busy, setBusy] = useState(false);

  /* ---------- 1) 태그 목록 ---------- */
  const rows = useMemo(() => {
    const m = new Map<string, Record<Kind, number>>();
    const zero = () => Object.fromEntries(KINDS.map(k => [k, 0])) as Record<Kind, number>;
    KINDS.forEach(k => lists[k].list.forEach(it => (it.tags ?? []).forEach(t => {
      const r = m.get(t) ?? zero();
      r[k]++; m.set(t, r);
    })));
    return [...m.entries()]
      .map(([tag, c]) => ({ tag, c, total: KINDS.reduce((a, k) => a + c[k], 0) }))
      .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars.list, rels.list, logs.list, posts.list, records.list, dotori.list, board.list]);

  const all = async (fn: (tags: string[]) => string[]) => {
    let n = 0;
    for (const k of KINDS) n += await runTags(lists[k], fn);
    return n;
  };
  const guard = async (job: () => Promise<string>) => {
    if (!ready || busy) return;
    setBusy(true);
    try { toast(await job()); }
    catch (e) { toast(`저장하지 못했습니다 — ${e instanceof Error ? e.message : '다시 시도해 주세요'}`); }
    finally { setBusy(false); }
  };

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const startEdit = (t: string) => { setEditing(t); setDraft(t); };
  const doRename = (oldTag: string, nu: string[]) => guard(async () => {
    const n = await all(tags => uniq(tags.flatMap(t => (t === oldTag ? nu : [t]))));
    if (nu.length === 1) moveColor(oldTag, nu[0]); else setColor(oldTag, null);   // 색도 따라간다
    setEditing(null);
    return `「${oldTag}」→ ${nu.map(t => `#${t}`).join(' ')} · ${n}개 항목에 적용했습니다`;
  });
  const applyRename = (oldTag: string) => {
    const nu = parseTags(draft);
    if (nu.length === 0 || (nu.length === 1 && nu[0] === oldTag)) { setEditing(null); return; }
    const exists = nu.filter(t => t !== oldTag && rows.some(r => r.tag === t));
    if (exists.length > 0) {
      del.ask('태그를 합칠까요?', () => void doRename(oldTag, nu),
        `「${oldTag}」가 이미 있는 ${exists.map(t => `「${t}」`).join(' ')}와(과) 합쳐집니다.`, '합치기');
    } else void doRename(oldTag, nu);
  };
  const askDelete = (tag: string) => del.ask(`「${tag}」 태그를 지울까요?`, () => void guard(async () => {
    const n = await all(tags => tags.filter(t => t !== tag));
    setColor(tag, null);
    return `「${tag}」 태그를 ${n}개 항목에서 지웠습니다`;
  }), '이 태그가 달린 모든 항목에서 태그만 지워집니다. 항목 자체는 그대로입니다.');

  /* ---------- 2) 일괄 추가/제거 ---------- */
  const [kind, setKind] = useState<Kind>('chars');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState('');
  const items = useMemo(() => {
    const src: { id: string; label: string; tags: string[] }[] =
      kind === 'chars' ? chars.list.map(c => ({ id: c.id, label: c.name + (c.own ? '' : ' (상대)'), tags: c.tags ?? [] }))
      : kind === 'rels' ? rels.list.map(r => ({ id: r.id, label: r.name, tags: r.tags ?? [] }))
      : kind === 'trpg' ? logs.list.map(l => ({ id: l.id, label: l.title, tags: l.tags ?? [] }))
      : kind === 'gallery' ? posts.list.map(p => ({ id: p.id, label: p.title, tags: p.tags ?? [] }))
      : kind === 'playlog' ? records.list.map(r => ({ id: r.id, label: r.scenario, tags: r.tags ?? [] }))
      : kind === 'dotori' ? dotori.list.map(d => ({ id: d.id, label: d.name, tags: d.tags ?? [] }))
      : board.list.map(p => ({ id: p.id, label: p.title, tags: p.tags ?? [] }));
    const k = q.trim().toLowerCase();
    return k ? src.filter(i => i.label.toLowerCase().includes(k) || i.tags.some(t => t.toLowerCase().includes(k))) : src;
  }, [kind, q, chars.list, rels.list, logs.list, posts.list, records.list, dotori.list, board.list]);
  const bulkTags = parseTags(bulk);
  const togglePick = (id: string) => setPicked(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allPicked = items.length > 0 && items.every(i => picked.has(i.id));
  const pickAll = () => setPicked(s => {
    const n = new Set(s);
    if (allPicked) items.forEach(i => n.delete(i.id)); else items.forEach(i => n.add(i.id));
    return n;
  });
  const applyBulk = (mode: 'add' | 'remove') => guard(async () => {
    const fn = mode === 'add'
      ? (tags: string[]) => uniq([...tags, ...bulkTags])
      : (tags: string[]) => tags.filter(t => !bulkTags.includes(t));
    const n = await runTags(lists[kind], fn, picked);   // id·tags만 만지고 나머지 필드는 그대로 보존
    return n > 0
      ? `${KIND_LABEL[kind]} ${n}개에서 ${bulkTags.map(t => `#${t}`).join(' ')} ${mode === 'add' ? '추가' : '제거'}했습니다`
      : '바뀐 항목이 없습니다';
  });
  const pickedHere = items.filter(i => picked.has(i.id)).length;

  const btn: React.CSSProperties = { height: 32, padding: '0 12px', fontSize: 11 };
  const swatch = (c: string | null, on: boolean, tag: string) => (
    <button key={c ?? 'none'} onClick={() => setColor(tag, c)} data-tip={c ? undefined : '색 없음'}
      style={{
        width: 16, height: 16, padding: 0, borderRadius: 3, cursor: 'var(--cur-pointer,pointer)',
        background: c ?? 'transparent', border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
        fontSize: 9, lineHeight: '12px', color: 'var(--faint)',
      }}>{c ? '' : '✕'}</button>
  );

  return (
    <div>
      {del.element}
      <div className="set-sec">
        <h3>태그 관리</h3>
        <div className="d">
          캐릭터·자관·로그·갤러리·플레이기록·도토리·게시판에 단 태그를 한곳에서 정리합니다. 오타로 갈라진 태그를 합치거나, 이름을 바꾸거나, 안 쓰는 태그를 지우거나, 태그마다 색을 줄 수 있어요.
          항목 자체는 건드리지 않고 태그만 바뀝니다.
        </div>
        {!ready && <div className="d">불러오는 중…</div>}
        {ready && rows.length === 0 && <div className="d">아직 단 태그가 없습니다.</div>}
        {rows.map(({ tag, c, total }) => (
          <div className="set-row" key={tag}>
            <div className="l" style={{ minWidth: 0 }}>
              {editing === tag ? (
                <KInput value={draft} onChange={e => setDraft(e.target.value)} placeholder="새 이름 (쉼표로 여러 개로 나눌 수 있어요)"
                  style={{ width: 280 }} />
              ) : (
                <>
                  <b style={colors[tag] ? { color: colors[tag] } : undefined}>#{tag}</b>
                  <small>
                    {KINDS.filter(k => c[k] > 0).map(k => `${KIND_SHORT[k]} ${c[k]}`).join(' · ')} (총 {total})
                  </small>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center' }}>
                    {TAG_PALETTE.map(p => swatch(p, colors[tag] === p, tag))}
                    {colors[tag] && swatch(null, false, tag)}
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {editing === tag ? (
                <>
                  <button className="btn btn-dark" style={btn} disabled={busy} onClick={() => applyRename(tag)}>적용</button>
                  <button className="btn btn-ghost" style={btn} onClick={() => setEditing(null)}>취소</button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost" style={btn} disabled={busy} onClick={() => startEdit(tag)}>이름 바꾸기</button>
                  <button className="btn btn-ghost" style={btn} disabled={busy} onClick={() => askDelete(tag)}>삭제</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="set-sec">
        <h3>일괄 추가 / 제거</h3>
        <div className="d">종류를 고르고 항목을 체크한 뒤, 태그를 적어 한 번에 달거나 뺄 수 있어요. 이미 올린 글에 태그를 달 때 편합니다.</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {KINDS.map(k => (
            <button key={k} className={`btn ${kind === k ? 'btn-dark' : 'btn-ghost'}`} style={btn}
              onClick={() => { setKind(k); setPicked(new Set()); setQ(''); }}>{KIND_LABEL[k]}</button>
          ))}
        </div>
        <KInput value={q} onChange={e => setQ(e.target.value)} placeholder="이름·제목·태그로 찾기" style={{ marginBottom: 8 }} />
        <div style={{ margin: '4px 0 8px' }}>
          <KCheck label={`보이는 항목 전체 선택 (${pickedHere}/${items.length})`} checked={allPicked} onChange={pickAll} />
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--line)', padding: '4px 12px', marginBottom: 12 }}>
          {items.length === 0 && <div className="d" style={{ margin: '10px 0' }}>항목이 없습니다.</div>}
          {items.map(i => (
            <div key={i.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
              <KCheck checked={picked.has(i.id)} onChange={() => togglePick(i.id)}
                label={<>{i.label}{i.tags.length > 0 && <small style={{ color: 'var(--faint)', marginLeft: 8 }}>{i.tags.map(t => `#${t}`).join(' ')}</small>}</>} />
            </div>
          ))}
        </div>
        <TagInput value={bulk} onChange={setBulk} placeholder="달거나 뺄 태그 (쉼표로 구분)" />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn btn-dark" style={btn} disabled={busy || !ready || picked.size === 0 || bulkTags.length === 0}
            onClick={() => void applyBulk('add')}>선택한 항목에 태그 추가</button>
          <button className="btn btn-ghost" style={btn} disabled={busy || !ready || picked.size === 0 || bulkTags.length === 0}
            onClick={() => void applyBulk('remove')}>선택한 항목에서 태그 제거</button>
        </div>
      </div>
    </div>
  );
}
