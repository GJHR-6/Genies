-- Deshace los datos FICTICIOS del miércoles 11 nov 2026 en Century y Palenque
-- (cargados el 12 nov para capacitar: inicial = final del martes, ingreso =
-- pedido del martes, venta 30–50 %, día terminado). Correr cuando haya datos
-- reales de ese día o después de la capacitación.
delete from movimientos_diarios
 where fecha = '2026-11-11'
   and sucursal_id in (select id from sucursales where nombre in ('Century', 'Palenque'));
delete from cierres_dia
 where fecha = '2026-11-11'
   and sucursal_id in (select id from sucursales where nombre in ('Century', 'Palenque'));
