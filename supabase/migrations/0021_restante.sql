-- =====================================================================
-- 0021 · RESTANTE en el cuadro completo (8 nov 2026)
-- =====================================================================
-- RESTANTE (sobrantes): columna de INVENTARIO DIARIO que se llena a mano
-- (la fórmula está pendiente). Se guarda en la fila de Principal del día;
-- vacío = null. (CHOCOLATE CRISPIE 6 y 8 quedó resuelto en 0022.)
alter table public.movimientos_diarios add column if not exists restante integer;
