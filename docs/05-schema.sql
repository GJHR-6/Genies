-- =====================================================================
-- Genies â€” Esquema base de datos  (OpciÃ³n 2 / MVP)
-- Motor: PostgreSQL (Supabase)   Â·   VersiÃ³n: 1.1
--
-- Cubre: sucursales, catÃ¡logo, departamentos, perfiles y roles,
-- movimientos diarios, reglas de sugeridos y seguridad por fila (RLS).
--
-- Pendiente de carga desde el Excel del cliente (hito M2 del plan):
--   productos, departamentos, reglas_sugerido
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Tipos
-- ---------------------------------------------------------------------
create type rol_usuario     as enum ('tienda', 'principal', 'admin');
create type tipo_decoracion as enum ('decorado', 'sin_decorar', 'na');
create type estado_dia      as enum ('sin_iniciar', 'en_captura', 'cerrado');

-- ---------------------------------------------------------------------
-- 1. Sucursales  (6 confirmadas)
-- ---------------------------------------------------------------------
create table sucursales (
  id           smallint generated always as identity primary key,
  nombre       text    not null unique,
  es_principal boolean not null default false,
  activa       boolean not null default true
);

insert into sucursales (nombre, es_principal) values
  ('Principal', true),
  ('Cypress',   false),
  ('Century',   false),
  ('Altara',    false),
  ('Chalets',   false),
  ('Palenque',  false);

-- ---------------------------------------------------------------------
-- 2. Departamentos de producciÃ³n  (se llenan desde el Excel)
-- ---------------------------------------------------------------------
create table departamentos (
  id     smallint generated always as identity primary key,
  nombre text    not null unique,
  activo boolean not null default true
);

-- ---------------------------------------------------------------------
-- 3. CatÃ¡logo de productos  (se migra desde el Excel)
-- ---------------------------------------------------------------------
create table productos (
  id               integer generated always as identity primary key,
  nombre           text    not null,
  categoria        text,
  tamano           text,
  departamento_id  smallint references departamentos(id),
  lleva_decoracion boolean not null default false,
  activo           boolean not null default true,
  unique (nombre, tamano)
);

-- ---------------------------------------------------------------------
-- 4. Perfiles  (usuarios de Supabase Auth â†” sucursal y rol)
-- ---------------------------------------------------------------------
create table perfiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nombre      text,
  rol         rol_usuario not null default 'tienda',
  sucursal_id smallint    references sucursales(id)
);

-- Helpers de seguridad
create or replace function rol_actual() returns rol_usuario
  language sql stable security definer set search_path = public as $$
  select rol from perfiles where user_id = auth.uid()
$$;

create or replace function sucursal_actual() returns smallint
  language sql stable security definer set search_path = public as $$
  select sucursal_id from perfiles where user_id = auth.uid()
$$;

create or replace function es_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(rol_actual() = 'admin', false)
$$;

-- ---------------------------------------------------------------------
-- 5. Movimientos diarios  (fila = producto Ã— sucursal Ã— dÃ­a)
-- ---------------------------------------------------------------------
create table movimientos_diarios (
  id           bigint generated always as identity primary key,
  fecha        date     not null,
  sucursal_id  smallint not null references sucursales(id),
  producto_id  integer  not null references productos(id),
  saldo_inicial integer not null default 0 check (saldo_inicial >= 0),
  ingreso      integer  not null default 0 check (ingreso >= 0),
  devolucion   integer  not null default 0 check (devolucion >= 0),
  pedido       integer  not null default 0 check (pedido >= 0),
  saldo_final  integer  check (saldo_final >= 0),
  -- Solo Principal: desglose de decoraciÃ³n
  decorado     integer  not null default 0 check (decorado >= 0),
  sin_decorar  integer  not null default 0 check (sin_decorar >= 0),
  -- Override manual del sugerido (null = usar el calculado)
  sugerido_override integer check (sugerido_override >= 0),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id),
  unique (fecha, sucursal_id, producto_id)
);

create index idx_mov_fecha_suc on movimientos_diarios (fecha, sucursal_id);

-- Vendido calculado (nunca digitado)
create or replace view v_movimientos as
select m.*,
       (m.saldo_inicial + m.ingreso - m.devolucion
          - coalesce(m.saldo_final, m.saldo_inicial + m.ingreso - m.devolucion)
       ) as vendido
from movimientos_diarios m;

-- ---------------------------------------------------------------------
-- 6. Estado del dÃ­a por sucursal
-- ---------------------------------------------------------------------
create table cierres_dia (
  fecha       date     not null,
  sucursal_id smallint not null references sucursales(id),
  estado      estado_dia not null default 'en_captura',
  cerrado_at  timestamptz,
  cerrado_by  uuid references auth.users(id),
  primary key (fecha, sucursal_id)
);

-- ---------------------------------------------------------------------
-- 7. Reglas de sugeridos  (objetivo por producto Ã— sucursal Ã— dÃ­a semana)
--    dia_semana: 0=domingo â€¦ 6=sÃ¡bado; null = todos los dÃ­as
-- ---------------------------------------------------------------------
create table reglas_sugerido (
  id          integer generated always as identity primary key,
  producto_id integer  not null references productos(id),
  sucursal_id smallint not null references sucursales(id),
  dia_semana  smallint check (dia_semana between 0 and 6),
  objetivo    integer  not null check (objetivo >= 0),
  unique (producto_id, sucursal_id, dia_semana)
);

-- Sugerido = objetivo âˆ’ saldo (con override manual si existe)
create or replace view v_sugeridos as
select m.fecha, m.sucursal_id, m.producto_id,
       r.objetivo,
       coalesce(m.saldo_final, m.saldo_inicial + m.ingreso - m.devolucion) as saldo,
       coalesce(
         m.sugerido_override,
         greatest(r.objetivo - coalesce(m.saldo_final,
                  m.saldo_inicial + m.ingreso - m.devolucion), 0)
       ) as sugerido,
       (m.sugerido_override is not null) as es_override
from movimientos_diarios m
join reglas_sugerido r
  on r.producto_id = m.producto_id
 and r.sucursal_id = m.sucursal_id
 and (r.dia_semana is null or r.dia_semana = extract(dow from m.fecha));

-- ---------------------------------------------------------------------
-- 8. Seguridad por fila (RLS)
--    Tienda/principal: solo su sucursal.  Admin: todo.
-- ---------------------------------------------------------------------
alter table sucursales          enable row level security;
alter table departamentos       enable row level security;
alter table productos           enable row level security;
alter table perfiles            enable row level security;
alter table movimientos_diarios enable row level security;
alter table cierres_dia         enable row level security;
alter table reglas_sugerido     enable row level security;

-- CatÃ¡logos: autenticados leen; solo admin escribe
create policy cat_suc_lectura on sucursales
  for select to authenticated using (true);
create policy cat_suc_admin on sucursales
  for all to authenticated using (es_admin()) with check (es_admin());

create policy cat_dep_lectura on departamentos
  for select to authenticated using (true);
create policy cat_dep_admin on departamentos
  for all to authenticated using (es_admin()) with check (es_admin());

create policy cat_prod_lectura on productos
  for select to authenticated using (true);
create policy cat_prod_admin on productos
  for all to authenticated using (es_admin()) with check (es_admin());

-- Perfiles: cada quien ve el suyo; admin todos
create policy perfil_propio on perfiles
  for select to authenticated using (user_id = auth.uid() or es_admin());
create policy perfil_admin on perfiles
  for all to authenticated using (es_admin()) with check (es_admin());

-- Movimientos: la tienda ve y edita lo suyo; admin todo
create policy mov_lectura on movimientos_diarios
  for select to authenticated
  using (es_admin() or sucursal_id = sucursal_actual());
create policy mov_insertar on movimientos_diarios
  for insert to authenticated
  with check (es_admin() or sucursal_id = sucursal_actual());
create policy mov_actualizar on movimientos_diarios
  for update to authenticated
  using (es_admin() or sucursal_id = sucursal_actual())
  with check (es_admin() or sucursal_id = sucursal_actual());

-- Cierres: misma regla que movimientos
create policy cierre_lectura on cierres_dia
  for select to authenticated
  using (es_admin() or sucursal_id = sucursal_actual());
create policy cierre_escritura on cierres_dia
  for all to authenticated
  using (es_admin() or sucursal_id = sucursal_actual())
  with check (es_admin() or sucursal_id = sucursal_actual());

-- Reglas: todos leen; solo admin escribe
create policy reglas_lectura on reglas_sugerido
  for select to authenticated using (true);
create policy reglas_admin on reglas_sugerido
  for all to authenticated using (es_admin()) with check (es_admin());

-- =====================================================================
-- FIN â€” v1.1 (agrega cierres_dia, saldo_inicial/final, override y
--       vistas v_movimientos / v_sugeridos respecto de la v1.0)
-- =====================================================================
