-- 0024 · Ingreso de días anteriores (16 nov 2026)
-- A veces a la tienda le llegan, como ingreso de hoy, pasteles hechos otro
-- día. La tienda dice de qué día son: {"2026-11-14": 2} = 2 de ese ingreso
-- son del sábado 14 (su color). El resto del ingreso es de hoy. Solo lo usa
-- la rotación; el saldo, el vendido y el sugerido no cambian. null = todo
-- el ingreso es de hoy.
alter table public.movimientos_diarios add column if not exists ingreso_anterior jsonb
  check (ingreso_anterior is null or jsonb_typeof(ingreso_anterior) = 'object');
