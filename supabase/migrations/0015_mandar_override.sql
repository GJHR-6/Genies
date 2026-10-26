-- =====================================================================
-- Lo que se manda a cada tienda (26 oct 2026)
--
-- En el cuadro completo, lo que se le manda a cada tienda es el PEDIDO que
-- anotó la tienda (el sugerido queda de referencia). Administración lo
-- puede ajustar: el ajuste va en esta columna para no pisar el pedido de
-- la tienda ni el sugerido (que sigue mandando la producción).
-- Vacío = se manda el pedido. Solo agrega una columna; las políticas
-- existentes ya dejan escribir al admin en cualquier sucursal.
-- =====================================================================

begin;

alter table movimientos_diarios
  add column mandar_override integer check (mandar_override is null or mandar_override >= 0);

comment on column movimientos_diarios.mandar_override is
  'Ajuste de administración a lo que se manda a la tienda; vacío = se manda el pedido';

commit;
