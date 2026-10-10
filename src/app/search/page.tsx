'use client';
// 전체 검색 (v2.0 사용자 요청) — 캐릭터·자관·TRPG 로그·갤러리·플레이기록·도토리를 한 번에 찾는다.
// 이름·제목·작성자·태그, 캐릭터는 소개 본문까지 검색한다. (TRPG 로그의 본문은 따로 저장돼 있어 제외)
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
//
// 항목은 lib/siteEntries가 각 목록과 같은 공개 범위·메뉴 비공개 규칙으로 걸러서 준다.
// 게시판은 글마다 읽기 권한 규칙이 달라 뺐다 (게시판 목록의 검색을 쓴다).
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { KInput } from '@/components/ui/Kit';
import { TagList } from '@/components/ui/TagList';
import { useSiteEntries, ENTRY_KINDS, ENTRY_LABEL } from '@/lib/siteEntries';

const PER_KIND = 20;

export default function SearchPage() {
  const { loaded, entries } = useSiteEntries();
  const [q, setQ] = useState('');
  const [more, setMore] = useState<Record<string, boolean>>({});

  // 주소(?q=)와 이어 둔다 — 새로고침·링크 공유에도 검색어가 남게 (기록은 쌓지 않고 교체)
  useEffect(() => {
    try { setQ(new URLSearchParams(window.location.search).get('q') ?? ''); } catch { /* 무시 */ }
  }, []);
  const onChange = (v: string) => {
    setQ(v); setMore({});
    try {
      const url = new URL(window.location.href);
      if (v.trim()) url.searchParams.set('q', v); else url.searchParams.delete('q');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch { /* 무시 */ }
  };

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = useMemo(() => {
    if (words.length === 0) return [];
    // 띄어쓰기로 나눈 낱말이 전부 들어 있는 항목 (AND)
    const hit = entries.filter(e => words.every(w => e.text.includes(w)));
    return ENTRY_KINDS.map(k => ({ k, rows: hit.filter(e => e.kind === k) })).filter(g => g.rows.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, q]);
  const total = found.reduce((a, g) => a + g.rows.length, 0);

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>SEARCH</PageTitle>
        <EditableDesc k="search-desc" def="전체 검색 — 캐릭터·자관·로그·갤러리·기록·도토리를 한 번에 찾아요" />
      </div>

      <div className="panel" style={{ padding: '18px 20px', marginBottom: 16 }}>
        <KInput value={q} onChange={e => onChange(e.target.value)} placeholder="이름·제목·작성자·태그 (띄어쓰기로 여러 낱말)" autoFocus />
        <p style={{ fontSize: 11, color: 'var(--faint)', margin: '8px 0 0' }}>
          {!loaded ? '불러오는 중…' : words.length === 0 ? `${entries.length}개 항목에서 찾아요` : `${total}개 찾았어요`}
        </p>
      </div>

      {found.map(({ k, rows }) => (
        <div className="panel" key={k} style={{ padding: '14px 20px', marginBottom: 14 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 12, letterSpacing: '.08em' }}>
            {ENTRY_LABEL[k]} <small style={{ color: 'var(--faint)' }}>{rows.length}</small>
          </h4>
          {(more[k] ? rows : rows.slice(0, PER_KIND)).map(e => (
            <div key={e.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
              <Link href={e.href} style={{ fontWeight: 600 }}>{e.title}</Link>
              {e.sub && <small style={{ color: 'var(--faint)', marginLeft: 8 }}>{e.sub}</small>}
              <TagList tags={e.tags} href="/tags" style={{ marginTop: 3, fontSize: 11 }} />
            </div>
          ))}
          {!more[k] && rows.length > PER_KIND && (
            <button className="btn btn-ghost" style={{ height: 30, padding: '0 12px', fontSize: 11, marginTop: 8 }}
              onClick={() => setMore(m => ({ ...m, [k]: true }))}>+{rows.length - PER_KIND}개 더 보기</button>
          )}
        </div>
      ))}

      {loaded && words.length > 0 && found.length === 0 && (
        <div className="panel" style={{ padding: 40, textAlign: 'center', fontSize: 12, color: 'var(--faint)' }}>
          찾는 항목이 없어요.
        </div>
      )}
    </section>
  );
}
