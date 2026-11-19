-- Deshace los datos de DEMO cargados en noviembre 2026:
--   · Altara y Chalets: 13, 14 y 16 nov (cargados el 17 nov).
--   · Principal y Cypress: 13, 14, 16, 17 y 18 nov (cargados el 19 nov),
--     y lo que «no se mandó» a Cypress el 18.
-- Correr antes de cargar el Excel de arranque o de usar la app de verdad.
-- OJO: si alguna tienda anotó datos reales en esas fechas, se borran también.
delete from no_enviados
 where fecha between '2026-11-13' and '2026-11-18'
   and sucursal_id in (select id from sucursales where nombre in ('Altara', 'Chalets', 'Principal', 'Cypress'));
delete from movimientos_diarios
 where fecha between '2026-11-13' and '2026-11-18'
   and sucursal_id in (select id from sucursales where nombre in ('Altara', 'Chalets', 'Principal', 'Cypress'));
delete from cierres_dia
 where fecha between '2026-11-13' and '2026-11-18'
   and sucursal_id in (select id from sucursales where nombre in ('Altara', 'Chalets', 'Principal', 'Cypress'));
