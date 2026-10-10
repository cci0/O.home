'use client';
// 태그 모아보기 (v2.0 사용자 요청) — 태그 하나(또는 여러 개)를 고르면 캐릭터·자관·TRPG 로그·갤러리·플레이기록·도토리에서
// 그 태그가 달린 것을 한 화면에 모아 보여 준다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
//
// 각 목록 화면과 같은 공개 범위 규칙으로 걸러서, 볼 수 없는 항목의 제목·태그가 새지 않는다.
// 게시판은 글마다 읽기 권한 규칙이 달라 이 화면에서는 뺐다 (게시판 목록에서는 태그로 거를 수 있다).
import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { TagFilter } from '@/components/ui/TagFilter';
import { TagList } from '@/components/ui/TagList';
import { useRawList } from '@/lib/rawList';
import { CHAR_SEED, REL_SEED, type Character, type Relation } from '@/lib/charStore';
import { TRPG_SEED, BACKUP_SEED, PLAYLOG_SEED, DOTORI_SEED, type TrpgLog, type BackupPost, type PlayRecord, type DotoriItem } from '@/lib/galleryStore';
import { sectionHref, MAIN_SEC } from '@/lib/sectionStore';
import { tagCounts, matchTags, useTagFilter } from '@/lib/tagUtil';

interface Entry { id: string; title: string; sub?: string; tags: string[]; href: string; list?: boolean }
type Kind = 'chars' | 'rels' | 'trpg' | 'gallery' | 'playlog' | 'dotori';
const LABEL: Record<Kind, string> = {
  chars: '캐릭터', rels: '자관', trpg: 'TRPG 로그', gallery: '갤러리', playlog: '플레이기록', dotori: '도토리',
};
const ORDER: Kind[] = ['chars', 'rels', 'trpg', 'gallery', 'playlog', 'dotori'];

export default function TagsPage() {
  const { isAdmin, user } = useAuth();
  const chars = useRawList<Character>('ohome.chars.v1', CHAR_SEED);
  const rels = useRawList<Relation>('ohome.rels.v1', REL_SEED);
  const logs = useRawList<TrpgLog>('ohome.trpg.v1', TRPG_SEED);
  const posts = useRawList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  const records = useRawList<PlayRecord>('ohome.playlog.v1', PLAYLOG_SEED);
  const dotori = useRawList<DotoriItem>('ohome.dotori.v1', DOTORI_SEED);
  const [sel, toggle, clear, mode, toggleMode] = useTagFilter();
  const loaded = chars.loaded && rels.loaded && logs.loaded && posts.loaded && records.loaded && dotori.loaded;

  // 각 목록 화면과 같은 규칙으로 「이 사람이 볼 수 있는 것」만
  const entries = useMemo<Record<Kind, Entry[]>>(() => ({
    chars: chars.list.filter(c => c.own && (isAdmin || c.visibility === 'public'))
      .map(c => ({ id: c.id, title: c.name, sub: c.sub, tags: c.tags ?? [], href: `/chars/${c.id}` })),
    rels: rels.list.filter(r => isAdmin || r.visibility !== 'private')
      .map(r => ({ id: r.id, title: r.name, tags: r.tags ?? [], href: `/rels/${r.id}` })),
    trpg: logs.list.filter(l => !l.listHidden && (isAdmin || l.visibility === 'public' || (l.visibility === 'member' && !!user)))
      .map(l => ({ id: l.id, title: l.title, sub: l.writer, tags: l.tags ?? [], href: `/trpg/${l.id}` })),
    gallery: posts.list.filter(p => isAdmin || p.visibility === 'public' || (p.visibility === 'member' && !!user))
      .map(p => ({ id: p.id, title: p.title, tags: p.tags ?? [], href: `/gallery/${p.id}` })),
    playlog: records.list
      .map(r => ({ id: r.id, title: r.scenario, sub: r.writer, tags: r.tags ?? [], href: sectionHref('playlog', r.secId ?? MAIN_SEC), list: true })),
    dotori: dotori.list
      .map(d => ({ id: d.id, title: d.name, sub: d.writer, tags: d.tags ?? [], href: sectionHref('dotori', d.secId ?? MAIN_SEC), list: true })),
  }), [chars.list, rels.list, logs.list, posts.list, records.list, dotori.list, isAdmin, user]);

  const counts = useMemo(() => tagCounts(ORDER.flatMap(k => entries[k])), [entries]);
  const found = ORDER.map(k => ({ k, rows: entries[k].filter(e => matchTags(e, sel, mode)) })).filter(g => g.rows.length > 0);
  const total = found.reduce((a, g) => a + g.rows.length, 0);

  // 목록형(상세 화면이 없는) 항목은 그 목록으로 보내되 같은 태그로 걸러서
  const listLink = (href: string) => {
    const q = `tag=${encodeURIComponent(sel.join(','))}${sel.length > 1 && mode === 'or' ? '&tagmode=or' : ''}`;
    return `${href}${href.includes('?') ? '&' : '?'}${q}`;
  };

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>TAGS</PageTitle>
        <EditableDesc k="tags-desc" def="태그로 모아 보기 — 태그를 누르면 그 태그가 달린 것을 한곳에서 볼 수 있어요" />
      </div>

      <div className="panel" style={{ padding: '18px 20px', marginBottom: 16 }}>
        {!loaded ? (
          <p style={{ fontSize: 12, color: 'var(--faint)' }}>불러오는 중…</p>
        ) : counts.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--faint)' }}>아직 단 태그가 없어요.</p>
        ) : (
          <TagFilter counts={counts} selected={sel} onToggle={toggle} onClear={clear}
            mode={mode} onToggleMode={toggleMode} showLink={false} />
        )}
      </div>

      {loaded && counts.length > 0 && sel.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--faint)' }}>태그를 눌러 보세요. 여러 개를 고르면 함께 달린 것만 보여요.</p>
      )}

      {sel.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 12 }}>
          {sel.map(t => `#${t}`).join(mode === 'or' ? ' 또는 ' : ' + ')} — {total}개
        </p>
      )}

      {found.map(({ k, rows }) => (
        <div className="panel" key={k} style={{ padding: '14px 20px', marginBottom: 14 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 12, letterSpacing: '.08em' }}>
            {LABEL[k]} <small style={{ color: 'var(--faint)' }}>{rows.length}</small>
          </h4>
          {rows.map(e => (
            <div key={e.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
              <Link href={e.list ? listLink(e.href) : e.href} style={{ fontWeight: 600 }}>{e.title}</Link>
              {e.sub && <small style={{ color: 'var(--faint)', marginLeft: 8 }}>{e.sub}</small>}
              <TagList tags={e.tags} onPick={toggle} style={{ marginTop: 3, fontSize: 11 }} />
            </div>
          ))}
        </div>
      ))}

      {loaded && sel.length > 0 && found.length === 0 && (
        <div className="panel" style={{ padding: 40, textAlign: 'center', fontSize: 12, color: 'var(--faint)' }}>
          이 태그가 함께 달린 항목이 없어요.
        </div>
      )}
    </section>
  );
}
