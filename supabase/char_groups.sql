-- 캐릭터 묶음(char_groups: 가족·소속·팀) 테이블 추가 (포크) — Supabase SQL Editor에 통째로 붙여넣고 Run (여러 번 실행해도 안전)
-- 읽기: 전체공개 / 멤버공개(로그인) / 본인 / 관리자  ·  쓰기: 관리자만
create table if not exists public.char_groups (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  author_id   uuid references auth.users(id) on delete set null,
  visibility  text not null default 'public',
  sort        double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.char_groups enable row level security;
create index if not exists char_groups_sort_idx on public.char_groups (sort);
-- 편집 권한 칸 — 원작 업데이트로 저장할 때 항상 함께 보낸다 (없으면 저장이 400으로 거부됨)
alter table public.char_groups add column if not exists editor_ids text[] not null default '{}'::text[];
notify pgrst, 'reload schema';

drop policy if exists "read" on public.char_groups;
create policy "read" on public.char_groups for select using (
  visibility = 'public'
  or (visibility = 'member' and auth.uid() is not null)
  or author_id = auth.uid()
  or public.is_admin()
);
drop policy if exists "insert" on public.char_groups;
create policy "insert" on public.char_groups for insert to authenticated with check (public.is_admin());
drop policy if exists "update" on public.char_groups;
create policy "update" on public.char_groups for update to authenticated
  using (author_id = auth.uid() or public.is_admin());
drop policy if exists "delete" on public.char_groups;
create policy "delete" on public.char_groups for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- 실시간 — 다른 창에서 묶음을 고치면 열려 있는 화면에 바로 반영
do $$ begin
  alter publication supabase_realtime add table public.char_groups;
exception when others then null; end $$;
