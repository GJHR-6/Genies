-- =====================================================================
-- Cierra fuga de RLS en las vistas v_movimientos y v_sugeridos.
--
-- Por defecto una vista de Postgres corre con los permisos de su dueño
-- (SECURITY DEFINER), saltándose el RLS del usuario que consulta. Como
-- estas vistas no filtran por sucursal internamente, una encargada podía
-- leer /rest/v1/v_sugeridos y /rest/v1/v_movimientos de TODAS las
-- sucursales con su token (viola la regla invariable #1: tienda solo ve
-- su sucursal).
--
-- security_invoker = on hace que las vistas apliquen el RLS del usuario
-- que consulta. Las tablas base ya tienen políticas correctas:
--   · movimientos_diarios: SELECT = es_admin() o sucursal_actual()
--   · reglas_sugerido:     SELECT = true (catálogo visible a todos)
-- El admin sigue viendo todo vía es_admin().
-- =====================================================================

begin;

alter view v_movimientos set (security_invoker = on);
alter view v_sugeridos   set (security_invoker = on);

commit;
