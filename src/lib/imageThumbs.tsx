'use client';
// 작은 썸네일 (포크 최적화) — 목록·위젯처럼 그림이 작게 보이는 곳에서도 원본(긴 변 2560px, 장당 수백 KB)을
// 통째로 받아 와서 Supabase 무료 요금제의 전송량(Cached Egress)을 크게 먹었다 (2026-10 한도 초과).
//   · 그림을 올릴 때 긴 변 THUMB_SIDE px의 작은 판(WebP, 장당 수십 KB)을 저장소 t/ 폴더에 하나 더 올린다
//     (원본 이름.jpg → t/원본 이름.webp — 주소만으로 짝을 찾으므로 데이터는 바꾸지 않는다)
//   · 표시(CropEditor의 CropImg)는 칸이 작으면 작은 판을, 크면(상세 큰 그림 등) 원본을 쓴다.
//     작은 판이 없으면(이 기능 전에 올린 그림) 알아서 원본으로 돌아간다
//   · 이미 올린 그림은 환경설정 > 메뉴 관리 > 권한 「업로드 이미지 자동 축소」 아래
//     「이미 올린 이미지에 작은 썸네일 만들기」로 한 번에 만든다
//   · 원본을 지우면 작은 판도 같이 지운다 (supabaseBackend deleteFile)
//   · GIF(움짤)·SVG는 작은 판을 만들지 않는다 (원본 그대로)
// Supabase 서버 모드에서만 동작한다 (다른 모드는 지금과 똑같이 원본).
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serverConfig } from './serverConfig';
import { backend, isServerMode } from './backend';
import { dumpAll, collectRefs } from './transfer';
import { decode, toBlob } from './imageShrink';
import { Modal } from '@/components/ui/Modal';
import { THUMB_SIDE, thumbPathOf } from './thumbUrl';
export { THUMB_SIDE, thumbPathOf, thumbUrlOf, markThumbMissing } from './thumbUrl';
const BUCKET = 'ohome';
const DIR = 't';   // thumbUrl.ts와 같은 폴더

/** 작은 판 만들기 — 실패하면 null (올리기는 막지 않는다) */
export async function makeThumb(blob: Blob): Promise<Blob | null> {
  try {
    const t = (blob.type || '').toLowerCase();
    if (t && !/^image\/(jpeg|jpg|png|webp)$/.test(t)) return null;
    const d = await decode(blob);
    if (!d || !d.w || !d.h) return null;
    const scale = Math.min(1, THUMB_SIDE / Math.max(d.w, d.h));
    const w = Math.max(1, Math.round(d.w * scale));
    const h = Math.max(1, Math.round(d.h * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) { d.done(); return null; }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(d.img, 0, 0, w, h);
    d.done();
    let out = await toBlob(c, 'image/webp', 0.82);
    if (out && out.type !== 'image/webp') out = await toBlob(c, 'image/png', 1);   // WebP를 못 만드는 브라우저
    c.width = 0; c.height = 0;
    return out;
  } catch { return null; }
}

/** 원본을 올린 직후 작은 판도 올린다 (supabaseBackend uploadFile에서 부름) — 실패는 조용히 넘긴다 */
export async function putThumb(sb: SupabaseClient, mainPath: string, blob: Blob): Promise<void> {
  const p = thumbPathOf(mainPath);
  if (!p) return;
  const t = await makeThumb(blob);
  if (!t) return;
  await sb.storage.from(BUCKET).upload(p, t, { contentType: t.type, cacheControl: '31536000', upsert: true });
}

/** 원본을 지울 때 작은 판도 (supabaseBackend deleteFile에서 부름) */
export async function removeThumb(sb: SupabaseClient, mainName: string): Promise<void> {
  const p = thumbPathOf(mainName);
  if (p) await sb.storage.from(BUCKET).remove([p]);
}

/* ---------- 이미 올린 그림에 작은 판 만들기 (관리자 도구) ---------- */

let clientP: Promise<SupabaseClient> | null = null;
function client(): Promise<SupabaseClient> {
  const cfg = serverConfig();
  if (!cfg || cfg.kind !== 'supabase') return Promise.reject(new Error('Supabase 서버 모드에서만 쓸 수 있어요'));
  clientP ??= import('@supabase/ssr').then(m => m.createBrowserClient(cfg.url.replace(/\/$/, ''), cfg.anonKey) as unknown as SupabaseClient);
  return clientP;
}

async function listDir(sb: SupabaseClient, dir: string): Promise<{ name: string; size: number }[]> {
  const out: { name: string; size: number }[] = [];
  const PAGE = 100;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb.storage.from(BUCKET).list(dir, { limit: PAGE, offset });
    if (error) throw error;
    const rows = data ?? [];
    rows.filter(f => f.id).forEach(f => out.push({ name: f.name, size: (f.metadata as { size?: number } | null)?.size ?? 0 }));
    if (rows.length < PAGE) break;
  }
  return out;
}

interface Cand { name: string; size: number; url: string }

/** 작은 판이 없는 그림 찾기 — 사이트에서 실제로 쓰는 그림만 (안 쓰는 파일까지 받으면 전송량 낭비) */
async function scanThumbs(): Promise<{ cands: Cand[]; have: number; unused: number }> {
  const sb = await client();
  const be = backend();
  if (!be) throw new Error('서버 모드에서만 쓸 수 있어요');
  const snap = await dumpAll(be);
  if (snap.failed?.length) throw new Error(`${snap.failed.join(', ')}을(를) 읽지 못해 멈췄어요 — 잠시 뒤 다시 시도해 주세요`);
  const [files, thumbs] = await Promise.all([listDir(sb, ''), listDir(sb, DIR)]);
  const have = new Set(thumbs.map(t => `${DIR}/${t.name}`));
  const urlOf = (name: string) => sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  const known = new Set(files.map(f => urlOf(f.name)));
  const used = new Set<string>();
  Object.values(snap.collections).forEach(rows => collectRefs(rows, known, used));
  collectRefs(snap.settings, known, used);
  collectRefs(snap.members ?? [], known, used);
  const cands: Cand[] = [];
  let haveN = 0, unused = 0;
  for (const f of files) {
    const p = thumbPathOf(f.name);
    if (!p) continue;
    if (have.has(p)) { haveN++; continue; }
    const url = urlOf(f.name);
    if (!used.has(url)) { unused++; continue; }
    cands.push({ name: f.name, size: f.size, url });
  }
  return { cands, have: haveN, unused };
}

async function runThumbs(cands: Cand[], onProgress: (i: number, n: number) => void): Promise<{ done: number; failed: number; bytes: number }> {
  const sb = await client();
  const r = { done: 0, failed: 0, bytes: 0 };
  let i = 0;
  for (const c of cands) {
    i += 1; onProgress(i, cands.length);
    try {
      const res = await fetch(c.url);
      if (!res.ok) { r.failed++; continue; }
      const blob = await res.blob();
      const t = await makeThumb(blob);
      if (!t) { r.failed++; continue; }
      const p = thumbPathOf(c.name)!;
      const { error } = await sb.storage.from(BUCKET).upload(p, t, { contentType: t.type, cacheControl: '31536000', upsert: true });
      if (error) { r.failed++; continue; }
      r.done++; r.bytes += t.size;
    } catch { r.failed++; }
  }
  return r;
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

export function ThumbExisting() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'scan' | 'ready' | 'run' | 'done' | 'error'>('idle');
  const [scan, setScan] = useState<{ cands: Cand[]; have: number; unused: number } | null>(null);
  const [prog, setProg] = useState({ i: 0, n: 0 });
  const [res, setRes] = useState<{ done: number; failed: number; bytes: number } | null>(null);
  const [err, setErr] = useState('');
  if (!isServerMode() || serverConfig()?.kind !== 'supabase') return null;

  const doScan = async () => {
    setPhase('scan'); setErr(''); setScan(null); setRes(null);
    try { setScan(await scanThumbs()); setPhase('ready'); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); setPhase('error'); }
  };
  const doRun = async () => {
    if (!scan) return;
    setPhase('run');
    try { setRes(await runThumbs(scan.cands, (i, n) => setProg({ i, n }))); setPhase('done'); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); setPhase('error'); }
  };
  const total = scan?.cands.reduce((s, c) => s + c.size, 0) ?? 0;

  return (
    <div style={{ marginTop: 10 }}>
      <button className="btn btn-ghost" onClick={() => { setOpen(true); if (phase !== 'run' && phase !== 'ready') void doScan(); }}>
        이미 올린 이미지에 작은 썸네일 만들기…
      </button>
      <Modal open={open} onClose={() => { if (phase !== 'run') setOpen(false); }} title="작은 썸네일 만들기"
        desc={`목록·위젯처럼 작게 보이는 곳은 긴 변 ${THUMB_SIDE}px 작은 판을 받아요 — 새로 올리는 그림은 저절로 만들어지고, 이 기능 전에 올린 그림만 여기서 한 번 만들면 돼요`}
        actions={<>
          {phase !== 'run' && <button className="btn btn-ghost" onClick={() => setOpen(false)}>닫기</button>}
          {phase === 'ready' && !!scan?.cands.length && <button className="btn btn-dark" onClick={() => void doRun()}>{scan.cands.length}장 만들기</button>}
        </>}>
        {phase === 'scan' && <p className="hint">사이트에서 쓰는 그림을 찾는 중…</p>}
        {phase === 'error' && <p className="hint" style={{ color: '#c0392b' }}>{err}</p>}
        {phase === 'ready' && scan && (
          scan.cands.length === 0
            ? <p className="hint">만들 그림이 없어요 — 이미 다 있어요 (작은 판 {scan.have}장).</p>
            : <div style={{ display: 'grid', gap: 6, fontSize: 13, lineHeight: 1.6 }}>
                <b>작은 판이 없는 그림 {scan.cands.length}장 · 원본 합계 {mb(total)}</b>
                <span className="hint" style={{ margin: 0 }}>
                  원본을 한 번씩 내려받아 만드느라 전송량이 약 {mb(total)} 들어요 (한 번만).
                  이미 있는 것 {scan.have}장{scan.unused ? ` · 안 쓰는 파일 ${scan.unused}장은 건너뜀` : ''} · GIF는 원본 그대로.
                  끝날 때까지 이 창을 닫지 마세요.
                </span>
              </div>
        )}
        {phase === 'run' && <p className="hint" style={{ margin: 0 }}>만드는 중 {prog.i} / {prog.n} — 창을 닫지 마세요</p>}
        {phase === 'done' && res && (
          <p className="hint" style={{ margin: 0 }}>
            {res.done}장 만들었어요 (작은 판 합계 {mb(res.bytes)}){res.failed ? ` · 실패 ${res.failed}장 — 그 그림은 원본으로 보여요` : ''}.
            새로고침하면 목록부터 작은 판으로 보여요.
          </p>
        )}
      </Modal>
    </div>
  );
}
