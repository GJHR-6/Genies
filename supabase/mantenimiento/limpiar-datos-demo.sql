-- =====================================================================
-- LIMPIEZA DE DATOS DEMO  —  correr UNA sola vez antes del piloto
-- =====================================================================
-- ⚠️  DESTRUCTIVO: borra inventario, cierres y reparto de los días demo.
--     NO toca catálogo (sucursales, productos, reglas, áreas, perfiles,
--     pasteleras ni sus PIN).
--
-- Bloques demo cargados por SQL directo (no hay script generador en el repo):
--   · 2026-07-06 → 2026-07-21   (demo dueña 13 jul + sobras)
--   · 2026-07-30 → 2026-08-05   (demo áreas, mié 6 ago)
--   · 2026-08-13 → 2026-08-20   (bloque extra no documentado en CLAUDE.md)
--   · 2026-10-15                (reparto de prueba: asignaciones + plan
--                                borrador, sin inventario capturado)
--
-- Está acotado a esos rangos exactos: si el piloto ya empezó a capturar en
-- otras fechas, esos datos NO se borran. Transacción atómica con conteo
-- antes/después; revisa los NOTICE antes de confirmar.
-- =====================================================================

begin;

-- predicado de "día demo" reutilizado en ambos deletes
-- (fechas fuera de estos 3 bloques se conservan)
do $$
declare
  demo_mov int;
  demo_cie int;
  resto_mov int;
begin
  select count(*) into demo_mov from movimientos_diarios
   where fecha between '2026-07-06' and '2026-07-21'
      or fecha between '2026-07-30' and '2026-08-05'
      or fecha between '2026-08-13' and '2026-08-20';

  select count(*) into demo_cie from cierres_dia
   where fecha between '2026-07-06' and '2026-07-21'
      or fecha between '2026-07-30' and '2026-08-05'
      or fecha between '2026-08-13' and '2026-08-20';

  select count(*) into resto_mov from movimientos_diarios
   where not (fecha between '2026-07-06' and '2026-07-21'
      or fecha between '2026-07-30' and '2026-08-05'
      or fecha between '2026-08-13' and '2026-08-20');

  raise notice 'A borrar  -> movimientos: %, cierres: %', demo_mov, demo_cie;
  raise notice 'Se conserva (fuera de rangos demo) -> movimientos: %', resto_mov;
end $$;

delete from movimientos_diarios
 where fecha between '2026-07-06' and '2026-07-21'
    or fecha between '2026-07-30' and '2026-08-05'
    or fecha between '2026-08-13' and '2026-08-20';

delete from cierres_dia
 where fecha between '2026-07-06' and '2026-07-21'
    or fecha between '2026-07-30' and '2026-08-05'
    or fecha between '2026-08-13' and '2026-08-20';

-- Reparto por pastelera (migración 0008): solo el día de prueba.
do $$
begin
  raise notice 'A borrar  -> asignaciones: %, planes: %',
    (select count(*) from asignaciones where fecha = '2026-10-15'),
    (select count(*) from planes_dia   where fecha = '2026-10-15');
end $$;

delete from asignaciones where fecha = '2026-10-15';
delete from planes_dia   where fecha = '2026-10-15';

-- Verificación: debe quedar 0 en los rangos demo.
do $$
declare quedan int;
begin
  select count(*) into quedan from movimientos_diarios
   where fecha between '2026-07-06' and '2026-07-21'
      or fecha between '2026-07-30' and '2026-08-05'
      or fecha between '2026-08-13' and '2026-08-20';
  if quedan <> 0 then
    raise exception 'Aún quedan % movimientos demo tras el delete', quedan;
  end if;
  raise notice 'OK: movimientos demo restantes = 0. Total movimientos: %, cierres: %, asignaciones: %',
    (select count(*) from movimientos_diarios),
    (select count(*) from cierres_dia),
    (select count(*) from asignaciones);
end $$;

-- Revisa los NOTICE de arriba. Si todo cuadra, confirma:
commit;
-- Si algo no cuadra: rollback;
