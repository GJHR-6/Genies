-- =====================================================================
-- DATOS DE DEMOSTRACIÓN (versión SQL de scripts/datos-demo.ts)
-- =====================================================================
-- Corre en el SQL Editor de Supabase o por MCP; no necesita service key.
--   · 6 días de producción antes de hoy (sin domingo): las 6 tiendas
--     anotaron y cerraron → Historial y Rotación tienen datos.
--   · Hoy: 5 tiendas terminaron; Palenque sigue contando (~60 % de la
--     lista) para cerrarle el día en vivo.
--   · Cambios (CM) en las tiendas, decorado / sin decorar en Principal y
--     2 sugeridos cambiados a mano en Principal.
--   · Sin reparto de hoy: se hace en vivo en la demo.
-- ⚠️ BORRA y reescribe inventario y cierres de TODAS las sucursales en ese
-- rango, y el reparto de hoy. Solo antes del piloto.
-- =====================================================================

do $$
declare
  v_hoy     date := (now() at time zone 'America/Tegucigalpa')::date;
  v_desde   date;
  v_fechas  date[] := array[]::date[];
  v_f       date;
  v_admin   uuid;
  v_palenque smallint;
  v_principal smallint;
  r         record;
  v_obj     int;
  v_si      int;
  v_ing     int;
  v_dev     int;
  v_queda   int;
  v_deco    int;
  v_lento   boolean;
  v_n       int;
  v_i       int;
begin
  if extract(dow from v_hoy) = 0 then
    raise exception 'Hoy es domingo: no hay producción para demostrar.';
  end if;

  -- 6 días de producción antes de hoy + hoy.
  v_fechas := array[v_hoy];
  v_f := v_hoy;
  while array_length(v_fechas, 1) < 7 loop
    v_f := v_f - 1;
    if extract(dow from v_f) <> 0 then v_fechas := v_f || v_fechas; end if;
  end loop;
  v_desde := v_fechas[1];

  select user_id into v_admin from perfiles where rol = 'admin' limit 1;
  select id into v_palenque from sucursales where nombre = 'Palenque';
  select id into v_principal from sucursales where es_principal;

  delete from asignaciones where fecha = v_hoy;
  delete from planes_dia where fecha = v_hoy;
  delete from movimientos_diarios where fecha between v_desde and v_hoy;
  delete from cierres_dia where fecha between v_desde and v_hoy;

  perform setseed(0.20261021);

  -- Pares tienda × producto con objetivo (productos activos).
  create temp table demo_pares on commit drop as
    select distinct r.sucursal_id, r.producto_id,
           random() < 0.12 as lento,
           null::int as saldo
    from reglas_sugerido r
    join productos p on p.id = r.producto_id and p.activo
    join sucursales s on s.id = r.sucursal_id and s.activa;

  foreach v_f in array v_fechas loop
    for r in
      select dp.*, p.lleva_decoracion, s.es_principal,
             row_number() over (partition by dp.sucursal_id order by p.orden nulls last, p.id) as pos,
             count(*) over (partition by dp.sucursal_id) as total
      from demo_pares dp
      join productos p on p.id = dp.producto_id
      join sucursales s on s.id = dp.sucursal_id
      order by dp.sucursal_id, p.orden nulls last, p.id
    loop
      -- Palenque hoy lleva ~60 % de la lista.
      continue when v_f = v_hoy and r.sucursal_id = v_palenque and r.pos > r.total * 0.6;

      -- Objetivo: el del día de semana manda sobre el general.
      select objetivo into v_obj from reglas_sugerido
       where producto_id = r.producto_id and sucursal_id = r.sucursal_id
         and (dia_semana = extract(dow from v_f) or dia_semana is null)
       order by dia_semana nulls last limit 1;
      continue when v_obj is null;

      select saldo into v_si from demo_pares
       where sucursal_id = r.sucursal_id and producto_id = r.producto_id;
      v_lento := r.lento;
      if v_si is null then
        v_si := case when v_lento then greatest(v_obj, 2)
                     else floor(random() * (ceil(v_obj / 3.0) + 1))::int end;
      end if;
      v_ing := case when v_lento and v_si >= ceil(v_obj / 2.0) then 0
                    else greatest(v_obj - v_si + (floor(random() * 3)::int - 1), 0) end;
      v_dev := case when not v_lento and random() < 0.1
                    then least(1 + floor(random() * 2)::int, v_si + v_ing) else 0 end;
      v_queda := greatest(round((v_si + v_ing - v_dev) *
                   (1 - case when v_lento then 0.1 + random() * 0.15 else 0.5 + random() * 0.4 end))::int, 0);
      v_deco := case when r.es_principal and r.lleva_decoracion then round(v_ing * 0.6)::int else 0 end;

      insert into movimientos_diarios
        (fecha, sucursal_id, producto_id, saldo_inicial, ingreso, devolucion,
         pedido, saldo_final, decorado, sin_decorar, cambio, updated_at)
      values
        (v_f, r.sucursal_id, r.producto_id, v_si, v_ing, v_dev,
         case when random() < 0.08 then 1 + floor(random() * 3)::int else 0 end,
         v_queda, v_deco,
         case when r.es_principal and r.lleva_decoracion then v_ing - v_deco else 0 end,
         case when not r.es_principal and random() < 0.12 then 1 + floor(random() * 2)::int else 0 end,
         (v_f + time '13:00' + (random() * interval '3 hours 59 minutes')) at time zone 'America/Tegucigalpa');

      update demo_pares set saldo = v_queda
       where sucursal_id = r.sucursal_id and producto_id = r.producto_id;
    end loop;

    insert into cierres_dia (fecha, sucursal_id, estado, cerrado_at, cerrado_by)
    select v_f, s.id,
           case when v_f = v_hoy and s.id = v_palenque then 'en_captura' else 'cerrado' end::estado_dia,
           case when v_f = v_hoy and s.id = v_palenque then null
                else (v_f + time '17:00' + random() * interval '59 minutes') at time zone 'America/Tegucigalpa' end,
           case when v_f = v_hoy and s.id = v_palenque then null else v_admin end
    from sucursales s where s.activa;
  end loop;

  -- Dos sugeridos cambiados a mano hoy en Principal (un pedido grande).
  update movimientos_diarios m
     set sugerido_override = greatest(coalesce(
           (select objetivo from reglas_sugerido rs
             where rs.producto_id = m.producto_id and rs.sucursal_id = m.sucursal_id
               and (rs.dia_semana = extract(dow from v_hoy) or rs.dia_semana is null)
             order by rs.dia_semana nulls last limit 1), 0)
           - coalesce(m.saldo_final, 0), 0) + 10
   where m.id in (select id from movimientos_diarios
                   where fecha = v_hoy and sucursal_id = v_principal
                   order by id limit 2);

  select count(*) into v_n from movimientos_diarios where fecha between v_desde and v_hoy;
  select count(*) into v_i from movimientos_diarios where fecha = v_hoy;
  raise notice 'Listo: % filas (% de hoy), rango % → %', v_n, v_i, v_desde, v_hoy;
end $$;
