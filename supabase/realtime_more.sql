-- 실시간 알림 넓히기 (포크) — 한 번만 실행하면 된다. 다시 실행해도 안전.
-- 원작은 역극·자관·게시판·방명록만 실시간이라, 다른 창(다른 사람)에서 캐릭터 등을 바꾸면
-- 새로고침해야 보였다. 아래 표들도 바뀌면 열려 있는 화면이 바로 새로 받아 온다.
-- (없는 표는 조용히 건너뜀 · 이미 켜진 표도 건너뜀)
do $$
declare t text;
begin
  foreach t in array array['characters', 'trpg_logs', 'trpg_chars', 'gallery', 'worlds', 'char_templates'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then null;
    end;
  end loop;
end $$;

-- 확인: 실시간이 켜진 표 목록
select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;
