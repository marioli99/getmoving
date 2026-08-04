-- ============================================================
--  GYM RAT CLUB — banco de dados
--  Cole tudo isto no SQL Editor do Supabase e rode uma vez.
-- ============================================================

-- ---------- perfis ----------
create table if not exists public.perfis (
  id         uuid primary key references auth.users on delete cascade,
  nome       text not null check (char_length(nome) between 2 and 24),
  criado_em  timestamptz not null default now()
);

-- cria o perfil sozinho quando alguém se cadastra
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'nome', ''),      -- cadastro por e-mail
      nullif(new.raw_user_meta_data->>'full_name', ''), -- Google
      nullif(new.raw_user_meta_data->>'name', ''),      -- Apple
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- ---------- check-ins ----------
create table if not exists public.checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  dia        date not null default (now() at time zone 'America/Sao_Paulo')::date,
  tipo       text not null check (tipo in ('treino','cardio','refeicao','agua')),
  pts        smallint not null,
  nota       text check (char_length(nota) <= 60),
  foto_path  text,
  criado_em  timestamptz not null default now()
);

create index if not exists idx_checkins_user_dia on public.checkins (user_id, dia);

-- ---------- as regras do desafio, aplicadas no servidor ----------
-- (impede burlar o limite diário chamando a API direto)
create or replace function public.validar_checkin()
returns trigger
language plpgsql
as $$
declare
  limite   smallint;
  valor    smallint;
  usados   smallint;
begin
  case new.tipo
    when 'treino'   then limite := 1; valor := 2;
    when 'cardio'   then limite := 1; valor := 2;
    when 'refeicao' then limite := 3; valor := 1;
    when 'agua'     then limite := 1; valor := 1;
  end case;

  new.pts := valor;  -- a pontuação vem da regra, nunca do cliente

  select count(*) into usados
  from public.checkins
  where user_id = new.user_id and dia = new.dia and tipo = new.tipo;

  if usados >= limite then
    raise exception 'Limite diário de % já foi atingido.', new.tipo;
  end if;

  if new.dia > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Não dá para registrar um dia futuro.';
  end if;

  if new.dia < (now() at time zone 'America/Sao_Paulo')::date - 1 then
    raise exception 'Só dá para registrar hoje ou ontem.';
  end if;

  return new;
end;
$$;

drop trigger if exists antes_de_inserir_checkin on public.checkins;
create trigger antes_de_inserir_checkin
  before insert on public.checkins
  for each row execute function public.validar_checkin();

-- ---------- segurança por linha ----------
alter table public.perfis   enable row level security;
alter table public.checkins enable row level security;

-- todo mundo logado enxerga os perfis (para montar o ranking)
drop policy if exists "perfis visíveis para quem está logado" on public.perfis;
create policy "perfis visíveis para quem está logado"
  on public.perfis for select to authenticated using (true);

drop policy if exists "cada um edita o próprio perfil" on public.perfis;
create policy "cada um edita o próprio perfil"
  on public.perfis for update to authenticated using (auth.uid() = id);

-- check-ins do grupo são públicos entre participantes; escrita só do dono
drop policy if exists "checkins visíveis para o grupo" on public.checkins;
create policy "checkins visíveis para o grupo"
  on public.checkins for select to authenticated using (true);

drop policy if exists "cada um cria o próprio checkin" on public.checkins;
create policy "cada um cria o próprio checkin"
  on public.checkins for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "cada um apaga o próprio checkin" on public.checkins;
create policy "cada um apaga o próprio checkin"
  on public.checkins for delete to authenticated using (auth.uid() = user_id);

-- ---------- fotos ----------
insert into storage.buckets (id, name, public)
values ('provas', 'provas', true)
on conflict (id) do nothing;

drop policy if exists "qualquer um vê as fotos" on storage.objects;
create policy "qualquer um vê as fotos"
  on storage.objects for select using (bucket_id = 'provas');

drop policy if exists "cada um envia na própria pasta" on storage.objects;
create policy "cada um envia na própria pasta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'provas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cada um apaga a própria foto" on storage.objects;
create policy "cada um apaga a própria foto"
  on storage.objects for delete to authenticated
  using (bucket_id = 'provas' and (storage.foldername(name))[1] = auth.uid()::text);
