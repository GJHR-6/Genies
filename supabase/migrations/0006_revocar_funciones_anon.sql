-- =====================================================================
-- Quita a anon el permiso de ejecutar las funciones de contexto vía
-- /rest/v1/rpc. Un usuario NO autenticado no tiene por qué llamarlas
-- (silencia el aviso 0028 del linter de Supabase).
--
-- Supabase concede EXECUTE directamente a anon y authenticated (no solo
-- vía PUBLIC), así que hay que revocar a anon explícitamente además de a
-- public.
--
-- Se conserva EXECUTE para `authenticated` A PROPÓSITO: las políticas RLS
-- (mov_lectura, cat_*_admin, etc.) invocan es_admin() / sucursal_actual()
-- y se evalúan con el rol del usuario que consulta; sin este grant el RLS
-- dejaría de funcionar. Por eso el aviso 0029 (authenticated puede
-- ejecutarlas) permanece de forma intencional y es benigno: cada función
-- solo revela el contexto del propio llamador (su rol / su sucursal).
-- =====================================================================

begin;

revoke execute on function public.es_admin()        from anon, public;
revoke execute on function public.sucursal_actual() from anon, public;
revoke execute on function public.rol_actual()      from anon, public;

grant execute on function public.es_admin()        to authenticated;
grant execute on function public.sucursal_actual() to authenticated;
grant execute on function public.rol_actual()      to authenticated;

commit;
