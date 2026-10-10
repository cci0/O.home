'use client';
// 태그 입력 — 쉼표로 구분해 직접 쓰되, 이미 쓴 태그가 칩으로 떠서 눌러 고를 수 있다 (오타로 태그가 갈라지는 것 방지).
// 제안은 캐릭터·자관·TRPG 로그·갤러리·플레이기록·도토리·게시판에 쓰인 태그 전체에서 가져온다 (많이 쓴 순).
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import React, { useEffect, useMemo, useState } from 'react';
import { KInput } from '@/components/ui/Kit';
import { TABLE_OF, fetchList } from '@/lib/db';
import { isServerMode } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { parseTags, tagCounts } from '@/lib/tagUtil';
import { useTagColors, tagInk } from '@/lib/tagColors';

const TAG_KEYS = ['ohome.chars.v1', 'ohome.rels.v1', 'ohome.trpg.v1', 'ohome.backup.v1', 'ohome.playlog.v1', 'ohome.dotori.v1', 'ohome.board.v1'];

/** 이 홈에서 쓰인 모든 태그 — 많이 쓴 순
 *
 *  useLocalList를 쓰지 않는다: 서버 모드에서 useLocalList는 목록마다 실시간 구독을 여는데,
 *  같은 목록을 이미 쓰는 화면(작성 폼 등)에 또 열면 Supabase가 「구독 후 콜백 추가 불가」 오류를 내며
 *  페이지가 통째로 안 열린다. 여기서는 구독 없이 한 번 읽기만 한다. */
type Row = { tags?: string[]; secret?: boolean; visibility?: string };

export function useAllTags(): string[] {
  const { isAdmin } = useAuth();
  const [rawItems, setItems] = useState<Row[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const all: Row[] = [];
      for (const key of TAG_KEYS) {
        try {
          if (isServerMode() && TABLE_OF[key]) {
            all.push(...(await fetchList<{ id: string } & Row>(TABLE_OF[key])));
          } else {
            const raw = localStorage.getItem(key);
            if (raw) all.push(...(JSON.parse(raw) as Row[]));
          }
        } catch { /* 이 목록은 건너뜀 — 태그 제안만 줄어들 뿐 */ }
      }
      if (alive) setItems(all);
    })();
    return () => { alive = false; };
  }, []);
  // 관리자가 아니면 비밀글·비공개 항목의 태그는 제안에서 뺀다 (태그 이름이 새어 나가지 않게)
  const items = useMemo(
    () => (isAdmin ? rawItems : rawItems.filter(it => !it.secret && (!it.visibility || it.visibility === 'public'))),
    [rawItems, isAdmin],
  );
  return useMemo(() => tagCounts(items).map(([t]) => t), [items]);
}

export function TagInput({ value, onChange, placeholder, style }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const all = useAllTags();
  const [colors] = useTagColors();
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
              style={{ marginLeft: 0, cursor: 'var(--cur-pointer,pointer)', ...tagInk(colors, t) }}>#{t}</i>
          ))}
        </div>
      )}
    </div>
  );
}
