'use client';
// 태그 입력 — 쉼표로 구분해 직접 쓰되, 이미 쓴 태그가 칩으로 떠서 눌러 고를 수 있다 (오타로 태그가 갈라지는 것 방지).
// 제안은 캐릭터·자관·TRPG 로그·갤러리에 쓰인 태그 전체에서 가져온다 (많이 쓴 순).
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useMemo } from 'react';
import { KInput } from '@/components/ui/Kit';
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, REL_SEED, type Character, type Relation } from '@/lib/charStore';
import { TRPG_SEED, BACKUP_SEED, type TrpgLog, type BackupPost } from '@/lib/galleryStore';
import { parseTags, tagCounts } from '@/lib/tagUtil';

/** 이 홈에서 쓰인 모든 태그 — 많이 쓴 순 */
export function useAllTags(): string[] {
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const [rels] = useLocalList<Relation>('ohome.rels.v1', REL_SEED);
  const [logs] = useLocalList<TrpgLog>('ohome.trpg.v1', TRPG_SEED);
  const [posts] = useLocalList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  return useMemo(
    () => tagCounts([...chars, ...rels, ...logs, ...posts]).map(([t]) => t),
    [chars, rels, logs, posts],
  );
}

export function TagInput({ value, onChange, placeholder, style }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const all = useAllTags();
  const cur = parseTags(value);
  // 지금 치고 있는 조각 (마지막 쉼표 뒤) — 이걸로 제안을 좁힌다
  const frag = (value.split(',').pop() ?? '').trim().replace(/^#+/, '').toLowerCase();
  const sugg = all.filter(t => !cur.includes(t) && (!frag || t.toLowerCase().includes(frag))).slice(0, 12);
  const pick = (t: string) => {
    const parts = value.split(',');
    parts.pop();   // 치던 조각은 고른 태그로 대체
    onChange([...parts.map(s => s.trim()).filter(Boolean), t].join(', ') + ', ');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0, ...style }}>
      <KInput placeholder={placeholder ?? '태그 (선택 — 쉼표로 구분)'} value={value} onChange={e => onChange(e.target.value)} />
      {sugg.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 11 }}>
          {sugg.map(t => (
            <i key={t} className="tag-in" onClick={() => pick(t)}
              style={{ marginLeft: 0, cursor: 'var(--cur-pointer,pointer)' }}>#{t}</i>
          ))}
        </div>
      )}
    </div>
  );
}
