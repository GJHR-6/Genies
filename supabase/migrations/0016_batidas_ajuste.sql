-- =====================================================================
-- DEC y PROD por batida escritos a mano en el cuadro completo (27 oct 2026)
--
-- En el cuadro completo, DEC sale solo: batida 1 = lo que Principal anotó
-- sin decorar, batida 2 = lo que se hornea (suma de PROD); PROD sale del
-- reparto. Administración puede cambiar cualquier casilla: el cambio va
-- aquí, por producto, tipo y batida, sin tocar el reparto de las
-- pasteleras. Sin fila = el valor automático.
-- =====================================================================

begin;

create table batidas_ajuste (
  id          bigint generated always as identity primary key,
  fecha       date     not null,
  producto_id integer  not null references productos(id),
  tipo        text     not null check (tipo in ('produccion', 'decoracion')),
  tanda       smallint not null check (tanda between 1 and 4),
  cantidad    integer  not null check (cantidad >= 0),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id),
  unique (fecha, producto_id, tipo, tanda)
);

create index idx_batidas_ajuste_producto   on batidas_ajuste (producto_id);
create index idx_batidas_ajuste_updated_by on batidas_ajuste (updated_by);

alter table batidas_ajuste enable row level security;

create policy batajuste_lectura on batidas_ajuste
  for select to authenticated
  using (es_admin() or rol_actual() = 'principal');
create policy batajuste_admin_ins on batidas_ajuste
  for insert to authenticated with check (es_admin());
create policy batajuste_admin_upd on batidas_ajuste
  for update to authenticated using (es_admin()) with check (es_admin());
create policy batajuste_admin_del on batidas_ajuste
  for delete to authenticated using (es_admin());

commit;
