'use client';
// 태그 모아보기 (v2.0 사용자 요청) — 태그 하나(또는 여러 개)를 고르면 캐릭터·자관·TRPG 로그·갤러리·플레이기록·도토리에서
// 그 태그가 달린 것을 한 화면에 모아 보여 준다.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
//
// 항목은 lib/siteEntries가 각 목록과 같은 공개 범위·메뉴 비공개 규칙으로 걸러서 준다 — 볼 수 없는 항목의 제목·태그가 새지 않는다.
// 게시판은 글마다 읽기 권한 규칙이 달라 이 화면에서는 뺐다 (게시판 목록에서는 태그로 거를 수 있다).
import React, { useMemo } from 'react';
import Link from 'next/link';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { TagFilter } from '@/components/ui/TagFilter';
import { TagList } from '@/components/ui/TagList';
import { useSiteEntries, ENTRY_KINDS, ENTRY_LABEL } from '@/lib/siteEntries';
import { tagCounts, matchTags, useTagFilter } from '@/lib/tagUtil';

export default function TagsPage() {
  const { loaded, entries } = useSiteEntries();
  const [sel, toggle, clear, mode, toggleMode] = useTagFilter();

  const counts = useMemo(() => tagCounts(entries), [entries]);
  const found = ENTRY_KINDS
    .map(k => ({ k, rows: entries.filter(e => e.kind === k && matchTags(e, sel, mode)) }))
    .filter(g => g.rows.length > 0);
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
            {ENTRY_LABEL[k]} <small style={{ color: 'var(--faint)' }}>{rows.length}</small>
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
