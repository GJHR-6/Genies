-- =====================================================================
-- GENIES — Datos de prueba (mientras llega el Excel del cliente, hito M2)
-- Las sucursales reales ya se insertan en 0001_schema.sql.
-- =====================================================================

insert into departamentos (nombre) values
  ('Pastelería'),
  ('Repostería'),
  ('Panadería');

insert into productos (nombre, categoria, tamano, departamento_id, lleva_decoracion) values
  ('Pastel de chocolate', 'Pasteles', 'Grande',  1, true),
  ('Pastel de chocolate', 'Pasteles', 'Mediano', 1, true),
  ('Pastel tres leches',  'Pasteles', 'Grande',  1, true),
  ('Cheesecake',          'Pasteles', 'Mediano', 1, false),
  ('Brownie',             'Repostería', null,    2, false),
  ('Galleta de avena',    'Repostería', null,    2, false),
  ('Pan de banano',       'Panadería',  null,    3, false);

-- Reglas de sugeridos de prueba (objetivo por producto × sucursal, todos los días)
insert into reglas_sugerido (producto_id, sucursal_id, dia_semana, objetivo)
select p.id, s.id, null, 5
from productos p
cross join sucursales s;
