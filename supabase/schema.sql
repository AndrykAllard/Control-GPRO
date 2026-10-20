-- Control GPRO · esquema en Supabase
-- Una tabla de documentos (misma forma que la base del artifact) + lista de correos autorizados.

create table if not exists public.gpro_docs (
  coleccion       text        not null,
  id              text        not null,
  data            jsonb       not null default '{}'::jsonb,
  actualizado     timestamptz not null default now(),
  actualizado_por text,
  primary key (coleccion, id)
);

create table if not exists public.gpro_miembros (
  email text primary key,
  nombre text
);

alter table public.gpro_docs     enable row level security;
alter table public.gpro_miembros enable row level security;

-- ¿El usuario conectado está en la lista del equipo?
create or replace function public.gpro_es_miembro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gpro_miembros m
                 where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

drop policy if exists "gpro leer"    on public.gpro_docs;
drop policy if exists "gpro crear"   on public.gpro_docs;
drop policy if exists "gpro editar"  on public.gpro_docs;
drop policy if exists "gpro borrar"  on public.gpro_docs;
drop policy if exists "gpro mi fila" on public.gpro_miembros;

create policy "gpro leer"   on public.gpro_docs for select to authenticated using (public.gpro_es_miembro());
create policy "gpro crear"  on public.gpro_docs for insert to authenticated with check (public.gpro_es_miembro());
create policy "gpro editar" on public.gpro_docs for update to authenticated using (public.gpro_es_miembro()) with check (public.gpro_es_miembro());
create policy "gpro borrar" on public.gpro_docs for delete to authenticated using (public.gpro_es_miembro());
-- cada usuario solo ve su propia fila en la lista (para saber si tiene acceso)
create policy "gpro mi fila" on public.gpro_miembros for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- cambios en vivo
alter table public.gpro_docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.gpro_docs;
exception when duplicate_object then null; end $$;
