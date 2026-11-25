-- =====================================================================
-- Batidas con libras (21 oct 2026)
--
-- 1. productos.libras: libras de masa que lleva UNA unidad del producto.
--    Solo se llena en los pasteles que se controlan por batidas (vainilla,
--    chocolate, mixto…). Vacío = no se controla por libras.
--    En el reparto, cada tanda (T1–T4) es una batida: se suman las
--    libras de lo que se hornea de cada masa (la categoría) y se avisa si
--    pasa de 100 lb, el máximo de una batida.
-- Solo agrega una columna; las políticas existentes ya cubren lectura para
-- todos y escritura solo admin.
-- =====================================================================

begin;

alter table productos
  add column libras numeric(6,2) check (libras is null or libras > 0);

comment on column productos.libras is
  'Libras de masa por unidad (solo productos controlados por batidas); vacío = no se controla por libras';

commit;
