-- =====================================================================
-- Batidas con libras y colores de decoración por tienda (21 oct 2026)
--
-- 1. productos.libras: libras de masa que lleva UNA unidad del producto.
--    Solo se llena en los pasteles que se controlan por batidas (vainilla,
--    chocolate, mixto…). Vacío = no se controla por libras.
--    En el reparto, cada tanda (T1–T4) es una batida: se suman las
--    libras de lo que se hornea de cada masa (la categoría) y se avisa si
--    pasa de 100 lb, el máximo de una batida.
-- 2. sucursales.colores_decoracion: descripción libre de los colores con
--    que se decoran los pasteles de cada tienda. Sale en las hojas de
--    despacho.
-- Solo agrega columnas; las políticas existentes ya cubren lectura para
-- todos y escritura solo admin (productos y sucursales).
-- =====================================================================

begin;

alter table productos
  add column libras numeric(6,2) check (libras is null or libras > 0);

comment on column productos.libras is
  'Libras de masa por unidad (solo productos controlados por batidas); vacío = no se controla por libras';

alter table sucursales
  add column colores_decoracion text;

comment on column sucursales.colores_decoracion is
  'Descripción de los colores de decoración de los pasteles de la tienda (sale en las hojas de despacho)';

commit;
