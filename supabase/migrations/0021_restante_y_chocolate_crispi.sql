-- =====================================================================
-- 0021 · RESTANTE en el cuadro completo y CHOCOLATE CRISPI 6 y 8 (8 nov 2026)
-- =====================================================================
-- RESTANTE (sobrantes): columna de INVENTARIO DIARIO que se llena a mano
-- (la fórmula está pendiente). Se guarda en la fila de Principal del día;
-- vacío = null.
alter table public.movimientos_diarios add column if not exists restante integer;

-- CHOCOLATE CRISPI se separa en 8 y 6 (en DEC escribían "3 de 8 y 5 de 6").
-- La fila que ya existía (con lo de lunes a miércoles) pasa a ser la de 8;
-- la de 6 es nueva, va justo después y lleva los mismos objetivos.
update public.productos set nombre = 'CHOCOLATE CRISPI 8' where id = 71;

insert into public.productos (nombre, categoria, tamano, departamento_id, lleva_decoracion, activo, area_id, orden, temporada, libras)
select 'CHOCOLATE CRISPI 6', categoria, tamano, departamento_id, lleva_decoracion, activo, area_id, 735, temporada, libras
from public.productos
where id = 71
  and not exists (select 1 from public.productos where nombre = 'CHOCOLATE CRISPI 6');

insert into public.reglas_sugerido (producto_id, sucursal_id, dia_semana, objetivo)
select n.id, r.sucursal_id, r.dia_semana, r.objetivo
from public.reglas_sugerido r
cross join (select id from public.productos where nombre = 'CHOCOLATE CRISPI 6') n
where r.producto_id = 71
  and not exists (select 1 from public.reglas_sugerido x where x.producto_id = n.id);
