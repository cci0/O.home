-- 세계관(worlds) 테이블 추가 — Supabase SQL Editor에 통째로 붙여넣고 Run (여러 번 실행해도 안전)
-- 읽기: 전체공개 / 멤버공개(로그인) / 본인 / 관리자  ·  쓰기: 관리자만
create table if not exists public.worlds (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  author_id   uuid references auth.users(id) on delete set null,
  visibility  text not null default 'public',
  sort        double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.worlds enable row level security;
create index if not exists worlds_sort_idx on public.worlds (sort);

drop policy if exists "read" on public.worlds;
create policy "read" on public.worlds for select using (
  visibility = 'public'
  or (visibility = 'member' and auth.uid() is not null)
  or author_id = auth.uid()
  or public.is_admin()
);
drop policy if exists "insert" on public.worlds;
create policy "insert" on public.worlds for insert to authenticated with check (public.is_admin());
drop policy if exists "update" on public.worlds;
create policy "update" on public.worlds for update to authenticated
  using (author_id = auth.uid() or public.is_admin());
drop policy if exists "delete" on public.worlds;
create policy "delete" on public.worlds for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());
