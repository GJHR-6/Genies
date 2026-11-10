-- Deshace los datos de DEMO de rotación cargados el 10 nov 2026 en Century.
-- Para la demo se sumaron unidades como ingreso del domingo 8 nov (no
-- cambian el saldo de hoy: re-fechan unidades viejas para que salgan como
-- "prioridad de venta"). Inflan el ingreso y la venta del domingo de estos
-- productos. Correr después de la demo.
update movimientos_diarios m
   set ingreso = m.ingreso - d.extra
  from (values (69, 8), (98, 12), (97, 6), (61, 10), (28, 10), (78, 8), (96, 6), (112, 6), (105, 5), (126, 5)) as d(producto_id, extra)
 where m.fecha = '2026-11-08'
   and m.sucursal_id = (select id from sucursales where nombre = 'Century')
   and m.producto_id = d.producto_id;
