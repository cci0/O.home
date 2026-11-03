// 작은 썸네일 주소 계산 (포크 최적화 — lib/imageThumbs 참고). 표시 쪽(CropImg)이 가볍게 쓰도록 의존성 없이 따로 둔다.
export const THUMB_SIDE = 800;          // 작은 판의 긴 변 (px)
/** 그림이 실제 화소로 그려질 긴 변이 이 이하일 때만 작은 판을 쓴다 — 작은 판(800)을 늘 조금이라도 줄여서 보여 줘야 선명하다.
 *  처음엔 880까지 쓰고 화면 배율을 2로 잘라서, 메인 슬라이드에서 작은 판이 늘어나 보여 화질이 떨어졌다 (사용자 제보) */
export const THUMB_USE_MAX = 720;
/** 그림 비율을 알기 전(칸 크기만으로) 정할 때의 기준 — 그림이 칸보다 한쪽으로 넘쳐 더 크게 그려질 수 있어 넉넉히 낮게.
 *  애매하면 처음부터 원본을 받는다 (작은 판을 받았다가 원본을 또 받는 두 번 받기 방지) */
export const THUMB_PRE_MAX = 540;
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

