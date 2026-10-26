'use client';
// 비밀글 잠금 (포크 보안) — 게시판 비밀글·방명록 비밀글의 내용을 서버의 잠긴 표(post_secrets)로 옮긴다.
//
// 왜: 예전 비밀글은 화면에서만 가렸다. 글은 전체공개로 저장돼 있어서 F12·API로 부르면 제목·본문이 그대로 보였다.
// 이제:
//   · 게시판 표·방명록 표에는 「비밀글」 자리만 남는다 (제목 '비밀글', 본문 비움, sealed: true)
//   · 진짜 제목·본문·태그·대표 이미지·접기 설정은 post_secrets에 — 이 표는 누구도 직접 못 읽고
//     서버 함수(secret_read 등)만 꺼내 준다: 관리자 · 작성자 · 비밀번호가 맞는 사람
//   · 게시판 비밀글은 「열람 비밀번호」를 정할 수 있다 — 비우면 관리자·작성자만
//   · 방명록 비밀글은 관리자(와 회원이 쓴 경우 그 회원)만
//   · 비밀글에 달린 댓글·답글은 「나만보기」로 저장 (다른 방문자에게 안 내려감)
//   · 예전에 써 둔 비밀글은 관리자가 게시판·방명록을 열면 한 번 자동으로 옮겨진다
// 표·함수: supabase/secret_posts.sql (한 번 실행). Supabase가 아닐 때(브라우저 저장 등)는 예전처럼 화면에서만 가린다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게 (원작 파일에는 몇 줄만).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { serverConfig } from './serverConfig';
import { isServerMode } from './backend';
import { PageTitle } from '@/components/ui/PageText';
import { KInput } from '@/components/ui/Kit';

export type SecretColl = 'posts' | 'guestbook';
type Row = { id: string; secret?: boolean; sealed?: boolean; secretPass?: boolean; authorId?: string } & Record<string, unknown>;

/** 게시판 글에서 잠글 칸 · 방명록에서 잠글 칸 */
export const SECRET_FIELDS: Record<SecretColl, string[]> = {
  posts: ['title', 'body', 'tags', 'thumbSrc', 'thumbCrop', 'fold', 'comments'],
  guestbook: ['body', 'reply'],
};
/** 잠근 뒤 표에 남는 값 */
const BLANK: Record<SecretColl, Record<string, unknown>> = {
  posts: { title: '비밀글', body: '', tags: [], thumbSrc: undefined, thumbCrop: undefined, fold: null, comments: [] },
  guestbook: { body: '', reply: null },
};

/** 서버 잠금을 쓸 수 있는가 (Supabase 서버 모드) */
export const secretOn = () => isServerMode() && serverConfig()?.kind === 'supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clientP: Promise<any> | null = null;
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const cfg = serverConfig();
  if (!cfg || cfg.kind !== 'supabase') throw new Error('서버 모드가 아니에요');
  // 백엔드와 같은 브라우저 클라이언트(하나만 만들어 나눠 쓴다) — 로그인 상태도 같이 쓴다
  clientP ??= import('@supabase/ssr').then(m => m.createBrowserClient(cfg.url.replace(/\/$/, ''), cfg.anonKey));
  const sb = await clientP;
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// 관리자·작성자 목록용 기억 (30초) — 게시판 목록을 다시 열 때마다 서버에 다시 묻지 않게.
// 잠그기·지우기를 하면 바로 버린다.
const MINE_TTL = 30_000;
let mineCache: { key: string; at: number; p: Promise<Map<string, Record<string, unknown>>> } | null = null;
const forgetMine = () => { mineCache = null; };

/** 잠그기 — pass: null이면 비밀번호 그대로 · ''이면 없앰 · 그 밖은 새 비밀번호 */
export async function saveSecret(coll: SecretColl, id: string, payload: Record<string, unknown>, pass: string | null, authorId: string | null) {
  forgetMine();
  await rpc('secret_save', { p_id: id, p_coll: coll, p_payload: payload, p_pass: pass, p_author: authorId || null });
}
/** 꺼내기 — 볼 수 없으면 null */
export async function readSecret(id: string, pass?: string): Promise<Record<string, unknown> | null> {
  return rpc('secret_read', { p_id: id, p_pass: pass ?? null });
}
/** 내가(관리자·작성자) 볼 수 있는 것 한꺼번에 */
export async function readMine(ids: string[]): Promise<Map<string, Record<string, unknown>>> {
  if (!ids.length) return new Map();
  const key = [...ids].sort().join(',');
  if (mineCache && mineCache.key === key && Date.now() - mineCache.at < MINE_TTL) return mineCache.p;
  const p = rpc<{ id: string; payload: Record<string, unknown> }[]>('secret_read_mine', { p_ids: ids })
    .then(rows => new Map((rows ?? []).map(r => [r.id, r.payload] as [string, Record<string, unknown>])));
  mineCache = { key, at: Date.now(), p };
  p.catch(() => { if (mineCache?.p === p) mineCache = null; });
  return p;
}
export async function deleteSecret(id: string) {
  if (!secretOn()) return;
  forgetMine();
  try { await rpc('secret_delete', { p_id: id }); } catch { /* 없으면 그만 */ }
}

const pick = (row: Row, keys: string[]) => {
  const out: Record<string, unknown> = {};
  keys.forEach(k => { if (row[k] !== undefined) out[k] = row[k]; });
  return out;
};

/**
 * 저장 직전에 부른다 — 비밀글이면 내용을 잠긴 표로 보내고, 표에 남길 「빈 자리」를 돌려준다.
 * 비밀글이 아니면(또는 서버 잠금을 못 쓰면) 그대로 돌려준다.
 * pass: 게시판 열람 비밀번호 (null = 그대로 · '' = 없음)
 */
export async function sealRow<T>(coll: SecretColl, row: T, pass: string | null, hadPass = false): Promise<T> {
  const r = row as unknown as Row;
  if (!r.secret || !secretOn()) return row;
  await saveSecret(coll, r.id, pick(r, SECRET_FIELDS[coll]), pass, (r.authorId as string) || null);
  const secretPass = coll === 'posts' ? (pass === null ? hadPass : pass !== '') : undefined;
  return { ...r, ...BLANK[coll], sealed: true, ...(secretPass !== undefined ? { secretPass } : {}) } as unknown as T;
}

/** 목록용 — 내가 볼 수 있는 잠긴 글은 진짜 내용으로 채워서 돌려준다 (관리자·작성자) */
export function useRevealSecrets<T>(rows: T[], canSee: (row: T) => boolean): T[] {
  const sealedIds = (rows as unknown as Row[]).filter(r => r.secret && r.sealed && canSee(r as unknown as T)).map(r => r.id);
  const key = sealedIds.join(',');
  const [map, setMap] = useState<Map<string, Record<string, unknown>>>(new Map());
  useEffect(() => {
    if (!key || !secretOn()) return;
    let alive = true;
    readMine(key.split(',')).then(m => { if (alive) setMap(m); }).catch(() => { /* 그대로 비밀글 */ });
    return () => { alive = false; };
  }, [key]);
  return useMemo(() => (map.size
    ? rows.map(r => { const p = map.get((r as unknown as Row).id); return p ? ({ ...r, ...p } as T) : r; })
    : rows), [rows, map]);
}

/* ---------- 게시판 상세 — 잠긴 글 열기 ---------- */

const GATE_CSS = `
.sp-gate{max-width:420px;margin:30px auto;padding:30px 26px;text-align:center;display:grid;gap:12px}
.sp-gate .ic{font-size:26px}
.sp-gate b{font-size:15px}
.sp-gate p{margin:0;font-size:12.5px;color:var(--faint)}
.sp-gate form{display:flex;gap:8px;margin-top:4px}
.sp-gate .k-input{flex:1;min-width:0}
.sp-gate .err{color:#c0392b;font-size:12px}
`;

/**
 * 게시판 상세에서 부른다 — 비밀글이면 볼 수 있는 사람에게만 내용을 채운 글을 돌려주고,
 * 아직 못 보면 gate(비밀번호 입력 · 안내 화면)를 돌려준다. gate가 있으면 그걸 그린다.
 */
export function useSecretPost<T extends { id: string; secret: boolean; authorId?: string }>(
  raw: T | undefined, isAdmin: boolean, uid: string | undefined, title = 'BOARD',
): { post: T | undefined; gate: React.ReactNode } {
  const r = raw as unknown as Row | undefined;
  const isAuthor = !!r?.authorId && r.authorId === uid;
  const sealed = !!(r?.secret && r.sealed && secretOn());
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'locked' | 'denied' | 'open'>('idle');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const opened = useRef<string | null>(null);

  useEffect(() => {
    setPayload(null); setErr(''); setPw('');
    if (!r || !sealed) { setState('idle'); return; }
    if (isAdmin || isAuthor) {
      setState('loading');
      readSecret(r.id).then(p => { setPayload(p); setState(p ? 'open' : 'denied'); opened.current = r.id; })
        .catch(() => setState('denied'));
    } else setState(r.secretPass ? 'locked' : 'denied');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.id, sealed, isAdmin, isAuthor, r?.secretPass]);

  const post = useMemo(() => (raw && payload ? ({ ...raw, ...payload } as T) : raw), [raw, payload]);

  if (!r || !r.secret) return { post, gate: null };
  // 서버 잠금 전(예전 글) · 브라우저 저장 — 예전처럼 화면에서만 가린다
  if (!sealed) {
    if (isAdmin || isAuthor) return { post, gate: null };
    return { post, gate: <Gate title={title} kind="denied" /> };
  }
  if (state === 'open') return { post, gate: null };
  if (state === 'locked') {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!pw.trim() || busy) return;
      setBusy(true); setErr('');
      try {
        const p = await readSecret(r.id, pw.trim());
        if (p) { setPayload(p); setState('open'); } else setErr('비밀번호가 맞지 않아요');
      } catch { setErr('열지 못했어요 — 잠시 뒤 다시 시도해 주세요'); }
      finally { setBusy(false); }
    };
    return {
      post,
      gate: (
        <Gate title={title} kind="locked">
          <form onSubmit={submit}>
            <KInput type="password" value={pw} placeholder="비밀번호" autoFocus onChange={e => setPw(e.target.value)} />
            <button className="btn btn-dark" disabled={busy}>{busy ? '…' : '열기'}</button>
          </form>
          {err && <div className="err">{err}</div>}
        </Gate>
      ),
    };
  }
  if (state === 'denied') return { post, gate: <Gate title={title} kind="denied" /> };
  return { post, gate: <section className="page" /> };   // 불러오는 중
}

function Gate({ title, kind, children }: { title: string; kind: 'locked' | 'denied'; children?: React.ReactNode }) {
  return (
    <section className="page">
      <style>{GATE_CSS}</style>
      <div className="page-head"><PageTitle>{title}</PageTitle></div>
      <div className="panel sp-gate">
        <div className="ic">🔒</div>
        <b>비밀글</b>
        <p>{kind === 'locked' ? '비밀번호를 입력하면 볼 수 있어요' : '작성자와 관리자만 열람할 수 있습니다'}</p>
        {children}
      </div>
    </section>
  );
}

/* ---------- 예전 비밀글 옮기기 (관리자가 게시판·방명록을 열면 한 번) ---------- */

const done = new Set<SecretColl>();

/**
 * 아직 잠기지 않은 예전 비밀글을 잠긴 표로 옮기고, 딸린 댓글·답글을 「나만보기」로 바꾼다.
 * 관리자만 · 세션당 한 번 · 하나라도 실패하면 그 글은 그대로 둔다(내용을 잃지 않게).
 */
export function useSecretMigration<T, C extends { target: string; targetId: string }>(
  coll: SecretColl, isAdmin: boolean, loaded: boolean,
  rows: T[], setRows: (next: T[]) => void,
  cmtRows: C[], setCmtRows: (next: C[]) => void, cmtTarget: string,
) {
  useEffect(() => {
    if (!isAdmin || !loaded || done.has(coll) || !secretOn()) return;
    const old = (rows as unknown as Row[]).filter(r => r.secret && !r.sealed);
    const secretIds = new Set((rows as unknown as Row[]).filter(r => r.secret).map(r => r.id));
    const openCmts = cmtRows.filter(c => c.target === cmtTarget && secretIds.has(c.targetId)
      && (c as unknown as Row).visibility !== 'private');
    if (!old.length && !openCmts.length) { done.add(coll); return; }
    done.add(coll);
    (async () => {
      const moved = new Map<string, T>();
      for (const r of old) {
        try { moved.set(r.id, await sealRow(coll, r as unknown as T, '', false)); }
        catch (e) { console.warn('[ohome] 비밀글 옮기기 실패 — 그대로 둠', r.id, e); }
      }
      if (moved.size) setRows(rows.map(r => moved.get((r as unknown as Row).id) ?? r));
      if (openCmts.length) {
        const ids = new Set(openCmts.map(c => (c as unknown as Row).id));
        setCmtRows(cmtRows.map(c => (ids.has((c as unknown as Row).id) ? ({ ...c, visibility: 'private' } as C) : c)));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, loaded, rows.length, cmtRows.length]);
}

/** 비밀글에 다는 댓글·답글은 나만보기로 (작성자·관리자만 내려받는다) */
export const privateIfSecret = <C,>(c: C, secret: boolean): C => (secret ? ({ ...c, visibility: 'private' } as C) : c);
