-- =====================================================================
-- Reparto de la producción por pastelera
--
-- Cada área de producción (cuadro) tiene sus pasteleras con un porcentaje
-- FIJO. Cada día el admin genera el reparto: el total de cada producto
-- (suma de sugeridos de las sucursales, igual que el cuadro) se divide
-- entre las pasteleras del área según su porcentaje, y cada asignación se
-- puede partir en tandas 1–4 (el "1*2*3*4" del Excel es por tanda).
-- Al publicarlo, cada pastelera ve "Mi trabajo de hoy" en la tablet de
-- Principal (/cocina), entrando con su nombre y un PIN opcional.
--
-- Decoración: área especial (es_decoracion). Si no tiene pasteleras
-- activas, la decoración se asigna a las pasteleras del área del producto.
-- =====================================================================

begin;

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Área de decoración
-- ---------------------------------------------------------------------
alter table areas_produccion
  add column es_decoracion boolean not null default false;

insert into areas_produccion (nombre, encargadas, orden, es_decoracion)
values ('Decoración', 'Por definir', 7, true);

-- ---------------------------------------------------------------------
-- 2. Pasteleras (porcentaje fijo dentro de su área)
-- ---------------------------------------------------------------------
create table pasteleras (
  id          smallint generated always as identity primary key,
  nombre      text     not null unique,
  area_id     smallint not null references areas_produccion(id),
  porcentaje  numeric(5,2) not null default 0
              check (porcentaje >= 0 and porcentaje <= 100),
  orden       smallint not null default 0,
  activa      boolean  not null default true,
  requiere_pin boolean not null default false
);

create index idx_pasteleras_area on pasteleras (area_id);

-- PIN en tabla aparte: nadie la lee por la API (RLS sin políticas);
-- solo las funciones security definer de abajo.
create table pasteleras_pin (
  pastelera_id smallint primary key references pasteleras(id) on delete cascade,
  pin_hash     text not null
);

alter table pasteleras     enable row level security;
alter table pasteleras_pin enable row level security;

create policy pasteleras_lectura on pasteleras
  for select to authenticated using (true);
create policy pasteleras_admin_ins on pasteleras
  for insert to authenticated with check (es_admin());
create policy pasteleras_admin_upd on pasteleras
  for update to authenticated using (es_admin()) with check (es_admin());
create policy pasteleras_admin_del on pasteleras
  for delete to authenticated using (es_admin());

-- Pasteleras según DISTRIBUCION PRODUCCION Y DECORACION.xlsx;
-- porcentaje parejo dentro del área hasta que la administradora lo ajuste.
insert into pasteleras (nombre, area_id, porcentaje, orden)
select v.nombre, a.id, v.porcentaje, v.orden
from (values
  ('Kenia',    'Producción 1',       50, 1),
  ('Dany',     'Producción 1',       50, 2),
  ('Melissa',  'Producción 2',       50, 1),
  ('Johanna',  'Producción 2',       50, 2),
  ('Heidy',    'Producción 3',      100, 1),
  ('Olivia',   'Producción 4',      100, 1),
  ('Carolina', 'Producción 4B / 5B', 50, 1),
  ('Silvia',   'Producción 4B / 5B', 50, 2),
  ('Audry',    'Producción 5',      100, 1)
) as v(nombre, area, porcentaje, orden)
join areas_produccion a on a.nombre = v.area;

-- ---------------------------------------------------------------------
-- 3. Plan del día (borrador → publicado)
-- ---------------------------------------------------------------------
create table planes_dia (
  fecha        date primary key,
  estado       text not null default 'borrador'
               check (estado in ('borrador', 'publicado')),
  generado_at  timestamptz,
  publicado_at timestamptz,
  updated_by   uuid references auth.users(id)
);

create index idx_planes_updated_by on planes_dia (updated_by);

alter table planes_dia enable row level security;

create policy planes_lectura on planes_dia
  for select to authenticated
  using (es_admin() or rol_actual() = 'principal');
create policy planes_admin_ins on planes_dia
  for insert to authenticated with check (es_admin());
create policy planes_admin_upd on planes_dia
  for update to authenticated using (es_admin()) with check (es_admin());
create policy planes_admin_del on planes_dia
  for delete to authenticated using (es_admin());

-- ---------------------------------------------------------------------
-- 4. Asignaciones: producto × pastelera × tipo × tanda
--    pastelera_id null = sin asignar (área sin pasteleras activas).
-- ---------------------------------------------------------------------
create table asignaciones (
  id             bigint generated always as identity primary key,
  fecha          date     not null,
  producto_id    integer  not null references productos(id),
  pastelera_id   smallint references pasteleras(id),
  tipo           text     not null check (tipo in ('produccion', 'decoracion')),
  tanda          smallint not null default 1 check (tanda between 1 and 4),
  cantidad       integer  not null check (cantidad >= 0),
  cantidad_hecha integer  not null default 0 check (cantidad_hecha >= 0),
  estado         text     not null default 'pendiente'
                 check (estado in ('pendiente', 'en_proceso', 'listo')),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id),
  unique nulls not distinct (fecha, producto_id, pastelera_id, tipo, tanda)
);

create index idx_asig_fecha_pastelera on asignaciones (fecha, pastelera_id);
create index idx_asig_producto        on asignaciones (producto_id);
create index idx_asig_pastelera       on asignaciones (pastelera_id);
create index idx_asig_updated_by      on asignaciones (updated_by);

alter table asignaciones enable row level security;

create policy asig_lectura on asignaciones
  for select to authenticated
  using (es_admin() or rol_actual() = 'principal');
create policy asig_admin_ins on asignaciones
  for insert to authenticated with check (es_admin());
create policy asig_admin_upd on asignaciones
  for update to authenticated using (es_admin()) with check (es_admin());
create policy asig_admin_del on asignaciones
  for delete to authenticated using (es_admin());

-- ---------------------------------------------------------------------
-- 5. Funciones
-- ---------------------------------------------------------------------

-- Reemplaza el reparto de un día en una sola transacción (vuelve a
-- borrador). Corre con los permisos del admin que la llama (RLS aplica).
create or replace function reemplazar_asignaciones(p_fecha date, p_filas jsonb)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  v_total integer;
begin
  if not es_admin() then
    raise exception 'Solo administración puede generar el reparto';
  end if;

  delete from asignaciones where fecha = p_fecha;

  insert into asignaciones (fecha, producto_id, pastelera_id, tipo, tanda,
                            cantidad, updated_by)
  select p_fecha, f.producto_id, f.pastelera_id, f.tipo, f.tanda,
         f.cantidad, auth.uid()
  from jsonb_to_recordset(p_filas) as f(
    producto_id integer, pastelera_id smallint, tipo text,
    tanda smallint, cantidad integer)
  where f.cantidad > 0;

  get diagnostics v_total = row_count;

  insert into planes_dia (fecha, estado, generado_at, publicado_at, updated_by)
  values (p_fecha, 'borrador', now(), null, auth.uid())
  on conflict (fecha) do update
    set estado = 'borrador', generado_at = now(), publicado_at = null,
        updated_by = auth.uid();

  return v_total;
end;
$$;

-- Fija o quita (null / '') el PIN de 4 dígitos de una pastelera.
create or replace function fijar_pin_pastelera(p_pastelera smallint, p_pin text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not es_admin() then
    raise exception 'Solo administración puede cambiar PINs';
  end if;

  if p_pin is null or p_pin = '' then
    delete from pasteleras_pin where pastelera_id = p_pastelera;
    update pasteleras set requiere_pin = false where id = p_pastelera;
    return;
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'El PIN debe tener 4 dígitos';
  end if;

  insert into pasteleras_pin (pastelera_id, pin_hash)
  values (p_pastelera, crypt(p_pin, gen_salt('bf')))
  on conflict (pastelera_id) do update set pin_hash = excluded.pin_hash;
  update pasteleras set requiere_pin = true where id = p_pastelera;
end;
$$;

-- Uso interno: ¿el PIN es correcto? (sin PIN configurado = siempre sí)
create or replace function pin_valido(p_pastelera smallint, p_pin text)
returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select pp.pin_hash = crypt(coalesce(p_pin, ''), pp.pin_hash)
       from pasteleras_pin pp where pp.pastelera_id = p_pastelera),
    true)
$$;

-- La tablet de Principal valida el PIN antes de mostrar "Mi trabajo".
create or replace function verificar_pin_pastelera(p_pastelera smallint, p_pin text)
returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if not (es_admin() or rol_actual() = 'principal') then
    raise exception 'Sin permiso';
  end if;
  return pin_valido(p_pastelera, p_pin);
end;
$$;

-- La pastelera marca su avance desde la tablet (cantidad hecha / estado).
create or replace function registrar_avance(
  p_asignacion bigint, p_pin text, p_hecha integer, p_estado text default null)
returns asignaciones
language plpgsql security definer set search_path = public as $$
declare
  v_asig  asignaciones;
  v_hecha integer;
  v_estado text;
begin
  if not (es_admin() or rol_actual() = 'principal') then
    raise exception 'Sin permiso';
  end if;

  select * into v_asig from asignaciones where id = p_asignacion for update;
  if not found then
    raise exception 'Asignación no encontrada';
  end if;

  if not es_admin() then
    if v_asig.pastelera_id is null
       or not pin_valido(v_asig.pastelera_id, p_pin) then
      raise exception 'PIN incorrecto';
    end if;
    if not exists (select 1 from planes_dia
                   where fecha = v_asig.fecha and estado = 'publicado') then
      raise exception 'El reparto de este día no está publicado';
    end if;
  end if;

  v_hecha := greatest(coalesce(p_hecha, v_asig.cantidad_hecha), 0);
  v_estado := coalesce(p_estado,
    case when v_hecha >= v_asig.cantidad and v_asig.cantidad > 0 then 'listo'
         when v_hecha > 0 then 'en_proceso'
         else 'pendiente' end);
  if v_estado not in ('pendiente', 'en_proceso', 'listo') then
    raise exception 'Estado inválido';
  end if;
  if v_estado = 'listo' and v_hecha < v_asig.cantidad then
    v_hecha := v_asig.cantidad;
  end if;

  update asignaciones
     set cantidad_hecha = v_hecha, estado = v_estado,
         updated_at = now(), updated_by = auth.uid()
   where id = p_asignacion
  returning * into v_asig;

  return v_asig;
end;
$$;

revoke execute on function reemplazar_asignaciones(date, jsonb)        from anon, public;
revoke execute on function fijar_pin_pastelera(smallint, text)          from anon, public;
revoke execute on function pin_valido(smallint, text)                   from anon, public, authenticated;
revoke execute on function verificar_pin_pastelera(smallint, text)      from anon, public;
revoke execute on function registrar_avance(bigint, text, integer, text) from anon, public;

grant execute on function reemplazar_asignaciones(date, jsonb)        to authenticated;
grant execute on function fijar_pin_pastelera(smallint, text)          to authenticated;
grant execute on function verificar_pin_pastelera(smallint, text)      to authenticated;
grant execute on function registrar_avance(bigint, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Tiempo real: la tablet y el admin ven el avance al instante
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table asignaciones;
alter publication supabase_realtime add table planes_dia;

commit;
