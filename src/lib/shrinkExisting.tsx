'use client';
// 이미 올린 이미지 줄이기 (포크 최적화) — 자동 축소(30번)가 생기기 전에 원본 그대로 올라간 큰 이미지를
// 관리자가 한 번에 줄인다. 환경설정 > 메뉴 관리 > 권한 「업로드 이미지 자동 축소」 아래 버튼.
//
// 안전하게:
//   · **원본을 덮어쓰지 않는다** — 줄인 이미지를 새 파일로 올리고, 데이터 안의 주소만 새 파일로 바꾼다
//     (백업·DB 이전과 같은 엔진: lib/transfer의 dumpAll · collectRefs · replaceRefs)
//   · 원본 파일은 저장소에 그대로 남는다 → 확인한 뒤 「데이터 백업 > 쓰지 않는 이미지 정리」로 지우면
//     그때 저장 공간이 준다. 중간에 멈춰도 원본이 남아 있어 깨지지 않는다
//   · 한 곳이라도 못 읽으면 시작하지 않는다 (못 읽은 곳의 주소를 못 바꾸므로)
// 대상: 쓰이고 있는 JPG·PNG·WebP 중 1.2MB 이상. 그대로 두는 것:
//   · 갤러리(그림 백업)가 쓰는 이미지 (자동 축소의 「갤러리도 축소」를 켜면 포함)
//   · GIF·SVG 등 · 작은 이미지 · 줄여도 별로 안 작아지는 이미지 · 회원 프로필 사진 · 아무도 안 쓰는 파일
// 줄이는 기준은 업로드 자동 축소와 같다 — 긴 변 2560px, JPG는 JPG, PNG·WebP는 WebP.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useEffect, useState } from 'react';
import { backend } from './backend';
import { syncList } from './db';
import { currentUserId } from './currentUser';
import { dumpAll, collectRefs, replaceRefs, type Snapshot } from './transfer';
import { isLocalOnlySetting } from './settingStore';
import { shrinkCore, extOfType } from './imageShrink';
import { Modal } from '@/components/ui/Modal';

const MIN_SIZE = 1.2 * 1024 * 1024;
const OK_EXT = /\.(jpe?g|png|webp)(?:\?|$)/i;
const typeOfRef = (ref: string) => {
  const m = ref.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]?.toLowerCase();
  return m === 'png' ? 'image/png' : m === 'webp' ? 'image/webp' : m === 'jpg' || m === 'jpeg' ? 'image/jpeg' : '';
};
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(n >= 100 * 1024 * 1024 ? 0 : 1)}MB`;

// 컬렉션 → 보기 좋은 이름 (목록에 「어디서 쓰는지」 표시용)
const COLL_NAME: Record<string, string> = {
  characters: '캐릭터', relations: '자관', worlds: '세계관', trpg_logs: '로그', trpg_log_bodies: '로그 본문', trpg_chars: 'TRPG 캐릭터',
  posts: '게시판', guestbook: '방명록', gallery: '갤러리', roadview: '로드뷰', dotori: '도토리', playlog: '플레이기록',
  rp_rooms: '역극', threads: '감상타래', diary: '다이어리', memos: '메모', commissions: '커미션', applicants: '신청자',
  widgets: '위젯', char_templates: '양식', char_groups: '묶음',
};

export interface Cand { ref: string; size: number; where: string[] }
export interface ScanResult {
  cands: Cand[];
  skipped: { gallery: number; small: number; type: number; unused: number; member: number };
}

// 찾기에서 읽은 데이터를 잠깐 기억해 실행 때 다시 읽지 않는다 (전체를 두 번 받지 않게 · 2분 안이면)
let lastSnap: { at: number; snap: Snapshot } | null = null;

async function snapshot(reuse = false): Promise<Snapshot> {
  if (reuse && lastSnap && Date.now() - lastSnap.at < 120_000) return lastSnap.snap;
  const be = backend();
  if (!be) throw new Error('서버(Supabase) 모드에서만 쓸 수 있어요');
  const snap = await dumpAll(be);
  if (snap.failed?.length) throw new Error(`${snap.failed.join(', ')}을(를) 읽지 못해 멈췄어요 — 잠시 뒤 다시 시도해 주세요`);
  lastSnap = { at: Date.now(), snap };
  return snap;
}

/** 줄일 수 있는 이미지 찾기 */
export async function scanExisting(includeGallery: boolean): Promise<ScanResult> {
  const be = backend()!;
  const snap = await snapshot();
  const whereOf = new Map<string, Set<string>>();
  Object.entries(snap.collections).forEach(([coll, rows]) => {
    collectRefs(rows, new Set()).forEach(r => { const s = whereOf.get(r) ?? new Set(); s.add(COLL_NAME[coll] ?? coll); whereOf.set(r, s); });
  });
  collectRefs(snap.settings, new Set()).forEach(r => { const s = whereOf.get(r) ?? new Set(); s.add('사이트 설정'); whereOf.set(r, s); });
  const memberRefs = collectRefs(snap.members ?? [], new Set());
  const galleryRefs = collectRefs(snap.collections.gallery ?? [], new Set());

  const skipped = { gallery: 0, small: 0, type: 0, unused: 0, member: 0 };
  const cands: Cand[] = [];
  for (const f of await be.listFiles()) {
    if (!whereOf.has(f.ref) && !memberRefs.has(f.ref)) { skipped.unused++; continue; }
    if (memberRefs.has(f.ref)) { skipped.member++; continue; }
    if (!OK_EXT.test(f.ref)) { skipped.type++; continue; }
    if (f.size < MIN_SIZE) { skipped.small++; continue; }
    if (!includeGallery && galleryRefs.has(f.ref)) { skipped.gallery++; continue; }
    cands.push({ ref: f.ref, size: f.size, where: [...(whereOf.get(f.ref) ?? [])] });
  }
  cands.sort((a, b) => b.size - a.size);
  return { cands, skipped };
}

/** 한 장 줄여 보기 (미리 비교) */
export async function previewShrink(ref: string) {
  const res = await fetch(ref);
  if (!res.ok) throw new Error('이미지를 받지 못했어요');
  const blob = await res.blob();
  const r = await shrinkCore(blob, typeOfRef(ref));
  return { blob, r };
}

export interface RunResult { done: number; kept: number; failed: number; before: number; after: number; rows: number }

/** 실제로 줄이기 — 새 파일로 올리고 데이터 안의 주소를 바꾼다 (원본 파일은 남긴다) */
export async function runShrink(cands: Cand[], onProgress: (msg: string, i: number, n: number) => void): Promise<RunResult> {
  const be = backend()!;
  onProgress('데이터 읽는 중', 0, cands.length);
  const snap = await snapshot(true);   // 찾기 직후(2분 안)면 그 데이터, 아니면 새로 읽는다
  const map = new Map<string, string>();
  const out: RunResult = { done: 0, kept: 0, failed: 0, before: 0, after: 0, rows: 0 };
  let i = 0;
  for (const c of cands) {
    i += 1;
    onProgress('이미지 줄이는 중', i, cands.length);
    try {
      const res = await fetch(c.ref);
      if (!res.ok) { out.failed++; continue; }
      const blob = await res.blob();
      const r = await shrinkCore(blob, typeOfRef(c.ref));
      if (!r) { out.kept++; continue; }
      const next = await be.uploadFile(r.out, extOfType(r.out.type));
      map.set(c.ref, next);
      out.done++; out.before += blob.size; out.after += r.out.size;
    } catch { out.failed++; }
  }
  if (!map.size) return out;

  // 데이터 안의 주소 바꾸기 — 바뀐 항목만 저장된다 (순서·권한은 그대로)
  const uid = currentUserId();
  const colls = Object.entries(snap.collections);
  let k = 0;
  for (const [coll, rows] of colls) {
    k += 1;
    onProgress('주소 바꾸는 중', k, colls.length);
    if (!rows?.length) continue;
    const next = replaceRefs(rows, map);
    const changed = next.filter((r, j) => JSON.stringify(r) !== JSON.stringify(rows[j])).length;
    if (!changed) continue;
    await syncList(coll, rows, next, uid);
    out.rows += changed;
  }
  lastSnap = null;
  for (const [key, v] of Object.entries(snap.settings)) {
    if (v === undefined || v === null || isLocalOnlySetting(key)) continue;
    const nv = replaceRefs(v, map);
    if (JSON.stringify(nv) !== JSON.stringify(v)) { await be.saveSetting(key, nv); out.rows += 1; }
  }
  return out;
}

/* ---------- 화면 ---------- */

const CSS = `
.sx-sum{display:grid;gap:4px;font-size:13px;line-height:1.6}
.sx-sum b{font-size:15px}
.sx-sum small{color:var(--faint)}
.sx-list{margin-top:10px;max-height:150px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:4px 10px;font-size:12px}
.sx-list div{display:flex;gap:10px;padding:4px 0;border-bottom:1px dashed var(--line)}
.sx-list div:last-child{border-bottom:0}
.sx-list span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--faint)}
.sx-cmp{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.sx-cmp figure{margin:0;display:grid;gap:5px}
.sx-cmp .box{position:relative;height:220px;border-radius:10px;overflow:hidden;background:#111}
.sx-cmp .box img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.sx-cmp .box.zoom img{inset:auto;left:50%;top:50%;width:auto;height:auto;max-width:none;transform:translate(-50%,-50%)}
.sx-cmp figcaption{font-size:11.5px;color:var(--faint);text-align:center}
.sx-bar{height:6px;border-radius:999px;background:rgba(127,127,127,.18);overflow:hidden;margin:10px 0 4px}
.sx-bar i{display:block;height:100%;background:var(--accent,#a63a45);transition:width .2s}
@media (max-width:560px){.sx-cmp{grid-template-columns:1fr}}
`;

type Phase = 'idle' | 'scan' | 'ready' | 'run' | 'done' | 'error';

export function ShrinkExisting({ includeGallery }: { includeGallery: boolean }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [err, setErr] = useState('');
  const [prog, setProg] = useState<{ msg: string; i: number; n: number }>({ msg: '', i: 0, n: 0 });
  const [result, setResult] = useState<RunResult | null>(null);
  const [cmp, setCmp] = useState<{ a: string; b: string; info: string } | null>(null);
  const [cmpBusy, setCmpBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [sure, setSure] = useState(false);

  useEffect(() => () => { if (cmp) { URL.revokeObjectURL(cmp.a); URL.revokeObjectURL(cmp.b); } }, [cmp]);

  const doScan = async () => {
    setPhase('scan'); setErr(''); setScan(null); setResult(null); setCmp(null); setSure(false);
    try { setScan(await scanExisting(includeGallery)); setPhase('ready'); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); setPhase('error'); }
  };
  const doPreview = async () => {
    if (!scan?.cands.length) return;
    setCmpBusy(true);
    try {
      const { blob, r } = await previewShrink(scan.cands[0].ref);
      if (!r) { setCmp(null); setErr('이 이미지는 줄여도 별로 작아지지 않아 그대로 둬요'); return; }
      setCmp({ a: URL.createObjectURL(blob), b: URL.createObjectURL(r.out),
        info: `원본 ${r.ow}×${r.oh} · ${mb(blob.size)} → ${r.w}×${r.h} · ${mb(r.out.size)}` });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setCmpBusy(false); }
  };
  const doRun = async () => {
    if (!scan) return;
    setPhase('run'); setErr('');
    try { setResult(await runShrink(scan.cands, (msg, i, n) => setProg({ msg, i, n }))); setPhase('done'); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); setPhase('error'); }
  };

  const total = scan?.cands.reduce((s, c) => s + c.size, 0) ?? 0;
  const sk = scan?.skipped;

  return (
    <div style={{ marginTop: 10 }}>
      <button className="btn btn-ghost" onClick={() => { setOpen(true); if (phase === 'idle' || phase === 'done' || phase === 'error') void doScan(); }}>
        이미 올린 이미지 줄이기…
      </button>
      <Modal open={open} onClose={() => { if (phase !== 'run') setOpen(false); }} title="이미 올린 이미지 줄이기"
        desc="자동 축소가 생기기 전에 원본 그대로 올라간 큰 이미지를 긴 변 2560px로 줄여 새 파일로 바꿔요 — 원본 파일은 지우지 않아요"
        actions={<>
          {phase !== 'run' && <button className="btn btn-ghost" onClick={() => setOpen(false)}>닫기</button>}
          {phase === 'ready' && !!scan?.cands.length && (
            sure
              ? <button className="btn btn-dark" onClick={() => void doRun()}>정말 {scan.cands.length}장 줄이기</button>
              : <button className="btn btn-dark" onClick={() => setSure(true)}>{scan.cands.length}장 줄이기…</button>
          )}
        </>}>
        <style>{CSS}</style>
        {phase === 'scan' && <p className="hint">사이트 전체에서 이미지를 찾는 중…</p>}
        {phase === 'error' && <p className="hint" style={{ color: '#c0392b' }}>{err}</p>}

        {phase === 'ready' && scan && (
          <>
            {scan.cands.length === 0 ? (
              <p className="hint">줄일 이미지가 없어요 — 이미 작거나, 갤러리·GIF처럼 그대로 두는 이미지뿐이에요.</p>
            ) : (
              <div className="sx-sum">
                <b>줄일 수 있는 이미지 {scan.cands.length}장 · 지금 {mb(total)}</b>
                <small>보통 원본의 10~30% 크기로 줄어요. 정확한 양은 실행 후에 알려 드려요.</small>
                <div className="sx-list">
                  {scan.cands.slice(0, 50).map(c => (
                    <div key={c.ref}><b style={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{mb(c.size)}</b><span>{c.where.join(' · ')}</span></div>
                  ))}
                  {scan.cands.length > 50 && <div><span>… 외 {scan.cands.length - 50}장</span></div>}
                </div>
              </div>
            )}
            {sk && (
              <p className="hint" style={{ marginTop: 10 }}>
                그대로 두는 이미지 — 갤러리 {sk.gallery} · 작은 이미지 {sk.small} · GIF 등 {sk.type} · 프로필 사진 {sk.member}
                {sk.unused > 0 && ` · 아무도 안 쓰는 파일 ${sk.unused}(데이터 백업 > 이미지 정리로 지울 수 있어요)`}
              </p>
            )}
            {!!scan.cands.length && (
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-ghost" disabled={cmpBusy} onClick={() => void doPreview()}>
                  {cmpBusy ? '줄여 보는 중…' : cmp ? '다시 비교' : '가장 큰 이미지로 미리 비교'}
                </button>
                {cmp && (
                  <>
                    <div className="sx-cmp">
                      <figure><div className={`box${zoom ? ' zoom' : ''}`}><img src={cmp.a} alt="원본" /></div><figcaption>원본</figcaption></figure>
                      <figure><div className={`box${zoom ? ' zoom' : ''}`}><img src={cmp.b} alt="줄인 것" /></div><figcaption>줄인 것</figcaption></figure>
                    </div>
                    <p className="hint" style={{ textAlign: 'center', margin: '6px 0 0' }}>
                      {cmp.info} · <a href="#" onClick={e => { e.preventDefault(); setZoom(z => !z); }}>{zoom ? '전체 보기' : '실제 크기로 가운데 보기'}</a>
                    </p>
                  </>
                )}
              </div>
            )}
            {sure && (
              <p className="hint" style={{ marginTop: 12 }}>
                실행하면 이미지 {scan.cands.length}장을 받아 줄인 뒤 새 파일로 올리고, 그 이미지를 쓰는 글·캐릭터의 주소를 바꿔요.
                원본을 한 번씩 내려받느라 전송량이 약 {mb(total)} 들어요. 끝날 때까지 이 창을 닫지 마세요.
              </p>
            )}
          </>
        )}

        {phase === 'run' && (
          <>
            <p className="hint" style={{ margin: 0 }}>{prog.msg} {prog.n ? `${prog.i} / ${prog.n}` : ''} — 창을 닫지 마세요</p>
            <div className="sx-bar"><i style={{ width: `${prog.n ? Math.round((prog.i / prog.n) * 100) : 0}%` }} /></div>
          </>
        )}

        {phase === 'done' && result && (
          <div className="sx-sum">
            <b>{result.done}장 줄였어요 · {mb(result.before)} → {mb(result.after)}</b>
            <small>
              주소를 바꾼 항목 {result.rows}개{result.kept ? ` · 별로 안 작아져 그대로 둔 것 ${result.kept}장` : ''}{result.failed ? ` · 실패 ${result.failed}장(원본 그대로)` : ''}
            </small>
            <p className="hint" style={{ marginTop: 8 }}>
              원본 파일은 저장소에 그대로 남아 있어요. 사이트를 새로고침해 이미지가 잘 보이는지 확인한 뒤,
              환경설정 &gt; 데이터 백업 &gt; 「쓰지 않는 이미지 정리」로 원본을 지우면 저장 공간이 줄어요.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
