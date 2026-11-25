-- =====================================================================
-- 0018 · Seguridad de tiendas (revisión del 3 nov 2026)
-- =====================================================================
-- Hasta ahora el RLS solo pedía "es tu sucursal". Con la API (saltándose
-- la pantalla) una tienda podía:
--   · cambiar el inventario de cualquier día, también los ya terminados;
--   · escribirse mandar_override / sugerido_override (lo que se le manda);
--   · reabrir o borrar el cierre de su día;
--   · firmar cambios a nombre de otra persona (updated_by / cerrado_by).
-- Ahora, para quien no es admin:
--   · solo hoy o ayer (ayer = lo que quedó en la tablet sin internet),
--     y nunca un día ya terminado;
--   · los ajustes del admin no se tocan; updated_by = quien escribe;
--   · el cierre solo se puede poner en "cerrado", hoy, y no se borra.
-- Scripts con la service key (auth.uid() nulo) y el admin no cambian.
-- También: se quitan las funciones de PIN de cocina (sin uso desde el
-- 26 oct) y se optimiza la política de perfiles.
-- =====================================================================

create or replace function public.hoy_tegucigalpa()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'America/Tegucigalpa')::date
$$;

-- ---------------------------------------------------------------------
-- Inventario: qué puede escribir una tienda
-- ---------------------------------------------------------------------
create or replace function public.proteger_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hoy date := hoy_tegucigalpa();
begin
  if auth.uid() is null or es_admin() then
    return new;
  end if;

  if new.fecha not between hoy - 1 and hoy
     or (tg_op = 'UPDATE' and old.fecha not between hoy - 1 and hoy) then
    raise exception 'Solo se puede anotar el inventario de hoy'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from cierres_dia c
    where c.fecha = new.fecha
      and c.sucursal_id = new.sucursal_id
      and c.estado = 'cerrado'
  ) then
    raise exception 'Ese día ya se terminó; solo administración puede corregirlo'
      using errcode = '42501';
  end if;

  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.mandar_override := null;
    new.sugerido_override := null;
  else
    new.mandar_override := old.mandar_override;
    new.sugerido_override := old.sugerido_override;
  end if;
  return new;
end;
$$;

revoke execute on function public.proteger_movimiento() from public, anon, authenticated;

drop trigger if exists proteger_movimiento on public.movimientos_diarios;
create trigger proteger_movimiento
  before insert or update on public.movimientos_diarios
  for each row execute function public.proteger_movimiento();

-- ---------------------------------------------------------------------
-- Cierres: la tienda solo termina su día de hoy
-- ---------------------------------------------------------------------
drop policy if exists cierre_escritura on public.cierres_dia;

create policy cierre_admin on public.cierres_dia
  for all to authenticated
  using (es_admin())
  with check (es_admin());

create policy cierre_tienda_insertar on public.cierres_dia
  for insert to authenticated
  with check (
    sucursal_id = sucursal_actual()
    and fecha = hoy_tegucigalpa()
    and estado = 'cerrado'
    and (cerrado_by is null or cerrado_by = (select auth.uid()))
  );

-- cerrado → cerrado se permite (doble toque en "Sí, terminé").
create policy cierre_tienda_actualizar on public.cierres_dia
  for update to authenticated
  using (sucursal_id = sucursal_actual() and fecha = hoy_tegucigalpa())
  with check (
    sucursal_id = sucursal_actual()
    and fecha = hoy_tegucigalpa()
    and estado = 'cerrado'
    and (cerrado_by is null or cerrado_by = (select auth.uid()))
  );

-- ---------------------------------------------------------------------
-- PIN y avance de cocina: sin uso (no hay tablet en cocina)
-- ---------------------------------------------------------------------
revoke execute on function public.fijar_pin_pastelera(smallint, text) from public, anon, authenticated;
revoke execute on function public.verificar_pin_pastelera(smallint, text) from public, anon, authenticated;
revoke execute on function public.registrar_avance(bigint, text, integer, text, smallint) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Perfiles: auth.uid() una vez por consulta, no por fila
-- ---------------------------------------------------------------------
drop policy if exists perfil_propio on public.perfiles;
create policy perfil_propio on public.perfiles
  for select to authenticated
  using (user_id = (select auth.uid()) or es_admin());
