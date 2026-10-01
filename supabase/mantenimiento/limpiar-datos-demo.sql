-- =====================================================================
-- LIMPIEZA DE DATOS DEMO  —  correr UNA sola vez antes del piloto
-- =====================================================================
-- ⚠️  DESTRUCTIVO: borra inventario y cierres de los días demo.
--     NO toca catálogo (sucursales, productos, reglas, áreas, perfiles).
--
-- Bloques demo cargados por SQL directo (no hay script generador en el repo):
--   · 2026-07-06 → 2026-07-21   (demo dueña 13 jul + sobras)
--   · 2026-07-30 → 2026-08-05   (demo áreas, mié 6 ago)
--   · 2026-08-13 → 2026-08-20   (bloque extra no documentado en CLAUDE.md)
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
  raise notice 'OK: movimientos demo restantes = 0. Total movimientos: %, cierres: %',
    (select count(*) from movimientos_diarios),
    (select count(*) from cierres_dia);
end $$;

-- Revisa los NOTICE de arriba. Si todo cuadra, confirma:
commit;
-- Si algo no cuadra: rollback;
