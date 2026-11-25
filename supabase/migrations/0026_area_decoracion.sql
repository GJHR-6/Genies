-- 0026 · Quién decora cada producto (17 nov 2026)
-- Por defecto lo que lleva decoración sale en el cuadro general de
-- Decoración. Si se elige un área (p. ej. Producción 6 · Jenny para el
-- terciopelo), sale en la hoja de esa pastelera, en «Para decorar», y no en
-- el cuadro general. null = cuadro general de Decoración.
alter table public.productos
  add column if not exists area_decoracion_id integer
    references public.areas_produccion (id) on delete set null;
create index if not exists productos_area_decoracion_idx on public.productos (area_decoracion_id);
