-- 0023 · Nota por producto en el inventario del día (11 nov 2026)
-- Para la devolución: la tienda anota el detalle que no entra en números
-- ("3 negros, 2 rosados…"). Vacío = null.
alter table public.movimientos_diarios add column if not exists nota text
  check (nota is null or char_length(nota) <= 300);
