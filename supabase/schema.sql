-- Control GPRO · esquema en Supabase (proyecto control-gpro, sa-east-1)
-- Acceso abierto: cualquiera con el link lee y edita. Cada edición o borrado guarda
-- la versión anterior en gpro_historial (no visible desde el link) para poder recuperarla.

create table if not exists public.gpro_docs (
  coleccion   text        not null,
  id          text        not null,
  data        jsonb       not null default '{}'::jsonb,
  actualizado timestamptz not null default now(),
  primary key (coleccion, id)
);
alter table public.gpro_docs enable row level security;
create policy "gpro leer"   on public.gpro_docs for select to anon, authenticated using (true);
create policy "gpro crear"  on public.gpro_docs for insert to anon, authenticated with check (true);
create policy "gpro editar" on public.gpro_docs for update to anon, authenticated using (true) with check (true);
create policy "gpro borrar" on public.gpro_docs for delete to anon, authenticated using (true);

create table if not exists public.gpro_historial (
  n          bigint generated always as identity primary key,
  cuando     timestamptz not null default now(),
  operacion  text not null,
  coleccion  text not null,
  id         text not null,
  data_antes jsonb
);
alter table public.gpro_historial enable row level security;
create or replace function public.gpro_guardar_historial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.gpro_historial(operacion, coleccion, id, data_antes)
  values (tg_op, old.coleccion, old.id, old.data);
  return null;
end $$;
revoke execute on function public.gpro_guardar_historial() from anon, authenticated, public;
create trigger gpro_historial_trg after update or delete on public.gpro_docs
  for each row execute function public.gpro_guardar_historial();

alter table public.gpro_docs replica identity full;
alter publication supabase_realtime add table public.gpro_docs;

-- Recuperar un documento (ejemplo):
--   select * from gpro_historial where coleccion='proyectos' and id='c27-ptas' order by n desc;
--   update gpro_docs set data = (select data_antes from gpro_historial where n = <n>) where coleccion='proyectos' and id='c27-ptas';
