-- =====================================================================
-- 0019 · El saldo inicial lo calcula la base (3 nov 2026)
-- =====================================================================
-- Antes lo mandaba la tablet: el saldo de "ayer" de calendario. Fallaba:
--   · el lunes buscaba el domingo (sin inventario) → arrancaba en 0;
--   · un producto que no se anotó ayer arrancaba en 0;
--   · si el admin ajustaba un sugerido o el cuadro completo de un
--     producto sin anotar, la fila se creaba con saldo inicial 0;
--   · si se corregía el día anterior, el inicial de hoy no cambiaba;
--   · una tienda podía escribir el inicial que quisiera.
-- Ahora: saldo inicial = saldo del último día anterior que tenga fila de
-- ese producto en esa sucursal (saldo final contado, o inicial + ingreso
-- − devolución, nunca negativo). Si se corrige un día, se recalculan los
-- días siguientes. Los scripts con service key (auth.uid() nulo) siguen
-- escribiendo el inicial que traen (datos demo, pruebas).
-- =====================================================================

-- Saldo con el que arranca un producto en una sucursal en una fecha.
create or replace function public.saldo_anterior(
  p_fecha date, p_sucursal smallint, p_producto integer
)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce((
    select greatest(coalesce(m.saldo_final, m.saldo_inicial + m.ingreso - m.devolucion), 0)
    from movimientos_diarios m
    where m.sucursal_id = p_sucursal
      and m.producto_id = p_producto
      and m.fecha < p_fecha
    order by m.fecha desc
    limit 1
  ), 0)
$$;

-- Lo mismo para todos los productos de una sucursal (pantalla de inventario).
create or replace function public.saldos_anteriores(p_fecha date, p_sucursal smallint)
returns table (producto_id integer, saldo integer)
language sql
stable
set search_path = public
as $$
  select distinct on (m.producto_id)
         m.producto_id,
         greatest(coalesce(m.saldo_final, m.saldo_inicial + m.ingreso - m.devolucion), 0)
  from movimientos_diarios m
  where m.sucursal_id = p_sucursal
    and m.fecha < p_fecha
  order by m.producto_id, m.fecha desc
$$;

grant execute on function public.saldo_anterior(date, smallint, integer) to authenticated;
grant execute on function public.saldos_anteriores(date, smallint) to authenticated;
revoke execute on function public.saldo_anterior(date, smallint, integer) from anon;
revoke execute on function public.saldos_anteriores(date, smallint) from anon;

-- Antes de guardar: el inicial sale de la base.
create or replace function public.calcular_saldo_inicial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.saldo_inicial := saldo_anterior(new.fecha, new.sucursal_id, new.producto_id);
  return new;
end;
$$;

-- Después de guardar: si cambió el saldo de ese día, el día siguiente con
-- fila se recalcula (y ese, en cadena, el que sigue).
create or replace function public.propagar_saldo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.saldo_inicial = old.saldo_inicial
     and new.ingreso = old.ingreso
     and new.devolucion = old.devolucion
     and new.saldo_final is not distinct from old.saldo_final then
    return null;
  end if;
  update movimientos_diarios m
     set saldo_inicial = m.saldo_inicial
   where m.id = (
     select s.id from movimientos_diarios s
     where s.sucursal_id = new.sucursal_id
       and s.producto_id = new.producto_id
       and s.fecha > new.fecha
     order by s.fecha
     limit 1
   );
  return null;
end;
$$;

revoke execute on function public.calcular_saldo_inicial() from public, anon, authenticated;
revoke execute on function public.propagar_saldo() from public, anon, authenticated;

drop trigger if exists calcular_saldo_inicial on public.movimientos_diarios;
create trigger calcular_saldo_inicial
  before insert or update on public.movimientos_diarios
  for each row execute function public.calcular_saldo_inicial();

drop trigger if exists propagar_saldo on public.movimientos_diarios;
create trigger propagar_saldo
  after insert or update on public.movimientos_diarios
  for each row execute function public.propagar_saldo();

-- El recálculo en cadena de días siguientes no es la tienda escribiendo:
-- puede tocar un día ya terminado (solo su saldo inicial).
create or replace function public.proteger_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hoy date := hoy_tegucigalpa();
begin
  if auth.uid() is null or es_admin() or pg_trigger_depth() > 1 then
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
