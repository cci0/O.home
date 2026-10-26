-- 이미지 저장소 잠금 (포크 보안) — Supabase SQL Editor에 통째로 붙여넣고 Run (여러 번 실행해도 안전)
--   · 파일 목록 보기: 누구나 → 올린 사람 본인 · 관리자만
--     (그림 주소로 보는 건 그대로 — 공개 버킷의 그림 주소는 이 규칙과 상관없이 열린다)
--   · 파일 덮어쓰기: 로그인한 누구나 → 올린 사람 본인 · 관리자만
-- 주의: 원작의 설치 SQL(schema.sql)을 다시 실행하면 예전 규칙으로 돌아간다 — 그 뒤에 이 파일을 다시 실행할 것
drop policy if exists "ohome_read" on storage.objects;
create policy "ohome_read" on storage.objects for select to authenticated
  using (bucket_id = 'ohome' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "ohome_update" on storage.objects;
create policy "ohome_update" on storage.objects for update to authenticated
  using (bucket_id = 'ohome' and (owner = auth.uid() or public.is_admin()))
  with check (bucket_id = 'ohome' and (owner = auth.uid() or public.is_admin()));
