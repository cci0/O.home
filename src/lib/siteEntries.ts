'use client';
// 사이트 전체 항목 모음 — 태그 모아보기·전체 검색·최근 업데이트 위젯이 같이 쓴다.
// 각 목록 화면과 같은 공개 범위 규칙(+ 메뉴에서 비공개로 둔 곳)으로 걸러서, 볼 수 없는 항목은 아예 담지 않는다.
// 목록은 useLocalList가 아니라 한 번 읽기(useRawList)로 가져온다 — 같은 목록을 쓰는 화면과 겹쳐도
// 서버 모드의 실시간 구독이 중복으로 열리지 않게.
// 새 파일로 따로 둔 이유: 원작 저장소가 업데이트돼도 충돌하지 않게.
import { useMemo } from 'react';
import { useAuth } from './auth';
import { useMenuSettings, canViewHref } from './menuStore';
import { sectionHref, MAIN_SEC } from './sectionStore';
import { useRawList } from './rawList';
import { CHAR_SEED, REL_SEED, type Character, type Relation } from './charStore';
import { TRPG_SEED, BACKUP_SEED, PLAYLOG_SEED, DOTORI_SEED, type TrpgLog, type BackupPost, type PlayRecord, type DotoriItem } from './galleryStore';

export type EntryKind = 'chars' | 'rels' | 'trpg' | 'gallery' | 'playlog' | 'dotori';
export const ENTRY_KINDS: EntryKind[] = ['chars', 'rels', 'trpg', 'gallery', 'playlog', 'dotori'];
export const ENTRY_LABEL: Record<EntryKind, string> = {
  chars: '캐릭터', rels: '자관', trpg: '로그', gallery: '갤러리', playlog: '플레이기록', dotori: '도토리',
};

export interface SiteEntry {
  kind: EntryKind;
  id: string;
  title: string;
  sub?: string;
  tags: string[];
  href: string;
  list?: boolean;      // 상세 화면이 없어 목록으로 연결되는 항목 (플레이기록·도토리)
  text: string;        // 검색용 — 소문자 한 줄
  at: number;          // 올라온 시각(ms) — 모르면 0
}

/** 항목 id(newId) 앞 8글자는 만든 시각(base36 ms) — 옛 데이터·시드는 이 형식이 아니라 0 */
export const idMs = (id: string): number => {
  const n = parseInt(id.slice(0, 8), 36);
  return Number.isFinite(n) && n > 1.5e12 && n < 4e12 ? n : 0;
};
const dateMs = (d?: string): number => {
  const n = d ? Date.parse(d) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const strip = (html?: string) => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const mk = (parts: (string | undefined)[]) => parts.filter(Boolean).join(' ').toLowerCase();

export function useSiteEntries(): { loaded: boolean; entries: SiteEntry[] } {
  const { isAdmin, user } = useAuth();
  const [menuSet] = useMenuSettings();
  const chars = useRawList<Character>('ohome.chars.v1', CHAR_SEED);
  const rels = useRawList<Relation>('ohome.rels.v1', REL_SEED);
  const logs = useRawList<TrpgLog>('ohome.trpg.v1', TRPG_SEED);
  const posts = useRawList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  const records = useRawList<PlayRecord>('ohome.playlog.v1', PLAYLOG_SEED);
  const dotori = useRawList<DotoriItem>('ohome.dotori.v1', DOTORI_SEED);
  const loaded = chars.loaded && rels.loaded && logs.loaded && posts.loaded && records.loaded && dotori.loaded;

  const entries = useMemo<SiteEntry[]>(() => {
    const viewer = { loggedIn: !!user, isAdmin, id: user?.id };
    const menuOk = (href: string) => canViewHref(menuSet, href, viewer);
    const out: SiteEntry[] = [];
    chars.list.forEach(c => {
      if (!c.own || !(isAdmin || c.visibility === 'public')) return;
      if (!menuOk(sectionHref('chars', c.secId ?? MAIN_SEC))) return;
      out.push({ kind: 'chars', id: c.id, title: c.name, sub: c.sub, tags: c.tags ?? [], href: `/chars/${c.id}`,
        text: mk([c.name, c.sub, (c.tags ?? []).join(' '), strip(c.basicHtml)]), at: idMs(c.id) });
    });
    if (menuOk('/rels')) rels.list.forEach(r => {
      if (!(isAdmin || r.visibility !== 'private')) return;
      out.push({ kind: 'rels', id: r.id, title: r.name, tags: r.tags ?? [], href: `/rels/${r.id}`,
        text: mk([r.name, r.catchphrase, (r.tags ?? []).join(' ')]), at: idMs(r.id) });
    });
    logs.list.forEach(l => {
      if (l.listHidden || !(isAdmin || l.visibility === 'public' || (l.visibility === 'member' && !!user))) return;
      if (!menuOk(sectionHref('trpg', l.secId ?? MAIN_SEC))) return;
      out.push({ kind: 'trpg', id: l.id, title: l.title, sub: l.writer, tags: l.tags ?? [], href: `/trpg/${l.id}`,
        text: mk([l.title, l.writer, l.withText, (l.tags ?? []).join(' ')]), at: idMs(l.id) || dateMs(l.date) });
    });
    posts.list.forEach(p => {
      if (!(isAdmin || p.visibility === 'public' || (p.visibility === 'member' && !!user))) return;
      if (!menuOk(sectionHref('gallery', p.secId ?? MAIN_SEC))) return;
      out.push({ kind: 'gallery', id: p.id, title: p.title, sub: p.category, tags: p.tags ?? [], href: `/gallery/${p.id}`,
        text: mk([p.title, p.category, (p.tags ?? []).join(' ')]), at: dateMs(p.date) || idMs(p.id) });
    });
    records.list.forEach(r => {
      const href = sectionHref('playlog', r.secId ?? MAIN_SEC);
      if (!menuOk(href)) return;
      out.push({ kind: 'playlog', id: r.id, title: r.scenario, sub: r.writer, tags: r.tags ?? [], href, list: true,
        text: mk([r.scenario, r.writer, r.withText, r.role, (r.tags ?? []).join(' ')]), at: idMs(r.id) || dateMs(r.date) });
    });
    dotori.list.forEach(d => {
      const href = sectionHref('dotori', d.secId ?? MAIN_SEC);
      if (!menuOk(href)) return;
      out.push({ kind: 'dotori', id: d.id, title: d.name, sub: d.writer, tags: d.tags ?? [], href, list: true,
        text: mk([d.name, d.writer, d.rule, (d.tags ?? []).join(' ')]), at: idMs(d.id) });
    });
    return out;
  }, [chars.list, rels.list, logs.list, posts.list, records.list, dotori.list, isAdmin, user, menuSet]);

  return { loaded, entries };
}
