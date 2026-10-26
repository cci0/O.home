-- 비밀글 잠금 (포크 보안) — Supabase SQL Editor에 통째로 붙여넣고 Run (여러 번 실행해도 안전)
--
-- 예전 비밀글은 화면에서만 가렸다 — 글 자체는 전체공개로 저장돼 F12·API로 본문이 그대로 보였다.
-- 이제 비밀글의 제목·본문 등은 이 잠긴 표(post_secrets)에 따로 두고, 게시판 표에는 「🔒 비밀글」 자리만 남긴다.
--   · 이 표는 누구도 직접 읽거나 쓸 수 없다 (정책 없음 + 권한 회수) — 아래 함수로만
--   · 꺼내 주는 대상: 관리자 · 작성자 · 비밀번호가 맞는 사람
--   · 비밀번호는 bcrypt 해시(crypt + gen_salt('bf'))로만 저장 — 해시도 밖으로 나가지 않는다
--   · 틀린 비밀번호는 0.5초 늦게 답한다 (마구 넣어 보기 방지)
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.post_secrets (
  id          text primary key,              -- 글(또는 방명록) id
  coll        text not null default 'posts', -- posts · guestbook
  payload     jsonb not null default '{}'::jsonb,
  pass_hash   text,                          -- 열람 비밀번호 (없으면 관리자·작성자만)
  author_id   uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);
alter table public.post_secrets enable row level security;
revoke all on public.post_secrets from anon, authenticated;

-- 저장 — p_pass: null이면 비밀번호 그대로 · ''이면 비밀번호 없앰 · 그 밖이면 새 비밀번호
create or replace function public.secret_save(p_id text, p_coll text, p_payload jsonb, p_pass text, p_author uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare r public.post_secrets;
begin
  if p_coll not in ('posts', 'guestbook') then raise exception 'bad collection'; end if;
  if length(p_payload::text) > 1000000 then raise exception 'too large'; end if;
  select * into r from public.post_secrets s where s.id = p_id;
  if found then
    if not (public.is_admin() or (auth.uid() is not null and r.author_id = auth.uid())) then
      raise exception 'not allowed';
    end if;
    update public.post_secrets set
      payload = p_payload,
      pass_hash = case when p_pass is null then pass_hash
                       when p_pass = '' then null
                       else crypt(p_pass, gen_salt('bf', 8)) end,
      updated_at = now()
    where id = p_id;
  else
    -- 새로 잠그기: 작성자는 자기 자신만(관리자는 예전 글을 옮길 때 원래 작성자로) · 비로그인은 방명록만
    if not (public.is_admin() or p_author is not distinct from auth.uid()) then raise exception 'not allowed'; end if;
    if auth.uid() is null and p_coll <> 'guestbook' then raise exception 'not allowed'; end if;
    insert into public.post_secrets (id, coll, payload, pass_hash, author_id)
    values (p_id, p_coll, p_payload,
            case when coalesce(p_pass, '') = '' then null else crypt(p_pass, gen_salt('bf', 8)) end,
            p_author);
  end if;
end $$;

-- 읽기 — 관리자 · 작성자 · 비밀번호가 맞으면 내용, 아니면 null
create or replace function public.secret_read(p_id text, p_pass text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.post_secrets;
begin
  select * into r from public.post_secrets s where s.id = p_id;
  if not found then return null; end if;
  if public.is_admin() or (auth.uid() is not null and r.author_id = auth.uid()) then return r.payload; end if;
  if r.pass_hash is not null and coalesce(p_pass, '') <> '' then
    if crypt(p_pass, r.pass_hash) = r.pass_hash then return r.payload; end if;
    perform pg_sleep(0.5);
  end if;
  return null;
end $$;

-- 내가 볼 수 있는 것 한꺼번에 (관리자·작성자 — 목록의 제목 표시용, 비밀번호 없이)
create or replace function public.secret_read_mine(p_ids text[])
returns table (id text, payload jsonb) language sql security definer set search_path = public as $$
  select s.id, s.payload from public.post_secrets s
  where s.id = any(p_ids) and (public.is_admin() or (auth.uid() is not null and s.author_id = auth.uid()));
$$;

-- 지우기 (비밀글을 풀거나 글을 지울 때)
create or replace function public.secret_delete(p_id text)
returns void language sql security definer set search_path = public as $$
  delete from public.post_secrets s
  where s.id = p_id and (public.is_admin() or (auth.uid() is not null and s.author_id = auth.uid()));
$$;

revoke all on function public.secret_save(text, text, jsonb, text, uuid) from public;
revoke all on function public.secret_read(text, text) from public;
revoke all on function public.secret_read_mine(text[]) from public;
revoke all on function public.secret_delete(text) from public;
grant execute on function public.secret_save(text, text, jsonb, text, uuid) to anon, authenticated;
grant execute on function public.secret_read(text, text) to anon, authenticated;
grant execute on function public.secret_read_mine(text[]) to anon, authenticated;
grant execute on function public.secret_delete(text) to anon, authenticated;
notify pgrst, 'reload schema';
