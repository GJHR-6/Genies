-- =====================================================================
-- Rendimiento: índices para las llaves foráneas sin índice (aviso 0001
-- del linter de Supabase). No cambia comportamiento.
-- =====================================================================

begin;

create index if not exists idx_cierres_sucursal      on cierres_dia (sucursal_id);
create index if not exists idx_cierres_cerrado_by    on cierres_dia (cerrado_by);
create index if not exists idx_mov_producto          on movimientos_diarios (producto_id);
create index if not exists idx_mov_sucursal          on movimientos_diarios (sucursal_id);
create index if not exists idx_mov_updated_by        on movimientos_diarios (updated_by);
create index if not exists idx_perfiles_sucursal     on perfiles (sucursal_id);
create index if not exists idx_productos_area        on productos (area_id);
create index if not exists idx_productos_departamento on productos (departamento_id);
create index if not exists idx_reglas_sucursal       on reglas_sugerido (sucursal_id);

commit;
