-- =====================================================================
-- Libras por tamaño (26 oct 2026)
--
-- Datos de la dueña: libras de masa por unidad según el tamaño del molde.
-- Máximo 100 lb por batida (MAX_LIBRAS_BATIDA en src/lib/batidas.ts).
--   6X2 = 1 lb · 8X2 = 1.75 lb · 9X2 = 2 lb · 10X2 = 2.5 lb · 11X2 = 3 lb
--   9X13X2 (rectangular) = 4 lb
-- Se aplica igual a las tres masas que se controlan por batidas
-- (VAINILLA, CHOCOLATE, MIXTO). Las porciones quedan vacías (no se
-- hornean aparte); se pueden cargar en Catálogos → Productos.
-- =====================================================================

begin;

update productos p
set libras = t.libras
from (values
  ('6X2', 1.00),
  ('8X2', 1.75),
  ('9X2', 2.00),
  ('10X2', 2.50),
  ('11X2', 3.00),
  ('9X13X2', 4.00)
) as t(tamano, libras)
where p.tamano = t.tamano
  and p.categoria in ('VAINILLA', 'CHOCOLATE', 'MIXTO');

commit;
