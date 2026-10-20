-- =====================================================================
-- Excel nuevo "PRINCIPAL Auto inventario diario" (20 oct 2026)
--
-- 1. productos.orden: el orden de las filas de INVENTARIO DIARIO, de
--    arriba para abajo. La dueña lo quiere igual en todas las pantallas y
--    hojas impresas (antes cada pantalla ordenaba distinto).
-- 2. productos.temporada: productos eventuales / de temporada. Se activan
--    y desactivan desde Catálogos → Productos.
-- 3. movimientos_diarios.cambio: la columna CAMBIO de la hoja de cada
--    tienda. En la hoja completa sale como "CM" junto al pedido de cada
--    tienda, y suma al SALDO de Principal:
--      SALDO = INV/TOTAL de Principal + Σ cambios − Σ lo que se manda.
--    No entra en el cálculo de "vendido" (eso no cambia).
-- Los valores de `orden` se cargan en 0012 junto con los productos nuevos.
-- =====================================================================

begin;

alter table productos
  add column orden     smallint,
  add column temporada boolean not null default false;

comment on column productos.orden is
  'Posición del producto en el Excel (INVENTARIO DIARIO, de arriba para abajo); manda el orden en todas las pantallas';
comment on column productos.temporada is
  'Producto eventual / de temporada';

create index idx_productos_orden on productos (orden);

alter table movimientos_diarios
  add column cambio integer not null default 0 check (cambio >= 0);

comment on column movimientos_diarios.cambio is
  'Producto que la tienda manda de regreso a Principal para cambio (columna CM del Excel)';

commit;
