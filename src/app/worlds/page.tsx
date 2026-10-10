'use client';
// 세계관 목록 — 가로로 긴 행 카드 (정사각 커버 · 이탤릭 제목 · 한 줄 소개 | 캐릭터 N명 · 오른쪽 라벨)
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useRawList } from '@/lib/rawList';
import { Character, CHAR_SEED } from '@/lib/charStore';
import { useVisibleWorlds, countByWorld, worldPath } from '@/lib/worldStore';
import { SearchBar } from '@/components/ui/Kit';
import { TagFilter } from '@/components/ui/TagFilter';
import { TagList } from '@/components/ui/TagList';
import { tagCounts, matchTags, tagMatches, useTagFilter } from '@/lib/tagUtil';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { useConfirmDelete } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function WorldsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const del = useConfirmDelete();
  const worlds = useVisibleWorlds();
  const chars = useRawList<Character>('ohome.chars.v1', CHAR_SEED);
  const [q, setQ] = useState('');
  const [tagSel, toggleTag, clearTags, tagMode, toggleMode] = useTagFilter();
  const counts = useMemo(() => countByWorld(chars.list, isAdmin), [chars.list, isAdmin]);

  const shown = worlds.visible
    .filter(w => matchTags(w, tagSel, tagMode))
    .filter(w => !q || w.name.toLowerCase().includes(q.toLowerCase()) || (w.sub ?? '').toLowerCase().includes(q.toLowerCase()) || tagMatches(w, q));

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>WORLDS</PageTitle>
        <EditableDesc k="worlds-desc" def="세계관 목록 — 캐릭터가 속한 세계" />
        <div className="head-actions">
          <SearchBar onSearch={setQ} />
          {isAdmin && <button className="btn btn-dark" onClick={() => router.push('/worlds/new')}>＋ ADD WORLD</button>}
        </div>
      </div>
      <TagFilter counts={tagCounts(worlds.visible)} selected={tagSel} onToggle={toggleTag} onClear={clearTags} mode={tagMode} onToggleMode={toggleMode} />
      {worlds.loaded && shown.length === 0 && <p className="hint" style={{ padding: '24px 4px' }}>{worlds.visible.length ? '조건에 맞는 세계관이 없어요' : '아직 등록된 세계관이 없어요'}</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {shown.map(w => (
          <div key={w.id} role="link" tabIndex={0}
            onClick={() => router.push(worldPath(w))}
            onKeyDown={e => { if (e.key === 'Enter') router.push(worldPath(w)); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 18, padding: 14, background: 'var(--panel)',
              border: '1px solid var(--line)', borderRadius: 'var(--radius)', cursor: 'var(--cur-pointer,pointer)',
              opacity: w.visibility === 'private' ? .55 : 1,
            }}>
            <div style={{ width: 92, height: 92, flex: 'none', position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
              <CroppedBlobImg fileRef={w.imgId} crop={w.crop} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 'calc(22px*var(--fs,1))', color: 'var(--ink)', lineHeight: 1.25, wordBreak: 'keep-all' }}>
                {w.name}
                {w.visibility !== 'public' && <span className="pill" style={{ marginLeft: 8, fontStyle: 'normal' }}>{w.visibility === 'member' ? '멤버' : '비공개'}</span>}
              </div>
              <div style={{ marginTop: 5, fontSize: 'calc(12.5px*var(--fs,1))', color: 'var(--faint)' }}>
                {w.sub ? `${w.sub} | ` : ''}캐릭터 {counts[w.id] ?? 0}명
              </div>
              {w.tags && w.tags.length > 0 && <TagList tags={w.tags} max={4} onPick={toggleTag} style={{ marginTop: 6, fontSize: 11 }} />}
            </div>
            <div style={{ flex: 'none', textAlign: 'right', display: 'grid', gap: 6, justifyItems: 'end' }}>
              <span style={{ fontSize: 'calc(11px*var(--fs,1))', letterSpacing: '.14em', color: 'var(--accent)' }}>{w.label || 'VIEW'} ›</span>
              {isAdmin && (
                <span style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => router.push(`/worlds/${w.id}/edit`)}>EDIT</button>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }}
                    onClick={() => del.ask(`「${w.name}」 세계관을 삭제할까요?`, async () => {
                      await worlds.save(worlds.list.filter(x => x.id !== w.id));
                      toast('삭제되었습니다');
                    }, '삭제하면 복구할 수 없습니다. 소속 캐릭터는 그대로 남고 세계관만 미지정이 됩니다.')}>DELETE</button>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {del.element}
    </section>
  );
}
