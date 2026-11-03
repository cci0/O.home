// 작은 썸네일 주소 계산 (포크 최적화 — lib/imageThumbs 참고). 표시 쪽(CropImg)이 가볍게 쓰도록 의존성 없이 따로 둔다.
export const THUMB_SIDE = 800;          // 작은 판의 긴 변 (px) — 목록 칸(최대 약 400px)을 고해상도 화면에서도 선명하게
const DIR = 't';
const RASTER = /\.(jpe?g|png|webp)$/i;
// Supabase 공개 주소: https://xxx.supabase.co/storage/v1/object/public/ohome/파일이름
const PUB_RE = /^(https?:\/\/[^?#]+\/storage\/v1\/object\/public\/ohome\/)([^/?#]+)(?:[?#].*)?$/;

// 이번 방문에서 「작은 판이 없다」고 확인된 주소 — 다시 시도하지 않는다
const missing = new Set<string>();
export const markThumbMissing = (thumbUrl: string) => { missing.add(thumbUrl); };

/** 원본 파일 이름 → 작은 판 경로 (만들지 않는 종류면 null) */
export function thumbPathOf(name: string): string | null {
  if (!name || name.includes('/') || !RASTER.test(name)) return null;
  return `${DIR}/${name.replace(/\.[^.]+$/, '')}.webp`;
}

/** 원본 공개 주소 → 작은 판 공개 주소 (해당 없으면 null) */
export function thumbUrlOf(url?: string): string | null {
  if (!url) return null;
  const m = url.match(PUB_RE);
  if (!m) return null;
  let name = m[2];
  try { name = decodeURIComponent(name); } catch { /* 그대로 */ }
  const p = thumbPathOf(name);
  return p && !missing.has(m[1] + p) ? m[1] + p : null;
}

