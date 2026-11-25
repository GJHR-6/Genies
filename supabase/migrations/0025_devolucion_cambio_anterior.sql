-- 0025 · De qué día es la devolución y el cambio (17 nov 2026)
-- Igual que `ingreso_anterior` (0024): la tienda dice de qué día de
-- producción (color) son los pasteles que devuelve o manda a cambio.
-- {"2026-11-14": 2} = 2 son del sábado 14. null = no se dijo.
alter table public.movimientos_diarios
  add column if not exists devolucion_anterior jsonb
    check (devolucion_anterior is null or jsonb_typeof(devolucion_anterior) = 'object'),
  add column if not exists cambio_anterior jsonb
    check (cambio_anterior is null or jsonb_typeof(cambio_anterior) = 'object');
