-- =====================================================================
-- 0020 · Control de lo que no se mandó (3 nov 2026)
-- =====================================================================
-- Pedido de la reunión del 16 oct: al despachar, lo que no se pudo mandar
-- a una tienda queda anotado como pendiente hasta que se manda (en la
-- tarde o después), para no perderlo ni mandarlo doble.
--   · cantidad   = cuánto no se mandó de ese producto a esa tienda ese día.
--   · enviado_at = cuándo se mandó después (null = sigue pendiente).
-- Lo anota administración; la tienda ve lo suyo (aviso en su inventario)
-- y Principal lo ve todo.
-- =====================================================================

create table public.no_enviados (
  id           bigint generated always as identity primary key,
  fecha        date     not null,
  sucursal_id  smallint not null references public.sucursales(id),
  producto_id  integer  not null references public.productos(id),
  cantidad     integer  not null check (cantidad > 0),
  enviado_at   timestamptz,
  enviado_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id) default auth.uid(),
  unique (fecha, sucursal_id, producto_id)
);

create index idx_no_enviados_pendientes on public.no_enviados (sucursal_id, fecha) where enviado_at is null;
create index idx_no_enviados_producto on public.no_enviados (producto_id);
create index idx_no_enviados_enviado_by on public.no_enviados (enviado_by);
create index idx_no_enviados_updated_by on public.no_enviados (updated_by);

alter table public.no_enviados enable row level security;

create policy no_enviados_lectura on public.no_enviados
  for select to authenticated
  using (es_admin() or rol_actual() = 'principal' or sucursal_id = sucursal_actual());

create policy no_enviados_admin_ins on public.no_enviados
  for insert to authenticated with check (es_admin());

create policy no_enviados_admin_upd on public.no_enviados
  for update to authenticated using (es_admin()) with check (es_admin());

create policy no_enviados_admin_del on public.no_enviados
  for delete to authenticated using (es_admin());

revoke all on public.no_enviados from anon;
